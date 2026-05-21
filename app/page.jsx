'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProfile } from './_components/useProfile';
import { getProfile } from '../lib/profiles';
import { todayMantra, MANTRAS } from '../lib/mantras';
import EquityCurve from './_components/EquityCurve';
import Insights from './_components/Insights';
import CountUp from './_components/CountUp';
import { SkeletonCard } from './_components/Skeleton';

export default function Desk() {
  const profile = useProfile();
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mantraOfDay, setMantraOfDay] = useState('');

  useEffect(() => { setMantraOfDay(todayMantra()); }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/db', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (!cancelled) { setDb(d); setLoading(false); } })
      .catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [profile]);

  if (loading || !db) return <DashboardSkeleton />;

  const trades = db.trades.filter(t => t.user === profile);
  const closed = trades.filter(t => t.status === 'closed');
  const open = trades.filter(t => t.status === 'open');
  const wins = closed.filter(t => Number(t.pnl) > 0).length;
  const losses = closed.filter(t => Number(t.pnl) < 0).length;
  const totalPnl = closed.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  const avgR = closed.length
    ? +(closed.reduce((s, t) => s + (Number(t.rMultiple) || 0), 0) / closed.length).toFixed(2)
    : 0;
  const winRate = closed.length ? Math.round((wins / closed.length) * 100) : 0;

  const today = new Date().toISOString().slice(0, 10);
  const noTradeToday = db.noTradeDays.some(d => d.user === profile && d.date === today);
  const headToday = db.headspace.find(d => d.user === profile && d.date === today);
  const prepToday = db.prep.find(p => p.user === profile && p.date === today);
  const postToday = (db.post || []).find(p => p.user === profile && p.date === today);

  const me = getProfile(profile);

  return (
    <div>
      <div className="flex between" style={{ marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <h1>The desk <span className="sub">— {me.name.toLowerCase()}</span></h1>
        <div className="flex">
          <Link href="/prep"><button>Today's prep</button></Link>
          <Link href="/new"><button className="outline">+ New trade</button></Link>
          <Link href="/post"><button className="ghost">Day post</button></Link>
        </div>
      </div>

      {/* Mantra of the day */}
      <div className="card" style={{ marginBottom: 22, borderLeft: '3px solid var(--amber)' }}>
        <div className="flex between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Mantra of the day</h3>
            <div style={{ marginTop: 8, fontSize: 17, fontStyle: 'italic', color: 'var(--fg)' }}>
              <span style={{ color: 'var(--amber)' }}>“</span>{mantraOfDay}<span style={{ color: 'var(--amber)' }}>”</span>
            </div>
          </div>
          <div className="muted mono" style={{ fontSize: 11, textAlign: 'right' }}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="grid-2-1" style={{ marginBottom: 22 }}>
        <PrepSummary prep={prepToday} />
        <DayChecklist
          prep={!!prepToday}
          head={!!headToday}
          flat={noTradeToday}
          tradedToday={trades.some(t => (t.createdAt || '').slice(0, 10) === today)}
          posted={!!postToday}
        />
      </div>

      {/* Stats row */}
      <div className="row" style={{ marginBottom: 22 }}>
        <Stat label="Trades"   value={trades.length} />
        <Stat label="Open"     value={open.length} tone="amber" />
        <Stat label="Win rate" value={winRate} format={v => Math.round(v) + '%'} />
        <Stat label="Avg R"    value={avgR} format={v => v.toFixed(2)} tone="amber" />
        <Stat label="W / L"    value={`${wins} / ${losses}`} raw />
        <Stat label="Total PnL" value={totalPnl} tone={totalPnl >= 0 ? 'green' : 'red'} format={v => (v >= 0 ? '+' : '') + Math.round(v).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} />
      </div>

      {/* Equity curve + insights */}
      <div className="grid-2-1" style={{ marginBottom: 22 }}>
        <EquityCurve trades={trades} />
        <Insights trades={trades} />
      </div>

      <h2>Recent trades</h2>
      {trades.length === 0 ? (
        <div className="empty">
          <div className="big">No trades yet</div>
          <div>The best trade is often the one not taken. When the setup is real — execute.</div>
          <div className="small">{MANTRAS[2]}</div>
          <div style={{ marginTop: 18 }}>
            <Link href="/prep"><button>Start with a prep</button></Link>
            <Link href="/new" style={{ marginLeft: 8 }}><button className="outline">Log a trade</button></Link>
          </div>
        </div>
      ) : (
        <div className="table-scroll"><table>
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
        </table></div>
      )}
    </div>
  );
}

function PrepSummary({ prep }) {
  if (!prep) {
    return (
      <div className="card" style={{ borderLeft: '3px solid var(--info)' }}>
        <h3>Today's prep</h3>
        <div className="muted" style={{ marginTop: 8 }}>No prep yet for today. The plan is the trade.</div>
        <div style={{ marginTop: 10 }}>
          <Link href="/prep"><button>Write today's prep</button></Link>
        </div>
      </div>
    );
  }
  return (
    <div className="card" style={{ borderLeft: '3px solid var(--info)' }}>
      <div className="flex between">
        <h3>Today's prep</h3>
        <Link href="/prep" className="muted" style={{ fontSize: 11 }}>view full →</Link>
      </div>
      <div className="flex wrap gap-6" style={{ marginTop: 8 }}>
        {prep.dOpenTags?.slice(0, 4).map(t => <span key={t} className="tag amber">{t}</span>)}
      </div>
      {prep.bias && <div style={{ marginTop: 10 }}><span className="label-mini">bias </span>{prep.bias}</div>}
      <div className="grid-2" style={{ marginTop: 12 }}>
        <MiniBlock label="Longs"  color="var(--pos)" text={prep.longs} />
        <MiniBlock label="Shorts" color="var(--neg)" text={prep.shorts} />
      </div>
    </div>
  );
}

function MiniBlock({ label, color, text }) {
  if (!text) return <div className="muted" style={{ fontSize: 12 }}>{label}: —</div>;
  const lines = text.split('\n').filter(Boolean).slice(0, 3);
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color }}>{label}</div>
      {lines.map((l, i) => <div key={i} style={{ fontSize: 12.5, marginTop: 3, color: 'var(--fg)' }}>{l.replace(/^[•\-\*]\s?/, '')}</div>)}
    </div>
  );
}

