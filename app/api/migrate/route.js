// One-shot migration: copy data from GitHub into the KV store.
// Safe to call multiple times — it'll merge by replacing the KV value with whatever
// is in GitHub. Only use this BEFORE you start writing fresh data to KV.
//
// POST /api/migrate

import { Redis } from '@upstash/redis';
import { ensureShape } from '../../../lib/db';

export const dynamic = 'force-dynamic';

const KV_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const GH_TOKEN  = process.env.GITHUB_TOKEN;
const GH_REPO   = process.env.GITHUB_REPO || 'websitesbymartijn/cc-journal';
const GH_BRANCH = process.env.GITHUB_BRANCH || 'main';

export async function POST() {
  try {
    if (!KV_URL || !KV_TOKEN) {
      return Response.json({ error: 'KV not configured' }, { status: 400 });
    }
    if (!GH_TOKEN) {
      return Response.json({ error: 'GITHUB_TOKEN not set — nothing to migrate from' }, { status: 400 });
    }
    const url = `https://api.github.com/repos/${GH_REPO}/contents/data/journal.json?ref=${GH_BRANCH}`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json' },
      cache: 'no-store',
    });
    if (!r.ok) return Response.json({ error: `GitHub read failed: ${r.status}` }, { status: 500 });
    const body = await r.json();
    const content = Buffer.from(body.content, 'base64').toString('utf8');
    const data = ensureShape(content.trim() ? JSON.parse(content) : null);
    const redis = new Redis({ url: KV_URL, token: KV_TOKEN });
    await redis.set('journal:main', data);
    const totals = {
      trades: data.trades.length, prep: data.prep.length, post: data.post.length,
      headspace: data.headspace.length, reviews: data.reviews.length, noTradeDays: data.noTradeDays.length,
    };
    return Response.json({ ok: true, migrated: totals });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
