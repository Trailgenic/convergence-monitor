import { upsertSignalReading } from '@/lib/signals/readings';

export async function pollIpoSignals() {
  await upsertSignalReading({
    name: 'IPO_DAY_ONE_POP_PCT',
    value: 19.34,
    text: 'SpaceX (SPCX) day-one pop +19.34%',
    readingDate: '2026-06-12',
    rawPayload: { seeded: true, note: 'SPCX priced $135 6/11, closed $160.95; marginal — 0.66pp inside line' }
  });

  await upsertSignalReading({
    name: 'IPO_CALENDAR_TRACKING',
    text: 'Anthropic confidential S-1 2026-06-01; OpenAI confidential S-1 2026-06-08; SpaceX trading as SPCX from 2026-06-12',
    readingDate: '2026-06-12',
    rawPayload: { seeded: true }
  });
}
