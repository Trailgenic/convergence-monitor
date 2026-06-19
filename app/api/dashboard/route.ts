import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { aggregateConvergence, type AggregationReading } from '@/lib/aggregation';
import { isRegistrySignal } from '@/lib/dashboard-format';

export async function GET() {
  const readings = await sql`SELECT * FROM signal_readings ORDER BY reading_date DESC, created_at DESC LIMIT 200`;
  const latest = await sql`SELECT DISTINCT ON (signal_name) signal_category, signal_name, reading_value, reading_text, threshold_value, threshold_breached, qualitative_severity, data_status, reading_date, raw_payload FROM signal_readings ORDER BY signal_name, reading_date DESC, created_at DESC`;
  const events = await sql`SELECT * FROM convergence_events ORDER BY event_date DESC, created_at DESC LIMIT 50`;
  const lifecycleEvents = await sql`SELECT * FROM signal_lifecycle_events ORDER BY created_at DESC LIMIT 100`;
  const latestRegistryRows = latest.rows.filter((row) => isRegistrySignal(row.signal_name));
  const aggregate = aggregateConvergence(latestRegistryRows as AggregationReading[]);
  return NextResponse.json({ readings: readings.rows, status: aggregate.status, statusRationale: aggregate.statusRationale, coverage: aggregate.coverageLine, events: events.rows, lifecycleEvents: lifecycleEvents.rows });
}
