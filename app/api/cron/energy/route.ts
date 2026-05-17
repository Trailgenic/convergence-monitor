import { NextRequest, NextResponse } from 'next/server';
import { assertCronAuth } from '@/lib/db';
import { pollEnergySignals } from '@/lib/signals/energy';
export async function GET(req: NextRequest) { if (!assertCronAuth(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); return NextResponse.json({ ok: true, inserted: await pollEnergySignals() }); }
