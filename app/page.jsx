'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProfile } from './_components/useProfile';
import { PROFILES, getProfile } from '../lib/profiles';

export default function Dashboard() {
  const profile = useProfile();
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/db', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (!cancelled) { setDb(d); setLoading(false); } })
      .catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [profile]);

  if (loading || !db) return <div className="muted">Loading…</div>;

  const trades = db.trades.filter(t => t.user === profile);
  const closed = trades.filter(t => t.status === 'closed');
  const open = trades.filter(t => t.status === 'open');
  const wins = closed.filter(t => Number(t.pnl) > 0).length;
  const losses = closed.filter(t => Number(t.pnl) < 0).length;
  const totalPnl = closed.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  const avgR = closed.length
    ? (closed.reduce((s, t) => s + (Number(t.rMultiple) || 0), 0) / closed.length).toFixed(2)
    : '—';
  const winRate = closed.length ? Math.round((wins / closed.length) * 100) + '%' : '—';

  const today = new Date().toISOString().slice(0, 10);
  const noTradeToday = db.noTradeDays.some(d => d.user === profile && d.date === today);
  const headToday = db.headspace.find(d => d.user === profile && d.date === today);

  const me = getProfile(profile);

  return (
    <div>
      <div className="flex between" style={{ marginBottom: 14 }}>
        <h1>Dashboard — <span style={{ color: me.color }}>{me.name}</span></h1>
        <div className="flex">
          <Link href="/new"><button>+ New Trade</button></Link>
          <NoTradeButton user={profile} alreadyMarked={noTradeToday} onDone={() => refresh(setDb)} />
        </div>
      </div>

      {noTradeToday && (
        <div className="notice green">No-trade day logged for today. "No trade is a trade." — Igor</div>
      )}
      {!headToday && (
        <div className="notice">No headspace logged today. <Link href="/headspace">Log it →</Link></div>
      )}

      <div className="row" style={{ marginBottom: 18 }}>
        <Stat label="Total trades" value={trades.length} />
        <Stat label="Open" value={open.length} tone="amber" />
        <Stat label="Closed" value={closed.length} />
        <Stat label="Win rate" value={winRate} />
        <Stat label="Avg R" value={avgR} />
        <Stat label="Total PnL" value={fmtUsd(totalPnl)} tone={totalPnl >= 0 ? 'green' : 'red'} />
      </div>

      <h2>Recent</h2>
      {trades.length === 0 ? (
        <div className="muted">No trades yet. <Link href="/new">Take the first one →</Link></div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>When</th><th>Sym</th><th>Side</th><th>Level</th><th>Confl.</th><th>Status</th><th>R</th><th className="right">PnL</th><th></th>
            </tr>
          </thead>
          <tbody>
            {trades.slice(0, 10).map(t => (
              <tr key={t.id}>
                <td className="muted">{fmtDate(t.createdAt)}</td>
                <td>{t.instrument}</td>
                <td><span className={'tag ' + (t.side === 'long' ? 'green' : 'red')}>{t.side}</span></td>
                <td>{t.level || '—'}</td>
                <td>{t.confluenceCount}</td>
                <td><span className={'tag ' + (t.status === 'open' ? 'amber' : 'blue')}>{t.status}</span></td>
                <td>{t.rMultiple || '—'}</td>
                <td className={'right ' + pnlClass(t.pnl)}>{fmtUsd(t.pnl)}</td>
                <td><Link href={`/trades/${t.id}`}>open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'green' }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className={'value ' + (tone === 'green' ? '' : tone === 'amber' ? 'amber' : tone === 'red' ? 'red' : 'neutral')}>
        {value}
      </div>
    </div>
  );
}

function NoTradeButton({ user, alreadyMarked, onDone }) {
  const [busy, setBusy] = useState(false);
  if (alreadyMarked) return <button className="ghost" disabled>No-trade ✓</button>;
  return (
    <button
      className="ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch('/api/no-trade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user, reason: 'flat day' }),
        });
        setBusy(false);
        onDone && onDone();
      }}
    >
      No-trade day
    </button>
  );
}

async function refresh(setDb) {
  const d = await fetch('/api/db', { cache: 'no-store' }).then(r => r.json());
  setDb(d);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtUsd(n) {
  if (n === '' || n == null || isNaN(Number(n))) return '—';
  const num = Number(n);
  const sign = num > 0 ? '+' : '';
  return sign + num.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}
function pnlClass(n) {
  const num = Number(n);
  if (isNaN(num)) return 'pnl-neu';
  if (num > 0) return 'pnl-pos';
  if (num < 0) return 'pnl-neg';
  return 'pnl-neu';
}
