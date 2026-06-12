import { thresholds } from '@/lib/thresholds';
import { upsertSignalReading } from '@/lib/signals/readings';

const ENERGY_PLACEHOLDERS = [
  { name: 'PJM_WEST_LMP_USD_MWH', threshold: thresholds.energy.PJM_WEST_LMP_THRESHOLD_USD_MWH, sustainedDays: 5 },
  { name: 'ERCOT_NORTH_LMP_USD_MWH', threshold: thresholds.energy.ERCOT_NORTH_LMP_THRESHOLD_USD_MWH, sustainedDays: 5 },
  { name: 'CAISO_LMP_USD_MWH', threshold: thresholds.energy.CAISO_LMP_THRESHOLD_USD_MWH, sustainedDays: 5 }
] as const;

export async function pollEnergySignals() {
  const date = new Date().toISOString().slice(0, 10);
  const eiaConfigured = Boolean(process.env.EIA_API_KEY);

  for (const signal of ENERGY_PLACEHOLDERS) {
    await upsertSignalReading({
      category: 'energy',
      name: signal.name,
      text: 'Placeholder until EIA LMP series mapping configured',
      readingDate: date,
      breached: false,
      threshold: signal.threshold,
      rawPayload: {
        eiaApiKeyConfigured: eiaConfigured,
        thresholdUnit: 'USD/MWh',
        sustainedTradingDaysRequired: signal.sustainedDays
      }
    });
  }

  return ENERGY_PLACEHOLDERS.length;
}
