import { upsertSignalReading } from '@/lib/signals/readings';

const CLOUD_Q1_2026_READINGS = [
  { name: 'AWS_YOY_PCT', provider: 'AWS', growth: 28 },
  { name: 'AZURE_YOY_PCT', provider: 'Azure', growth: 40 },
  { name: 'GCP_YOY_PCT', provider: 'GCP', growth: 63 }
] as const;

export async function pollCloudSignals() {
  for (const signal of CLOUD_Q1_2026_READINGS) {
    await upsertSignalReading({
      name: signal.name,
      value: signal.growth,
      text: `${signal.provider} +${signal.growth}% Q1 2026 YoY growth`,
      readingDate: '2026-04-30',
      rawPayload: { seeded: true, provider: signal.provider, fiscalQuarter: 'Q1 2026' }
    });
  }
}
