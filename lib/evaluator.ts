import type { SignalRegistryEntry } from '@/lib/signal-registry';
import { SEVERE_BAND_PCT, WEAK_BAND_PCT } from '@/lib/status-config';

export type BreachSeverity = 'weak' | 'moderate' | 'severe';
export type DataStatus = 'ok' | 'unknown' | 'placeholder' | 'stale' | 'error';

export type SignalReadingInput = {
  value?: number | null;
  text?: string | null;
  forcedBreached?: boolean;
  qualitativeSeverity?: BreachSeverity | null;
};

export type SignalEvaluationState = 'clear' | 'flag' | 'breach';

export type SignalEvaluation = {
  breached: boolean;
  normalizedValue: number | null;
  state: SignalEvaluationState;
  severe: boolean;
  severity: BreachSeverity | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function normalizeSignalValue(entry: SignalRegistryEntry, reading: SignalReadingInput): number | null {
  if (reading.value === undefined || reading.value === null || Number.isNaN(reading.value)) return null;
  if (entry.unit === 'text') return null;

  const normalized = entry.unit === 'bps' ? reading.value * 100 : reading.value;
  return round2(normalized);
}

export function normalizeQualitativeSeverity(severity: unknown): BreachSeverity {
  return severity === 'moderate' || severity === 'severe' || severity === 'weak' ? severity : 'weak';
}

function evaluateIpoDayOnePop(normalizedValue: number | null): SignalEvaluation {
  if (normalizedValue === null) return { breached: false, normalizedValue, state: 'clear', severe: false, severity: null };
  if (normalizedValue <= 0) return { breached: true, normalizedValue, state: 'breach', severe: true, severity: 'severe' };
  if (normalizedValue < 18) {
    const severity = classifyNumericBreachSeverity(getIpoThresholdEntry(), normalizedValue);
    return { breached: true, normalizedValue, state: 'breach', severe: severity === 'severe', severity };
  }
  if (normalizedValue < 20) return { breached: false, normalizedValue, state: 'flag', severe: false, severity: null };
  return { breached: false, normalizedValue, state: 'clear', severe: false, severity: null };
}

function getIpoThresholdEntry(): Pick<SignalRegistryEntry, 'threshold' | 'direction' | 'name'> {
  return { name: 'IPO_DAY_ONE_POP_PCT', threshold: 18, direction: 'below' };
}

export function evaluateSignal(entry: SignalRegistryEntry, reading: SignalReadingInput): SignalEvaluation {
  const normalizedValue = normalizeSignalValue(entry, reading);

  if (reading.forcedBreached !== undefined) {
    const severity = reading.forcedBreached ? classifyBreachSeverity(entry, normalizedValue, reading.qualitativeSeverity) : null;
    return { breached: reading.forcedBreached, normalizedValue, state: reading.forcedBreached ? 'breach' : 'clear', severe: severity === 'severe', severity };
  }

  if (entry.name === 'IPO_DAY_ONE_POP_PCT') {
    return evaluateIpoDayOnePop(normalizedValue);
  }

  if (normalizedValue === null || entry.threshold === null || entry.direction === null) {
    return { breached: false, normalizedValue, state: 'clear', severe: false, severity: null };
  }

  const breached = entry.direction === 'above'
    ? normalizedValue > entry.threshold
    : normalizedValue < entry.threshold;
  const severity = breached ? classifyNumericBreachSeverity(entry, normalizedValue) : null;

  return { breached, normalizedValue, state: breached ? 'breach' : 'clear', severe: severity === 'severe', severity };
}

export function thresholdDistance(entry: Pick<SignalRegistryEntry, 'threshold' | 'direction'>, normalizedValue: number | null): number {
  if (normalizedValue === null || entry.threshold === null || entry.threshold === 0 || entry.direction === null) return 0;

  if (entry.direction === 'above') {
    return Math.max(0, (normalizedValue - entry.threshold) / Math.abs(entry.threshold));
  }

  return Math.max(0, (entry.threshold - normalizedValue) / Math.abs(entry.threshold));
}

export function classifyNumericBreachSeverity(entry: Pick<SignalRegistryEntry, 'threshold' | 'direction' | 'name'>, normalizedValue: number | null): BreachSeverity {
  if (entry.name === 'IPO_DAY_ONE_POP_PCT' && normalizedValue !== null && normalizedValue <= 0) return 'severe';
  const distancePct = thresholdDistance(entry, normalizedValue) * 100;
  if (distancePct > SEVERE_BAND_PCT) return 'severe';
  if (distancePct > WEAK_BAND_PCT) return 'moderate';
  return 'weak';
}

export function classifyBreachSeverity(entry: SignalRegistryEntry, normalizedValue: number | null, qualitativeSeverity?: unknown): BreachSeverity {
  if (entry.threshold === null || entry.direction === null) return normalizeQualitativeSeverity(qualitativeSeverity);
  return classifyNumericBreachSeverity(entry, normalizedValue);
}

export function isSevereBreach(entry: SignalRegistryEntry, normalizedValue: number | null): boolean {
  return classifyNumericBreachSeverity(entry, normalizedValue) === 'severe';
}
