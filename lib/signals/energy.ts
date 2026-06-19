import { ensureSchema } from '@/lib/schema';
import { upsertSignalReading } from '@/lib/signals/readings';
import { getSignal } from '@/lib/signal-registry';
import type { DataStatus } from '@/lib/evaluator';

type EnergySignalName = 'PJM_LMP_USD_MWH' | 'ERCOT_LMP_USD_MWH' | 'CAISO_LMP_USD_MWH';
type EiaFacetName = 'location' | 'respondent';

type EnergyHubConfig = {
  signalName: EnergySignalName;
  label: string;
  aliases: string[];
  threshold: number;
};

type EiaFacetOption = {
  id?: string;
  name?: string;
  alias?: string;
  description?: string;
};

type EiaDataRow = Record<string, unknown>;

type EiaJson = { response?: { data?: unknown; facets?: unknown }; error?: unknown; message?: unknown; request?: unknown };

class EiaRequestError extends Error {
  constructor(readonly status: number, readonly redactedUrl: string, readonly body: unknown) {
    super(`EIA request failed ${status}: ${formatEiaErrorBody(body)}`);
  }
}

export type ResolvedEnergyHub = EnergyHubConfig & {
  facet: EiaFacetName;
  code: string;
  facetName: string;
};

export type EnergyHubEvaluation = {
  readingValue: number | null;
  thresholdBreached: boolean;
  dataStatus: DataStatus;
  readingText: string;
  latestDate: string | null;
  daysAtOrAboveThreshold: number;
  trailingValues: number[];
  unconfirmed: boolean;
};

const EIA_BASE_URL = 'https://api.eia.gov/v2/electricity/wholesale-prices';
const TRADING_DAY_WINDOW = 10;
const SUSTAINED_DAYS_REQUIRED = 5;
const STALE_AFTER_DAYS = 10;

const ENERGY_HUBS: EnergyHubConfig[] = [
  {
    signalName: 'PJM_LMP_USD_MWH',
    label: 'PJM West hub',
    aliases: ['pjm west', 'pjm western hub', 'pjm wh'],
    threshold: getSignal('PJM_LMP_USD_MWH').threshold ?? 80
  },
  {
    signalName: 'ERCOT_LMP_USD_MWH',
    label: 'ERCOT North hub',
    aliases: ['ercot north', 'north 345kv'],
    threshold: getSignal('ERCOT_LMP_USD_MWH').threshold ?? 80
  },
  {
    signalName: 'CAISO_LMP_USD_MWH',
    label: 'CAISO NP15/SP15 hub',
    aliases: ['np-15', 'np15', 'sp-15', 'sp15'],
    threshold: getSignal('CAISO_LMP_USD_MWH').threshold ?? 100
  }
];

function eiaUrl(path: string, apiKey: string, params: Record<string, string | number> = {}) {
  const url = new URL(`${EIA_BASE_URL}/${path}`);
  url.searchParams.set('api_key', apiKey);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  return url;
}

