'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AutoTextarea from '../../_components/AutoTextarea';

export default function TradeDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [trade, setTrade] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/trades/${id}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setTrade(d.trade));
  }, [id]);

  if (!trade) return <div className="muted">Loading…</div>;

  function update(patch) { setTrade(t => ({ ...t, ...patch })); }

  async function save(extra = {}) {
    setBusy(true);
    const res = await fetch(`/api/trades/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...trade, ...extra }),
    });
    const { trade: updated } = await res.json();
    setTrade(updated);
    setBusy(false);
  }

  async function takePartial() {
    // Quick action: switch to runner, mark de-risked & BE
    await save({
      status: 'runner',
      partialTaken: true,
      partialAt: new Date().toISOString(),
      deriskedAt2_5R: true,
      movedStopToBE: true,
    });
  }

  async function closeRunner() {
    await save({
      status: 'closed',
      exitedAt: new Date().toISOString(),
    });
  }

  async function del() {
    if (!confirm('Delete this trade?')) return;
    await fetch(`/api/trades/${id}`, { method: 'DELETE' });
    router.push('/trades');
  }

  const partialPnl = Number(trade.partialPnl) || 0;
  const runnerPnl  = Number(trade.pnl) - partialPnl || 0;
  const totalPnl   = Number(trade.pnl) || 0;
  const showPartial = trade.status === 'runner' || trade.partialTaken;
  const showFinal   = trade.status === 'closed' || trade.status === 'runner';

  return (
    <div>
      <div className="flex between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <h1>{trade.instrument} {trade.side.toUpperCase()} <span className="sub">— {trade.level || '(no level)'}</span></h1>
        <div className="flex">
          <Link href="/trades"><button className="ghost">← Back</button></Link>
          <button className="danger" onClick={del}>Delete</button>
        </div>
      </div>

      <div className="grid-2">
        {/* ============= Pre-trade snapshot ============= */}
        <div className="card spacious">
          <h3>Pre-trade snapshot</h3>
          <KV k="Opened" v={fmtDate(trade.createdAt)} />
          <KV k="Gate passed" v={trade.isATrade ? '✓ yes' : '✗ no'} />
          <KV k="dOpen" v={trade.dOpen} />
          <KV k="Trigger" v={trade.trigger} />
          <KV k="HTF bias" v={trade.htfBias} />
          <KV k="Weekly" v={trade.weeklyStructure} />
          <KV k="Daily" v={trade.dailyStructure} />
          <KV k="30m" v={trade.ftf30m} />
          <KV k="15m" v={trade.ltf15m} />
          <KV k="Confluences" v={(trade.confluences || []).join(', ') || '—'} />
          <KV k="Entry / Stop / Target" v={`${trade.entry || '—'} / ${trade.stop || '—'} / ${trade.target || '—'}`} />
          <KV k="Risk" v={`${trade.riskPct || '—'}% / $${trade.riskUsd || '—'}`} />
          <KV k="Thesis" v={trade.thesis || trade.preNotes} />
        </div>

        {/* ============= Post-trade ============= */}
        <div className="card spacious">
          <h3>Post-trade</h3>

          <Row label="Status">
            <select value={trade.status} onChange={e => update({ status: e.target.value })}>
              <option value="open">Open</option>
              <option value="runner">Runner — partial booked</option>
              <option value="closed">Closed</option>
            </select>
          </Row>

          {/* Status banner */}
          {trade.status === 'open' && !trade.partialTaken && (
            <div className="notice amber" style={{ marginTop: 10 }}>
              Trade is live. Took partial profit?
              {' '}
              <a href="#partial" onClick={(e) => { e.preventDefault(); takePartial(); }} style={{ marginLeft: 4 }}>
                Take partial →
              </a>
            </div>
          )}
          {trade.status === 'runner' && (
            <div className="notice green" style={{ marginTop: 10 }}>
              <strong style={{ color: 'var(--pos)' }}>Runner active.</strong> Partial booked at {trade.partialExit || '—'} for {fmtMoney(partialPnl)}.
              <button className="ghost sm" style={{ marginLeft: 12 }} onClick={closeRunner}>Close runner</button>
            </div>
          )}

          {/* Partial fill subsection */}
          {showPartial && (
            <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <h3 style={{ color: 'var(--gold-bright, var(--amber))', marginBottom: 12 }}>Partial fill</h3>
              <div className="grid-3" style={{ gap: 12 }}>
                <Row label="Exit price">
                  <input value={trade.partialExit} onChange={e => update({ partialExit: e.target.value })} placeholder="5,418" />
                </Row>
                <Row label="R booked">
                  <input value={trade.partialR} onChange={e => update({ partialR: e.target.value })} placeholder="2.5" />
                </Row>
                <Row label="PnL booked ($)">
                  <input value={trade.partialPnl} onChange={e => update({ partialPnl: e.target.value })} placeholder="180" />
                </Row>
              </div>
              {trade.partialAt && (
                <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>booked {fmtDate(trade.partialAt)}</div>
              )}
            </div>
          )}

          {/* Final close subsection */}
          {showFinal && (
            <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: 12 }}>Final close{trade.status === 'runner' ? ' (runner still open)' : ''}</h3>
              <div className="grid-3" style={{ gap: 12 }}>
                <Row label="Runner exit price">
                  <input value={trade.runnerClosedAt} onChange={e => update({ runnerClosedAt: e.target.value })} placeholder="5,440" />
                </Row>
                <Row label="Final R (total)">
                  <input value={trade.rMultiple} onChange={e => update({ rMultiple: e.target.value })} placeholder="3.8" />
                </Row>
                <Row label="Total PnL ($)">
                  <input value={trade.pnl} onChange={e => update({ pnl: e.target.value })} placeholder="320" />
                </Row>
              </div>
              {showPartial && (
                <div className="muted mono" style={{ fontSize: 11.5, marginTop: 10 }}>
                  partial {fmtMoney(partialPnl)} + runner ≈ {fmtMoney(runnerPnl)} = total {fmtMoney(totalPnl)}
                </div>
              )}
              <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
                <label>Outcome</label>
                <select value={trade.outcome} onChange={e => update({ outcome: e.target.value })}>
                  <option value="">—</option>
                  <option value="full target">full target</option>
                  <option value="partial + BE">partial + BE</option>
                  <option value="runner closed at target">runner closed at target</option>
                  <option value="runner stopped at BE">runner stopped at BE</option>
                  <option value="full stop">full stop</option>
                  <option value="invalidated, manual exit">invalidated, manual exit</option>
                </select>
              </div>
            </div>
          )}

          {/* Discipline checks */}
          <div style={{ borderTop: '1px solid var(--border)', margin: '14px 0 10px' }} />
          <Row label="Execution discipline">
            <label className="flex" style={{ gap: 8, margin: 0 }}>
              <input type="checkbox" checked={!!trade.deriskedAt2_5R}
                onChange={e => update({ deriskedAt2_5R: e.target.checked })} style={{ width: 'auto' }} />
              De-risked at 2.5R
            </label>
          </Row>
          <Row label="">
            <label className="flex" style={{ gap: 8, margin: 0 }}>
              <input type="checkbox" checked={!!trade.movedStopToBE}
                onChange={e => update({ movedStopToBE: e.target.checked })} style={{ width: 'auto' }} />
              Stop moved to BE
            </label>
          </Row>

          <Row label="Lesson">
            <AutoTextarea
              value={trade.lesson}
              onChange={e => update({ lesson: e.target.value })}
              placeholder="Process vs. outcome — what did the market teach you?"
            />
          </Row>
          <Row label="Screenshot URL">
            <input value={trade.screenshotUrl} onChange={e => update({ screenshotUrl: e.target.value })} placeholder="link to TradingView snapshot" />
          </Row>

          <div className="flex" style={{ marginTop: 16 }}>
            <button disabled={busy} onClick={() => save()}>{busy ? 'Saving…' : 'Save'}</button>
            {trade.status === 'open' && !trade.partialTaken && (
              <button className="ghost" disabled={busy} onClick={takePartial}>Take partial (book + BE)</button>
            )}
            {trade.status === 'runner' && (
              <button className="ghost" disabled={busy} onClick={closeRunner}>Close runner</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div className="kv">
      <span className="k">{k}</span>
      <span className="v">{v || '—'}</span>
    </div>
  );
}
function Row({ label, children }) {
  return <div className="field">{label ? <label>{label}</label> : null}{children}</div>;
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtMoney(n) {
  if (n == null || isNaN(Number(n))) return '—';
  const num = Number(n);
  const sign = num > 0 ? '+' : '';
  return sign + num.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}
