import { sql } from '@/lib/db';
export async function pollCapexSignals() {
  const date = new Date().toISOString().slice(0,10);
  await sql`INSERT INTO signal_readings (signal_category, signal_name, reading_text, reading_date, threshold_breached, raw_payload)
  VALUES ('capex','CAPEX_MANUAL_WEBHOOK_EVENT','Manual capex signal entry placeholder',${date},FALSE,'{}'::jsonb)
  ON CONFLICT (signal_name, reading_date) DO NOTHING`;
}
