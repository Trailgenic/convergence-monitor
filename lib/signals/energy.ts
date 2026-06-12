import { upsertSignalReading } from '@/lib/signals/readings';

const ENERGY_PLACEHOLDERS = ['PJM_LMP_USD_MWH', 'ERCOT_LMP_USD_MWH', 'CAISO_LMP_USD_MWH'] as const;

export async function pollEnergySignals() {
  const date = new Date().toISOString().slice(0, 10);
  const eiaConfigured = Boolean(process.env.EIA_API_KEY);

  for (const name of ENERGY_PLACEHOLDERS) {
    await upsertSignalReading({
      name,
      text: 'Placeholder until EIA LMP series mapping configured',
      readingDate: date,
      rawPayload: {
        eiaApiKeyConfigured: eiaConfigured,
        placeholder: true,
        sustainedTradingDaysRequired: 5
      }
    });
  }

  return ENERGY_PLACEHOLDERS.length;
}
