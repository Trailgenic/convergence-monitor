const num = (k: string, d: number) => Number(process.env[k] ?? d);

export const thresholds = {
  credit: {
    IG_HY_SPREAD_2W_DELTA_BPS: num('IG_HY_SPREAD_2W_DELTA_BPS', 50),
    CC_DELINQ_90D_THRESHOLD: num('CC_DELINQ_90D_THRESHOLD', 14.0),
    // FRED BAMLH0A0HYM2 is published in percentage points; pollCreditSignals converts daily deltas to basis points before comparing to this bps threshold.
    HY_OAS_SPIKE_BPS: num('HY_OAS_SPIKE_BPS', 100)
  },
  cloud: {
    AWS_GROWTH_THRESHOLD_PCT: num('AWS_GROWTH_THRESHOLD_PCT', 20),
    AZURE_GROWTH_THRESHOLD_PCT: num('AZURE_GROWTH_THRESHOLD_PCT', 28),
    GCP_GROWTH_THRESHOLD_PCT: num('GCP_GROWTH_THRESHOLD_PCT', 30),
    CONCENTRATION_DELTA_PCT: 5
  }
};
