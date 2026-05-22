import { readDB, writeDB, ensureShape } from '../../../../lib/db';
import { recomputeTrade } from '../../../../lib/trades';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const db = ensureShape(await readDB());
  const trade = db.trades.find(t => t.id === params.id);
  if (!trade) return new Response('Not found', { status: 404 });
  return Response.json({ trade });
}

export async function PATCH(req, { params }) {
  try {
  const patch = await req.json();
  const db = ensureShape(await readDB());
  const idx = db.trades.findIndex(t => t.id === params.id);
  if (idx === -1) return new Response('Not found', { status: 404 });
  const merged = { ...db.trades[idx], ...patch };
  if (Array.isArray(patch.confluences)) merged.confluenceCount = patch.confluences.length;
  // Auto-recompute status/pnl/rMultiple/exitedAt from exits[]
  const updated = recomputeTrade(merged);
  db.trades[idx] = updated;
  await writeDB(db, `journal: update ${updated.instrument} ${updated.id}`);
  return Response.json({ trade: updated });
  } catch (e) {
    console.error('[api] write failed:', e);
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
  const db = ensureShape(await readDB());
  const idx = db.trades.findIndex(t => t.id === params.id);
  if (idx === -1) return new Response('Not found', { status: 404 });
  const [removed] = db.trades.splice(idx, 1);
  await writeDB(db, `journal: delete trade ${removed.id}`);
  return Response.json({ ok: true });
  } catch (e) {
    console.error('[api] write failed:', e);
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
