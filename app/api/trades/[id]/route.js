import { readDB, writeDB, ensureShape } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const db = ensureShape(await readDB());
  const trade = db.trades.find(t => t.id === params.id);
  if (!trade) return new Response('Not found', { status: 404 });
  return Response.json({ trade });
}

export async function PATCH(req, { params }) {
  const patch = await req.json();
  const db = ensureShape(await readDB());
  const idx = db.trades.findIndex(t => t.id === params.id);
  if (idx === -1) return new Response('Not found', { status: 404 });
  const updated = { ...db.trades[idx], ...patch };
  if (Array.isArray(patch.confluences)) updated.confluenceCount = patch.confluences.length;
  db.trades[idx] = updated;
  await writeDB(db, `journal: update ${updated.instrument} ${updated.id}`);
  return Response.json({ trade: updated });
}

export async function DELETE(_req, { params }) {
  const db = ensureShape(await readDB());
  const idx = db.trades.findIndex(t => t.id === params.id);
  if (idx === -1) return new Response('Not found', { status: 404 });
  const [removed] = db.trades.splice(idx, 1);
  await writeDB(db, `journal: delete trade ${removed.id}`);
  return Response.json({ ok: true });
}
