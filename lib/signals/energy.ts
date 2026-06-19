import { upsertSignalReading } from '@/lib/signals/readings';
import type { BreachSeverity, DataStatus } from '@/lib/evaluator';

export const ENERGY_STRESS_SIGNAL = 'ENERGY_STRESS_MANUAL_ENTRY' as const;

export type EnergyManualEntryInput = {
  readingDate: string;
  text?: string | null;
  breached?: boolean;
  qualitativeSeverity?: BreachSeverity | null;
  dataStatus?: DataStatus | null;
};

export async function upsertEnergyManualEntry(input: EnergyManualEntryInput) {
  const hasManualText = Boolean(input.text?.trim());
  const dataStatus = input.dataStatus ?? (hasManualText ? 'ok' : 'unknown');

  return upsertSignalReading({
    name: ENERGY_STRESS_SIGNAL,
    text: input.text ?? 'Manual energy stress entry pending',
    readingDate: input.readingDate,
    forcedBreached: input.breached ?? false,
    qualitativeSeverity: input.qualitativeSeverity ?? 'weak',
    dataStatus,
    rawPayload: {
      manual: true,
      placeholder: dataStatus === 'unknown' || dataStatus === 'placeholder',
      unconfirmed: dataStatus === 'unknown' || dataStatus === 'placeholder',
      retiredHubRows: ['CAISO_LMP_USD_MWH', 'ERCOT_LMP_USD_MWH', 'PJM_LMP_USD_MWH']
    }
  });
}
