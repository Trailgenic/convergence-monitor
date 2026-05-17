import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  const readings = await sql`SELECT * FROM signal_readings ORDER BY reading_date DESC, created_at DESC LIMIT 200`;
  const events = await sql`SELECT * FROM convergence_events ORDER BY event_date DESC, created_at DESC LIMIT 50`;
  return NextResponse.json({ readings: readings.rows, events: events.rows });
}
