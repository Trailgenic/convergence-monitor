import { NextRequest, NextResponse } from 'next/server';
import { assertCronAuth } from '@/lib/db';
import { pollCloudSignals } from '@/lib/signals/cloud';
export async function GET(req: NextRequest) { if (!assertCronAuth(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); await pollCloudSignals(); return NextResponse.json({ ok: true }); }
