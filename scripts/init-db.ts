import { sql } from '@vercel/postgres';

async function main() {
  await sql`CREATE TABLE IF NOT EXISTS signal_readings (
    id SERIAL PRIMARY KEY,
    signal_category TEXT NOT NULL,
    signal_name TEXT NOT NULL,
    reading_value NUMERIC,
    reading_text TEXT,
    reading_date DATE NOT NULL,
    threshold_breached BOOLEAN DEFAULT FALSE,
    threshold_value NUMERIC,
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(signal_name, reading_date)
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
  console.log('DB initialized');
}

main().catch((e) => { console.error(e); process.exit(1); });
