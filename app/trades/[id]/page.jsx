'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

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
  async function del() {
    if (!confirm('Delete this trade?')) return;
    await fetch(`/api/trades/${id}`, { method: 'DELETE' });
    router.push('/trades');
  }

  return (
    <div>
      <div className="flex between" style={{ marginBottom: 14 }}>
        <h1>{trade.instrument} {trade.side.toUpperCase()} <span className="sub">— {trade.level || '(no level)'}</span></h1>
        <div className="flex">
          <Link href="/trades"><button className="ghost">← Back</button></Link>
          <button className="danger" onClick={del}>Delete</button>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
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
          <KV k="Pre notes" v={trade.preNotes} />
        </div>

        <div className="card">
          <h3>Post-trade — fill after exit</h3>
          <Row label="Status">
            <select value={trade.status} onChange={e => update({ status: e.target.value })}>
              <option value="open">open</option>
              <option value="closed">closed</option>
            </select>
          </Row>
          <Row label="Exit price"><input value={trade.exit} onChange={e => update({ exit: e.target.value })} /></Row>
          <Row label="R multiple"><input value={trade.rMultiple} onChange={e => update({ rMultiple: e.target.value })} placeholder="e.g. 2.5" /></Row>
          <Row label="PnL ($)"><input value={trade.pnl} onChange={e => update({ pnl: e.target.value })} /></Row>
          <Row label="Outcome">
            <select value={trade.outcome} onChange={e => update({ outcome: e.target.value })}>
              <option value="">—</option>
              <option value="full target">full target</option>
              <option value="partial + BE">partial + BE</option>
              <option value="runner closed">runner closed</option>
              <option value="full stop">full stop</option>
              <option value="invalidated, manual exit">invalidated, manual exit</option>
            </select>
          </Row>

          <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }} />

          <Row label="Execution discipline">
            <label className="flex" style={{ gap: 8 }}>
              <input type="checkbox" checked={!!trade.deriskedAt2_5R}
                onChange={e => update({ deriskedAt2_5R: e.target.checked })} style={{ width: 'auto' }} />
              De-risked at 2.5R
            </label>
          </Row>
          <Row label="">
            <label className="flex" style={{ gap: 8 }}>
              <input type="checkbox" checked={!!trade.movedStopToBE}
                onChange={e => update({ movedStopToBE: e.target.checked })} style={{ width: 'auto' }} />
              Stop moved to BE
            </label>
          </Row>
          <Row label="Runner closed at"><input value={trade.runnerClosedAt} onChange={e => update({ runnerClosedAt: e.target.value })} /></Row>

          <Row label="Lesson"><textarea value={trade.lesson} onChange={e => update({ lesson: e.target.value })} placeholder="Process vs. outcome — what did the market teach you?" /></Row>
          <Row label="Screenshot URL"><input value={trade.screenshotUrl} onChange={e => update({ screenshotUrl: e.target.value })} placeholder="link to TradingView snapshot" /></Row>

          <div className="flex" style={{ marginTop: 14 }}>
            <button disabled={busy} onClick={() => save()}>{busy ? 'Saving…' : 'Save'}</button>
            {trade.status === 'open' && (
              <button className="ghost" disabled={busy}
                onClick={() => save({ status: 'closed', exitedAt: new Date().toISOString() })}>
                Mark closed
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div className="flex" style={{ justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed var(--border)' }}>
      <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</span>
      <span style={{ textAlign: 'right' }}>{v || '—'}</span>
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
