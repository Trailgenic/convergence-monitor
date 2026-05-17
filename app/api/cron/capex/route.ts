import { NextRequest, NextResponse } from 'next/server';
import { assertCronAuth } from '@/lib/db';
import { pollCapexSignals } from '@/lib/signals/capex';
export async function POST(req: NextRequest) { if (!assertCronAuth(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); await pollCapexSignals(); return NextResponse.json({ ok: true }); }
export async function GET(req: NextRequest) { return POST(req); }
