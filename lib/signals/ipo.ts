import { upsertSignalReading } from '@/lib/signals/readings';

export async function pollIpoSignals() {
  await upsertSignalReading({
    category: 'ipo',
    name: 'IPO_DAY_ONE_POP_SPACE_X_SPCX',
    value: 19.34,
    text: 'SpaceX (SPCX) priced 2026-06-11 at $135; first trade 2026-06-12; day-one close $160.95; pop +19.34% vs <20% threshold; marginal — 0.66pp inside threshold; pending v1.3 scoring decision',
    readingDate: '2026-06-12',
    threshold: 20,
    breached: true,
    rawPayload: {
      issuer: 'SpaceX',
      ticker: 'SPCX',
      pricedDate: '2026-06-11',
      offerPriceUsd: 135,
      firstTradeDate: '2026-06-12',
      dayOneCloseUsd: 160.95,
      dayOnePopPct: 19.34,
      flag: 'marginal — 0.66pp inside threshold; pending v1.3 scoring decision',
      calendarNotes: [
        { issuer: 'Anthropic', filing: 'confidential S-1', filingDate: '2026-06-01', breach: false },
        { issuer: 'OpenAI', filing: 'confidential S-1', filingDate: '2026-06-08', breach: false }
      ]
    }
  });
}
