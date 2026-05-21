'use client';
import { useEffect, useState } from 'react';

export default function Setup() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    fetch('/api/status', { cache: 'no-store' }).then(r => r.json()).then(setStatus);
  }, []);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1>Storage setup</h1>
      <p className="dim">
        This app uses your GitHub repo as the database. Every save writes a tiny commit to <code>data/journal.json</code>.
        For this to work on Vercel, three environment variables must be set.
      </p>

      <div className="card spacious" style={{ marginTop: 20 }}>
        <h3>Current status</h3>
        {!status && <div className="muted">Checking…</div>}
        {status && (
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            <Row k="Mode" v={status.mode} ok={status.mode === 'github'} />
            <Row k="Has GITHUB_TOKEN" v={status.hasToken ? 'yes' : 'no'} ok={status.hasToken} />
            <Row k="Running on Vercel" v={status.onVercel ? 'yes' : 'no'} />
            <Row k="Repo" v={status.repo} />
            <Row k="Branch" v={status.branch} />
            <Row k="Can read journal.json" v={status.canRead ? 'yes' : 'no'} ok={status.canRead} />
            <Row k="Writes will persist" v={status.writesPersist ? 'yes' : 'no'} ok={status.writesPersist} />
            {status.counts && <Row k="Entries on file" v={Object.entries(status.counts).map(([k,v]) => `${k}:${v}`).join(' · ')} />}
            {status.error && <Row k="Error" v={status.error} ok={false} />}
          </div>
        )}
      </div>

      {status?.mode !== 'github' && (
        <div className="card spacious" style={{ marginTop: 16, borderLeft: '3px solid var(--amber)' }}>
          <h3>30-second fix</h3>
          <ol style={{ marginTop: 8, paddingLeft: 22, lineHeight: 1.8 }}>
            <li>Open <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noreferrer">GitHub → Settings → Developer settings → Personal access tokens → Fine-grained</a>.</li>
            <li>Click <strong>Generate new token</strong>. Repository access: only <code>websitesbymartijn/cc-journal</code>. Repository permissions: set <strong>Contents</strong> to <strong>Read and write</strong>.</li>
            <li>Copy the token (starts with <code>github_pat_…</code>).</li>
            <li>Open <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">your Vercel dashboard</a> → the cc-journal project → <strong>Settings → Environment Variables</strong>.</li>
            <li>Add three variables (apply to Production + Preview):
              <ul style={{ marginTop: 6 }}>
                <li><code>GITHUB_TOKEN</code> = the token you just copied</li>
                <li><code>GITHUB_REPO</code> = <code>websitesbymartijn/cc-journal</code></li>
                <li><code>GITHUB_BRANCH</code> = <code>main</code></li>
              </ul>
            </li>
            <li>Vercel → Deployments → click the latest → <strong>Redeploy</strong>.</li>
            <li>Come back here and refresh — should show <code>mode: github</code> and <code>writes will persist: yes</code>.</li>
          </ol>
        </div>
      )}

      <div className="card spacious" style={{ marginTop: 16 }}>
        <h3>Where your data lives</h3>
        <p style={{ marginTop: 6 }}>
          Once configured, every save creates a tiny commit like <code>journal: prep martijn 2026-05-21</code>.
          You can browse the whole history at <a href={`https://github.com/${status?.repo || 'websitesbymartijn/cc-journal'}/commits/main/data/journal.json`} target="_blank" rel="noreferrer">github.com/{status?.repo || 'websitesbymartijn/cc-journal'}/commits/main/data/journal.json</a>.
          Your journal is version-controlled — you can roll back any change.
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
