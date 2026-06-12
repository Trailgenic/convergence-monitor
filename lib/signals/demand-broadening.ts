import { upsertSignalReading } from '@/lib/signals/readings';

export async function pollDemandBroadeningSignals() {
  await upsertSignalReading({
    name: 'DEMAND_BROADENING_MANUAL_ENTRY',
    text: 'NVDA sovereign $30B+ FY26; AVGO 6 XPU customers, FY26 AI rev ~$56B (+180%), FY27 $100B reiterated',
    readingDate: '2026-06-10',
    rawPayload: { seeded: true }
  });
}
