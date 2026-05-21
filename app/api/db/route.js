import { readDB, ensureShape } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = ensureShape(await readDB());
  return Response.json(db);
}
