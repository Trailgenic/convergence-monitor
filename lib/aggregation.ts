import { findSignal, getSignal, type SignalCategory } from '@/lib/signal-registry';
import { isSevereBreach } from '@/lib/evaluator';

export type AggregationStatus = 'Quiet' | 'Watch' | 'Warning' | 'Firing';

export type AggregationReading = {
  signal_category: string;
  signal_name: string;
  reading_value: string | number | null;
  reading_text?: string | null;
  threshold_breached: boolean;
  raw_payload?: unknown;
};

export type AggregationResult = {
  status: AggregationStatus;
  tallyCategories: SignalCategory[];
  tallyRows: AggregationReading[];
};

function isSeeded(rawPayload: unknown): boolean {
  return Boolean(rawPayload && typeof rawPayload === 'object' && 'seeded' in rawPayload && (rawPayload as { seeded?: unknown }).seeded === true);
}

export function isAlertDispatchEligible(row: AggregationReading): boolean {
  if (!row.threshold_breached || isSeeded(row.raw_payload)) return false;

  const signal = findSignal(row.signal_name);
  return Boolean(signal?.tallyEligible && !signal.displayOnly);
}

export function aggregateConvergence(rows: AggregationReading[]): AggregationResult {
  const tallyRows = rows.filter((row) => {
    if (!row.threshold_breached) return false;
    const signal = findSignal(row.signal_name);
    return Boolean(signal?.tallyEligible && !signal.displayOnly);
  });
  const tallyCategories = [...new Set(tallyRows.map((row) => row.signal_category as SignalCategory))];
  const hasSevere = tallyRows.some((row) => {
    const signal = getSignal(row.signal_name);
    const numericValue = typeof row.reading_value === 'number' ? row.reading_value : row.reading_value === null ? null : Number(row.reading_value);
    return isSevereBreach(signal, Number.isFinite(numericValue) ? numericValue : null);
  });

  if (tallyCategories.length === 0) return { status: 'Quiet', tallyCategories, tallyRows };
  if (tallyCategories.length === 1) return { status: 'Watch', tallyCategories, tallyRows };
  return { status: hasSevere ? 'Firing' : 'Warning', tallyCategories, tallyRows };
}

export function aggregateAlertDispatch(rows: AggregationReading[]): AggregationResult {
  return aggregateConvergence(rows.filter(isAlertDispatchEligible));
}
