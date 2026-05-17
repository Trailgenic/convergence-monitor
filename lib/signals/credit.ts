import { sql } from '@/lib/db';
import { thresholds } from '@/lib/thresholds';

const fred = async (seriesId: string) => {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error('FRED_API_KEY missing');
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${key}&file_type=json&sort_order=desc&limit=20`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`FRED failed for ${seriesId}`);
  return (await res.json()).observations as Array<{ date: string; value: string }>;
};

export async function pollCreditSignals() {
  const hy = await fred('BAMLH0A0HYM2');
  const ig = await fred('BAMLC0A0CM');
  const delinq = await fred('DRCCLACBS');
  const date = hy[0].date;

  const hyNow = Number(hy[0].value), hyPrev = Number(hy[1].value), hy14 = Number(hy[14]?.value ?? hy[hy.length - 1].value);
  const igNow = Number(ig[0].value), ig14 = Number(ig[14]?.value ?? ig[ig.length - 1].value);
  const delinqNow = Number(delinq[0].value);

  const spread2wDelta = (hyNow - igNow) - (hy14 - ig14);
  const hySpike = hyNow - hyPrev;

  const records = [
    { name: 'IG_HY_SPREAD_2W_DELTA_BPS', value: spread2wDelta, threshold: thresholds.credit.IG_HY_SPREAD_2W_DELTA_BPS, breached: spread2wDelta > thresholds.credit.IG_HY_SPREAD_2W_DELTA_BPS },
    { name: 'CC_DELINQ_90D_THRESHOLD', value: delinqNow, threshold: thresholds.credit.CC_DELINQ_90D_THRESHOLD, breached: delinqNow > thresholds.credit.CC_DELINQ_90D_THRESHOLD },
    { name: 'HY_OAS_SPIKE_BPS', value: hySpike, threshold: thresholds.credit.HY_OAS_SPIKE_BPS, breached: hySpike > thresholds.credit.HY_OAS_SPIKE_BPS }
  ];

  for (const r of records) {
    await sql`INSERT INTO signal_readings (signal_category, signal_name, reading_value, reading_date, threshold_breached, threshold_value, raw_payload)
      VALUES ('credit', ${r.name}, ${r.value}, ${date}, ${r.breached}, ${r.threshold}, ${JSON.stringify({ hyNow, igNow, delinqNow })}::jsonb)
      ON CONFLICT (signal_name, reading_date) DO UPDATE SET reading_value = EXCLUDED.reading_value, threshold_breached = EXCLUDED.threshold_breached, raw_payload = EXCLUDED.raw_payload`;
  }

  return records;
}
