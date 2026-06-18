import type { SignalRegistryEntry } from '@/lib/signal-registry';

export type SignalReadingInput = {
  value?: number | null;
  text?: string | null;
  forcedBreached?: boolean;
};

export type SignalEvaluationState = 'clear' | 'flag' | 'breach';

export type SignalEvaluation = {
  breached: boolean;
  normalizedValue: number | null;
  state: SignalEvaluationState;
  severe: boolean;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function normalizeSignalValue(entry: SignalRegistryEntry, reading: SignalReadingInput): number | null {
  if (reading.value === undefined || reading.value === null || Number.isNaN(reading.value)) return null;
  if (entry.unit === 'text') return null;

  const normalized = entry.unit === 'bps' ? reading.value * 100 : reading.value;
  return round2(normalized);
}

function evaluateIpoDayOnePop(normalizedValue: number | null): SignalEvaluation {
  if (normalizedValue === null) return { breached: false, normalizedValue, state: 'clear', severe: false };
  if (normalizedValue <= 0) return { breached: true, normalizedValue, state: 'breach', severe: true };
  if (normalizedValue < 18) return { breached: true, normalizedValue, state: 'breach', severe: false };
  if (normalizedValue < 20) return { breached: false, normalizedValue, state: 'flag', severe: false };
  return { breached: false, normalizedValue, state: 'clear', severe: false };
}

export function evaluateSignal(entry: SignalRegistryEntry, reading: SignalReadingInput): SignalEvaluation {
  const normalizedValue = normalizeSignalValue(entry, reading);

  if (reading.forcedBreached !== undefined) {
    return { breached: reading.forcedBreached, normalizedValue, state: reading.forcedBreached ? 'breach' : 'clear', severe: false };
  }

  if (entry.name === 'IPO_DAY_ONE_POP_PCT') {
    return evaluateIpoDayOnePop(normalizedValue);
  }

  if (normalizedValue === null || entry.threshold === null || entry.direction === null) {
    return { breached: false, normalizedValue, state: 'clear', severe: false };
  }

  const breached = entry.direction === 'above'
    ? normalizedValue > entry.threshold
    : normalizedValue < entry.threshold;

  return { breached, normalizedValue, state: breached ? 'breach' : 'clear', severe: breached && isSevereBreach(entry, normalizedValue) };
}

export function thresholdDistance(entry: SignalRegistryEntry, normalizedValue: number | null): number {
  if (normalizedValue === null || entry.threshold === null || entry.threshold === 0 || entry.direction === null) return 0;

  if (entry.direction === 'above') {
    return Math.max(0, (normalizedValue - entry.threshold) / Math.abs(entry.threshold));
  }

  return Math.max(0, (entry.threshold - normalizedValue) / Math.abs(entry.threshold));
}

export function isSevereBreach(entry: SignalRegistryEntry, normalizedValue: number | null): boolean {
  if (entry.name === 'IPO_DAY_ONE_POP_PCT') return normalizedValue !== null && normalizedValue <= 0;
  return thresholdDistance(entry, normalizedValue) > 0.5;
}
