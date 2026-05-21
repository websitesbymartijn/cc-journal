'use client';
import { useEffect, useState } from 'react';

export default function StorageBanner() {
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/status', { cache: 'no-store' })
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ backend: 'local', canWrite: false }));
  }, []);

  if (!status || dismissed) return null;
  if (status.canWrite && status.backend !== 'local') return null;
  if (status.backend === 'local' && !status.onVercel) return null; // dev mode fine

  // Vercel + no persistent backend
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
        Saves are <strong>not being persisted</strong>. Add Vercel KV to fix it (2 minutes).
      </span>
      <a href="/setup" style={{ marginLeft: 'auto' }}>How to fix →</a>
      <button className="ghost sm" onClick={() => setDismissed(true)}>dismiss</button>
    </div>
  );
}
