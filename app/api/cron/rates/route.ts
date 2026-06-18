import { NextRequest, NextResponse } from 'next/server';
import { assertCronAuth } from '@/lib/db';
import { pollRatesSignals } from '@/lib/signals/rates';
export async function POST(req: NextRequest) { if (!assertCronAuth(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); await pollRatesSignals(); return NextResponse.json({ ok: true }); }
export async function GET(req: NextRequest) { return POST(req); }
