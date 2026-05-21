'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProfile } from '../_components/useProfile';

const CONFLUENCES = [
  'pdVAH', 'pdVAL', 'pdPOC', 'pwVAH', 'pwVAL', 'pwPOC',
  'naked level', 'single prints', 'anchored VWAP', 'dVWAP',
  'HTF S/R', 'liquidity grab', 'fib 0.618', 'fair-value gap', 'OVL',
];

const INSTRUMENTS = ['ES', 'NQ', 'YM', 'RTY', 'BTC', 'ETH'];

export default function NewTrade() {
  const profile = useProfile();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [prepBlocker, setPrepBlocker] = useState(null); // null | { reason, hsReady }
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    instrument: 'ES',
    side: 'long',
    level: '',
    entry: '',
    stop: '',
    target: '',
    riskUsd: '',
    confluences: [],
    thesis: '',
  });

  // Check if today's prep + headspace allow trading
  useEffect(() => {
    fetch('/api/db', { cache: 'no-store' })
      .then(r => r.json())
      .then(db => {
        const hs = (db.headspace || []).find(h => h.user === profile && h.date === today);
        const prep = (db.prep || []).find(p => p.user === profile && p.date === today);
        const hsReady = hs && tradeReady(hs);
        let reason = null;
        if (!prep) reason = 'no prep';
        else if (!hs) reason = 'no headspace';
        else if (!hsReady) reason = 'stand-down';
        setPrepBlocker(reason ? { reason, hs, prep } : null);
      });
  }, [profile, today]);

  function update(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function toggleConfluence(c) {
    setForm(f => ({
      ...f,
      confluences: f.confluences.includes(c)
        ? f.confluences.filter(x => x !== c)
        : [...f.confluences, c],
    }));
  }

  const gate = useMemo(() => evaluate(form), [form]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, user: profile, isATrade: gate.pass }),
    });
    const { trade } = await res.json();
    setBusy(false);
    router.push(`/trades/${trade.id}`);
  }

  if (prepBlocker) {
    return <Blocked reason={prepBlocker.reason} />;
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1>New trade <span className="sub">— keep it simple</span></h1>
      <p className="dim">Six fields. If the gate doesn't pass, it stays a watchlist item — not a trade.</p>

      <form onSubmit={submit}>
        {/* Setup */}
        <div className="card spacious" style={{ marginTop: 20 }}>
          <h3>Setup</h3>
          <div className="grid-3">
            <div className="field">
              <label>Instrument</label>
              <select value={form.instrument} onChange={e => update('instrument', e.target.value)}>
                {INSTRUMENTS.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Side</label>
              <select value={form.side} onChange={e => update('side', e.target.value)}>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
            <div className="field">
              <label>Level / idea</label>
              <input value={form.level} onChange={e => update('level', e.target.value)} placeholder="e.g. pdVAH + OVL" />
            </div>
          </div>
        </div>

        {/* Levels + Risk */}
        <div className="card spacious" style={{ marginTop: 16 }}>
          <h3>Levels & risk</h3>
          <div className="grid-3">
            <div className="field">
              <label>Entry</label>
              <input className="lg" value={form.entry} onChange={e => update('entry', e.target.value)} placeholder="5,405" />
            </div>
            <div className="field">
              <label>Stop</label>
              <input className="lg" value={form.stop} onChange={e => update('stop', e.target.value)} placeholder="5,396" />
            </div>
            <div className="field">
              <label>First target</label>
              <input className="lg" value={form.target} onChange={e => update('target', e.target.value)} placeholder="5,428" />
            </div>
          </div>
          <div className="field" style={{ maxWidth: 220 }}>
            <label>Max risk ($)</label>
            <input className="lg" value={form.riskUsd} onChange={e => update('riskUsd', e.target.value)} placeholder="200" />
          </div>
        </div>

        {/* Confluences */}
        <div className="card spacious" style={{ marginTop: 16 }}>
          <div className="flex between" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Confluences</h3>
            <span className="mono" style={{ fontSize: 12, color: form.confluences.length >= 3 ? 'var(--green-bright)' : 'var(--red)' }}>
              {form.confluences.length} / 3 minimum
            </span>
          </div>
          <div className="chips">
            {CONFLUENCES.map(c => (
              <span key={c} className={'chip lg' + (form.confluences.includes(c) ? ' on' : '')} onClick={() => toggleConfluence(c)}>{c}</span>
            ))}
          </div>
        </div>

        {/* Thesis */}
        <div className="card spacious" style={{ marginTop: 16 }}>
          <h3>Thesis</h3>
          <textarea
            className="lg"
            value={form.thesis}
            onChange={e => update('thesis', e.target.value)}
            placeholder="Why this trade, why now. One or two sentences."
          />
        </div>

        {/* Gate */}
        <div className={'gate ' + (gate.pass ? 'pass' : 'fail')}>
          <div className="flex between">
            <strong style={{ color: gate.pass ? 'var(--green-bright)' : 'var(--red)', fontSize: 15 }}>
              {gate.pass ? 'Clear — this is a trade.' : 'Not a trade yet.'}
            </strong>
            <span className="muted mono" style={{ fontSize: 11 }}>pre-flight</span>
          </div>
          <ul>
            {gate.checks.map(c => (
              <li key={c.label} className={c.ok ? 'ok' : 'bad'}>{c.label}</li>
            ))}
          </ul>
        </div>

        <div className="flex" style={{ marginTop: 20 }}>
          <button type="submit" className="lg" disabled={busy}>{busy ? 'Saving…' : 'Log trade'}</button>
          <span className="muted" style={{ fontSize: 13 }}>You can still log a failing trade — it'll be flagged as not-a-trade. Honest journal wins.</span>
        </div>
      </form>
    </div>
  );
}

function evaluate(f) {
  const checks = [
    { label: 'At least 3 confluences',  ok: f.confluences.length >= 3 },
    { label: 'Entry and stop set',       ok: !!f.entry && !!f.stop },
    { label: 'Risk size set',            ok: !!f.riskUsd },
    { label: 'Thesis written',           ok: !!f.thesis.trim() && f.thesis.trim().length > 5 },
  ];
  return { pass: checks.every(c => c.ok), checks };
}

function tradeReady(hs) {
  if (!hs) return false;
  if (hs.sleep <= 1 || hs.mind <= 1) return false;
  if (hs.sleep <= 2 && hs.mind <= 2) return false;
  return true;
}

function Blocked({ reason }) {
  const reasons = {
    'no prep':       { title: 'No prep for today', body: 'Set the plan before the trade. Open Daily Prep, write your dOpen, longs, shorts, and discipline first.', cta: 'Go to Daily Prep', tone: 'amber' },
    'no headspace':  { title: 'Log your state first', body: 'Headspace is now part of prep. Rate sleep / food / mind before you trade.', cta: 'Open Daily Prep', tone: 'amber' },
    'stand-down':    { title: 'Stand-down day', body: 'Your state is below the threshold for execution. The market will be there tomorrow.', cta: 'Mark as flat day', tone: 'red' },
  };
  const r = reasons[reason] || reasons['no prep'];
  return (
    <div style={{ maxWidth: 540, margin: '60px auto', textAlign: 'center' }}>
      <div className="card spacious" style={{ borderLeft: '3px solid var(--' + (r.tone) + ')' }}>
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>{r.title}</h2>
        <p style={{ fontSize: 14.5 }}>{r.body}</p>
        <div className="flex" style={{ justifyContent: 'center', marginTop: 18 }}>
          <Link href="/prep"><button className={r.tone}>{r.cta}</button></Link>
        </div>
      </div>
    </div>
  );
}
