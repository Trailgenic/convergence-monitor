import { thresholds } from '@/lib/thresholds';
import { upsertSignalReading } from '@/lib/signals/readings';

const fred = async (seriesId: string) => {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error('FRED_API_KEY missing');
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${key}&file_type=json&sort_order=desc&limit=20`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`FRED failed for ${seriesId}`);
  return (await res.json()).observations as Array<{ date: string; value: string }>;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function pollCreditSignals() {
  const hy = await fred('BAMLH0A0HYM2');
  const ig = await fred('BAMLC0A0CM');
  const delinq = await fred('DRCCLACBS');
  const date = hy[0].date;

  const hyNow = Number(hy[0].value), hyPrev = Number(hy[1].value), hy14 = Number(hy[14]?.value ?? hy[hy.length - 1].value);
  const igNow = Number(ig[0].value), ig14 = Number(ig[14]?.value ?? ig[ig.length - 1].value);
  const delinqNow = Number(delinq[0].value);

  const spread2wDeltaBps = round2(((hyNow - igNow) - (hy14 - ig14)) * 100);
  const hySpikeBps = round2((hyNow - hyPrev) * 100);
  const delinqPct = round2(delinqNow);

  const records = [
    { name: 'IG_HY_SPREAD_2W_DELTA_BPS', value: spread2wDeltaBps, text: `${spread2wDeltaBps.toFixed(2)} bps`, threshold: thresholds.credit.IG_HY_SPREAD_2W_DELTA_BPS, breached: spread2wDeltaBps > thresholds.credit.IG_HY_SPREAD_2W_DELTA_BPS },
    { name: 'CC_DELINQ_90D_THRESHOLD', value: delinqPct, text: `${delinqPct.toFixed(2)}%`, threshold: thresholds.credit.CC_DELINQ_90D_THRESHOLD, breached: delinqPct > thresholds.credit.CC_DELINQ_90D_THRESHOLD },
    { name: 'HY_OAS_SPIKE_BPS', value: hySpikeBps, text: `${hySpikeBps.toFixed(2)} bps`, threshold: thresholds.credit.HY_OAS_SPIKE_BPS, breached: hySpikeBps > thresholds.credit.HY_OAS_SPIKE_BPS }
  ];

  for (const r of records) {
    await upsertSignalReading({
      category: 'credit',
      name: r.name,
      value: r.value,
      text: r.text,
      readingDate: date,
      threshold: r.threshold,
      breached: r.breached,
      rawPayload: { hyNow, hyPrev, igNow, delinqNow, unit: r.name.includes('BPS') ? 'bps' : 'percent' }
    });
  }

  return records;
}
