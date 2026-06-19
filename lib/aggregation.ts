import { findSignal, getSignal, type SignalCategory } from '@/lib/signal-registry';
import { classifyBreachSeverity, normalizeQualitativeSeverity, type BreachSeverity, type DataStatus } from '@/lib/evaluator';

export type AggregationStatus = 'Quiet' | 'Watch' | 'Warning' | 'Convergence Firing';
export type CategoryEvaluationState = 'clear' | 'breach' | 'unknown' | 'partial';

export type AggregationReading = {
  signal_category: string;
  signal_name: string;
  reading_value: string | number | null;
  reading_text?: string | null;
  reading_date?: string | Date;
  data_status?: DataStatus | null;
  qualitative_severity?: BreachSeverity | null;
  threshold_breached: boolean;
  raw_payload?: unknown;
};

export type CategoryEvaluation = {
  category: SignalCategory;
  state: CategoryEvaluationState;
  unknownSignals: string[];
  breachedSignals: string[];
};

export type AggregationResult = {
  status: AggregationStatus;
  statusRationale: string;
  coverageLine: string;
  tallyCategories: SignalCategory[];
  tallyRows: AggregationReading[];
  unknownTallyCategories: SignalCategory[];
  categoryEvaluations: CategoryEvaluation[];
};

function isSeeded(rawPayload: unknown): boolean {
  return Boolean(rawPayload && typeof rawPayload === 'object' && 'seeded' in rawPayload && (rawPayload as { seeded?: unknown }).seeded === true);
}

export function normalizedDataStatus(row: { data_status?: DataStatus | null; reading_value?: string | number | null; reading_text?: string | null; raw_payload?: unknown }): DataStatus {
  if (row.data_status === 'unknown' || row.data_status === 'placeholder' || row.data_status === 'stale' || row.data_status === 'error' || row.data_status === 'ok') return row.data_status;
  if (row.raw_payload && typeof row.raw_payload === 'object' && (row.raw_payload as { placeholder?: unknown }).placeholder === true) return 'placeholder';
  const valueText = row.reading_value === null || row.reading_value === undefined ? '' : String(row.reading_value);
  const combined = `${valueText} ${row.reading_text ?? ''}`.trim().toLowerCase();
  if (!combined) return 'placeholder';
  if (/(placeholder|until|not configured|not yet wired|\btbd\b|n\/a-data)/i.test(combined)) return 'placeholder';
  return 'ok';
}

export function isUnconfirmedReading(row: { raw_payload?: unknown }): boolean {
  return Boolean(row.raw_payload && typeof row.raw_payload === 'object' && (row.raw_payload as { unconfirmed?: unknown }).unconfirmed === true);
}

export function isUnknownReading(row: { data_status?: DataStatus | null; reading_value?: string | number | null; reading_text?: string | null; raw_payload?: unknown }): boolean {
  const status = normalizedDataStatus(row);
  return status === 'unknown' || status === 'placeholder' || status === 'error' || status === 'stale' && isUnconfirmedReading(row);
}

function isRecent(row: AggregationReading, now = new Date()): boolean {
  if (!row.reading_date) return true;
  const readingTime = new Date(row.reading_date).getTime();
  if (Number.isNaN(readingTime)) return true;
  return now.getTime() - readingTime <= 14 * 24 * 60 * 60 * 1000;
}

function rawPayloadQualitativeSeverity(rawPayload: unknown): BreachSeverity | null {
  if (!rawPayload || typeof rawPayload !== 'object') return null;
  const value = (rawPayload as { qualitative_severity?: unknown; qualitativeSeverity?: unknown }).qualitative_severity ?? (rawPayload as { qualitativeSeverity?: unknown }).qualitativeSeverity;
  return normalizeQualitativeSeverity(value);
}

function rowSeverity(row: AggregationReading): BreachSeverity {
  const signal = getSignal(row.signal_name);
  const numericValue = typeof row.reading_value === 'number' ? row.reading_value : row.reading_value === null ? null : Number(row.reading_value);
  return classifyBreachSeverity(signal, Number.isFinite(numericValue) ? numericValue : null, row.qualitative_severity ?? rawPayloadQualitativeSeverity(row.raw_payload));
}

