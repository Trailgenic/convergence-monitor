import assert from 'node:assert/strict';
import { evaluateSignal } from '../lib/evaluator';
import { aggregateAlertDispatch, aggregateConvergence } from '../lib/aggregation';
import { getSignal } from '../lib/signal-registry';

const hySpike = getSignal('HY_OAS_SPIKE_BPS');
assert.deepEqual(evaluateSignal(hySpike, { value: 3.30 - 2.75 }), { normalizedValue: 55, breached: false });
assert.deepEqual(evaluateSignal(hySpike, { value: 3.80 - 2.75 }), { normalizedValue: 105, breached: true });

const igHy = getSignal('IG_HY_SPREAD_2W_DELTA_BPS');
assert.deepEqual(evaluateSignal(igHy, { value: 0.05 }), { normalizedValue: 5, breached: false });

const ipo = getSignal('IPO_DAY_ONE_POP_PCT');
assert.deepEqual(evaluateSignal(ipo, { value: 19.34 }), { normalizedValue: 19.34, breached: true });
assert.deepEqual(evaluateSignal(ipo, { value: 21.0 }), { normalizedValue: 21, breached: false });

const seededState = [
  { signal_category: 'capex', signal_name: 'CAPEX_REVENUE_RATIO_EXPANSION', reading_value: null, threshold_breached: true, raw_payload: { seeded: true, unit: 'text' } },
  { signal_category: 'ipo', signal_name: 'IPO_DAY_ONE_POP_PCT', reading_value: 19.34, threshold_breached: true, raw_payload: { seeded: true, unit: 'pct' } },
  { signal_category: 'cloud', signal_name: 'AWS_YOY_PCT', reading_value: 28, threshold_breached: false, raw_payload: { seeded: true, unit: 'pct' } },
  { signal_category: 'credit', signal_name: 'CC_DELINQ_90D_NYFED', reading_value: 13.12, threshold_breached: false, raw_payload: { seeded: true, unit: 'pct' } },
  { signal_category: 'energy', signal_name: 'PJM_LMP_USD_MWH', reading_value: null, threshold_breached: false, raw_payload: { placeholder: true, unit: 'usd_mwh' } },
  { signal_category: 'demand_broadening', signal_name: 'DEMAND_BROADENING_MANUAL_ENTRY', reading_value: null, threshold_breached: true, raw_payload: { seeded: true, unit: 'text' } },
  { signal_category: 'ipo', signal_name: 'IPO_CALENDAR_TRACKING', reading_value: null, threshold_breached: true, raw_payload: { seeded: true, unit: 'text' } }
];

const aggregate = aggregateConvergence(seededState);
assert.equal(aggregate.status, 'Warning');
assert.deepEqual(aggregate.tallyCategories.sort(), ['capex', 'ipo']);

const dispatchAggregate = aggregateAlertDispatch(seededState);
assert.equal(dispatchAggregate.status, 'Quiet');
assert.equal(dispatchAggregate.tallyRows.length, 0);

console.log('evaluator acceptance tests passed');
