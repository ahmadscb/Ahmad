import { NextResponse } from 'next/server';
import { getMarket, listProviders } from '@/server/market';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.has('list')) {
    const ps = await listProviders();
    return NextResponse.json(ps.map((p) => ({ id: p.id, ...p.meta })));
  }
  const id = url.searchParams.get('symbol') ?? 'NDX-SAMPLE';
  if (!/^[\w.-]{1,64}$/.test(id)) return NextResponse.json({ error: 'bad symbol' }, { status: 400 });
  try {
    const m = await getMarket(id);
    if (!m) return NextResponse.json({ error: 'unknown symbol' }, { status: 404 });
    return NextResponse.json(m);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
