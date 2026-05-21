import { readDB, writeDB, ensureShape, newId } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
  const body = await req.json();
  const db = ensureShape(await readDB());
  const date = body.date || new Date().toISOString().slice(0, 10);
  const user = body.user || 'martijn';
  // Avoid duplicates per (user, date)
  const exists = db.noTradeDays.find(r => r.user === user && r.date === date);
  if (exists) {
    return Response.json({ row: exists, deduped: true });
  }
  const row = { id: newId(), user, date, reason: body.reason || '' };
  db.noTradeDays.push(row);
  await writeDB(db, `journal: no-trade day ${user} ${date}`);
  return Response.json({ row });
  } catch (e) {
    console.error('[api] write failed:', e);
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}

export async function GET(req) {
  const url = new URL(req.url);
  const user = url.searchParams.get('user');
  const db = ensureShape(await readDB());
  let rows = db.noTradeDays;
  if (user) rows = rows.filter(r => r.user === user);
  rows = [...rows].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return Response.json({ noTradeDays: rows });
}
