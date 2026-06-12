import { thresholds } from '@/lib/thresholds';
import { upsertSignalReading } from '@/lib/signals/readings';

const CLOUD_Q1_2026_READINGS = [
  { name: 'AWS_GROWTH_Q1_2026_MANUAL_ENTRY', provider: 'AWS', growth: 28, threshold: thresholds.cloud.AWS_GROWTH_THRESHOLD_PCT },
  { name: 'AZURE_GROWTH_Q1_2026_MANUAL_ENTRY', provider: 'Azure', growth: 40, threshold: thresholds.cloud.AZURE_GROWTH_THRESHOLD_PCT },
  { name: 'GCP_GROWTH_Q1_2026_MANUAL_ENTRY', provider: 'GCP', growth: 63, threshold: thresholds.cloud.GCP_GROWTH_THRESHOLD_PCT }
] as const;

export async function pollCloudSignals() {
  const date = '2026-06-10';

  for (const signal of CLOUD_Q1_2026_READINGS) {
    await upsertSignalReading({
      category: 'cloud',
      name: signal.name,
      value: signal.growth,
      text: `${signal.provider} +${signal.growth}% Q1 2026 growth; no breach vs <${signal.threshold}% slowdown threshold`,
      readingDate: date,
      threshold: signal.threshold,
      breached: false,
      rawPayload: {
        provider: signal.provider,
        fiscalQuarter: 'Q1 2026',
        metric: 'year_over_year_growth_pct',
        breachLogic: `breach if growth falls below ${signal.threshold}%`
      }
    });
  }
}
