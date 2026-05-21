'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProfile } from './_components/useProfile';
import { PROFILES, getProfile } from '../lib/profiles';
import { todayMantra, MANTRAS } from '../lib/mantras';

export default function Desk() {
  const profile = useProfile();
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mantraOfDay, setMantraOfDay] = useState('');

  useEffect(() => {
    setMantraOfDay(todayMantra());
  }, []);

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
  const prepToday = db.prep.find(p => p.user === profile && p.date === today);

  // Last 14 closed trades for spark
  const lastClosed = [...closed].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).slice(-14);
  const maxAbs = Math.max(1, ...lastClosed.map(t => Math.abs(Number(t.pnl) || 0)));

  const me = getProfile(profile);

  return (
    <div>
      <div className="flex between" style={{ marginBottom: 18 }}>
        <h1>
          The Desk <span className="sub">— {me.name.toLowerCase()}</span>
        </h1>
        <div className="flex">
          <Link href="/prep"><button className="amber">Today's Prep</button></Link>
          <Link href="/new"><button>+ New Trade</button></Link>
          <NoTradeButton user={profile} alreadyMarked={noTradeToday} onDone={() => refresh(setDb)} />
        </div>
      </div>

      {/* Mantra of the day card */}
      <div className="card" style={{ marginBottom: 18, borderLeft: '3px solid var(--amber)' }}>
        <div className="flex between">
          <div>
            <h3 style={{ margin: 0 }}>Mantra of the day</h3>
            <div style={{ marginTop: 6, fontSize: 16, fontStyle: 'italic', color: 'var(--fg)' }}>
              <span style={{ color: 'var(--green)' }}>“</span>{mantraOfDay}<span style={{ color: 'var(--green)' }}>”</span>
            </div>
          </div>
          <div className="muted" style={{ fontSize: 11, textAlign: 'right' }}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="grid-2-1" style={{ marginBottom: 18 }}>
        <PrepSummary prep={prepToday} />
        <DayChecklist
          prep={!!prepToday}
          head={!!headToday}
          flat={noTradeToday}
          tradedToday={trades.some(t => (t.createdAt || '').slice(0,10) === today)}
        />
      </div>

      <div className="row" style={{ marginBottom: 22 }}>
        <Stat label="Total trades" value={trades.length} tone="neutral" />
        <Stat label="Open" value={open.length} tone="amber" />
        <Stat label="Win rate" value={winRate} />
        <Stat label="Avg R" value={avgR} tone="blue" />
        <Stat label="W / L" value={`${wins} / ${losses}`} tone="neutral" />
        <Stat
          label="Total PnL"
          value={fmtUsd(totalPnl)}
          tone={totalPnl >= 0 ? 'green' : 'red'}
          spark={
            <div className="spark">
              {lastClosed.map((t, i) => {
                const v = Number(t.pnl) || 0;
                const h = Math.max(2, (Math.abs(v) / maxAbs) * 24);
                return <div key={i} className={'bar ' + (v < 0 ? 'neg' : '')} style={{ height: h }} />;
              })}
            </div>
          }
        />
      </div>

      <h2>Recent Trades</h2>
      {trades.length === 0 ? (
        <div className="empty">
          <div className="big">No trades yet</div>
          <div>The best trade is often the one not taken. When the setup is real — execute.</div>
          <div className="small">{MANTRAS[2]}</div>
          <div style={{ marginTop: 18 }}>
            <Link href="/prep"><button className="amber">Start with a prep</button></Link>
            <Link href="/new" style={{ marginLeft: 8 }}><button>Log a trade</button></Link>
          </div>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>When</th><th>Sym</th><th>Side</th><th>Level</th><th>Conf</th><th>Status</th><th>R</th><th className="right">PnL</th><th></th>
            </tr>
          </thead>
          <tbody>
            {trades.slice(0, 10).map(t => (
              <tr key={t.id}>
                <td className="dim">{fmtDate(t.createdAt)}</td>
                <td>{t.instrument}</td>
                <td><span className={'tag ' + (t.side === 'long' ? 'green' : 'red')}>{t.side}</span></td>
                <td>{t.level || '—'}</td>
                <td>{t.confluenceCount}</td>
                <td><span className={'tag ' + (t.status === 'open' ? 'amber' : 'blue')}>{t.status}</span></td>
                <td>{t.rMultiple || '—'}</td>
                <td className={'right ' + pnlClass(t.pnl)}>{fmtUsd(t.pnl)}</td>
                <td><Link href={`/trades/${t.id}`}>open →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PrepSummary({ prep }) {
  if (!prep) {
    return (
      <div className="card" style={{ borderLeft: '3px solid var(--blue)' }}>
        <h3>Today's prep</h3>
        <div className="muted" style={{ marginTop: 8 }}>No prep set for today. The plan is the trade.</div>
        <div style={{ marginTop: 10 }}>
          <Link href="/prep"><button>Write today's prep</button></Link>
        </div>
      </div>
    );
  }
  return (
    <div className="card" style={{ borderLeft: '3px solid var(--blue)' }}>
      <div className="flex between">
        <h3>Today's prep</h3>
        <Link href="/prep" className="muted" style={{ fontSize: 11 }}>view full →</Link>
      </div>
      <div className="flex wrap gap-6" style={{ marginTop: 6 }}>
        {prep.dOpenTags?.slice(0, 4).map(t => <span key={t} className="tag blue">{t}</span>)}
      </div>
      {prep.bias && <div style={{ marginTop: 8 }}><span className="muted" style={{ fontSize: 10, textTransform: 'uppercase' }}>bias: </span>{prep.bias}</div>}
      <div className="grid-2" style={{ marginTop: 10 }}>
        <MiniBlock label="Longs"  tone="green" text={prep.longs}  />
        <MiniBlock label="Shorts" tone="red"   text={prep.shorts} />
      </div>
    </div>
  );
}

function MiniBlock({ label, tone, text }) {
  if (!text) return <div className="muted" style={{ fontSize: 12 }}>{label}: —</div>;
  const lines = text.split('\n').filter(Boolean).slice(0, 3);
  return (
    <div>
      <div className={'muted'} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: `var(--${tone})` }}>{label}</div>
      {lines.map((l, i) => <div key={i} style={{ fontSize: 12, marginTop: 2 }}>{l}</div>)}
    </div>
  );
}

function DayChecklist({ prep, head, flat, tradedToday }) {
  const items = [
    { label: 'Daily prep', done: prep, href: '/prep' },
    { label: 'Headspace logged', done: head, href: '/headspace' },
    { label: tradedToday ? 'Trades logged' : (flat ? 'No-trade day' : 'Trade or flat?'), done: tradedToday || flat, href: tradedToday ? '/trades' : '/' },
  ];
  return (
    <div className="card" style={{ borderLeft: '3px solid var(--green)' }}>
      <h3>Today's Process</h3>
      <div className="flex col" style={{ gap: 8, marginTop: 8 }}>
        {items.map(it => (
          <Link key={it.label} href={it.href} className="flex between" style={{ padding: '6px 0', borderBottom: '1px dashed var(--border)', color: 'var(--fg)' }}>
            <span>{it.done ? '✓ ' : '○ '} {it.label}</span>
            <span className="muted" style={{ fontSize: 11 }}>{it.done ? 'done' : 'open'}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'green', spark }) {
  return (
    <div className="card stat-card">
      <div className="label">{label}</div>
      <div className={'value ' + tone}>{value}</div>
      {spark}
    </div>
  );
}

function NoTradeButton({ user, alreadyMarked, onDone }) {
  const [busy, setBusy] = useState(false);
  if (alreadyMarked) return <button className="ghost" disabled>flat ✓</button>;
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
      Flat day
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
