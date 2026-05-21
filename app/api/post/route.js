import { readDB, writeDB, ensureShape, newId } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const url = new URL(req.url);
  const user = url.searchParams.get('user');
  const date = url.searchParams.get('date');
  const db = ensureShape(await readDB());
  let rows = db.post;
  if (user) rows = rows.filter(r => r.user === user);
  if (date) rows = rows.filter(r => r.date === date);
  rows = [...rows].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return Response.json({ post: rows });
}

export async function POST(req) {
  try {
  const body = await req.json();
  const db = ensureShape(await readDB());
  const date = body.date || new Date().toISOString().slice(0, 10);
  const user = body.user || 'martijn';
  const idx = db.post.findIndex(r => r.user === user && r.date === date);
  const row = {
    id: idx >= 0 ? db.post[idx].id : newId(),
    user, date,
    mood:        body.mood || '',
    summary:     body.summary || '',
    worked:      body.worked || '',
    didntWork:   body.didntWork || '',
    lesson:      body.lesson || '',
    gratitude:   body.gratitude || '',
    createdAt: idx >= 0 ? db.post[idx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) db.post[idx] = row;
  else db.post.push(row);
  await writeDB(db, `journal: post ${user} ${date}`);
  return Response.json({ row });
  } catch (e) {
    console.error('[api] write failed:', e);
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
