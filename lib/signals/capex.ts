import { upsertSignalReading } from '@/lib/signals/readings';

export async function pollCapexSignals() {
  await upsertSignalReading({
    name: 'CAPEX_REVENUE_RATIO_EXPANSION',
    text: 'ORCL ~83% FY26 rising; META 54%, MSFT 47%, GOOGL 46%',
    readingDate: '2026-06-10',
    forcedBreached: true,
    rawPayload: { seeded: true }
  });
}
