import { signalRegistry } from '@/lib/signal-registry';

export type DashboardReading = {
  signal_name: string;
  reading_value: string | number | null;
  reading_text: string | null;
  raw_payload?: unknown;
};

const registrySignalNames: Set<string> = new Set(signalRegistry.map((signal) => signal.name));

export function isRegistrySignal(signalName: string) {
  return registrySignalNames.has(signalName);
}

function unitSuffix(rawPayload: unknown): string {
  if (!rawPayload || typeof rawPayload !== 'object' || !('unit' in rawPayload)) return '';
  const unit = (rawPayload as { unit?: unknown }).unit;
  if (unit === 'bps') return ' bps';
  if (unit === 'pct') return '%';
  if (unit === 'usd_mwh') return ' USD/MWh';
  return '';
}

export function formatLastReading(reading: DashboardReading) {
  if (reading.reading_value !== null && reading.reading_value !== undefined) {
    const value = `${reading.reading_value}${unitSuffix(reading.raw_payload)}`;
    return reading.reading_text ? `${value} — ${reading.reading_text}` : value;
  }

  return reading.reading_text ?? 'N/A';
}
