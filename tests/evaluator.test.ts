import assert from 'node:assert/strict';
import { evaluateSignal } from '../lib/evaluator';
import { aggregateAlertDispatch, aggregateConvergence } from '../lib/aggregation';
import { getSignal } from '../lib/signal-registry';
import { formatLastReading, formatSignalState, isRegistrySignal } from '../lib/dashboard-format';

const today = new Date().toISOString().slice(0, 10);

const hySpike = getSignal('HY_OAS_SPIKE_BPS');
assert.deepEqual(evaluateSignal(hySpike, { value: 3.30 - 2.75 }), { normalizedValue: 55, breached: false, state: 'clear', severe: false, severity: null });
assert.deepEqual(evaluateSignal(hySpike, { value: 3.80 - 2.75 }), { normalizedValue: 105, breached: true, state: 'breach', severe: false, severity: 'weak' });

const igHy = getSignal('IG_HY_SPREAD_2W_DELTA_BPS');
assert.deepEqual(evaluateSignal(igHy, { value: 0.05 }), { normalizedValue: 5, breached: false, state: 'clear', severe: false, severity: null });

const ipo = getSignal('IPO_DAY_ONE_POP_PCT');
assert.deepEqual(evaluateSignal(ipo, { value: 19.34 }), { normalizedValue: 19.34, breached: false, state: 'flag', severe: false, severity: null });
assert.deepEqual(evaluateSignal(ipo, { value: 17.0 }), { normalizedValue: 17, breached: true, state: 'breach', severe: false, severity: 'weak' });
assert.deepEqual(evaluateSignal(ipo, { value: -5 }), { normalizedValue: -5, breached: true, state: 'breach', severe: true, severity: 'severe' });
assert.deepEqual(evaluateSignal(ipo, { value: 22 }), { normalizedValue: 22, breached: false, state: 'clear', severe: false, severity: null });

const seededState = [
  { signal_category: 'capex', signal_name: 'CAPEX_REVENUE_RATIO_EXPANSION', reading_value: null, reading_text: 'ORCL ~83% FY26 rising; META 54%, MSFT 47%, GOOGL 46%', reading_date: today, threshold_breached: true, qualitative_severity: 'weak' as const, data_status: 'ok' as const, raw_payload: { seeded: true, unit: 'text', state: 'breach' } },
  { signal_category: 'rates', signal_name: 'RATES_FOMC_HAWKISH_SHIFT', reading_value: null, reading_text: '2026-06-17 Warsh FOMC: held 3.50-3.75% unanimous; last 2026 cut eliminated; 9 of 18 project a hike; dot withheld', reading_date: today, threshold_breached: true, data_status: 'ok' as const, raw_payload: { seeded: true, unit: 'text', state: 'breach' } },
  { signal_category: 'rates', signal_name: 'RATES_GUIDANCE_REGIME', reading_value: null, reading_text: 'Forward guidance withheld / presser cadence reduced — uncertainty premium ON', reading_date: today, threshold_breached: false, data_status: 'ok' as const, raw_payload: { seeded: true, unit: 'text', state: 'clear' } },
  { signal_category: 'rates', signal_name: 'RATES_MOVE_INDEX', reading_value: null, reading_text: 'Placeholder until MOVE Index data source is wired', reading_date: today, threshold_breached: false, data_status: 'placeholder' as const, raw_payload: { placeholder: true, unit: 'level', state: 'clear' } },
  { signal_category: 'ipo', signal_name: 'IPO_DAY_ONE_POP_PCT', reading_value: 19.34, reading_text: 'SpaceX (SPCX) day-one pop +19.34%', reading_date: today, threshold_breached: false, data_status: 'ok' as const, raw_payload: { seeded: true, unit: 'pct', state: 'flag' } },
  { signal_category: 'cloud', signal_name: 'AWS_YOY_PCT', reading_value: 28, reading_text: 'AWS +28% Q1 2026 YoY growth', reading_date: today, threshold_breached: false, data_status: 'ok' as const, raw_payload: { seeded: true, unit: 'pct', state: 'clear' } },
  { signal_category: 'credit', signal_name: 'CC_DELINQ_90D_NYFED', reading_value: 13.12, reading_text: 'NY Fed account-based, Q1 2026', reading_date: today, threshold_breached: false, data_status: 'ok' as const, raw_payload: { seeded: true, unit: 'pct', state: 'clear' } },
  { signal_category: 'energy', signal_name: 'ENERGY_STRESS_MANUAL_ENTRY', reading_value: null, reading_text: 'Manual energy stress entry pending', reading_date: today, threshold_breached: false, qualitative_severity: 'weak' as const, data_status: 'unknown' as const, raw_payload: { manual: true, placeholder: true, unconfirmed: true, unit: 'text', state: 'clear' } },
  { signal_category: 'demand_broadening', signal_name: 'DEMAND_BROADENING_MANUAL_ENTRY', reading_value: null, reading_text: 'NVDA sovereign $30B+ FY26; AVGO 6 XPU customers', reading_date: today, threshold_breached: false, data_status: 'ok' as const, raw_payload: { seeded: true, unit: 'text', state: 'clear' } },
  { signal_category: 'ipo', signal_name: 'IPO_CALENDAR_TRACKING', reading_value: null, reading_text: 'Anthropic confidential S-1 2026-06-01', reading_date: today, threshold_breached: false, data_status: 'ok' as const, raw_payload: { seeded: true, unit: 'text', state: 'clear' } },
  { signal_category: 'credit', signal_name: 'CC_DELINQ_90D_THRESHOLD', reading_value: 14.2, reading_text: 'retired row', reading_date: today, threshold_breached: true, data_status: 'ok' as const, raw_payload: { unit: 'pct' } }
];

