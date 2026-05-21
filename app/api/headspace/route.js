import { readDB, writeDB, ensureShape, newId } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const url = new URL(req.url);
  const user = url.searchParams.get('user');
  const db = ensureShape(await readDB());
  let rows = db.headspace;
  if (user) rows = rows.filter(r => r.user === user);
  rows = [...rows].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return Response.json({ headspace: rows });
}

export async function POST(req) {
  const body = await req.json();
  const db = ensureShape(await readDB());
  const date = body.date || new Date().toISOString().slice(0, 10);
  const user = body.user || 'martijn';
  // Upsert by (user, date)
  const idx = db.headspace.findIndex(r => r.user === user && r.date === date);
  const row = {
    id: idx >= 0 ? db.headspace[idx].id : newId(),
    user, date,
    sleep: body.sleep ?? 3,
    food:  body.food ?? 3,
    mind:  body.mind ?? 3,
    note:  body.note || '',
  };
  if (idx >= 0) db.headspace[idx] = row;
  else db.headspace.push(row);
  await writeDB(db, `journal: headspace ${user} ${date}`);
  return Response.json({ row });
}
