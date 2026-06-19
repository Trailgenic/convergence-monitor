import assert from 'node:assert/strict';
import { evaluateEnergyHubReadings, redactEiaApiKey, resolveHubFromFacetOptions } from '../lib/signals/energy';

const now = new Date('2026-06-19T12:00:00.000Z');
const hub = { label: 'PJM West hub', threshold: 80 };

function dailyRows(values: number[], startDay = 18) {
  return values.map((price, index) => ({
    period: `2026-06-${String(startDay - index).padStart(2, '0')}`,
    price,
    location: 'PJM West',
    product: 'hub energy LMP'
  }));
}

const fiveOfTen = evaluateEnergyHubReadings(hub, dailyRows([90, 85, 82, 81, 80, 70, 60, 55, 50, 45]), now);
assert.equal(fiveOfTen.thresholdBreached, true);
assert.equal(fiveOfTen.daysAtOrAboveThreshold, 5);
assert.equal(fiveOfTen.dataStatus, 'ok');
assert.equal(fiveOfTen.readingValue, 90);
assert.match(fiveOfTen.readingText, /5\/10 days at\/above \$80\/MWh/);

const fourOfTen = evaluateEnergyHubReadings(hub, dailyRows([90, 85, 82, 81, 79, 70, 60, 55, 50, 45]), now);
assert.equal(fourOfTen.thresholdBreached, false);
assert.equal(fourOfTen.daysAtOrAboveThreshold, 4);
assert.equal(fourOfTen.dataStatus, 'ok');

const allInOnly = evaluateEnergyHubReadings(hub, [{ period: '2026-06-18', price: 125, product: 'all-in bundled wholesale price including capacity and transmission' }], now);
assert.equal(allInOnly.thresholdBreached, false);
assert.equal(allInOnly.dataStatus, 'stale');
assert.equal(allInOnly.unconfirmed, true);
assert.match(allInOnly.readingText, /all-in\/bundled/);

const staleRows = evaluateEnergyHubReadings(hub, [{ period: '2026-06-01', price: 90, product: 'hub energy LMP' }, ...dailyRows([85, 82, 81, 80, 70, 60, 55, 50, 45], 31)], now);
assert.equal(staleRows.dataStatus, 'stale');
assert.equal(staleRows.latestDate, '2026-06-01');
assert.equal(staleRows.thresholdBreached, true);

const resolvedPjm = resolveHubFromFacetOptions({ signalName: 'PJM_LMP_USD_MWH', label: 'PJM West hub', aliases: ['pjm west'], threshold: 80 }, 'location', [
  { id: 'PJM_WEST_CODE', name: 'PJM West' }
]);
assert.equal(resolvedPjm?.code, 'PJM_WEST_CODE');
assert.equal(resolvedPjm?.facet, 'location');

const resolvedCaiso = resolveHubFromFacetOptions({ signalName: 'CAISO_LMP_USD_MWH', label: 'CAISO NP15/SP15 hub', aliases: ['np15', 'sp15'], threshold: 100 }, 'respondent', [
  { id: 'NP15_CODE', name: 'NP15 EZ Gen DA LMP Peak' }
]);
assert.equal(resolvedCaiso?.code, 'NP15_CODE');

const redacted = redactEiaApiKey('https://api.eia.gov/v2/electricity/wholesale-prices/data?api_key=secret-key&frequency=daily&data[0]=price');
assert.equal(redacted.includes('secret-key'), false);
assert.equal(redacted.includes('api_key=REDACTED'), true);

console.log('energy EIA tests passed');
