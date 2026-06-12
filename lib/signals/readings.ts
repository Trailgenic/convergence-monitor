import { sql } from '@/lib/db';
import { evaluateSignal } from '@/lib/evaluator';
import { getSignal, type SignalRegistryEntry } from '@/lib/signal-registry';

type SignalReadingInput = {
  name: string;
  readingDate: string;
  value?: number | null;
  text?: string | null;
  forcedBreached?: boolean;
  rawPayload?: Record<string, unknown>;
};

async function emitSignalLifecycleEvent(entry: SignalRegistryEntry, input: SignalReadingInput, normalizedValue: number | null, breached: boolean) {
  if (breached) {
    const lastBreach = await sql`SELECT id FROM signal_lifecycle_events
      WHERE signal_name = ${entry.name} AND event_type = 'breach' AND created_at >= NOW() - INTERVAL '24 hours'
      LIMIT 1`;
    if (lastBreach.rows.length === 0) {
      await sql`INSERT INTO signal_lifecycle_events (event_date, signal_category, signal_name, event_type, reading_date, reading_value, reading_text, notes)
        VALUES (${input.readingDate}, ${entry.category}, ${entry.name}, 'breach', ${input.readingDate}, ${normalizedValue}, ${input.text ?? null}, 'threshold breached')`;
    }
    return;
  }

  const latestReadings = await sql`SELECT threshold_breached FROM signal_readings
    WHERE signal_name = ${entry.name}
    ORDER BY reading_date DESC, created_at DESC
    LIMIT 3`;
  const hasThreeConsecutiveClears = latestReadings.rows.length >= 3 && latestReadings.rows.every((row) => row.threshold_breached === false);
  if (!hasThreeConsecutiveClears) return;

  const lastLifecycleEvent = await sql`SELECT event_type FROM signal_lifecycle_events
    WHERE signal_name = ${entry.name}
    ORDER BY created_at DESC
    LIMIT 1`;
  if (lastLifecycleEvent.rows[0]?.event_type !== 'breach') return;

  const duplicateClear = await sql`SELECT id FROM signal_lifecycle_events
    WHERE signal_name = ${entry.name} AND event_type = 'clear' AND created_at >= NOW() - INTERVAL '24 hours'
    LIMIT 1`;
  if (duplicateClear.rows.length > 0) return;

  await sql`INSERT INTO signal_lifecycle_events (event_date, signal_category, signal_name, event_type, reading_date, reading_value, reading_text, notes)
    VALUES (${input.readingDate}, ${entry.category}, ${entry.name}, 'clear', ${input.readingDate}, ${normalizedValue}, ${input.text ?? null}, 'cleared after 3 consecutive in-threshold readings')`;
}

export async function upsertSignalReading(input: SignalReadingInput) {
  const entry = getSignal(input.name);
  const { breached, normalizedValue } = evaluateSignal(entry, input);
  const rawPayload = JSON.stringify({ ...(input.rawPayload ?? {}), unit: entry.unit });

  await sql`INSERT INTO signal_readings (signal_category, signal_name, reading_value, reading_text, reading_date, threshold_breached, threshold_value, raw_payload)
    VALUES (${entry.category}, ${entry.name}, ${normalizedValue}, ${input.text ?? null}, ${input.readingDate}, ${breached}, ${entry.threshold}, ${rawPayload}::jsonb)
    ON CONFLICT (signal_name, reading_date) DO UPDATE SET
      signal_category = EXCLUDED.signal_category,
      reading_value = EXCLUDED.reading_value,
      reading_text = EXCLUDED.reading_text,
      threshold_breached = EXCLUDED.threshold_breached,
      threshold_value = EXCLUDED.threshold_value,
      raw_payload = EXCLUDED.raw_payload`;

  await emitSignalLifecycleEvent(entry, input, normalizedValue, breached);

  return { entry, breached, normalizedValue };
}
