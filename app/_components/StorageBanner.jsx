'use client';
import { useEffect, useState } from 'react';

export default function StorageBanner() {
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/status', { cache: 'no-store' })
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ mode: 'broken', error: 'status check failed' }));
  }, []);

  if (!status || dismissed) return null;
  if (status.mode === 'github') return null;        // all good
  if (status.mode === 'local') return null;          // local dev, fine

  // broken — Vercel without token
  return (
    <div style={{
      background: 'rgba(232, 121, 99, 0.10)',
      borderBottom: '1px solid var(--neg)',
      padding: '10px 22px',
      fontSize: 13,
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      flexWrap: 'wrap',
      color: 'var(--fg)',
    }}>
      <strong style={{ color: 'var(--neg)' }}>Storage not configured</strong>
      <span style={{ color: 'var(--fg-dim)' }}>
        Saves to prep, trades, headspace and post are <strong>not being persisted</strong>.
        Set GITHUB_TOKEN in your Vercel project to fix this.
      </span>
      <a href="/setup" style={{ marginLeft: 'auto' }}>How to fix →</a>
      <button className="ghost sm" onClick={() => setDismissed(true)}>dismiss</button>
    </div>
  );
}
