// Storage layer with backend priority:
//   1. Vercel KV / Upstash Redis  (preferred — fast, no commits, multi-device sync)
//   2. GitHub Contents API        (legacy fallback — commits on every save)
//   3. Local filesystem           (dev only)
//
// Configure ONE of these in Vercel → Settings → Environment Variables:
//   KV path:     KV_REST_API_URL + KV_REST_API_TOKEN
//                (auto-injected if you add Vercel KV / Upstash via Vercel Marketplace)
//   Upstash:     UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//   GitHub:      GITHUB_TOKEN + GITHUB_REPO + GITHUB_BRANCH

import { Redis } from '@upstash/redis';
import fs from 'node:fs/promises';
import path from 'node:path';

const KV_KEY = 'journal:main';
const LOCAL_PATH = path.join(process.cwd(), 'data', 'journal.json');
const EMPTY = { trades: [], headspace: [], noTradeDays: [], reviews: [], prep: [], post: [] };

// ---- Detect available backends ----
const KV_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const HAS_KV = !!(KV_URL && KV_TOKEN);

const GH_TOKEN  = process.env.GITHUB_TOKEN;
const GH_REPO   = process.env.GITHUB_REPO || 'websitesbymartijn/cc-journal';
const GH_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GH_PATH   = 'data/journal.json';
const HAS_GH = !!GH_TOKEN;

export function detectBackend() {
  if (HAS_KV) return 'kv';
  if (HAS_GH) return 'github';
  return 'local';
}

// ---- KV backend ----
let _redis = null;
function getRedis() {
  if (!HAS_KV) return null;
  if (_redis) return _redis;
  _redis = new Redis({ url: KV_URL, token: KV_TOKEN });
  return _redis;
}

async function kvGet() {
  const r = getRedis();
  const v = await r.get(KV_KEY);
  if (!v) return { ...EMPTY };
  // @upstash/redis already JSON-decodes values
  return typeof v === 'string' ? JSON.parse(v) : v;
}

async function kvPut(data) {
  const r = getRedis();
  await r.set(KV_KEY, data);
}

// ---- GitHub backend (legacy) ----
let cachedSha = null;
let cachedJson = null;

async function ghGet() {
  const url = `https://api.github.com/repos/${GH_REPO}/contents/${GH_PATH}?ref=${GH_BRANCH}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    cache: 'no-store',
  });
  if (res.status === 404) { cachedSha = null; cachedJson = { ...EMPTY }; return cachedJson; }
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status} ${await res.text()}`);
  const body = await res.json();
  cachedSha = body.sha;
  const content = Buffer.from(body.content, 'base64').toString('utf8');
  cachedJson = content.trim() ? JSON.parse(content) : { ...EMPTY };
  return cachedJson;
}

async function ghPut(data, message) {
  if (cachedSha === null && cachedJson === null) { try { await ghGet(); } catch {} }
  const url = `https://api.github.com/repos/${GH_REPO}/contents/${GH_PATH}`;
  const body = {
    message: message || 'chore(journal): update',
    content: Buffer.from(JSON.stringify(data, null, 2), 'utf8').toString('base64'),
    branch: GH_BRANCH,
  };
  if (cachedSha) body.sha = cachedSha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 409 || res.status === 422) {
      cachedSha = null; await ghGet(); body.sha = cachedSha;
      const retry = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!retry.ok) throw new Error(`GitHub PUT retry failed: ${retry.status} ${await retry.text()}`);
      const r = await retry.json(); cachedSha = r.content?.sha || null; cachedJson = data; return;
    }
    throw new Error(`GitHub PUT failed: ${res.status} ${text}`);
  }
  const r = await res.json(); cachedSha = r.content?.sha || null; cachedJson = data;
}

// ---- Local filesystem backend ----
async function localGet() {
  try {
    const txt = await fs.readFile(LOCAL_PATH, 'utf8');
    return txt.trim() ? JSON.parse(txt) : { ...EMPTY };
  } catch (e) {
    if (e.code === 'ENOENT') {
      await fs.mkdir(path.dirname(LOCAL_PATH), { recursive: true });
      await fs.writeFile(LOCAL_PATH, JSON.stringify(EMPTY, null, 2));
      return { ...EMPTY };
    }
    throw e;
  }
}

async function localPut(data) {
  await fs.mkdir(path.dirname(LOCAL_PATH), { recursive: true });
  await fs.writeFile(LOCAL_PATH, JSON.stringify(data, null, 2));
}

// ---- Public API ----
export async function readDB() {
  const backend = detectBackend();
  if (backend === 'kv')     return ensureShape(await kvGet());
  if (backend === 'github') return ensureShape(await ghGet());
  return ensureShape(await localGet());
}

export async function writeDB(data, message) {
  const backend = detectBackend();
  if (backend === 'kv')     return await kvPut(data);
  if (backend === 'github') return await ghPut(data, message);
  return await localPut(data);
}

export function ensureShape(db) {
  if (!db) return { ...EMPTY };
  return {
    trades:      Array.isArray(db.trades) ? db.trades : [],
    headspace:   Array.isArray(db.headspace) ? db.headspace : [],
    noTradeDays: Array.isArray(db.noTradeDays) ? db.noTradeDays : [],
    reviews:     Array.isArray(db.reviews) ? db.reviews : [],
    prep:        Array.isArray(db.prep) ? db.prep : [],
    post:        Array.isArray(db.post) ? db.post : [],
  };
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
