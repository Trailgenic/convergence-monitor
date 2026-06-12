import { upsertSignalReading } from '@/lib/signals/readings';

export async function pollCapexSignals() {
  const date = '2026-06-10';

  await upsertSignalReading({
    category: 'capex',
    name: 'CAPEX_REVENUE_RATIO_EXPANSION',
    text: 'ORCL ~83% FY26 rising; META 54%, MSFT 47%, GOOGL 46%',
    readingDate: date,
    breached: true,
    rawPayload: {
      cadence: 'manual-entry quarterly',
      breachLogic: 'ratio rising QoQ at any tracked hyperscaler'
    }
  });

  await upsertSignalReading({
    category: 'demand_broadening',
    name: 'DEMAND_BROADENING_MANUAL_ENTRY',
    text: 'NVDA sovereign $30B+ FY26; AVGO 6 XPU customers, FY26 AI rev ~$56B (+180%)',
    readingDate: date,
    breached: false,
    rawPayload: {
      cadence: 'manual-entry quarterly',
      antiConvergence: true,
      aggregation: 'display only; never counts toward breach tally'
    }
  });
}
