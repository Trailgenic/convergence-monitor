import { NextResponse } from 'next/server';
import { dashboardApiStatusCode, loadDashboardData } from '@/lib/dashboard-data';
import { sql } from '@/lib/db';

export async function GET() {
  const dashboardData = await loadDashboardData();
  if (dashboardData.unavailable) {
    return NextResponse.json({ status: dashboardData.status, statusRationale: dashboardData.statusRationale, coverage: dashboardData.coverageLine, errors: dashboardData.errorMessages }, { status: dashboardApiStatusCode(dashboardData) });
  }

  const readings = await sql`SELECT * FROM signal_readings ORDER BY reading_date DESC, created_at DESC LIMIT 200`;
  const events = await sql`SELECT * FROM convergence_events ORDER BY event_date DESC, created_at DESC LIMIT 50`;
  const lifecycleEvents = await sql`SELECT * FROM signal_lifecycle_events ORDER BY created_at DESC LIMIT 100`;
  return NextResponse.json({ readings: readings.rows, status: dashboardData.status, statusRationale: dashboardData.statusRationale, coverage: dashboardData.coverageLine, events: events.rows, lifecycleEvents: lifecycleEvents.rows });
}
