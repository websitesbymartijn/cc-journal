'use client';
import { useMemo, useState } from 'react';

export default function EquityCurve({ trades, height = 220 }) {
  const data = useMemo(() => {
    const closed = (trades || [])
      .filter(t => t.status === 'closed' && t.pnl !== '' && t.pnl != null && !isNaN(Number(t.pnl)))
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    let cum = 0;
    return closed.map(t => {
      cum += Number(t.pnl);
      return { date: t.createdAt, pnl: Number(t.pnl), cum, instrument: t.instrument, side: t.side };
    });
  }, [trades]);

  const [hover, setHover] = useState(null);

  if (data.length < 2) {
    return (
      <div className="card" style={{ minHeight: height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Equity curve appears after 2 or more closed trades.
      </div>
    );
  }

  const w = 800, h = height, pad = { l: 56, r: 24, t: 28, b: 28 };
  const ys = data.map(d => d.cum);
  const min = Math.min(0, ...ys);
  const max = Math.max(0, ...ys);
  const range = max - min || 1;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const sx = i => pad.l + (i / Math.max(1, data.length - 1)) * innerW;
  const sy = v => pad.t + innerH - ((v - min) / range) * innerH;

  const linePath = data.map((d, i) => `${i ? 'L' : 'M'} ${sx(i).toFixed(1)} ${sy(d.cum).toFixed(1)}`).join(' ');
  const areaPath = linePath + ` L ${sx(data.length - 1).toFixed(1)} ${sy(Math.max(0, min)).toFixed(1)} L ${sx(0).toFixed(1)} ${sy(Math.max(0, min)).toFixed(1)} Z`;
  const zeroY = sy(0);
  const endValue = data[data.length - 1].cum;
  const peak = Math.max(...ys);
  const trough = Math.min(...ys);

  // Y-axis ticks
  const ticks = niceTicks(min, max, 4);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="flex between" style={{ padding: '18px 20px 0', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>Equity curve</h3>
          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{data.length} closed trades · peak {fmtUsd(peak)} · trough {fmtUsd(trough)}</div>
        </div>
        <div className="mono" style={{ fontSize: 20, color: endValue >= 0 ? 'var(--pos)' : 'var(--neg)', fontWeight: 600 }}>
          {endValue >= 0 ? '+' : ''}{fmtUsd(endValue)}
        </div>
      </div>
      <div style={{ position: 'relative', padding: '8px 0 0' }}>
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="eq-fill-pos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f5a524" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#f5a524" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* gridlines + tick labels */}
          {ticks.map(t => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={sy(t)} y2={sy(t)} stroke="#2a2520" strokeWidth="0.5" strokeDasharray={t === 0 ? "0" : "2 4"} opacity={t === 0 ? 0.9 : 0.5} />
              <text x={pad.l - 8} y={sy(t) + 4} textAnchor="end" fill="#756b5e" fontSize="10" fontFamily="ui-monospace, monospace">{fmtUsdShort(t)}</text>
            </g>
          ))}

          {/* fill */}
          <path d={areaPath} fill="url(#eq-fill-pos)" className="eq-area" />
          {/* line */}
          <path d={linePath} stroke="#f5a524" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" className="eq-line" />

          {/* points */}
          {data.map((d, i) => (
            <circle
              key={i}
              cx={sx(i)} cy={sy(d.cum)} r={hover === i ? 5 : 2.8}
              fill={d.pnl >= 0 ? '#7fc99a' : '#e87963'}
              stroke="#0f0e0d" strokeWidth="1.5"
              style={{ cursor: 'pointer', transition: 'r 0.12s' }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}

          {/* hover crosshair */}
          {hover !== null && (
            <line x1={sx(hover)} x2={sx(hover)} y1={pad.t} y2={h - pad.b} stroke="#f5a524" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.5" />
          )}
        </svg>

        {hover !== null && (
          <div style={{
            position: 'absolute',
            left: `${(sx(hover) / w) * 100}%`,
            top: 12, transform: 'translateX(-50%)',
            background: 'var(--panel-3)',
            border: '1px solid var(--border-bright)',
            borderRadius: 6, padding: '8px 12px',
            fontSize: 12, pointerEvents: 'none',
            boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap',
          }}>
            <div className="mono" style={{ color: data[hover].pnl >= 0 ? 'var(--pos)' : 'var(--neg)', fontWeight: 600 }}>
              {data[hover].pnl >= 0 ? '+' : ''}{fmtUsd(data[hover].pnl)}
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
              {data[hover].instrument} {data[hover].side} · cum {fmtUsd(data[hover].cum)}
            </div>
            <div className="muted mono" style={{ fontSize: 10, marginTop: 2 }}>
              {new Date(data[hover].date).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function niceTicks(min, max, count) {
  const range = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(range / count)));
  const err = (count / range) * step;
  const niceStep = err <= 0.15 ? step * 10 : err <= 0.35 ? step * 5 : err <= 0.75 ? step * 2 : step;
  const lo = Math.ceil(min / niceStep) * niceStep;
  const hi = Math.floor(max / niceStep) * niceStep;
  const out = [];
  for (let v = lo; v <= hi + 1e-9; v += niceStep) out.push(Math.round(v * 100) / 100);
  if (!out.includes(0) && min <= 0 && max >= 0) out.push(0);
  return out.sort((a, b) => a - b);
}
function fmtUsd(n) {
  if (n == null || isNaN(Number(n))) return '—';
  const num = Number(n);
  return num.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}
function fmtUsdShort(n) {
  const a = Math.abs(n);
  if (a >= 1000) return (n < 0 ? '-' : '') + '$' + (a / 1000).toFixed(a >= 10000 ? 0 : 1) + 'k';
  return (n < 0 ? '-' : '') + '$' + Math.round(a);
}