const dashboardRows = seededState.filter((row) => isRegistrySignal(row.signal_name));
assert.equal(dashboardRows.some((row) => row.signal_name === 'CAPEX_REVENUE_RATIO_EXPANSION' && row.threshold_breached), true);
assert.equal(dashboardRows.some((row) => row.signal_name === 'RATES_FOMC_HAWKISH_SHIFT' && row.threshold_breached), true);
assert.equal(dashboardRows.some((row) => row.signal_name === 'RATES_GUIDANCE_REGIME'), true);
assert.equal(dashboardRows.some((row) => row.signal_name === 'RATES_MOVE_INDEX'), true);
assert.equal(dashboardRows.some((row) => row.signal_name === 'DEMAND_BROADENING_MANUAL_ENTRY'), true);
assert.equal(dashboardRows.some((row) => row.signal_name === 'CC_DELINQ_90D_THRESHOLD'), false);
assert.equal(isRegistrySignal('CAISO_LMP_USD_MWH'), false);
assert.equal(isRegistrySignal('ERCOT_LMP_USD_MWH'), false);
assert.equal(isRegistrySignal('PJM_LMP_USD_MWH'), false);
assert.equal(isRegistrySignal('ENERGY_STRESS_MANUAL_ENTRY'), true);
assert.equal(formatLastReading(dashboardRows.find((row) => row.signal_name === 'CC_DELINQ_90D_NYFED')!), '13.12% — NY Fed account-based, Q1 2026');
assert.equal(formatLastReading(dashboardRows.find((row) => row.signal_name === 'IPO_DAY_ONE_POP_PCT')!), '19.34% — SpaceX (SPCX) day-one pop +19.34%');
assert.equal(formatSignalState(dashboardRows.find((row) => row.signal_name === 'IPO_DAY_ONE_POP_PCT')!), 'Flag');
assert.equal(formatSignalState(dashboardRows.find((row) => row.signal_name === 'ENERGY_STRESS_MANUAL_ENTRY')!), 'unknown');
assert.notEqual(formatSignalState(dashboardRows.find((row) => row.signal_name === 'ENERGY_STRESS_MANUAL_ENTRY')!), 'No');

const aggregate = aggregateConvergence(dashboardRows);
assert.equal(aggregate.status, 'Warning');
assert.match(aggregate.statusRationale, /all weak\/qualitative/);
assert.deepEqual(aggregate.tallyCategories.sort(), ['capex', 'rates']);
assert.deepEqual(aggregate.tallyRows.map((row) => row.signal_name).sort(), ['CAPEX_REVENUE_RATIO_EXPANSION', 'RATES_FOMC_HAWKISH_SHIFT']);
assert.deepEqual(aggregate.unknownTallyCategories, ['energy']);
assert.equal(aggregate.categoryEvaluations.find((category) => category.category === 'energy')?.state, 'unknown');
assert.match(aggregate.coverageLine, /1 tally-eligible categories UNKNOWN .*\[energy\]/);

assert.equal(aggregateConvergence([{ signal_category: 'credit', signal_name: 'HY_OAS_SPIKE_BPS', reading_value: 151, reading_text: null, reading_date: today, threshold_breached: true, data_status: 'ok' }]).status, 'Convergence Firing');
assert.equal(aggregateConvergence([{ signal_category: 'credit', signal_name: 'HY_OAS_SPIKE_BPS', reading_value: 126, reading_text: null, reading_date: today, threshold_breached: true, data_status: 'ok' }, { signal_category: 'cloud', signal_name: 'AWS_YOY_PCT', reading_value: 19, reading_text: null, reading_date: today, threshold_breached: true, data_status: 'ok' }]).status, 'Convergence Firing');
assert.equal(aggregateConvergence([{ signal_category: 'credit', signal_name: 'HY_OAS_SPIKE_BPS', reading_value: 105, reading_text: null, reading_date: today, threshold_breached: true, data_status: 'ok' }]).status, 'Watch');
assert.equal(aggregateConvergence([{ signal_category: 'credit', signal_name: 'HY_OAS_SPIKE_BPS', reading_value: 50, reading_text: null, reading_date: today, threshold_breached: false, data_status: 'ok' }]).status, 'Quiet');
assert.equal(aggregateConvergence([{ signal_category: 'demand_broadening', signal_name: 'DEMAND_BROADENING_MANUAL_ENTRY', reading_value: null, reading_text: 'manual collapse', reading_date: today, threshold_breached: false, data_status: 'ok', raw_payload: { collapse: true } }]).status, 'Convergence Firing');

const manualEnergyBreachAggregate = aggregateConvergence([
  { signal_category: 'energy', signal_name: 'ENERGY_STRESS_MANUAL_ENTRY', reading_value: null, reading_text: 'Manual energy stress breach', reading_date: today, threshold_breached: true, qualitative_severity: 'moderate' as const, data_status: 'ok' as const, raw_payload: { manual: true, unit: 'text', state: 'breach' } }
]);
assert.equal(manualEnergyBreachAggregate.status, 'Watch');
assert.deepEqual(manualEnergyBreachAggregate.tallyCategories, ['energy']);

const ratesWithPlaceholderMove = dashboardRows.filter((row) => row.signal_category === 'rates');
const ratesAggregate = aggregateConvergence(ratesWithPlaceholderMove);
assert.equal(ratesAggregate.status, 'Watch');
assert.deepEqual(ratesAggregate.tallyRows.map((row) => row.signal_name), ['RATES_FOMC_HAWKISH_SHIFT']);

const dispatchAggregate = aggregateAlertDispatch(dashboardRows);
assert.equal(dispatchAggregate.status, 'Quiet');
assert.equal(dispatchAggregate.tallyRows.length, 0);

console.log('evaluator acceptance tests passed');
