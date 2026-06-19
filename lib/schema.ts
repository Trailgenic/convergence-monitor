import { sql } from '@vercel/postgres';

export async function ensureSchema() {
  await sql`CREATE TABLE IF NOT EXISTS signal_readings (
    id SERIAL PRIMARY KEY,
    signal_category TEXT NOT NULL,
    signal_name TEXT NOT NULL,
    reading_value NUMERIC,
    reading_text TEXT,
    reading_date DATE NOT NULL,
    threshold_breached BOOLEAN DEFAULT FALSE,
    threshold_value NUMERIC,
    qualitative_severity TEXT DEFAULT 'weak' CHECK (qualitative_severity IN ('weak', 'moderate', 'severe')),
    data_status TEXT DEFAULT 'ok' CHECK (data_status IN ('ok', 'placeholder', 'stale', 'error')),
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(signal_name, reading_date)
  )`;
  await sql`ALTER TABLE signal_readings ADD COLUMN IF NOT EXISTS qualitative_severity TEXT DEFAULT 'weak' CHECK (qualitative_severity IN ('weak', 'moderate', 'severe'))`;
  await sql`ALTER TABLE signal_readings ADD COLUMN IF NOT EXISTS data_status TEXT DEFAULT 'ok' CHECK (data_status IN ('ok', 'placeholder', 'stale', 'error'))`;
  await sql`UPDATE signal_readings
    SET data_status = 'placeholder'
    WHERE data_status = 'ok' AND (
      reading_value IS NULL AND COALESCE(NULLIF(BTRIM(reading_text), ''), '') = ''
      OR reading_text ~* '(placeholder|until|not configured|not yet wired|\mtbd\M|n/a-data)'
      OR reading_value::text ~* '(placeholder|until|not configured|not yet wired|\mtbd\M|n/a-data)'
    )`;
  await sql`CREATE TABLE IF NOT EXISTS convergence_events (
    id SERIAL PRIMARY KEY,
    event_date DATE NOT NULL,
    signals_fired JSONB NOT NULL,
    signal_count INT NOT NULL,
    alert_sent BOOLEAN DEFAULT FALSE,
    alert_sent_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS signal_lifecycle_events (
    id SERIAL PRIMARY KEY,
    event_date DATE NOT NULL,
    signal_category TEXT NOT NULL,
    signal_name TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('breach', 'flag', 'clear')),
    reading_date DATE NOT NULL,
    reading_value NUMERIC,
    reading_text TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`DO $$
  BEGIN
    ALTER TABLE signal_lifecycle_events DROP CONSTRAINT IF EXISTS signal_lifecycle_events_event_type_check;
    ALTER TABLE signal_lifecycle_events ADD CONSTRAINT signal_lifecycle_events_event_type_check CHECK (event_type IN ('breach', 'flag', 'clear'));
  END $$`;
  await sql`CREATE INDEX IF NOT EXISTS idx_signal_lifecycle_events_signal ON signal_lifecycle_events(signal_name, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_signal_lifecycle_events_type_date ON signal_lifecycle_events(event_type, created_at DESC)`;
  await sql`CREATE TABLE IF NOT EXISTS earnings_calendar (
    id SERIAL PRIMARY KEY,
    ticker TEXT NOT NULL,
    earnings_date DATE NOT NULL,
    fiscal_quarter TEXT,
    capex_guidance NUMERIC,
    capex_guidance_change_pct NUMERIC,
    revenue_growth_yoy NUMERIC,
    backlog_value NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ticker, earnings_date)
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_signal_readings_date ON signal_readings(reading_date DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_signal_readings_breach ON signal_readings(threshold_breached, reading_date DESC)`;
}
