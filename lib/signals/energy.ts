import { sql } from '@/lib/db';
import { thresholds } from '@/lib/thresholds';
export async function pollEnergySignals() {
  const date = new Date().toISOString().slice(0,10);
  const vals = [
    ['PJM_LMP_THRESHOLD_USD_MWH', thresholds.energy.PJM_LMP_THRESHOLD_USD_MWH],
    ['ERCOT_LMP_THRESHOLD_USD_MWH', thresholds.energy.ERCOT_LMP_THRESHOLD_USD_MWH],
    ['CAISO_LMP_THRESHOLD_USD_MWH', thresholds.energy.CAISO_LMP_THRESHOLD_USD_MWH]
  ] as const;
  for (const [name, t] of vals) {
    await sql`INSERT INTO signal_readings (signal_category, signal_name, reading_text, reading_date, threshold_breached, threshold_value, raw_payload)
      VALUES ('energy', ${name}, 'Phase1 placeholder until EIA series mapping configured', ${date}, FALSE, ${t}, '{}'::jsonb)
      ON CONFLICT (signal_name, reading_date) DO NOTHING`;
  }
  return vals.length;
}
