import { sql } from '@/lib/db';
import { aggregateConvergence, type AggregationStatus } from '@/lib/aggregation';
import { formatLastReading, isRegistrySignal } from '@/lib/dashboard-format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CategoryRow = {
  signal_category: string;
  signal_name: string;
  reading_value: string | number | null;
  reading_text: string | null;
  threshold_value: string | number | null;
  threshold_breached: boolean;
  reading_date: string;
  raw_payload?: unknown;
};

type EventRow = {
  event_date: string;
  signal_count: number;
  alert_sent: boolean;
};

type DashboardError = 'schema' | 'connection' | 'unknown';

function classifyDashboardError(error: unknown): DashboardError {
  const err = error as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = err?.code ?? err?.cause?.code ?? '';
  const message = `${err?.message ?? ''} ${err?.cause?.message ?? ''}`.toLowerCase();

  if (code === '42P01' || message.includes('relation') && message.includes('does not exist')) return 'schema';
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
  if (error === 'schema') return 'Schema out of date — next cron run will migrate';
  if (error === 'connection') return 'Database unreachable';
  return 'Dashboard query failed';
}

export default async function DashboardPage() {
  let latestByCategory: CategoryRow[] = [];
  let events: EventRow[] = [];
  let activeCount: number | null = null;
  let clearedCount: number | null = null;
  const dashboardErrors = new Set<DashboardError>();
  let aggregateStatus: AggregationStatus = 'Quiet';

  try {
    const latestByCategoryResult = await sql`SELECT DISTINCT ON (signal_name) signal_category, signal_name, reading_value, reading_text, threshold_value, threshold_breached, reading_date, raw_payload FROM signal_readings ORDER BY signal_name, reading_date DESC, created_at DESC`;
    latestByCategory = (latestByCategoryResult.rows as CategoryRow[])
      .filter((row) => isRegistrySignal(row.signal_name))
      .sort((a, b) => a.signal_category.localeCompare(b.signal_category) || a.signal_name.localeCompare(b.signal_name));
    aggregateStatus = aggregateConvergence(latestByCategory).status;
  } catch (error) {
    console.error('Dashboard category state query failed', error);
    dashboardErrors.add(classifyDashboardError(error));
  }

  try {
    const eventsResult = await sql`SELECT event_date, signal_count, alert_sent, created_at FROM convergence_events ORDER BY event_date DESC, created_at DESC LIMIT 20`;
    events = eventsResult.rows as EventRow[];
  } catch (error) {
    console.error('Dashboard convergence events query failed', error);
    dashboardErrors.add(classifyDashboardError(error));
  }

  try {
    const activeResult = await sql`SELECT COUNT(*)::int AS count FROM signal_readings WHERE threshold_breached = TRUE AND reading_date >= NOW() - INTERVAL '14 days'`;
    activeCount = Number(activeResult.rows[0]?.count ?? 0);
  } catch (error) {
    console.error('Dashboard active breach count query failed', error);
    dashboardErrors.add(classifyDashboardError(error));
  }

  try {
    const clearedResult = await sql`SELECT COUNT(*)::int AS count FROM signal_lifecycle_events WHERE event_type = 'clear' AND created_at >= NOW() - INTERVAL '14 days'`;
    clearedCount = Number(clearedResult.rows[0]?.count ?? 0);
  } catch (error) {
    console.error('Dashboard cleared lifecycle count query failed', error);
    dashboardErrors.add(classifyDashboardError(error));
  }

  const errorMessages = [...dashboardErrors].map(dashboardErrorText);

  return <main>
    <h1>Convergence Monitor Dashboard</h1>
    <p>Status: {aggregateStatus}</p>
    {errorMessages.map((message) => <p key={message}><small>{message}</small></p>)}
    <h2>Category state</h2>
    <table><thead><tr><th>Category</th><th>Signal</th><th>Last Reading</th><th>Threshold</th><th>Breach</th><th>Date</th></tr></thead><tbody>
      {latestByCategory.map((r) => <tr key={`${r.signal_category}-${r.signal_name}`}><td>{r.signal_category}</td><td>{r.signal_name}</td><td>{formatLastReading(r)}</td><td>{r.threshold_value ?? 'N/A'}</td><td>{r.threshold_breached ? 'Yes' : 'No'}</td><td>{String(r.reading_date).slice(0,10)}</td></tr>)}
    </tbody></table>
    <h2>Active vs cleared breaches (last 14 days)</h2>
    <p>Active readings: {activeCount ?? 'N/A'} | Cleared lifecycle events: {clearedCount ?? 'N/A'}</p>
    <h2>Recent convergence events</h2>
    <table><thead><tr><th>Date</th><th>Signal count</th><th>Alert sent</th></tr></thead><tbody>
      {events.map((e, i) => <tr key={i}><td>{String(e.event_date).slice(0,10)}</td><td>{e.signal_count}</td><td>{e.alert_sent ? 'Yes' : 'No'}</td></tr>)}
    </tbody></table>
  </main>;
}
