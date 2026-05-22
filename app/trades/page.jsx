'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useProfile } from '../_components/useProfile';

export default function TradesPage() {
  return (
    <Suspense fallback={<div className="muted">Loading…</div>}>
      <TradesList />
    </Suspense>
  );
}

function TradesList() {
  const profile = useProfile();
  const params = useSearchParams();
  const dateFilter = params.get('date');
  const [trades, setTrades] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/trades?user=${profile}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setTrades(d.trades || []); setLoading(false); });
  }, [profile]);

  const filtered = useMemo(() => {
    return trades.filter(t => {
      if (dateFilter) {
        const td = t.tradeDate || (t.createdAt || '').slice(0, 10);
        if (td !== dateFilter) return false;
      }
      if (filter === 'all') return true;
      if (filter === 'open') return t.status === 'open';
      if (filter === 'closed') return t.status === 'closed';
      if (filter === 'not-a-trade') return t.isATrade === false;
      if (filter === 'a-trade') return t.isATrade === true;
      return true;
    });
  }, [trades, filter, dateFilter]);

  const totalPnl = filtered.reduce((s, t) => s + (Number(t.pnl) || 0), 0);

  return (
    <div>
      <div className="flex between" style={{ marginBottom: 14 }}>
        <h1>Trades {dateFilter && <span className="sub">— {dateFilter}</span>}</h1>
        <div className="flex">
          {['all', 'open', 'closed', 'a-trade', 'not-a-trade'].map(f => (
            <button key={f} className={filter === f ? '' : 'ghost'} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
          <Link href="/new"><button>+ New</button></Link>
        </div>
      </div>

      {dateFilter && (
        <div className="notice blue">
          Showing trades for <strong>{dateFilter}</strong> · sum PnL: <strong className={totalPnl >= 0 ? 'pnl-pos' : 'pnl-neg'}>{fmtUsd(totalPnl)}</strong>
          <Link href="/trades" style={{ marginLeft: 12 }}>clear filter</Link>
        </div>
      )}

      {loading && <div className="muted">Loading…</div>}
      {!loading && filtered.length === 0 && (
        <div className="empty">
          <div className="big">No trades match</div>
          <div className="small">Patience is a position.</div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="table-scroll"><table>
          <thead>
            <tr>
              <th>When</th><th>Sym</th><th>Side</th><th>Level</th><th>Conf</th>
              <th>Gate</th><th>Status</th><th>R</th><th className="right">PnL</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id}>
                <td className="dim">{fmtDate(t.createdAt)}</td>
                <td>{t.instrument}</td>
                <td><span className={'tag ' + (t.side === 'long' ? 'green' : 'red')}>{t.side}</span></td>
                <td>{t.level || '—'}</td>
                <td>{t.confluenceCount}</td>
                <td>{t.isATrade ? <span className="tag green">✓</span> : <span className="tag red">✗</span>}</td>
                <td><span className={'tag ' + (t.status === 'open' ? 'amber' : t.status === 'runner' ? 'purple' : 'blue')}>{t.status}</span></td>
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
