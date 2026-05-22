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
  const [adding, setAdding] = useState(false);
  const [exitForm, setExitForm] = useState({ contracts: 1, price: '', r: '', pnl: '', note: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetch(`/api/trades/${id}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setTrade(d.trade));
  }, [id]);

  if (!trade) return <div className="muted">Loading…</div>;

  const totalContracts = Number(trade.contracts) || 1;
  const exits = Array.isArray(trade.exits) ? trade.exits : [];
  const usedContracts = exits.reduce((s, e) => s + (Number(e.contracts) || 0), 0);
  const openContracts = totalContracts - usedContracts;
  const totalPnl = exits.reduce((s, e) => s + (Number(e.pnl) || 0), 0);
  const weightedR = exits.reduce((s, e) => s + (Number(e.r) || 0) * (Number(e.contracts) || 0), 0);
  const avgR = usedContracts > 0 ? weightedR / usedContracts : 0;

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

  function startAddExit() {
    setExitForm({
      contracts: Math.max(1, openContracts),
      price: '',
      r: '',
      pnl: '',
      note: '',
    });
    setAdding(true);
    setEditingId(null);
  }
  function startEditExit(e) {
    setExitForm({
      contracts: e.contracts,
      price: e.price || '',
      r: e.r || '',
      pnl: e.pnl || '',
      note: e.note || '',
    });
    setEditingId(e.id);
    setAdding(true);
  }

  async function saveExit() {
    const wantedContracts = Math.max(1, Number(exitForm.contracts) || 1);
    // For new exits, cap at openContracts. For edits, cap at openContracts + the editing row's current value.
    const currentRowContracts = editingId ? (exits.find(x => x.id === editingId)?.contracts || 0) : 0;
    const maxAllowed = openContracts + currentRowContracts;
    const contracts = Math.min(wantedContracts, maxAllowed);
    if (contracts < 1) { alert('No contracts left to exit.'); return; }

    const newExit = {
      id: editingId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      contracts,
      price: exitForm.price,
      r: exitForm.r,
      pnl: exitForm.pnl,
      note: exitForm.note,
      closedAt: editingId ? (exits.find(x => x.id === editingId)?.closedAt || new Date().toISOString()) : new Date().toISOString(),
    };

    const nextExits = editingId
      ? exits.map(x => x.id === editingId ? newExit : x)
      : [...exits, newExit];

    await save({ exits: nextExits });
    setAdding(false);
    setEditingId(null);
  }

  async function deleteExit(exitId) {
    if (!confirm('Delete this exit row?')) return;
    await save({ exits: exits.filter(e => e.id !== exitId) });
  }

  async function del() {
    if (!confirm('Delete this trade?')) return;
    await fetch(`/api/trades/${id}`, { method: 'DELETE' });
    router.push('/trades');
  }

  return (
    <div>
      <div className="flex between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <h1>
          {trade.instrument} {trade.side.toUpperCase()}
          <span className="sub">— {trade.level || '(no level)'}</span>
        </h1>
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
          <KV k="Contracts (size)" v={totalContracts} />
          <KV k="dOpen" v={trade.dOpen} />
          <KV k="Trigger" v={trade.trigger} />
          <KV k="HTF bias" v={trade.htfBias} />
          <KV k="Confluences" v={(trade.confluences || []).join(', ') || '—'} />
          <KV k="Entry / Stop / Target" v={`${trade.entry || '—'} / ${trade.stop || '—'} / ${trade.target || '—'}`} />
          <KV k="Risk" v={`${trade.riskPct || '—'}% / $${trade.riskUsd || '—'}`} />
          <KV k="Thesis" v={trade.thesis || trade.preNotes} />
        </div>

        {/* ============= Post-trade ============= */}
        <div className="card spacious">
          <div className="flex between" style={{ marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Exits</h3>
            <span className={'tag ' + statusTag(trade.status)}>{trade.status}</span>
          </div>

          {/* Contracts status */}
          <div className="flex" style={{ gap: 18, marginBottom: 14, padding: '12px 14px', background: 'var(--bg-2)', borderRadius: 6, border: '1px solid var(--border)' }}>
            <Stat label="Total"  v={totalContracts} />
            <Stat label="Closed" v={usedContracts} color={usedContracts === totalContracts ? 'var(--pos)' : 'var(--fg)'} />
            <Stat label="Open"   v={openContracts} color={openContracts > 0 ? 'var(--amber)' : 'var(--muted)'} />
            <div style={{ marginLeft: 'auto' }}>
              <Stat
                label="Total PnL"
                v={fmtMoney(totalPnl)}
                color={totalPnl > 0 ? 'var(--pos)' : totalPnl < 0 ? 'var(--neg)' : 'var(--fg)'}
              />
            </div>
          </div>

          {/* Exits table */}
          {exits.length > 0 ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Contracts</th><th>Price</th><th>R</th>
                    <th className="right">PnL</th><th>Note</th><th>When</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {exits.map((e, i) => (
                    <tr key={e.id}>
                      <td className="muted mono">{i + 1}</td>
                      <td>{e.contracts}</td>
                      <td className="mono">{e.price || '—'}</td>
                      <td className="mono">{e.r || '—'}</td>
                      <td className={'right mono ' + (Number(e.pnl) > 0 ? 'pnl-pos' : Number(e.pnl) < 0 ? 'pnl-neg' : '')}>
                        {fmtMoney(e.pnl)}
                      </td>
                      <td className="dim" style={{ fontSize: 12 }}>{e.note || '—'}</td>
                      <td className="muted" style={{ fontSize: 11 }}>{e.closedAt ? fmtDate(e.closedAt) : '—'}</td>
                      <td>
                        <button className="ghost sm" onClick={() => startEditExit(e)}>edit</button>
                        {' '}
                        <button className="danger sm" onClick={() => deleteExit(e.id)}>×</button>
                      </td>
                    </tr>
                  ))}
                  {usedContracts > 0 && (
                    <tr style={{ background: 'var(--bg-2)' }}>
                      <td colSpan="2" className="mono"><strong>Σ {usedContracts}</strong></td>
                      <td className="muted">avg R</td>
                      <td className="mono"><strong>{avgR.toFixed(2)}</strong></td>
                      <td className={'right mono ' + (totalPnl > 0 ? 'pnl-pos' : totalPnl < 0 ? 'pnl-neg' : '')}>
                        <strong>{fmtMoney(totalPnl)}</strong>
                      </td>
                      <td colSpan="3"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="muted" style={{ padding: '12px 0', fontSize: 13 }}>No exits yet. Trade is live with {totalContracts} contract{totalContracts === 1 ? '' : 's'}.</div>
          )}

          {/* Add / edit exit form */}
          {adding && (
            <div style={{ marginTop: 14, padding: 16, background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--amber)' }}>
              <h3 style={{ marginBottom: 12, color: 'var(--amber)' }}>{editingId ? 'Edit exit' : 'New exit'}</h3>
              <div className="grid-3" style={{ gap: 10 }}>
                <Row label={`Contracts (max ${openContracts + (editingId ? (exits.find(x => x.id === editingId)?.contracts || 0) : 0)})`}>
                  <input
                    type="number" min="1" step="1"
                    value={exitForm.contracts}
                    onChange={e => setExitForm(f => ({ ...f, contracts: e.target.value }))}
                  />
                </Row>
                <Row label="Exit price">
                  <input value={exitForm.price} onChange={e => setExitForm(f => ({ ...f, price: e.target.value }))} placeholder="5,418" />
                </Row>
                <Row label="R for this exit">
                  <input value={exitForm.r} onChange={e => setExitForm(f => ({ ...f, r: e.target.value }))} placeholder="2.5" />
                </Row>
              </div>
              <Row label="PnL for this exit ($)">
                <input value={exitForm.pnl} onChange={e => setExitForm(f => ({ ...f, pnl: e.target.value }))} placeholder="180" />
              </Row>
              <Row label="Note (optional)">
                <input value={exitForm.note} onChange={e => setExitForm(f => ({ ...f, note: e.target.value }))} placeholder="scalp partial / runner / stop hit…" />
              </Row>
              <div className="flex" style={{ marginTop: 12 }}>
                <button onClick={saveExit} disabled={busy}>{busy ? 'Saving…' : (editingId ? 'Update exit' : 'Add exit')}</button>
                <button className="ghost" onClick={() => { setAdding(false); setEditingId(null); }}>Cancel</button>
              </div>
            </div>
          )}

          {!adding && (
            <div className="flex" style={{ marginTop: 12 }}>
              {openContracts > 0 ? (
                <button onClick={startAddExit}>+ Add exit ({openContracts} open)</button>
              ) : (
                <div className="notice green" style={{ margin: 0, flex: 1 }}>
                  <strong style={{ color: 'var(--pos)' }}>All contracts closed.</strong> Total realized {fmtMoney(totalPnl)}.
                </div>
              )}
            </div>
          )}

          {/* Discipline + lesson */}
          <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0 12px' }} />
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
            <button disabled={busy} onClick={() => save()}>{busy ? 'Saving…' : 'Save notes'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function statusTag(status) {
  if (status === 'open') return 'amber';
  if (status === 'runner') return 'purple';
  if (status === 'closed') return 'blue';
  return '';
}
function KV({ k, v }) {
  return <div className="kv"><span className="k">{k}</span><span className="v">{v || '—'}</span></div>;
}
function Row({ label, children }) {
  return <div className="field">{label ? <label>{label}</label> : null}{children}</div>;
}
function Stat({ label, v, color }) {
  return (
    <div>
      <div className="label-mini" style={{ marginBottom: 3 }}>{label}</div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: color || 'var(--fg)' }}>{v}</div>
    </div>
  );
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtMoney(n) {
  if (n === '' || n == null || isNaN(Number(n))) return '—';
  const num = Number(n);
  const sign = num > 0 ? '+' : '';
  return sign + num.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}
