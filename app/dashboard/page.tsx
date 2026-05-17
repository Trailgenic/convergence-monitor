import { sql } from '@/lib/db';

export default async function DashboardPage() {
  const latestByCategory = await sql`SELECT DISTINCT ON (signal_category) signal_category, signal_name, reading_value, reading_text, threshold_value, threshold_breached, reading_date FROM signal_readings ORDER BY signal_category, reading_date DESC, created_at DESC`;
  const events = await sql`SELECT event_date, signal_count, alert_sent, created_at FROM convergence_events ORDER BY event_date DESC, created_at DESC LIMIT 20`;
  const active = await sql`SELECT COUNT(*)::int AS count FROM signal_readings WHERE threshold_breached = TRUE AND reading_date >= NOW() - INTERVAL '14 days'`;
  const cleared = await sql`SELECT COUNT(*)::int AS count FROM signal_readings WHERE threshold_breached = FALSE AND reading_date >= NOW() - INTERVAL '14 days'`;

  return <main>
    <h1>Convergence Monitor Dashboard</h1>
    <h2>Category state</h2>
    <table><thead><tr><th>Category</th><th>Signal</th><th>Last Reading</th><th>Threshold</th><th>Breach</th><th>Date</th></tr></thead><tbody>
      {latestByCategory.rows.map((r) => <tr key={`${r.signal_category}-${r.signal_name}`}><td>{r.signal_category}</td><td>{r.signal_name}</td><td>{r.reading_value ?? r.reading_text ?? 'N/A'}</td><td>{r.threshold_value ?? 'N/A'}</td><td>{r.threshold_breached ? 'Yes' : 'No'}</td><td>{String(r.reading_date).slice(0,10)}</td></tr>)}
    </tbody></table>
    <h2>Active vs cleared breaches (last 14 days)</h2>
    <p>Active: {active.rows[0]?.count ?? 0} | Cleared: {cleared.rows[0]?.count ?? 0}</p>
    <h2>Recent convergence events</h2>
    <table><thead><tr><th>Date</th><th>Signal count</th><th>Alert sent</th></tr></thead><tbody>
      {events.rows.map((e, i) => <tr key={i}><td>{String(e.event_date).slice(0,10)}</td><td>{e.signal_count}</td><td>{e.alert_sent ? 'Yes' : 'No'}</td></tr>)}
    </tbody></table>
  </main>;
}
