import { sql } from '@/lib/db';

type SignalReadingInput = {
  category: string;
  name: string;
  readingDate: string;
  breached: boolean;
  value?: number | null;
  text?: string | null;
  threshold?: number | null;
  rawPayload?: Record<string, unknown>;
};

async function emitSignalLifecycleEvent(input: SignalReadingInput) {
  if (input.breached) {
    const lastBreach = await sql`SELECT id FROM signal_lifecycle_events
      WHERE signal_name = ${input.name} AND event_type = 'breach' AND created_at >= NOW() - INTERVAL '24 hours'
      LIMIT 1`;
    if (lastBreach.rows.length === 0) {
      await sql`INSERT INTO signal_lifecycle_events (event_date, signal_category, signal_name, event_type, reading_date, reading_value, reading_text, notes)
        VALUES (${input.readingDate}, ${input.category}, ${input.name}, 'breach', ${input.readingDate}, ${input.value ?? null}, ${input.text ?? null}, 'threshold breached')`;
    }
    return;
  }

  const latestReadings = await sql`SELECT threshold_breached FROM signal_readings
    WHERE signal_name = ${input.name}
    ORDER BY reading_date DESC, created_at DESC
    LIMIT 3`;
  const hasThreeConsecutiveClears = latestReadings.rows.length >= 3 && latestReadings.rows.every((row) => row.threshold_breached === false);
  if (!hasThreeConsecutiveClears) return;

  const lastLifecycleEvent = await sql`SELECT event_type FROM signal_lifecycle_events
    WHERE signal_name = ${input.name}
    ORDER BY created_at DESC
    LIMIT 1`;
  if (lastLifecycleEvent.rows[0]?.event_type !== 'breach') return;

  const duplicateClear = await sql`SELECT id FROM signal_lifecycle_events
    WHERE signal_name = ${input.name} AND event_type = 'clear' AND created_at >= NOW() - INTERVAL '24 hours'
    LIMIT 1`;
  if (duplicateClear.rows.length > 0) return;

  await sql`INSERT INTO signal_lifecycle_events (event_date, signal_category, signal_name, event_type, reading_date, reading_value, reading_text, notes)
    VALUES (${input.readingDate}, ${input.category}, ${input.name}, 'clear', ${input.readingDate}, ${input.value ?? null}, ${input.text ?? null}, 'cleared after 3 consecutive in-threshold readings')`;
}

export async function upsertSignalReading(input: SignalReadingInput) {
  await sql`INSERT INTO signal_readings (signal_category, signal_name, reading_value, reading_text, reading_date, threshold_breached, threshold_value, raw_payload)
    VALUES (${input.category}, ${input.name}, ${input.value ?? null}, ${input.text ?? null}, ${input.readingDate}, ${input.breached}, ${input.threshold ?? null}, ${JSON.stringify(input.rawPayload ?? {})}::jsonb)
    ON CONFLICT (signal_name, reading_date) DO UPDATE SET
      signal_category = EXCLUDED.signal_category,
      reading_value = EXCLUDED.reading_value,
      reading_text = EXCLUDED.reading_text,
      threshold_breached = EXCLUDED.threshold_breached,
      threshold_value = EXCLUDED.threshold_value,
      raw_payload = EXCLUDED.raw_payload`;

  await emitSignalLifecycleEvent(input);
}
