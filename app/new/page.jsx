'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '../_components/useProfile';

const CONFLUENCE_OPTIONS = [
  'pdVAH', 'pdVAL', 'pdPOC', 'naked level', 'single prints',
  'anchored VWAP', 'HTF S/R', 'liquidity grab', 'fib 0.618', 'fair-value gap',
];

const INSTRUMENTS_FUTURES = ['ES', 'NQ', 'YM', 'RTY'];
const INSTRUMENTS_CRYPTO  = ['BTC', 'ETH'];

export default function NewTrade() {
  const profile = useProfile();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    instrument: 'ES',
    side: 'long',
    level: '',
    dOpen: 'above pdClose',
    trigger: '3C',
    htfBias: '',
    weeklyStructure: '',
    dailyStructure: '',
    ftf30m: '',
    ltf15m: '',
    riskPct: '0.5',
    riskUsd: '',
    entry: '',
    stop: '',
    target: '',
    preNotes: '',
    confluences: [],
  });

  function update(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function toggleConfluence(c) {
    setForm(f => ({
      ...f,
      confluences: f.confluences.includes(c)
        ? f.confluences.filter(x => x !== c)
        : [...f.confluences, c],
    }));
  }

  const gate = useMemo(() => evaluateGate(form), [form]);

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

  return (
    <div>
      <h1>New Trade — Pre-trade Gate</h1>
      <p className="muted">Igor's rule: fill this BEFORE you click. If the gate fails, it's a watchlist, not a trade.</p>

      <form onSubmit={submit}>
        <div className="grid-2">
          <div className="card">
            <h3>Instrument & side</h3>
            <div className="field">
              <label>Instrument</label>
              <select value={form.instrument} onChange={e => update('instrument', e.target.value)}>
                <optgroup label="Futures (Severin)">
                  {INSTRUMENTS_FUTURES.map(i => <option key={i}>{i}</option>)}
                </optgroup>
                <optgroup label="Crypto (Igor)">
                  {INSTRUMENTS_CRYPTO.map(i => <option key={i}>{i}</option>)}
                </optgroup>
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
              <label>Level</label>
              <input
                value={form.level}
                onChange={e => update('level', e.target.value)}
                placeholder="e.g. 5,400 / pdVAH / 76,000"
              />
            </div>
            <div className="field">
              <label>dOpen stat</label>
              <select value={form.dOpen} onChange={e => update('dOpen', e.target.value)}>
                <option>above pdClose</option>
                <option>below pdClose</option>
                <option>open inside pdVA</option>
                <option>gap up &gt; 0.5%</option>
                <option>gap down &gt; 0.5%</option>
              </select>
            </div>
            <div className="field">
              <label>Entry trigger</label>
              <select value={form.trigger} onChange={e => update('trigger', e.target.value)}>
                <option>3C (Severin)</option>
                <option>30m fractal + 15m close (Igor OTF)</option>
                <option>momentum at level</option>
                <option>limit fill</option>
              </select>
            </div>
          </div>

          <div className="card">
            <h3>Top-down structure</h3>
            <div className="field">
              <label>HTF bias (weekly/monthly)</label>
              <input value={form.htfBias} onChange={e => update('htfBias', e.target.value)} placeholder="bullish / bearish / range" />
            </div>
            <div className="field">
              <label>Weekly structure</label>
              <input value={form.weeklyStructure} onChange={e => update('weeklyStructure', e.target.value)} placeholder="HH/HL, LH/LL, range" />
            </div>
            <div className="field">
              <label>Daily structure</label>
              <input value={form.dailyStructure} onChange={e => update('dailyStructure', e.target.value)} />
            </div>
            <div className="field">
              <label>30m fractal</label>
              <input value={form.ftf30m} onChange={e => update('ftf30m', e.target.value)} placeholder="HL formed / waiting" />
            </div>
            <div className="field">
              <label>15m close</label>
              <input value={form.ltf15m} onChange={e => update('ltf15m', e.target.value)} placeholder="confirmed / waiting" />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <h3>Confluences (Severin: minimum 3)</h3>
          <div className="confluence-pills" style={{ flexWrap: 'wrap', gap: 6 }}>
            {CONFLUENCE_OPTIONS.map(c => (
              <span
                key={c}
                className={'p' + (form.confluences.includes(c) ? ' on' : '')}
                style={{ width: 'auto', padding: '2px 10px', fontSize: 12 }}
                onClick={() => toggleConfluence(c)}
              >
                {c}
              </span>
            ))}
          </div>
          <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            Selected: <strong>{form.confluences.length}</strong> {form.confluences.length < 3 && '(under 3 — Severin won\'t take this)'}
          </div>
        </div>

        <div className="grid-3" style={{ marginTop: 12 }}>
          <div className="card">
            <h3>Risk</h3>
            <div className="field">
              <label>Max risk %</label>
              <input value={form.riskPct} onChange={e => update('riskPct', e.target.value)} />
            </div>
            <div className="field">
              <label>Max risk $</label>
              <input value={form.riskUsd} onChange={e => update('riskUsd', e.target.value)} />
            </div>
          </div>
          <div className="card">
            <h3>Levels</h3>
            <div className="field">
              <label>Entry</label>
              <input value={form.entry} onChange={e => update('entry', e.target.value)} />
            </div>
            <div className="field">
              <label>Stop</label>
              <input value={form.stop} onChange={e => update('stop', e.target.value)} />
            </div>
            <div className="field">
              <label>First target</label>
              <input value={form.target} onChange={e => update('target', e.target.value)} />
            </div>
          </div>
          <div className="card">
            <h3>Pre-trade notes</h3>
            <div className="field">
              <textarea
                value={form.preNotes}
                onChange={e => update('preNotes', e.target.value)}
                placeholder="thesis in 1-2 lines"
              />
            </div>
          </div>
        </div>

        <div className={'gate ' + (gate.pass ? '' : 'fail')}>
          <div className="flex between">
            <strong>{gate.pass ? '✓ This is a trade.' : '✗ Not a trade yet — fix the items below.'}</strong>
            <span className="muted">Igor's gate</span>
          </div>
          <ul style={{ margin: '8px 0 0 18px', padding: 0 }}>
            {gate.checks.map(c => (
              <li key={c.label} style={{ color: c.ok ? 'var(--green)' : 'var(--red)' }}>
                {c.ok ? '✓' : '✗'} {c.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex" style={{ marginTop: 16 }}>
          <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Log trade'}</button>
          <span className="muted">You can save even if the gate fails — it'll be marked as not-a-trade.</span>
        </div>
      </form>
    </div>
  );
}

function evaluateGate(f) {
  const checks = [
    { label: 'HTF bias filled',          ok: !!f.htfBias.trim() },
    { label: 'Daily structure filled',   ok: !!f.dailyStructure.trim() },
    { label: '30m fractal status filled',ok: !!f.ftf30m.trim() },
    { label: 'At least 3 confluences',   ok: f.confluences.length >= 3 },
    { label: 'Entry and stop set',       ok: !!f.entry && !!f.stop },
    { label: 'Risk size set',            ok: !!f.riskPct || !!f.riskUsd },
  ];
  return { pass: checks.every(c => c.ok), checks };
}