function hasDemandBroadeningCollapse(rows: AggregationReading[]) {
  return rows.some((row) => row.signal_category === 'demand_broadening' && row.raw_payload && typeof row.raw_payload === 'object' && ((row.raw_payload as { collapse?: unknown }).collapse === true || (row.raw_payload as { manual_collapse?: unknown }).manual_collapse === true));
}

export function isAlertDispatchEligible(row: AggregationReading): boolean {
  if (!row.threshold_breached || isSeeded(row.raw_payload) || isUnknownReading(row)) return false;

  const signal = findSignal(row.signal_name);
  return Boolean(signal?.tallyEligible && !signal.displayOnly);
}

function evaluateCategories(rows: AggregationReading[]): CategoryEvaluation[] {
  const groups = new Map<SignalCategory, AggregationReading[]>();
  for (const row of rows) {
    const signal = findSignal(row.signal_name);
    if (!signal?.tallyEligible || signal.displayOnly) continue;
    const category = row.signal_category as SignalCategory;
    groups.set(category, [...(groups.get(category) ?? []), row]);
  }

  return [...groups.entries()].map(([category, categoryRows]) => {
    const unknownSignals = categoryRows.filter(isUnknownReading).map((row) => row.signal_name);
    const evaluableRows = categoryRows.filter((row) => !isUnknownReading(row));
    const breachedSignals = evaluableRows.filter((row) => row.threshold_breached).map((row) => row.signal_name);
    const state = evaluableRows.length === 0 ? 'unknown' : unknownSignals.length > 0 ? 'partial' : breachedSignals.length > 0 ? 'breach' : 'clear';
    return { category, state, unknownSignals, breachedSignals };
  });
}

export function aggregateConvergence(rows: AggregationReading[]): AggregationResult {
  const recentRows = rows.filter((row) => isRecent(row));
  const categoryEvaluations = evaluateCategories(recentRows);
  const unknownTallyCategories = categoryEvaluations.filter((category) => category.state === 'unknown').map((category) => category.category);
  const tallyRows = recentRows.filter((row) => {
    if (!row.threshold_breached || isUnknownReading(row)) return false;
    const signal = findSignal(row.signal_name);
    return Boolean(signal?.tallyEligible && !signal.displayOnly);
  });
  const tallyCategories = [...new Set(tallyRows.map((row) => row.signal_category as SignalCategory))];
  const severities = tallyRows.map(rowSeverity);
  const categoryList = tallyCategories.join(', ') || 'none';
  const coverageLine = `Tally-eligible breached: ${tallyCategories.length} of ${categoryEvaluations.filter((category) => category.state !== 'unknown').length} evaluable. ${unknownTallyCategories.length} tally-eligible categories UNKNOWN (coverage gap): [${unknownTallyCategories.join(', ') || 'none'}]. Status computed on evaluable categories only.`;

  let status: AggregationStatus;
  let statusRationale: string;
  if (hasDemandBroadeningCollapse(recentRows)) {
    status = 'Convergence Firing';
    statusRationale = 'Convergence Firing — demand broadening collapse override is set.';
  } else if (severities.includes('severe')) {
    status = 'Convergence Firing';
    statusRationale = `Convergence Firing — severe tally-eligible breach present across ${tallyCategories.length} breached category/categories (${categoryList}).`;
  } else if (tallyCategories.length === 0) {
    status = 'Quiet';
    statusRationale = 'Quiet — 0 tally-eligible breaches in the trailing 14 days.';
  } else if (tallyCategories.length === 1) {
    status = 'Watch';
    statusRationale = `Watch — 1 tally-eligible breach (${categoryList}); no severe breach present.`;
  } else if (severities.includes('moderate')) {
    status = 'Convergence Firing';
    statusRationale = `Convergence Firing — ${tallyCategories.length} tally-eligible breaches (${categoryList}); at least one moderate breach present.`;
  } else {
    status = 'Warning';
    statusRationale = `Warning — ${tallyCategories.length} tally-eligible breaches (${categoryList}); all weak/qualitative; no severe or moderate breach present.`;
  }

  return { status, statusRationale, coverageLine, tallyCategories, tallyRows, unknownTallyCategories, categoryEvaluations };
}

export function aggregateAlertDispatch(rows: AggregationReading[]): AggregationResult {
  return aggregateConvergence(rows.filter(isAlertDispatchEligible));
}
