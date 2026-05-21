'use client';
import { useMemo } from 'react';

export default function Insights({ trades }) {
  const stats = useMemo(() => compute(trades), [trades]);
  if (!stats.has) {
    return null;
  }
  return (
    <div className="card" style={{ borderLeft: '3px solid var(--gold)' }}>
      <h3>Insights</h3>
      <div className="grid-3" style={{ marginTop: 10, gap: 14 }}>
        <Mini label="Best day"   value={stats.bestDay.pnl} sub={stats.bestDay.date} positive />
        <Mini label="Worst day"  value={stats.worstDay.pnl} sub={stats.worstDay.date} negative />
        <Mini label="Streak"     value={stats.streak.value} sub={stats.streak.label} streak={stats.streak.kind} />
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
        <div className="flex between">
          <span className="label-mini">last 5 trend</span>
          <Sparkline values={stats.last5} />
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, sub, positive, negative, streak }) {
  const color = streak === 'win' ? 'var(--pos)' : streak === 'loss' ? 'var(--neg)' : positive ? 'var(--pos)' : negative ? 'var(--neg)' : 'var(--fg)';
  const display = typeof value === 'number' ? (value > 0 ? '+' : '') + value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : value;
  return (
    <div>
      <div className="label-mini">{label}</div>
      <div className="mono" style={{ fontSize: 22, color, fontWeight: 600, marginTop: 4 }}>{display}</div>
      {sub && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Sparkline({ values }) {
  if (!values || values.length === 0) return <span className="muted">—</span>;
  const max = Math.max(1, ...values.map(v => Math.abs(v)));
  return (
    <div className="spark" style={{ width: 120, marginTop: 0 }}>
      {values.map((v, i) => {
        const h = Math.max(3, (Math.abs(v) / max) * 22);
        return <div key={i} className={'bar ' + (v < 0 ? 'neg' : '')} style={{ height: h }} />;
      })}
    </div>
  );
}

function compute(trades) {
  const closed = (trades || []).filter(t => t.status === 'closed' && t.pnl !== '' && t.pnl != null && !isNaN(Number(t.pnl)));
  if (closed.length === 0) return { has: false };

  // Group by day
  const byDay = {};
  for (const t of closed) {
    const d = (t.tradeDate || (t.createdAt || '').slice(0, 10));
    byDay[d] = (byDay[d] || 0) + Number(t.pnl);
  }
  const days = Object.entries(byDay).map(([date, pnl]) => ({ date, pnl }));
  const bestDay  = days.reduce((b, d) => d.pnl > b.pnl ? d : b, days[0]);
  const worstDay = days.reduce((b, d) => d.pnl < b.pnl ? d : b, days[0]);

  // Current streak (latest run of consecutive wins or losses)
  const sorted = [...closed].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  let streakCount = 0; let kind = null;
  for (const t of sorted) {
    const v = Number(t.pnl);
    if (v === 0) continue;
    const k = v > 0 ? 'win' : 'loss';
    if (kind === null) { kind = k; streakCount = 1; }
    else if (k === kind) streakCount++;
    else break;
  }
  const streak = {
    value: streakCount + (kind === 'win' ? 'W' : kind === 'loss' ? 'L' : ''),
    label: kind === 'win' ? 'wins in a row' : kind === 'loss' ? 'losses in a row' : '—',
    kind,
  };

  const last5 = sorted.slice(0, 5).reverse().map(t => Number(t.pnl) || 0);

  return { has: true, bestDay, worstDay, streak, last5 };
}
