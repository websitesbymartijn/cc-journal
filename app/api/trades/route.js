import { readDB, writeDB, ensureShape, newId } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const url = new URL(req.url);
  const user = url.searchParams.get('user');
  const db = ensureShape(await readDB());
  const trades = user ? db.trades.filter(t => t.user === user) : db.trades;
  trades.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return Response.json({ trades });
}

export async function POST(req) {
  try {
  const body = await req.json();
  const db = ensureShape(await readDB());
  const trade = {
    id: newId(),
    user: body.user || 'martijn',
    createdAt: new Date().toISOString(),
    status: 'open',
    // Pre-trade fields
    instrument: body.instrument || 'ES',
    side: body.side || 'long',
    level: body.level || '',
    confluences: body.confluences || [],
    confluenceCount: (body.confluences || []).length,
    dOpen: body.dOpen || '',
    trigger: body.trigger || '',
    htfBias: body.htfBias || '',
    weeklyStructure: body.weeklyStructure || '',
    dailyStructure: body.dailyStructure || '',
    ftf30m: body.ftf30m || '',
    ltf15m: body.ltf15m || '',
    isATrade: !!body.isATrade,
    riskPct: body.riskPct || '',
    riskUsd: body.riskUsd || '',
    entry: body.entry || '',
    stop: body.stop || '',
    target: body.target || '',
    preNotes: body.preNotes || '',
    // Post-trade (filled later)
    exitedAt: null,
    exit: '',
    rMultiple: '',
    pnl: '',
    deriskedAt2_5R: false,
    movedStopToBE: false,
    runnerClosedAt: '',
    outcome: '',
    lesson: '',
    screenshotUrl: '',
  };
  db.trades.push(trade);
  await writeDB(db, `journal: new ${trade.instrument} ${trade.side} by ${trade.user}`);
  return Response.json({ trade });
  } catch (e) {
    console.error('[api] write failed:', e);
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
