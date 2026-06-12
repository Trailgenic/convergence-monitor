import { upsertSignalReading } from '@/lib/signals/readings';

const fred = async (seriesId: string) => {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error('FRED_API_KEY missing');
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${key}&file_type=json&sort_order=desc&limit=20`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`FRED failed for ${seriesId}`);
  return (await res.json()).observations as Array<{ date: string; value: string }>;
};

function maxOneDayMove(values: number[]) {
  let maxMove = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < values.length - 1; i += 1) {
    maxMove = Math.max(maxMove, values[i] - values[i + 1]);
  }
  return maxMove;
}

export async function pollCreditSignals() {
  const hy = await fred('BAMLH0A0HYM2');
  const ig = await fred('BAMLC0A0CM');
  const delinq = await fred('DRCCLACBS');
  const date = hy[0].date;

  const hyValues = hy.slice(0, 15).map((row) => Number(row.value));
  const igValues = ig.slice(0, 15).map((row) => Number(row.value));
  const hyNow = hyValues[0], hy14 = hyValues[14] ?? hyValues[hyValues.length - 1];
  const igNow = igValues[0], ig14 = igValues[14] ?? igValues[igValues.length - 1];
  const delinqNow = Number(delinq[0].value);

  const records = [
    await upsertSignalReading({
      name: 'IG_HY_SPREAD_2W_DELTA_BPS',
      value: (hyNow - igNow) - (hy14 - ig14),
      text: 'FRED HY minus IG OAS 14d delta',
      readingDate: date,
      rawPayload: { hyNow, hy14, igNow, ig14, rawUnit: 'percentage_points' }
    }),
    await upsertSignalReading({
      name: 'HY_OAS_SPIKE_BPS',
      value: maxOneDayMove(hyValues),
      text: 'FRED max 1d HY OAS move over trailing 14d',
      readingDate: date,
      rawPayload: { hyValues, rawUnit: 'percentage_points' }
    }),
    await upsertSignalReading({
      name: 'CC_DELINQ_DRCCLACBS_SENTINEL',
      value: delinqNow,
      text: `${delinqNow}% DRCCLACBS sentinel`,
      readingDate: delinq[0].date,
      rawPayload: { rawUnit: 'percent', seriesId: 'DRCCLACBS' }
    })
  ];

  await upsertSignalReading({
    name: 'CC_DELINQ_90D_NYFED',
    value: 13.12,
    text: 'NY Fed account-based, Q1 2026; update quarterly from Household Debt & Credit report',
    readingDate: '2026-03-31',
    rawPayload: { seeded: true, note: 'NY Fed account-based, Q1 2026; update quarterly from Household Debt & Credit report' }
  });

  return records;
}
