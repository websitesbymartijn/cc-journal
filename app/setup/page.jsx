'use client';
import { useEffect, useState } from 'react';

export default function Setup() {
  const [status, setStatus] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState(null);

  async function refresh() {
    const s = await fetch('/api/status', { cache: 'no-store' }).then(r => r.json());
    setStatus(s);
  }
  useEffect(() => { refresh(); }, []);

  async function runMigration() {
    setMigrating(true);
    setMigrateMsg(null);
    try {
      const r = await fetch('/api/migrate', { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'failed');
      setMigrateMsg(`Migrated ${Object.entries(j.migrated).map(([k,v]) => `${k}:${v}`).join(' · ')}`);
      refresh();
    } catch (e) {
      setMigrateMsg('Failed: ' + String(e.message || e));
    } finally {
      setMigrating(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1>Storage setup</h1>
      <p className="dim">
        This app stores your journal in <strong>Vercel KV (Upstash Redis)</strong>. Fast, no commits, multi-device sync.
        GitHub-as-DB is still supported as a legacy fallback if KV isn't configured.
      </p>

      <div className="card spacious" style={{ marginTop: 20 }}>
        <h3>Current status</h3>
        {!status && <div className="muted">Checking…</div>}
        {status && (
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            <Row k="Active backend" v={badge(status.backend)} ok={status.backend === 'kv'} />
            <Row k="Running on Vercel" v={status.onVercel ? 'yes' : 'no'} />
            <Row k="KV env vars present" v={status.env.hasKvUrl && status.env.hasKvToken ? 'yes' : 'no'} ok={status.env.hasKvUrl && status.env.hasKvToken} />
            <Row k="GitHub token (legacy)" v={status.env.hasGhToken ? 'yes' : 'no'} />
            <Row k="Can read storage" v={status.canRead ? 'yes' : 'no'} ok={status.canRead} />
            <Row k="Writes will persist" v={status.canWrite ? 'yes' : 'no'} ok={status.canWrite} />
            {status.counts && <Row k="Entries on file" v={Object.entries(status.counts).map(([k,v]) => `${k}:${v}`).join(' · ')} />}
            {status.error && <Row k="Error" v={status.error} ok={false} />}
          </div>
        )}
      </div>

      {status?.backend !== 'kv' && (
        <div className="card spacious" style={{ marginTop: 16, borderLeft: '3px solid var(--amber)' }}>
          <h3>Set up Vercel KV (2 minutes)</h3>
          <ol style={{ marginTop: 8, paddingLeft: 22, lineHeight: 1.8 }}>
            <li>Open <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">your Vercel dashboard</a> → the <strong>cc-journal</strong> project.</li>
            <li>Click the <strong>Storage</strong> tab → <strong>Create Database</strong>.</li>
            <li>Pick <strong>Upstash Redis</strong> (or "KV"). Free tier is fine — pick the closest region to you (eu-west-1 for Europe).</li>
            <li>Click <strong>Connect</strong> to attach it to this project. Vercel will inject <code>KV_REST_API_URL</code> + <code>KV_REST_API_TOKEN</code> automatically.</li>
            <li>Vercel → Deployments → click the latest → <strong>Redeploy</strong>.</li>
            <li>Refresh this page. Active backend should switch to <code>kv</code>.</li>
          </ol>
          <p className="dim" style={{ fontSize: 12, marginTop: 12 }}>
            That's it. No tokens to manage manually, no commits per save, fast everywhere.
          </p>
        </div>
      )}

      {status?.backend === 'kv' && status?.env.hasGhToken && (
        <div className="card spacious" style={{ marginTop: 16, borderLeft: '3px solid var(--info)' }}>
          <h3>Migrate old data from GitHub (one-time)</h3>
          <p style={{ marginTop: 6 }}>
            If you had any data in the GitHub-backed store, click below to copy it into KV.
            Safe to skip if you never managed to save anything before.
          </p>
          <div className="flex" style={{ marginTop: 10 }}>
            <button onClick={runMigration} disabled={migrating}>{migrating ? 'Migrating…' : 'Migrate now'}</button>
            {migrateMsg && <span className="muted" style={{ fontSize: 12 }}>{migrateMsg}</span>}
          </div>
          <p className="dim" style={{ fontSize: 12, marginTop: 12 }}>
            After migrating, you can safely remove the <code>GITHUB_TOKEN</code> env var from Vercel.
          </p>
        </div>
      )}

      <div className="card spacious" style={{ marginTop: 16 }}>
        <h3>What this stores</h3>
        <p style={{ marginTop: 6 }}>
          One Redis key (<code>journal:main</code>) holding the full journal: trades, prep, post, headspace, no-trade days, reviews.
          For two desks with daily use, lifetime size stays well under 1MB — far below Upstash's free 256MB quota.
        </p>
      </div>
    </div>
  );
}

function Row({ k, v, ok }) {
  const color = ok === true ? 'var(--pos)' : ok === false ? 'var(--neg)' : 'var(--fg)';
  return (
    <div className="flex between" style={{ borderBottom: '1px dashed var(--border)', paddingBottom: 8 }}>
      <span className="muted" style={{ fontSize: 12 }}>{k}</span>
      <span className="mono" style={{ color, fontSize: 13 }}>{v}</span>
    </div>
  );
}

function badge(backend) {
  if (backend === 'kv') return 'kv ✓';
  if (backend === 'github') return 'github (legacy)';
  return 'local (writes won\'t persist on Vercel)';
}