export function redactEiaApiKey(url: URL | string) {
  const redacted = new URL(String(url));
  if (redacted.searchParams.has('api_key')) redacted.searchParams.set('api_key', 'REDACTED');
  return redacted.toString();
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function formatEiaErrorBody(body: unknown) {
  return typeof body === 'string' ? body : JSON.stringify(body);
}

async function fetchEiaJson(url: URL): Promise<EiaJson> {
  const response = await fetch(url);
  const text = await response.text();
  const body = text ? safeJsonParse(text) : {};

  if (!response.ok) {
    const redactedUrl = redactEiaApiKey(url);
    console.error('[energy:eia] non-2xx response', { status: response.status, url: redactedUrl, body });
    throw new EiaRequestError(response.status, redactedUrl, body);
  }

  return body as EiaJson;
}

function responseArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function normalizeText(value: unknown) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function facetText(option: EiaFacetOption) {
  return normalizeText(`${option.id ?? ''} ${option.name ?? ''} ${option.alias ?? ''} ${option.description ?? ''}`);
}

function optionCode(option: EiaFacetOption) {
  return String(option.id ?? option.name ?? option.alias ?? '').trim();
}

export function resolveHubFromFacetOptions(hub: EnergyHubConfig, facet: EiaFacetName, options: EiaFacetOption[]): ResolvedEnergyHub | null {
  for (const alias of hub.aliases) {
    const normalizedAlias = normalizeText(alias);
    const match = options.find((option) => facetText(option).includes(normalizedAlias) && optionCode(option));
    if (match) {
      return { ...hub, facet, code: optionCode(match), facetName: String(match.name ?? match.alias ?? match.id ?? optionCode(match)) };
    }
  }

  return null;
}

function logFacetCandidates(facet: EiaFacetName, options: EiaFacetOption[]) {
  const candidates = options
    .filter((option) => ENERGY_HUBS.some((hub) => hub.aliases.some((alias) => facetText(option).includes(normalizeText(alias)))))
    .map((option) => ({ code: optionCode(option), name: option.name ?? option.alias ?? option.description ?? option.id }));
  console.log(`[energy:eia] ${facet} facet candidates`, { count: options.length, candidates });
}

export async function resolveEnergyHubs(apiKey: string): Promise<ResolvedEnergyHub[]> {
  const facetEntries = await Promise.all((['location', 'respondent'] as const).map(async (facet) => {
    const json = await fetchEiaJson(eiaUrl(`facet/${facet}`, apiKey));
    const options = responseArray(json.response?.facets ?? json.response?.data) as EiaFacetOption[];
    logFacetCandidates(facet, options);
    return [facet, options] as const;
  }));
  const facets = new Map<EiaFacetName, EiaFacetOption[]>(facetEntries);

  return ENERGY_HUBS.map((hub) => {
    const resolved = resolveHubFromFacetOptions(hub, 'location', facets.get('location') ?? [])
      ?? resolveHubFromFacetOptions(hub, 'respondent', facets.get('respondent') ?? []);
    if (!resolved) throw new Error(`Unable to resolve EIA wholesale-prices facet code for ${hub.label}`);
    console.log(`[energy:eia] resolved ${hub.signalName} ${hub.label}: ${resolved.facet}=${resolved.code} (${resolved.facetName})`);
    return resolved;
  });
}

function rowPeriod(row: EiaDataRow) {
  return String(row.period ?? row.date ?? row.datetime ?? '').slice(0, 10);
}

function rowPrice(row: EiaDataRow) {
  const value = row.price ?? row.value;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function rowDescriptor(row: EiaDataRow) {
  return normalizeText(Object.entries(row).map(([key, value]) => `${key} ${String(value ?? '')}`).join(' '));
}

function isAllInOrBundled(row: EiaDataRow) {
  return /all in|all-in|bundled|capacity|transmission/.test(rowDescriptor(row));
}

function daysBetween(now: Date, date: string) {
  const timestamp = new Date(`${date}T00:00:00.000Z`).getTime();
  if (Number.isNaN(timestamp)) return Number.POSITIVE_INFINITY;
  return (now.getTime() - timestamp) / (24 * 60 * 60 * 1000);
}

export function evaluateEnergyHubReadings(hub: Pick<ResolvedEnergyHub, 'label' | 'threshold'>, rows: EiaDataRow[], now = new Date()): EnergyHubEvaluation {
  if (rows.length === 0) {
    return {
      readingValue: null,
      thresholdBreached: false,
      dataStatus: 'placeholder',
      readingText: `${hub.label}: no EIA hub LMP rows returned; breach unconfirmed`,
      latestDate: null,
      daysAtOrAboveThreshold: 0,
      trailingValues: [],
      unconfirmed: true
    };
  }

  if (rows.every(isAllInOrBundled)) {
    const latestDate = rowPeriod(rows[0]) || null;
    return {
      readingValue: null,
      thresholdBreached: false,
      dataStatus: 'stale',
      readingText: `${hub.label}: EIA returned only all-in/bundled wholesale data; hub energy LMP breach unconfirmed${latestDate ? `; latest print ${latestDate}` : ''}`,
      latestDate,
      daysAtOrAboveThreshold: 0,
      trailingValues: [],
      unconfirmed: true
    };
  }

  const lmpRows = rows.filter((row) => !isAllInOrBundled(row) && rowPrice(row) !== null && rowPeriod(row));
  if (lmpRows.length === 0) {
    return {
      readingValue: null,
      thresholdBreached: false,
      dataStatus: 'placeholder',
      readingText: `${hub.label}: no usable EIA hub energy LMP rows returned; breach unconfirmed`,
      latestDate: null,
      daysAtOrAboveThreshold: 0,
      trailingValues: [],
      unconfirmed: true
    };
  }

  const trailing = lmpRows.slice(0, TRADING_DAY_WINDOW);
  const trailingValues = trailing.map((row) => rowPrice(row)).filter((value): value is number => value !== null);
  const latestDate = rowPeriod(trailing[0]);
  const latestValue = rowPrice(trailing[0]);
  const daysAtOrAboveThreshold = trailingValues.filter((value) => value >= hub.threshold).length;
  const dataStatus: DataStatus = latestDate && daysBetween(now, latestDate) > STALE_AFTER_DAYS ? 'stale' : 'ok';

  return {
    readingValue: latestValue,
    thresholdBreached: daysAtOrAboveThreshold >= SUSTAINED_DAYS_REQUIRED,
    dataStatus,
    readingText: `${hub.label}: latest LMP $${latestValue?.toFixed(2) ?? 'N/A'}/MWh; ${daysAtOrAboveThreshold}/${Math.min(TRADING_DAY_WINDOW, trailingValues.length)} days at/above $${hub.threshold}/MWh; latest print ${latestDate}`,
    latestDate,
    daysAtOrAboveThreshold,
    trailingValues,
    unconfirmed: false
  };
}

async function fetchHubRows(apiKey: string, hub: ResolvedEnergyHub) {
  const url = eiaUrl('data', apiKey, {
    frequency: 'daily',
    'data[0]': 'price',
    [`facets[${hub.facet}][]`]: hub.code,
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    length: 25
  });
  const json = await fetchEiaJson(url);
  return responseArray(json.response?.data) as EiaDataRow[];
}

function eiaFailureReadingText(hub: EnergyHubConfig, error: unknown) {
  if (error instanceof EiaRequestError) return `${hub.label}: EIA request failed ${error.status}; breach unconfirmed; ${formatEiaErrorBody(error.body)}`;
  return `${hub.label}: EIA request failed; breach unconfirmed; ${error instanceof Error ? error.message : String(error)}`;
}

async function writeDegradedEnergyReading(hub: EnergyHubConfig, date: string, error: unknown) {
  await upsertSignalReading({
    name: hub.signalName,
    text: eiaFailureReadingText(hub, error),
    readingDate: date,
    forcedBreached: false,
    dataStatus: 'stale',
    rawPayload: {
      eiaError: error instanceof EiaRequestError ? error.body : error instanceof Error ? error.message : String(error),
      eiaStatus: error instanceof EiaRequestError ? error.status : null,
      eiaUrl: error instanceof EiaRequestError ? error.redactedUrl : null,
      unconfirmed: true,
      sustainedTradingDaysRequired: SUSTAINED_DAYS_REQUIRED
    }
  });
}

export async function pollEnergySignals() {
  await ensureSchema();

  const date = new Date().toISOString().slice(0, 10);
  const apiKey = process.env.EIA_API_KEY;

  if (!apiKey) {
    for (const hub of ENERGY_HUBS) {
      await upsertSignalReading({
        name: hub.signalName,
        text: 'Placeholder until EIA_API_KEY is configured',
        readingDate: date,
        dataStatus: 'placeholder',
        rawPayload: { placeholder: true, eiaApiKeyConfigured: false, sustainedTradingDaysRequired: SUSTAINED_DAYS_REQUIRED }
      });
    }
    return ENERGY_HUBS.length;
  }

  let hubs: ResolvedEnergyHub[];
  try {
    hubs = await resolveEnergyHubs(apiKey);
  } catch (error) {
    console.error('[energy:eia] failed to resolve energy hub facets; writing degraded energy readings', error);
    for (const hub of ENERGY_HUBS) await writeDegradedEnergyReading(hub, date, error);
    return ENERGY_HUBS.length;
  }

  for (const hub of hubs) {
    let rows: EiaDataRow[];
    try {
      rows = await fetchHubRows(apiKey, hub);
    } catch (error) {
      console.error(`[energy:eia] failed to fetch ${hub.signalName}; writing degraded energy reading`, error);
      await writeDegradedEnergyReading(hub, date, error);
      continue;
    }

    const evaluation = evaluateEnergyHubReadings(hub, rows);
    await upsertSignalReading({
      name: hub.signalName,
      value: evaluation.readingValue,
      text: evaluation.readingText,
      readingDate: date,
      forcedBreached: evaluation.thresholdBreached,
      dataStatus: evaluation.dataStatus,
      rawPayload: {
        eiaFacet: hub.facet,
        eiaFacetCode: hub.code,
        eiaFacetName: hub.facetName,
        latestPrintDate: evaluation.latestDate,
        daysAtOrAboveThreshold: evaluation.daysAtOrAboveThreshold,
        trailingTradingDays: evaluation.trailingValues.length,
        sustainedTradingDaysRequired: SUSTAINED_DAYS_REQUIRED,
        unconfirmed: evaluation.unconfirmed,
        placeholder: evaluation.dataStatus === 'placeholder'
      }
    });
  }

  return hubs.length;
}
