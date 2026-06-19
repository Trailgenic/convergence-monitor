export type SignalCategory = 'credit' | 'capex' | 'cloud' | 'energy' | 'ipo' | 'rates' | 'demand_broadening';
export type SignalSource = 'fred' | 'manual' | 'computed';
export type SignalUnit = 'bps' | 'pct' | 'usd_mwh' | 'level' | 'text';
export type SignalDirection = 'above' | 'below';

const num = (k: string, d: number) => Number(process.env[k] ?? d);

export type SignalRegistryEntry = {
  category: SignalCategory;
  name: string;
  source: SignalSource;
  unit: SignalUnit;
  threshold: number | null;
  direction: SignalDirection | null;
  tallyEligible: boolean;
  displayOnly: boolean;
  notes: string;
};

export const signalRegistry = [
  {
    category: 'credit',
    name: 'IG_HY_SPREAD_2W_DELTA_BPS',
    source: 'computed',
    unit: 'bps',
    threshold: num('IG_HY_SPREAD_2W_DELTA_BPS', 50),
    direction: 'above',
    tallyEligible: true,
    displayOnly: false,
    notes: 'FRED-computed HY minus IG OAS 14d delta; raw FRED percentage-point deltas are normalized to bps.'
  },
  {
    category: 'credit',
    name: 'HY_OAS_SPIKE_BPS',
    source: 'computed',
    unit: 'bps',
    threshold: num('HY_OAS_SPIKE_BPS', 100),
    direction: 'above',
    tallyEligible: true,
    displayOnly: false,
    notes: 'FRED-computed max 1d HY OAS move over trailing 14d; raw FRED percentage-point deltas are normalized to bps.'
  },
  {
    category: 'credit',
    name: 'CC_DELINQ_90D_NYFED',
    source: 'manual',
    unit: 'pct',
    threshold: num('CC_DELINQ_90D_THRESHOLD', 14.0),
    direction: 'above',
    tallyEligible: true,
    displayOnly: false,
    notes: 'NY Fed account-based, Q1 2026; update quarterly from Household Debt & Credit report'
  },
  {
    category: 'credit',
    name: 'CC_DELINQ_DRCCLACBS_SENTINEL',
    source: 'fred',
    unit: 'pct',
    threshold: num('CC_DELINQ_DRCCLACBS_SENTINEL_THRESHOLD', 4.5),
    direction: 'above',
    tallyEligible: false,
    displayOnly: true,
    notes: 'automated sentinel between quarterly NY Fed updates; balance-based series, different scale'
  },
  {
    category: 'capex',
    name: 'CAPEX_REVENUE_RATIO_EXPANSION',
    source: 'manual',
    unit: 'text',
    threshold: null,
    direction: null,
    tallyEligible: true,
    displayOnly: false,
    notes: 'Manual-entry quarterly breach when capex/revenue ratio rises QoQ at any tracked hyperscaler.'
  },
  {
    category: 'cloud',
    name: 'AWS_YOY_PCT',
    source: 'manual',
    unit: 'pct',
    threshold: num('AWS_GROWTH_THRESHOLD_PCT', 20),
    direction: 'below',
    tallyEligible: true,
    displayOnly: false,
    notes: 'Manual Q1 2026 AWS YoY growth; breach on slowdown below threshold.'
  },
  {
    category: 'cloud',
    name: 'AZURE_YOY_PCT',
    source: 'manual',
    unit: 'pct',
    threshold: num('AZURE_GROWTH_THRESHOLD_PCT', 28),
    direction: 'below',
    tallyEligible: true,
    displayOnly: false,
    notes: 'Manual Q1 2026 Azure YoY growth; breach on slowdown below threshold.'
  },
  {
    category: 'cloud',
    name: 'GCP_YOY_PCT',
    source: 'manual',
    unit: 'pct',
    threshold: num('GCP_GROWTH_THRESHOLD_PCT', 30),
    direction: 'below',
    tallyEligible: true,
    displayOnly: false,
    notes: 'Manual Q1 2026 GCP YoY growth; breach on slowdown below threshold.'
  },
  {
    category: 'energy',
    name: 'ENERGY_STRESS_MANUAL_ENTRY',
    source: 'manual',
    unit: 'text',
    threshold: null,
    direction: null,
    tallyEligible: true,
    displayOnly: false,
    notes: 'Manual qualitative energy stress entry; replaces retired CAISO/ERCOT/PJM hub rows.'
  },
  {
    category: 'ipo',
    name: 'IPO_DAY_ONE_POP_PCT',
    source: 'manual',
    unit: 'pct',
    threshold: num('IPO_DAY_ONE_POP_THRESHOLD_PCT', 20),
    direction: 'below',
    tallyEligible: true,
    displayOnly: false,
    notes: 'Manual day-one IPO pop; clear at >=20%, flag at [18,20), breach below 18%, severe breach for broken issue <=0%.'
  },
  {
    category: 'ipo',
    name: 'IPO_CALENDAR_TRACKING',
    source: 'manual',
    unit: 'text',
    threshold: null,
    direction: null,
    tallyEligible: false,
    displayOnly: true,
    notes: 'Manual IPO calendar tracking display row.'
  },

  {
    category: 'rates',
    name: 'RATES_FOMC_HAWKISH_SHIFT',
    source: 'manual',
    unit: 'text',
    threshold: null,
    direction: null,
    tallyEligible: true,
    displayOnly: false,
    notes: 'Manual breach when the median year-end dot rises vs prior SEP or >= half of FOMC participants project a hike in the current calendar year.'
  },
  {
    category: 'rates',
    name: 'RATES_GUIDANCE_REGIME',
    source: 'manual',
    unit: 'text',
    threshold: null,
    direction: null,
    tallyEligible: false,
    displayOnly: true,
    notes: 'Display-only forward-guidance regime marker; never counts toward tally.'
  },
  {
    category: 'rates',
    name: 'RATES_MOVE_INDEX',
    source: 'manual',
    unit: 'level',
    threshold: num('RATES_MOVE_INDEX_THRESHOLD', 120),
    direction: 'above',
    tallyEligible: false,
    displayOnly: true,
    notes: 'Optional MOVE Index placeholder; display-only until a data source is wired.'
  },
  {
    category: 'demand_broadening',
    name: 'DEMAND_BROADENING_MANUAL_ENTRY',
    source: 'manual',
    unit: 'text',
    threshold: null,
    direction: null,
    tallyEligible: false,
    displayOnly: true,
    notes: 'Anti-convergence display-only manual entry; never counts toward tally.'
  }
] as const satisfies readonly SignalRegistryEntry[];

export type SignalName = (typeof signalRegistry)[number]['name'];

export function findSignal(name: SignalName | string): SignalRegistryEntry | undefined {
  return signalRegistry.find((entry) => entry.name === name);
}

export function getSignal(name: SignalName | string): SignalRegistryEntry {
  const signal = findSignal(name);
  if (!signal) throw new Error(`Unknown signal registry entry: ${name}`);
  return signal;
}
