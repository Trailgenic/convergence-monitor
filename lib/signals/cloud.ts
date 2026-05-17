import { sql } from '@/lib/db';
export async function pollCloudSignals() {
  const date = new Date().toISOString().slice(0,10);
  await sql`INSERT INTO signal_readings (signal_category, signal_name, reading_text, reading_date, threshold_breached, raw_payload)
  VALUES ('cloud','CLOUD_EARNINGS_MANUAL_ENTRY_REQUIRED','Awaiting quarterly manual updates',${date},FALSE,'{}'::jsonb)
  ON CONFLICT (signal_name, reading_date) DO NOTHING`;
}
