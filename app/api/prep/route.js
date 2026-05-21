import { readDB, writeDB, ensureShape, newId } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const url = new URL(req.url);
  const user = url.searchParams.get('user');
  const date = url.searchParams.get('date');
  const db = ensureShape(await readDB());
  let rows = db.prep;
  if (user) rows = rows.filter(r => r.user === user);
  if (date) rows = rows.filter(r => r.date === date);
  rows = [...rows].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return Response.json({ prep: rows });
}

export async function POST(req) {
  const body = await req.json();
  const db = ensureShape(await readDB());
  const date = body.date || new Date().toISOString().slice(0, 10);
  const user = body.user || 'martijn';
  const idx = db.prep.findIndex(r => r.user === user && r.date === date);
  const row = {
    id: idx >= 0 ? db.prep[idx].id : newId(),
    user, date,
    dOpenTags: Array.isArray(body.dOpenTags) ? body.dOpenTags : [],
    dOpenNote: body.dOpenNote || '',
    context: body.context || '',
    longs: body.longs || '',
    shorts: body.shorts || '',
    discipline: body.discipline || '',
    catalysts: body.catalysts || '',
    bias: body.bias || '',
    createdAt: idx >= 0 ? db.prep[idx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) db.prep[idx] = row;
  else db.prep.push(row);
  await writeDB(db, `journal: prep ${user} ${date}`);
  return Response.json({ row });
}
