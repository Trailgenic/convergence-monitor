import { NextRequest, NextResponse } from 'next/server';
import { assertCronAuth, sql } from '@/lib/db';
import { sendSms } from '@/lib/twilio';

export async function GET(req: NextRequest) {
  if (!assertCronAuth(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const breaches = await sql`SELECT signal_category, signal_name, reading_value, reading_text, reading_date
    FROM signal_readings WHERE threshold_breached = TRUE AND reading_date >= NOW() - INTERVAL '14 days' ORDER BY reading_date DESC`;
  const rows = breaches.rows;
  const categories = [...new Set(rows.map((r) => r.signal_category))];

  if (categories.length < 2) return NextResponse.json({ ok: true, triggered: false, reason: 'Need 2+ categories breached in 14d window' });

  const insert = await sql`INSERT INTO convergence_events (event_date, signals_fired, signal_count)
    VALUES (CURRENT_DATE, ${JSON.stringify(rows)}::jsonb, ${rows.length}) RETURNING id`;

  const specifics = rows.map((r) => `- ${r.signal_name}: ${r.reading_value ?? r.reading_text}`).join('\n');
  const dashboardUrl = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://your-deployment.vercel.app'}/dashboard`;
  const msg = `[CONVERGENCE] ${rows.length} signals fired across ${categories.length} categories.\nCategories: ${categories.join(', ')}\nSpecifics:\n${specifics}\nDashboard: ${dashboardUrl}`;

  await sendSms(msg);
  await sql`UPDATE convergence_events SET alert_sent = TRUE, alert_sent_at = NOW() WHERE id = ${insert.rows[0].id}`;

  return NextResponse.json({ ok: true, triggered: true, eventId: insert.rows[0].id });
}
