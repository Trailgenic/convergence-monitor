import { aggregateConvergence, type AggregationReading, type AggregationStatus } from '@/lib/aggregation';
import { ensureSchema as defaultEnsureSchema } from '@/lib/schema';
import { isRegistrySignal } from '@/lib/dashboard-format';
import { sql as defaultSql } from '@/lib/db';

export type DashboardStatus = AggregationStatus | 'ERROR/UNKNOWN';

export type CategoryRow = Omit<AggregationReading, 'reading_text' | 'reading_date'> & {
  reading_text: string | null;
  threshold_value: string | number | null;
  reading_date: string;
};

export type EventRow = {
  event_date: string;
  signal_count: number;
  alert_sent: boolean;
};

type QueryResult<T = Record<string, unknown>> = { rows: T[] };
type SqlQuery = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<QueryResult>;

type DashboardError = 'schema' | 'connection' | 'empty' | 'unknown';

export type DashboardData = {
  latestByCategory: CategoryRow[];
  events: EventRow[];
  activeCount: number | null;
  clearedCount: number | null;
  status: DashboardStatus;
  statusRationale: string;
  coverageLine: string;
  errorMessages: string[];
  lastSuccessfulRead: string | null;
  unavailable: boolean;
};

export type DashboardDataDeps = {
  query?: SqlQuery;
  ensureSchema?: () => Promise<void>;
  now?: () => Date;
};

let lastSuccessfulDashboardRead: string | null = null;

export function resetLastSuccessfulDashboardReadForTests() {
  lastSuccessfulDashboardRead = null;
}

function classifyDashboardError(error: unknown): DashboardError {
  const err = error as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = err?.code ?? err?.cause?.code ?? '';
  const message = `${err?.message ?? ''} ${err?.cause?.message ?? ''}`.toLowerCase();

  if (code === '42P01' || code === '42703' || message.includes('relation') && message.includes('does not exist') || message.includes('column') && message.includes('does not exist')) return 'schema';
  if (
    ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'].includes(code) ||
    message.includes('fetch failed') ||
    message.includes('connect') ||
    message.includes('connection') ||
    message.includes('timeout')
  ) return 'connection';

  return 'unknown';
}

function dashboardErrorText(error: DashboardError) {
  if (error === 'schema') return 'Schema unavailable — dashboard read path could not migrate';
  if (error === 'connection') return 'Database unreachable';
  if (error === 'empty') return 'Dashboard data unavailable — zero evaluable rows';
  return 'Dashboard query failed';
}

function unavailableBanner(lastSuccessfulRead: string | null) {
  return `Dashboard data unavailable — last successful read: ${lastSuccessfulRead ?? 'never'}`;
}

function unavailableResult(errorMessages: string[], lastSuccessfulRead: string | null): Pick<DashboardData, 'status' | 'statusRationale' | 'coverageLine' | 'errorMessages' | 'lastSuccessfulRead' | 'unavailable'> {
  return {
    status: 'ERROR/UNKNOWN',
    statusRationale: unavailableBanner(lastSuccessfulRead),
    coverageLine: 'Status not computed because dashboard data is unavailable.',
    errorMessages: [unavailableBanner(lastSuccessfulRead), ...errorMessages],
    lastSuccessfulRead,
    unavailable: true
  };
}

export function hasEvaluableRows(rows: AggregationReading[]) {
  const aggregate = aggregateConvergence(rows);
  return aggregate.categoryEvaluations.some((category) => category.state !== 'unknown');
}

export async function loadDashboardData(deps: DashboardDataDeps = {}): Promise<DashboardData> {
  const query = deps.query ?? defaultSql;
  const ensureSchema = deps.ensureSchema ?? defaultEnsureSchema;
  const now = deps.now ?? (() => new Date());

  let latestByCategory: CategoryRow[] = [];
  let events: EventRow[] = [];
  let activeCount: number | null = null;
  let clearedCount: number | null = null;
  const dashboardErrors = new Set<DashboardError>();

  try {
    await ensureSchema();
    const latestByCategoryResult = await query`SELECT DISTINCT ON (signal_name) signal_category, signal_name, reading_value, reading_text, threshold_value, threshold_breached, qualitative_severity, data_status, reading_date, raw_payload FROM signal_readings ORDER BY signal_name, reading_date DESC, created_at DESC`;
    latestByCategory = (latestByCategoryResult.rows as CategoryRow[])
      .filter((row) => isRegistrySignal(row.signal_name))
      .sort((a, b) => a.signal_category.localeCompare(b.signal_category) || a.signal_name.localeCompare(b.signal_name));
  } catch (error) {
    console.error('Dashboard category state query failed', error);
    dashboardErrors.add(classifyDashboardError(error));
  }

  if (dashboardErrors.size > 0 || !hasEvaluableRows(latestByCategory)) {
    if (dashboardErrors.size === 0) dashboardErrors.add('empty');
    return {
      latestByCategory,
      events,
      activeCount,
      clearedCount,
      ...unavailableResult([...dashboardErrors].map(dashboardErrorText), lastSuccessfulDashboardRead)
    };
  }

  const aggregate = aggregateConvergence(latestByCategory);
  lastSuccessfulDashboardRead = now().toISOString();

  try {
    const eventsResult = await query`SELECT event_date, signal_count, alert_sent, created_at FROM convergence_events ORDER BY event_date DESC, created_at DESC LIMIT 20`;
    events = eventsResult.rows as EventRow[];
  } catch (error) {
    console.error('Dashboard convergence events query failed', error);
    dashboardErrors.add(classifyDashboardError(error));
  }

  try {
    const activeResult = await query`SELECT COUNT(*)::int AS count FROM signal_readings WHERE threshold_breached = TRUE AND reading_date >= NOW() - INTERVAL '14 days'`;
    activeCount = Number(activeResult.rows[0]?.count ?? 0);
  } catch (error) {
    console.error('Dashboard active breach count query failed', error);
    dashboardErrors.add(classifyDashboardError(error));
  }

  try {
    const clearedResult = await query`SELECT COUNT(*)::int AS count FROM signal_lifecycle_events WHERE event_type = 'clear' AND created_at >= NOW() - INTERVAL '14 days'`;
    clearedCount = Number(clearedResult.rows[0]?.count ?? 0);
  } catch (error) {
    console.error('Dashboard cleared lifecycle count query failed', error);
    dashboardErrors.add(classifyDashboardError(error));
  }

  return {
    latestByCategory,
    events,
    activeCount,
    clearedCount,
    status: aggregate.status,
    statusRationale: aggregate.statusRationale,
    coverageLine: aggregate.coverageLine,
    errorMessages: [...dashboardErrors].map(dashboardErrorText),
    lastSuccessfulRead: lastSuccessfulDashboardRead,
    unavailable: false
  };
}

export function dashboardApiStatusCode(data: Pick<DashboardData, 'unavailable'>) {
  return data.unavailable ? 503 : 200;
}
