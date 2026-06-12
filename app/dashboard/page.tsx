import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CategoryRow = {
  signal_category: string;
  signal_name: string;
  reading_value: string | number | null;
  reading_text: string | null;
  threshold_value: string | number | null;
  threshold_breached: boolean;
  reading_date: string;
};

type EventRow = {
  event_date: string;
  signal_count: number;
  alert_sent: boolean;
};

export default async function DashboardPage() {
  let latestByCategory: CategoryRow[] = [];
  let events: EventRow[] = [];
  let activeCount = 0;
  let clearedCount = 0;
  let dbNotInitialized = false;

  try {
    const latestByCategoryResult = await sql`SELECT DISTINCT ON (signal_name) signal_category, signal_name, reading_value, reading_text, threshold_value, threshold_breached, reading_date FROM signal_readings ORDER BY signal_name, reading_date DESC, created_at DESC`;
    const eventsResult = await sql`SELECT event_date, signal_count, alert_sent, created_at FROM convergence_events ORDER BY event_date DESC, created_at DESC LIMIT 20`;
    const activeResult = await sql`SELECT COUNT(*)::int AS count FROM signal_readings WHERE threshold_breached = TRUE AND reading_date >= NOW() - INTERVAL '14 days'`;
    const clearedResult = await sql`SELECT COUNT(*)::int AS count FROM signal_lifecycle_events WHERE event_type = 'clear' AND created_at >= NOW() - INTERVAL '14 days'`;

    latestByCategory = (latestByCategoryResult.rows as CategoryRow[]).sort((a, b) => a.signal_category.localeCompare(b.signal_category) || a.signal_name.localeCompare(b.signal_name));
    events = eventsResult.rows as EventRow[];
    activeCount = Number(activeResult.rows[0]?.count ?? 0);
    clearedCount = Number(clearedResult.rows[0]?.count ?? 0);
  } catch {
    dbNotInitialized = true;
  }

  return <main>
    <h1>Convergence Monitor Dashboard</h1>
    {dbNotInitialized ? <p><small>Database not yet initialized.</small></p> : null}
    <h2>Category state</h2>
    <table><thead><tr><th>Category</th><th>Signal</th><th>Last Reading</th><th>Threshold</th><th>Breach</th><th>Date</th></tr></thead><tbody>
      {latestByCategory.map((r) => <tr key={`${r.signal_category}-${r.signal_name}`}><td>{r.signal_category}</td><td>{r.signal_name}</td><td>{r.reading_text ?? r.reading_value ?? 'N/A'}</td><td>{r.threshold_value ?? 'N/A'}</td><td>{r.threshold_breached ? 'Yes' : 'No'}</td><td>{String(r.reading_date).slice(0,10)}</td></tr>)}
    </tbody></table>
    <h2>Active vs cleared breaches (last 14 days)</h2>
    <p>Active readings: {activeCount} | Cleared lifecycle events: {clearedCount}</p>
    <h2>Recent convergence events</h2>
    <table><thead><tr><th>Date</th><th>Signal count</th><th>Alert sent</th></tr></thead><tbody>
      {events.map((e, i) => <tr key={i}><td>{String(e.event_date).slice(0,10)}</td><td>{e.signal_count}</td><td>{e.alert_sent ? 'Yes' : 'No'}</td></tr>)}
    </tbody></table>
  </main>;
}
