import { readDB, detectBackend } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const backend = detectBackend();
  const onVercel = !!process.env.VERCEL;

  let canRead = false;
  let canWrite = false;
  let error = null;
  let counts = null;

  try {
    const db = await readDB();
    canRead = true;
    counts = {
      trades:      db.trades?.length || 0,
      prep:        db.prep?.length || 0,
      post:        db.post?.length || 0,
      headspace:   db.headspace?.length || 0,
      reviews:     db.reviews?.length || 0,
      noTradeDays: db.noTradeDays?.length || 0,
    };
  } catch (e) {
    error = String(e.message || e);
  }

  // Writes will persist if a remote backend is configured, OR on local dev (writeable FS)
  canWrite = backend === 'kv' || backend === 'github' || !onVercel;

  return Response.json({
    backend,           // 'kv' | 'github' | 'local'
    onVercel,
    canRead,
    canWrite,
    counts,
    error,
    env: {
      hasKvUrl:   !!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
      hasKvToken: !!(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN),
      hasGhToken: !!process.env.GITHUB_TOKEN,
      repo:       process.env.GITHUB_REPO || null,
      branch:     process.env.GITHUB_BRANCH || null,
    },
  });
}
