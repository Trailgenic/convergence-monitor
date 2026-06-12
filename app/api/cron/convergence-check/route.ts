import { NextRequest, NextResponse } from 'next/server';
import { assertCronAuth, sql } from '@/lib/db';
import { sendSms } from '@/lib/twilio';
import { ensureSchema } from '@/lib/schema';
import { aggregateAlertDispatch, type AggregationReading } from '@/lib/aggregation';

export async function GET(req: NextRequest) {
  if (!assertCronAuth(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureSchema();

  const breaches = await sql`SELECT signal_category, signal_name, reading_value, reading_text, reading_date, raw_payload, threshold_breached
    FROM signal_readings WHERE threshold_breached = TRUE AND reading_date >= NOW() - INTERVAL '14 days' ORDER BY reading_date DESC`;
  const aggregate = aggregateAlertDispatch(breaches.rows as AggregationReading[]);
  const rows = aggregate.tallyRows;

  if (aggregate.status === 'Quiet' || aggregate.status === 'Watch') {
    return NextResponse.json({ ok: true, triggered: false, status: aggregate.status, reason: 'Need 2+ non-seeded tally-eligible categories breached in 14d window' });
  }

  const insert = await sql`INSERT INTO convergence_events (event_date, signals_fired, signal_count)
    VALUES (CURRENT_DATE, ${JSON.stringify(rows)}::jsonb, ${rows.length}) RETURNING id`;

  const specifics = rows.map((r) => `- ${r.signal_name}: ${r.reading_value ?? r.reading_text}`).join('\n');
  const dashboardUrl = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://your-deployment.vercel.app'}/dashboard`;
  const msg = `[CONVERGENCE:${aggregate.status}] ${rows.length} signals fired across ${aggregate.tallyCategories.length} categories.\nCategories: ${aggregate.tallyCategories.join(', ')}\nSpecifics:\n${specifics}\nDashboard: ${dashboardUrl}`;

  await sendSms(msg);
  await sql`UPDATE convergence_events SET alert_sent = TRUE, alert_sent_at = NOW() WHERE id = ${insert.rows[0].id}`;

  return NextResponse.json({ ok: true, triggered: true, status: aggregate.status, eventId: insert.rows[0].id });
}
