import assert from 'node:assert/strict';
import { dashboardApiStatusCode, loadDashboardData, resetLastSuccessfulDashboardReadForTests } from '../lib/dashboard-data';

const today = new Date().toISOString().slice(0, 10);

function queryText(strings: TemplateStringsArray) {
  return strings.join('?');
}

const populatedRows = [
  { signal_category: 'capex', signal_name: 'CAPEX_REVENUE_RATIO_EXPANSION', reading_value: null, reading_text: 'capex breach', threshold_value: null, reading_date: today, threshold_breached: true, qualitative_severity: 'weak' as const, data_status: 'ok' as const, raw_payload: { unit: 'text', state: 'breach' } },
  { signal_category: 'rates', signal_name: 'RATES_FOMC_HAWKISH_SHIFT', reading_value: null, reading_text: 'rates breach', threshold_value: null, reading_date: today, threshold_breached: true, qualitative_severity: 'weak' as const, data_status: 'ok' as const, raw_payload: { unit: 'text', state: 'breach' } },
  { signal_category: 'energy', signal_name: 'PJM_LMP_USD_MWH', reading_value: 50, reading_text: 'wired energy', threshold_value: 80, reading_date: today, threshold_breached: false, qualitative_severity: 'weak' as const, data_status: 'ok' as const, raw_payload: { unit: 'usd_mwh', state: 'clear' } }
];

async function main() {
resetLastSuccessfulDashboardReadForTests();
let ensureCalled = false;
const freshDbData = await loadDashboardData({
  ensureSchema: async () => { ensureCalled = true; },
  now: () => new Date('2026-06-19T12:00:00.000Z'),
  query: async (strings) => {
    const text = queryText(strings);
    if (text.includes('DISTINCT ON')) return { rows: populatedRows };
    if (text.includes('convergence_events')) return { rows: [] };
    if (text.includes('COUNT')) return { rows: [{ count: 0 }] };
    return { rows: [] };
  }
});
assert.equal(ensureCalled, true);
assert.equal(freshDbData.unavailable, false);
assert.equal(freshDbData.status, 'Warning');
assert.equal(freshDbData.latestByCategory.length, 3);
assert.equal(dashboardApiStatusCode(freshDbData), 200);

resetLastSuccessfulDashboardReadForTests();
const dbErrorData = await loadDashboardData({
  ensureSchema: async () => undefined,
  query: async (strings) => {
    if (queryText(strings).includes('DISTINCT ON')) {
      const err = new Error('column data_status does not exist') as Error & { code: string };
      err.code = '42703';
      throw err;
    }
    return { rows: [] };
  }
});
assert.equal(dbErrorData.unavailable, true);
assert.equal(dbErrorData.status, 'ERROR/UNKNOWN');
assert.notEqual(dbErrorData.status, 'Quiet');
assert.match(dbErrorData.statusRationale, /Dashboard data unavailable — last successful read: never/);
assert.notEqual(dashboardApiStatusCode(dbErrorData), 200);
assert.equal(dashboardApiStatusCode(dbErrorData), 503);

resetLastSuccessfulDashboardReadForTests();
const emptyData = await loadDashboardData({
  ensureSchema: async () => undefined,
  query: async (strings) => queryText(strings).includes('DISTINCT ON') ? { rows: [] } : { rows: [] }
});
assert.equal(emptyData.unavailable, true);
assert.equal(emptyData.status, 'ERROR/UNKNOWN');
assert.notEqual(emptyData.status, 'Quiet');
assert.equal(dashboardApiStatusCode(emptyData), 503);

console.log('dashboard data failure-open tests passed');
}

main().catch((error) => { console.error(error); process.exit(1); });
