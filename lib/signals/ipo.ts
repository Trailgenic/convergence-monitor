import { sql } from '@/lib/db';
export async function pollIpoSignals() {
  const date = new Date().toISOString().slice(0,10);
  await sql`INSERT INTO signal_readings (signal_category, signal_name, reading_text, reading_date, threshold_breached, raw_payload)
  VALUES ('ipo','IPO_CALENDAR_TRACKING','Monitoring pre/post-pricing conditions',${date},FALSE,'{}'::jsonb)
  ON CONFLICT (signal_name, reading_date) DO NOTHING`;
}
