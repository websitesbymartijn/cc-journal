import { readDB } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasToken = !!process.env.GITHUB_TOKEN;
  const repo     = process.env.GITHUB_REPO || 'websitesbymartijn/cc-journal';
  const branch   = process.env.GITHUB_BRANCH || 'main';
  const onVercel = !!process.env.VERCEL;

  let canRead = false;
  let error = null;
  let counts = null;

  try {
    const db = await readDB();
    canRead = true;
    counts = {
      trades:      Array.isArray(db.trades) ? db.trades.length : 0,
      prep:        Array.isArray(db.prep) ? db.prep.length : 0,
      post:        Array.isArray(db.post) ? db.post.length : 0,
      headspace:   Array.isArray(db.headspace) ? db.headspace.length : 0,
      reviews:     Array.isArray(db.reviews) ? db.reviews.length : 0,
      noTradeDays: Array.isArray(db.noTradeDays) ? db.noTradeDays.length : 0,
    };
  } catch (e) {
    error = String(e.message || e);
  }

  // On Vercel without a token, writes will fail (read-only filesystem)
  const writesPersist = hasToken;
  const mode = hasToken ? 'github' : (onVercel ? 'broken' : 'local');

  return Response.json({
    mode,           // 'github' | 'local' | 'broken'
    hasToken,
    onVercel,
    repo,
    branch,
    canRead,
    writesPersist,
    counts,
    error,
  });
}
