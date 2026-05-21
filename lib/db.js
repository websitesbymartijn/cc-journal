// JSON DB layer.
// - In dev (no GITHUB_TOKEN): read/write data/journal.json on disk.
// - In production (GITHUB_TOKEN set): read/write via GitHub Contents API
//   so writes persist across deploys / serverless cold starts.

import fs from 'node:fs/promises';
import path from 'node:path';

const LOCAL_PATH = path.join(process.cwd(), 'data', 'journal.json');
const EMPTY = { trades: [], headspace: [], noTradeDays: [], reviews: [] };

const TOKEN  = process.env.GITHUB_TOKEN;
const REPO   = process.env.GITHUB_REPO || 'websitesbymartijn/cc-journal';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const FILE_PATH = 'data/journal.json';

// In-memory cache (per serverless instance) of the GitHub blob sha,
// so writes don't always need an extra GET.
let cachedSha = null;
let cachedJson = null;

async function ghGet() {
  const url = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  });
  if (res.status === 404) {
    cachedSha = null;
    cachedJson = { ...EMPTY };
    return cachedJson;
  }
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status} ${await res.text()}`);
  const body = await res.json();
  cachedSha = body.sha;
  const content = Buffer.from(body.content, 'base64').toString('utf8');
  cachedJson = content.trim() ? JSON.parse(content) : { ...EMPTY };
  return cachedJson;
}

async function ghPut(data, message) {
  // Ensure we have a sha by reading first if needed
  if (cachedSha === null && cachedJson === null) {
    try { await ghGet(); } catch { /* file may not exist yet */ }
  }
  const url = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;
  const body = {
    message: message || 'chore(journal): update',
    content: Buffer.from(JSON.stringify(data, null, 2), 'utf8').toString('base64'),
    branch: BRANCH,
  };
  if (cachedSha) body.sha = cachedSha;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    // If 409 (sha mismatch), refresh and retry once
    if (res.status === 409 || res.status === 422) {
      cachedSha = null;
      await ghGet();
      body.sha = cachedSha;
      const retry = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!retry.ok) throw new Error(`GitHub PUT retry failed: ${retry.status} ${await retry.text()}`);
      const r = await retry.json();
      cachedSha = r.content?.sha || null;
      cachedJson = data;
      return;
    }
    throw new Error(`GitHub PUT failed: ${res.status} ${text}`);
  }
  const r = await res.json();
  cachedSha = r.content?.sha || null;
  cachedJson = data;
}

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

export async function readDB() {
  if (TOKEN) return await ghGet();
  return await localGet();
}

export async function writeDB(data, message) {
  if (TOKEN) return await ghPut(data, message);
  return await localPut(data);
}

export function ensureShape(db) {
  return {
    trades:      Array.isArray(db.trades) ? db.trades : [],
    headspace:   Array.isArray(db.headspace) ? db.headspace : [],
    noTradeDays: Array.isArray(db.noTradeDays) ? db.noTradeDays : [],
    reviews:     Array.isArray(db.reviews) ? db.reviews : [],
  };
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,