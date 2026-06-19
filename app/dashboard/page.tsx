import { loadDashboardData } from '@/lib/dashboard-data';
import { formatLastReading, formatSignalState } from '@/lib/dashboard-format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const {
    latestByCategory,
    events,
    activeCount,
    clearedCount,
    status,
    statusRationale,
    coverageLine,
    errorMessages,
    unavailable
  } = await loadDashboardData();

  return <main>
    <h1>Convergence Monitor Dashboard</h1>
    {unavailable ? <p role="alert"><strong>{statusRationale}</strong></p> : null}
    <p>Status: {status}</p>
    <p><small>{statusRationale}</small></p>
    <p><small>{coverageLine}</small></p>
    {errorMessages.map((message) => <p key={message}><small>{message}</small></p>)}
    <h2>Category state</h2>
    <table><thead><tr><th>Category</th><th>Signal</th><th>Last Reading</th><th>Threshold</th><th>Breach</th><th>Date</th></tr></thead><tbody>
      {latestByCategory.map((r) => <tr key={`${r.signal_category}-${r.signal_name}`}><td>{r.signal_category}</td><td>{r.signal_name}</td><td>{formatLastReading(r)}</td><td>{r.threshold_value ?? 'N/A'}</td><td>{formatSignalState(r)}</td><td>{String(r.reading_date).slice(0,10)}</td></tr>)}
    </tbody></table>
    <h2>Active vs cleared breaches (last 14 days)</h2>
    <p>Active readings: {activeCount ?? 'N/A'} | Cleared lifecycle events: {clearedCount ?? 'N/A'}</p>
    <h2>Recent convergence events</h2>
    <table><thead><tr><th>Date</th><th>Signal count</th><th>Alert sent</th></tr></thead><tbody>
      {events.map((e, i) => <tr key={i}><td>{String(e.event_date).slice(0,10)}</td><td>{e.signal_count}</td><td>{e.alert_sent ? 'Yes' : 'No'}</td></tr>)}
    </tbody></table>
  </main>;
}
