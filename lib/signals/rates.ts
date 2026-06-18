import { upsertSignalReading } from '@/lib/signals/readings';

export async function pollRatesSignals() {
  await upsertSignalReading({
    name: 'RATES_FOMC_HAWKISH_SHIFT',
    text: '2026-06-17 Warsh FOMC: held 3.50-3.75% unanimous; last 2026 cut eliminated; 9 of 18 project a hike; dot withheld',
    readingDate: '2026-06-17',
    forcedBreached: true,
    rawPayload: { seeded: true }
  });

  await upsertSignalReading({
    name: 'RATES_GUIDANCE_REGIME',
    text: 'Forward guidance withheld / presser cadence reduced — uncertainty premium ON',
    readingDate: '2026-06-17',
    rawPayload: { seeded: true }
  });

  await upsertSignalReading({
    name: 'RATES_MOVE_INDEX',
    text: 'Placeholder until MOVE Index data source is wired',
    readingDate: '2026-06-17',
    rawPayload: { placeholder: true }
  });
}
