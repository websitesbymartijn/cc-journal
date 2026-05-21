import { readDB, writeDB, ensureShape, newId } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const url = new URL(req.url);
  const user = url.searchParams.get('user');
  const db = ensureShape(await readDB());
  let rows = db.reviews;
  if (user) rows = rows.filter(r => r.user === user);
  rows = [...rows].sort((a, b) => (b.weekStart || '').localeCompare(a.weekStart || ''));
  return Response.json({ reviews: rows });
}

export async function POST(req) {
  const body = await req.json();
  const db = ensureShape(await readDB());
  const weekStart = body.weekStart || isoWeekStart(new Date());
  const user = body.user || 'martijn';
  const idx = db.reviews.findIndex(r => r.user === user && r.weekStart === weekStart);
  const row = {
    id: idx >= 0 ? db.reviews[idx].id : newId(),
    user, weekStart,
    followedProcess: body.followedProcess || '',
    aPlusActuallyAPlus: body.aPlusActuallyAPlus || '',
    nextWeekPlay: body.nextWeekPlay || '',
    createdAt: idx >= 0 ? db.reviews[idx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) db.reviews[idx] = row;
  else db.reviews.push(row);
  await writeDB(db, `journal: review ${user} week ${weekStart}`);
  return Response.json({ row });
}

function isoWeekStart(d) {
  const date = new Date(d);
  const day = (date.getUTCDay() + 6) % 7; // Mon=0
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}
