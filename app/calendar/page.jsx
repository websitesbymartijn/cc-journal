'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useProfile } from '../_components/useProfile';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarPage() {
  const profile = useProfile();
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [db, setDb] = useState(null);

  useEffect(() => {
    fetch('/api/db', { cache: 'no-store' }).then(r => r.json()).then(setDb);
  }, [profile]);

  const byDate = useMemo(() => {
    if (!db) return {};
    const map = {};
    for (const t of db.trades) {
      if (t.user !== profile) continue;
      const d = (t.tradeDate || (t.createdAt || '').slice(0, 10));
      if (!d) continue;
      if (!map[d]) map[d] = { pnl: 0, count: 0, wins: 0, losses: 0 };
      const pnl = Number(t.pnl) || 0;
      map[d].pnl += pnl;
      map[d].count += 1;
      if (pnl > 0) map[d].wins += 1;
      else if (pnl < 0) map[d].losses += 1;
    }
    return map;
  }, [db, profile]);

  const prepSet = useMemo(() => {
    if (!db) return new Set();
    return new Set(db.prep.filter(p => p.user === profile).map(p => p.date));
  }, [db, profile]);
  const headSet = useMemo(() => {
    if (!db) return new Set();
    return new Set(db.headspace.filter(p => p.user === profile).map(p => p.date));
  }, [db, profile]);
  const flatSet = useMemo(() => {
    if (!db) return new Set();
    return new Set(db.noTradeDays.filter(p => p.user === profile).map(p => p.date));
  }, [db, profile]);

  const monthCells = useMemo(() => buildMonth(cursor.y, cursor.m), [cursor]);
  const monthPnL = monthCells.reduce((s, c) => {
    if (!c) return s;
    const k = ymd(cursor.y, cursor.m, c);
    return s + (byDate[k]?.pnl || 0);
  }, 0);
  const monthTrades = monthCells.reduce((s, c) => {
    if (!c) return s;
    const k = ymd(cursor.y, cursor.m, c);
    return s + (byDate[k]?.count || 0);
  }, 0);
  const monthGreen = monthCells.filter(c => c && (byDate[ymd(cursor.y, cursor.m, c)]?.pnl || 0) > 0).length;
  const monthRed = monthCells.filter(c => c && (byDate[ymd(cursor.y, cursor.m, c)]?.pnl || 0) < 0).length;

  const todayStr = new Date().toISOString().slice(0, 10);

  function nav(delta) {
    let y = cursor.y, m = cursor.m + delta;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCursor({ y, m });
  }

  // Intensity grading based on max abs PnL in month
  const maxAbs = Math.max(
    1,
    ...monthCells.filter(Boolean).map(c => Math.abs(byDate[ymd(cursor.y, cursor.m, c)]?.pnl || 0))
  );

  return (
    <div>
      <div className="cal-head">
        <div className="flex">
          <button className="ghost" onClick={() => nav(-1)}>← Prev</button>
          <div className="cal-month">{monthName(cursor.m)} {cursor.y}</div>
          <button className="ghost" onClick={() => nav(1)}>Next →</button>
          <button className="ghost" onClick={() => setCursor({ y: today.getFullYear(), m: today.getMonth() })}>Today</button>
        </div>
        <div className="flex">
          <Stat label="Month PnL" value={fmtUsd(monthPnL)} tone={monthPnL >= 0 ? 'green' : 'red'} />
          <Stat label="Trades" value={monthTrades} tone="neutral" />
          <Stat label="Green / Red days" value={`${monthGreen} / ${monthRed}`} tone={monthGreen >= monthRed ? 'green' : 'red'} />
        </div>
      </div>

      <div className="cal-grid">
        {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
        {monthCells.map((c, i) => {
          if (!c) return <div key={i} className="cal-cell empty" />;
          const key = ymd(cursor.y, cursor.m, c);
          const data = byDate[key];
          const pnl = data?.pnl || 0;
          const cls = intensityClass(pnl, maxAbs);
          const isToday = key === todayStr;
          return (
            <Link
              key={i}
              href={`/trades?date=${key}`}
              className={`cal-cell ${cls} ${isToday ? 'today' : ''}`}
            >
              <div className="d-num">{c}</div>
              {data && (
                <div className={'d-pnl ' + (pnl > 0 ? 'pnl-pos' : pnl < 0 ? 'pnl-neg' : 'pnl-neu')}>
                  {fmtUsdShort(pnl)}
                </div>
              )}
              <div className="markers">
                {prepSet.has(key) && <span className="dot prep" title="prep" />}
                {headSet.has(key) && <span className="dot head" title="headspace" />}
                {flatSet.has(key) && <span className="dot flat" title="no-trade" />}
              </div>
              <div className="d-count">
                {data ? `${data.count} tr` : ''}
                {flatSet.has(key) && !data ? 'flat' : ''}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="cal-legend">
        <span><span className="dot" style={{ background: 'var(--blue)' }} /> prep</span>
        <span><span className="dot" style={{ background: 'var(--amber)' }} /> headspace logged</span>
        <span><span className="dot" style={{ background: 'var(--purple)' }} /> no-trade day</span>
        <span style={{ marginLeft: 'auto' }} className="muted">color intensity = relative PnL</span>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'green' }) {
  return (
    <div className="card stat-card" style={{ minWidth: 140 }}>
      <div className="label">{label}</div>
      <div className={'value ' + tone}>{value}</div>
    </div>
  );
}

function buildMonth(y, m) {
  const first = new Date(Date.UTC(y, m, 1));
  const dow = (first.getUTCDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < dow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function ymd(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function monthName(m) {
  return ['January','February','March','April','May','June','July','August','September','October','November','December'][m];
}
function intensityClass(pnl, max) {
  if (!pnl) return '';
  const r = Math.abs(pnl) / max;
  const sign = pnl > 0 ? 'pos' : 'neg';
  if (r > 0.66) return `pnl-${sign}-hi`;
  if (r > 0.33) return `pnl-${sign}-mid`;
  return `pnl-${sign}-lite`;
}
function fmtUsd(n) {
  if (n == null || isNaN(Number(n))) return '—';
  const num = Number(n);
  const sign = num > 0 ? '+' : '';
  return sign + num.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}
function fmtUsdShort(n) {
  if (n == null || isNaN(Number(n))) return '—';
  const num = Number(n);
  const abs = Math.abs(num);
  const sign = num > 0 ? '+' : (num < 0 ? '−' : '');
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${Math.round(abs)}`;
}
