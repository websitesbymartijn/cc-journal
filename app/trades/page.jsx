'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProfile } from '../_components/useProfile';

export default function TradesList() {
  const profile = useProfile();
  const [trades, setTrades] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/trades?user=${profile}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setTrades(d.trades || []); setLoading(false); });
  }, [profile]);

  const filtered = trades.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'open') return t.status === 'open';
    if (filter === 'closed') return t.status === 'closed';
    if (filter === 'not-a-trade') return t.isATrade === false;
    if (filter === 'a-trade') return t.isATrade === true;
    return true;
  });

  return (
    <div>
      <div className="flex between" style={{ marginBottom: 12 }}>
        <h1>Trades</h1>
        <div className="flex">
          {['all', 'open', 'closed', 'a-trade', 'not-a-trade'].map(f => (
            <button key={f} className={filter === f ? '' : 'ghost'} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
          <Link href="/new"><button>+ New</button></Link>
        </div>
      </div>

      {loading && <div className="muted">Loading…</div>}
      {!loading && filtered.length === 0 && <div className="muted">No trades match.</div>}

      {filtered.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>When</th><th>Sym</th><th>Side</th><th>Level</th><th>Conf</th>
              <th>Gate</th><th>Status</th><th>R</th><th className="right">PnL</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id}>
                <td className="muted">{fmtDate(t.createdAt)}</td>
                <td>{t.instrument}</td>
                <td><span className={'tag ' + (t.side === 'long' ? 'green' : 'red')}>{t.side}</span></td>
                <td>{t.level || '—'}</td>
                <td>{t.confluenceCount}</td>
                <td>{t.isATrade ? <span className="tag green">✓</span> : <span className="tag red">✗</span>}</td>
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