function DayChecklist({ prep, head, flat, tradedToday, posted }) {
  const items = [
    { label: 'Daily prep',       done: prep, href: '/prep' },
    { label: 'Headspace logged', done: head, href: '/prep' },
    { label: tradedToday ? 'Trades logged' : (flat ? 'No-trade day' : 'Trade or flat?'), done: tradedToday || flat, href: tradedToday ? '/trades' : '/' },
    { label: 'Day post',         done: posted, href: '/post' },
  ];
  return (
    <div className="card" style={{ borderLeft: '3px solid var(--amber)' }}>
      <h3>Today's process</h3>
      <div className="flex col" style={{ gap: 8, marginTop: 8 }}>
        {items.map(it => (
          <Link key={it.label} href={it.href} className="flex between" style={{ padding: '7px 0', borderBottom: '1px dashed var(--border)', color: 'var(--fg)' }}>
            <span>
              <span style={{ color: it.done ? 'var(--amber)' : 'var(--muted)', marginRight: 8 }}>{it.done ? '●' : '○'}</span>
              {it.label}
            </span>
            <span className="muted" style={{ fontSize: 11 }}>{it.done ? 'done' : 'open'}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'neutral', format, raw, spark }) {
  return (
    <div className="card stat-card">
      <div className="label">{label}</div>
      <div className={'value ' + tone}>
        {raw ? value : (typeof value === 'number' ? <CountUp value={value} format={format || (v => Math.round(v).toString())} /> : value)}
      </div>
      {spark}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="flex between" style={{ marginBottom: 22 }}>
        <div className="skeleton" style={{ height: 28, width: 220 }} />
        <div className="flex">
          <div className="skeleton" style={{ height: 40, width: 110 }} />
          <div className="skeleton" style={{ height: 40, width: 110 }} />
        </div>
      </div>
      <div className="card" style={{ marginBottom: 22, borderLeft: '3px solid var(--amber)' }}>
        <div className="skeleton" style={{ height: 12, width: 120, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 20, width: '60%' }} />
      </div>
      <div className="grid-2-1" style={{ marginBottom: 22 }}>
        <SkeletonCard height={160} />
        <SkeletonCard height={160} />
      </div>
      <div className="row" style={{ marginBottom: 22 }}>
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} height={90} />)}
      </div>
      <div className="grid-2-1">
        <SkeletonCard height={220} />
        <SkeletonCard height={220} />
      </div>
    </div>
  );
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
