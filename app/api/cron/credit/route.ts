import { NextRequest, NextResponse } from 'next/server';
import { assertCronAuth } from '@/lib/db';
import { pollCreditSignals } from '@/lib/signals/credit';

export async function GET(req: NextRequest) {
  if (!assertCronAuth(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await pollCreditSignals();
  return NextResponse.json({ ok: true, data });
}
