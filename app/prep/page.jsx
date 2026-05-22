'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useProfile } from '../_components/useProfile';
import { localToday } from '../../lib/dates';
import AutoTextarea from '../_components/AutoTextarea';

const DOPEN_TAGS = [
  'inside pdVA', 'outside pdVA (high)', 'outside pdVA (low)',
  'upper quartile', 'lower quartile', 'midpoint',
  'gap up', 'gap down', 'flat open',
  'inside pwVA', 'above pwVAH', 'below pwVAL',
  'at ATH', 'above ATH', 'near ATL',
  'sweep D ERL', 'D FVG',
];

export default function PrepPage() {
  const profile = useProfile();
  const today = localToday();
  const [date, setDate] = useState(today);
  const [allPrep, setAllPrep] = useState([]);
  const [allHs, setAllHs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(false);
  const [override, setOverride] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [form, setForm] = useState(emptyPrep(today));
  const [hs, setHs] = useState({ sleep: 3, food: 3, mind: 3, note: '' });

  useEffect(() => { load(); }, [profile]);

  async function load() {
    const db = await fetch('/api/db', { cache: 'no-store' }).then(r => r.json());
    const prepRows = (db.prep || []).filter(p => p.user === profile);
    const hsRows   = (db.headspace || []).filter(h => h.user === profile);
    setAllPrep(prepRows);
    setAllHs(hsRows);
    hydrate(prepRows, hsRows, date);
  }

  function hydrate(prepRows, hsRows, d) {
    const existing = prepRows.find(r => r.date === d);
    if (existing) {
      setForm({ ...emptyPrep(d), ...existing });
      setEdit(false);
    } else {
      setForm(emptyPrep(d));
      setEdit(true);
    }
    const exHs = hsRows.find(r => r.date === d);
    if (exHs) setHs({ sleep: exHs.sleep, food: exHs.food, mind: exHs.mind, note: exHs.note || '' });
    else setHs({ sleep: 3, food: 3, mind: 3, note: '' });
    setOverride(false);
  }

  useEffect(() => {
    if (allPrep.length || allHs.length) hydrate(allPrep, allHs, date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  function update(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function setHsK(k, v) { setHs(s => ({ ...s, [k]: v })); }
  function toggleTag(t) {
    setForm(f => ({
      ...f,
      dOpenTags: f.dOpenTags.includes(t)
        ? f.dOpenTags.filter(x => x !== t)
        : [...f.dOpenTags, t],
    }));
  }

  const status = useMemo(() => evaluate(hs), [hs]);

  async function saveAll() {
    setBusy(true);
    setSaveError(null);
    try {
      const r1 = await fetch('/api/headspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...hs, user: profile, date }),
      });
      if (!r1.ok) throw new Error('headspace save failed: ' + r1.status + ' ' + (await r1.text()));
      const r2 = await fetch('/api/prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, user: profile, date }),
      });
      if (!r2.ok) throw new Error('prep save failed: ' + r2.status + ' ' + (await r2.text()));
      setBusy(false);
      setEdit(false);
      setSavedAt(new Date());
      load();
    } catch (e) {
      setBusy(false);
      setSaveError(String(e.message || e));
    }
  }

  async function standDown() {
    setBusy(true);
    await fetch('/api/headspace', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...hs, user: profile, date }),
    });
    await fetch('/api/no-trade', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: profile, date, reason: `stand-down: sleep ${hs.sleep} / mind ${hs.mind}` }),
    });
    setBusy(false);
    setEdit(false);
    load();
    alert('Marked as flat day. The market will be there tomorrow.');
  }

  const existingDates = useMemo(
    () => [...new Set(allPrep.map(r => r.date))].sort().reverse(),
    [allPrep]
  );

  const blocked = status.tier === 'block' && !override;

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto' }}>
      <div className="flex between" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        <h1>Daily prep <span className="sub">— set the plan before the open</span></h1>
        <div className="flex">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          {!edit && <button className="ghost" onClick={() => setEdit(true)}>Edit</button>}
        </div>
      </div>

      {existingDates.length > 0 && (
        <div className="flex wrap" style={{ marginBottom: 18, gap: 6 }}>
          <span className="label-mini">recent</span>
          {existingDates.slice(0, 10).map(d => (
            <span key={d} className={'chip' + (d === date ? ' on' : '')} onClick={() => setDate(d)}>{d}</span>
          ))}
        </div>
      )}

      {edit ? (
        <EditForm
          form={form} update={update} toggleTag={toggleTag}
          hs={hs} setHsK={setHsK}
          status={status} blocked={blocked}
          override={override} setOverride={setOverride}
          saveAll={saveAll} standDown={standDown}
          busy={busy} saveError={saveError} savedAt={savedAt}
          onCancel={() => hydrate(allPrep, allHs, date)}
        />
      ) : (
        <View form={form} hs={allHs.find(h => h.date === date)} onEdit={() => setEdit(true)} />
      )}
    </div>
  );
}

function emptyPrep(d) {
  return {
    date: d,
    dOpenTags: [], dOpenNote: '',
    context: '', longs: '', shorts: '',
    discipline: '', catalysts: '', bias: '',
    sweep4h: '', sweepD: '', erl: '', fvg4h: '', fvgD: '',
  };
}

function evaluate(hs) {
  // Returns { tier: 'ok' | 'warn' | 'block', message, color }
  if (hs.sleep <= 1 || hs.mind <= 1) {
    return { tier: 'block', message: 'You marked a 1 on sleep or mind. Stand-down day — flat trading only.', color: 'red' };
  }
  if (hs.sleep <= 2 && hs.mind <= 2) {
    return { tier: 'block', message: 'Both sleep and mind below 3. Stand-down day — flat trading only.', color: 'red' };
  }
  const avg = (hs.sleep + hs.food + hs.mind) / 3;
  if (avg < 2.7 || hs.mind <= 2) {
    return { tier: 'warn', message: 'Marginal state. Reduce size, take only A+ setups, no FOMO.', color: 'amber' };
  }
  return { tier: 'ok', message: 'Cleared to trade. Stick to the plan.', color: 'green' };
}

// ============ EDIT FORM ============
function EditForm({ form, update, toggleTag, hs, setHsK, status, blocked, override, setOverride, saveAll, standDown, busy, saveError, savedAt, onCancel }) {
  const hasFvg = !!(form.sweep4h || form.sweepD || form.erl || form.fvg4h || form.fvgD);
  const hasCatalysts = !!form.catalysts;
  const [showFvg, setShowFvg] = useState(hasFvg);
  const [showCatalysts, setShowCatalysts] = useState(hasCatalysts);
  return (
    <form onSubmit={e => { e.preventDefault(); if (!blocked) saveAll(); }}>
      {/* HEADSPACE / READINESS — first thing */}
      <SectionHeader num="00" title="Headspace" hint="Your state is your edge. Rate honestly." />
      <div className="card spacious">
        <div className="grid-3">
          <Rating label="Sleep" value={hs.sleep} onChange={v => setHsK('sleep', v)} />
          <Rating label="Food"  value={hs.food}  onChange={v => setHsK('food', v)} />
          <Rating label="Mind"  value={hs.mind}  onChange={v => setHsK('mind', v)} />
        </div>
        <div className="field" style={{ marginTop: 16, marginBottom: 4 }}>
          <label>Note (optional)</label>
          <AutoTextarea value={hs.note} onChange={e => setHsK('note', e.target.value)} placeholder="anything off? energy, focus, sleep quality…" />
        </div>

        <div className={'notice ' + status.color} style={{ marginTop: 16, marginBottom: 0 }}>
          <strong style={{ color: `var(--${status.color === 'green' ? 'green-bright' : status.color})` }}>
            {status.tier === 'ok' ? '✓ ' : status.tier === 'warn' ? '⚠ ' : '✗ '}
            {status.message}
          </strong>
        </div>

        {status.tier === 'block' && (
          <div style={{ marginTop: 16, padding: 16, background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8 }}>
            <div style={{ fontSize: 14.5, marginBottom: 12 }}>
              The honest move is to sit out. <strong>The chart will be there tomorrow.</strong>
            </div>
            <div className="flex" style={{ flexWrap: 'wrap' }}>
              <button type="button" className="danger" onClick={standDown} disabled={busy}>
                {busy ? 'Saving…' : 'Stand down — flat day'}
              </button>
              <label className="flex gap-6" style={{ margin: 0, cursor: 'pointer' }}>
                <input type="checkbox" checked={override} onChange={e => setOverride(e.target.checked)} style={{ width: 'auto', height: 'auto' }} />
                <span style={{ color: 'var(--fg-dim)', fontSize: 12.5 }}>I understand. Let me save the prep anyway.</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Disable visually below if blocked */}
      <div style={{ opacity: blocked ? 0.4 : 1, pointerEvents: blocked ? 'none' : 'auto' }}>

        <SectionHeader num="01" title="dOpen & bias" hint="Where price opens vs prior day" />
        <div className="grid-2-1">
          <div className="card spacious">
            <label>dOpen tags</label>
            <div className="chips" style={{ marginBottom: 14 }}>
              {DOPEN_TAGS.map(t => (
                <span key={t} className={'chip' + (form.dOpenTags.includes(t) ? ' on' : '')} onClick={() => toggleTag(t)}>{t}</span>
              ))}
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Note</label>
              <input className="lg" value={form.dOpenNote} onChange={e => update('dOpenNote', e.target.value)} placeholder="extra context on the open" />
            </div>
          </div>

          <div className="card spacious">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Bias</label>
              <select value={form.bias} onChange={e => update('bias', e.target.value)}>
                <option value="">— pick —</option>
                <option>strong long</option>
                <option>long-leaning</option>
                <option>neutral / two-way</option>
                <option>short-leaning</option>
                <option>strong short</option>
                <option>cash / no edge</option>
              </select>
            </div>
          </div>
        </div>

        <SectionHeader num="02" title="Context" hint="Recent structure, levels claimed, key reads" />
        <div className="card spacious">
          <AutoTextarea
            className="xl notes"
            value={form.context}
            onChange={e => update('context', e.target.value)}
            placeholder={'one bullet per line, e.g.\n• tested lower value as support\n• claimed pwPOC'}
          />
        </div>

        {!showFvg ? (
          <div className="section-header">
            <span className="num">02b</span>
            <span className="title">Liquidity & FVG</span>
            <button type="button" className="ghost sm" style={{ marginLeft: 'auto' }} onClick={() => setShowFvg(true)}>+ add</button>
          </div>
        ) : (
        <>
        <SectionHeader num="02b" title="Liquidity & FVG" hint="Sweeps, ranges, fair-value gaps" />
        <div className="grid-2">
          <div className="card spacious">
            <div className="field">
              <label>4H sweeps</label>
              <AutoTextarea
                value={form.sweep4h}
                onChange={e => update('sweep4h', e.target.value)}
                placeholder={'e.g.\n4368 high not yet swept\n4321 low taken last session'}
                style={{ minHeight: 90 }}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Daily sweeps</label>
              <AutoTextarea
                value={form.sweepD}
                onChange={e => update('sweepD', e.target.value)}
                placeholder={'e.g.\nDH not yet swept\nDL taken yesterday'}
                style={{ minHeight: 90 }}
              />
            </div>
          </div>
          <div className="card spacious">
            <div className="field">
              <label>ERL (External Range Liquidity)</label>
              <AutoTextarea
                value={form.erl}
                onChange={e => update('erl', e.target.value)}
                placeholder={'e.g.\nprev week high at 4400\nmonthly high at 4520'}
                style={{ minHeight: 90 }}
              />
            </div>
            <div className="field">
              <label>4H FVG</label>
              <AutoTextarea
                value={form.fvg4h}
                onChange={e => update('fvg4h', e.target.value)}
                placeholder={'e.g.\n4350-4358 unfilled\n4310-4318 partial fill'}
                style={{ minHeight: 80 }}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>D FVG</label>
              <AutoTextarea
                value={form.fvgD}
                onChange={e => update('fvgD', e.target.value)}
                placeholder={'e.g.\n4280-4295 still open\n4180-4205 filled'}
                style={{ minHeight: 80 }}
              />
            </div>
          </div>
        </div>
        </>
        )}

        <SectionHeader num="03" title="Trade plan" hint="Pre-defined orders by type" />
        <div className="grid-2">
          <div className="card spacious" style={{ borderTop: '3px solid var(--green)' }}>
            <h3 style={{ color: 'var(--green-bright)' }}>Longs</h3>
            <AutoTextarea
              className="xl notes"
              value={form.longs}
              onChange={e => update('longs', e.target.value)}
              placeholder={'one per line, e.g.\n• pdClose + dVWAP (scalp)\n• pdEQ + pdVAH + OVL (daytrade)'}
            />
          </div>
          <div className="card spacious" style={{ borderTop: '3px solid var(--red)' }}>
            <h3 style={{ color: 'var(--red)' }}>Shorts</h3>
            <AutoTextarea
              className="xl notes"
              value={form.shorts}
              onChange={e => update('shorts', e.target.value)}
              placeholder={'one per line, e.g.\n• pwVAH only.. (daytrade)\n• none; close to ATH, market is strong'}
            />
          </div>
        </div>

        <SectionHeader num="04" title="Discipline" hint="Rules of engagement for the day" />
        <div className="card spacious" style={{ borderLeft: '3px solid var(--amber)' }}>
          <AutoTextarea
            className="xl notes"
            value={form.discipline}
            onChange={e => update('discipline', e.target.value)}
            placeholder={'one rule per line, e.g.\n• trades: Sequence 9 + COT\n• be late rather than too early'}
          />
        </div>

        {!showCatalysts ? (
          <div className="section-header">
            <span className="num">05</span>
            <span className="title">Catalysts</span>
            <button type="button" className="ghost sm" style={{ marginLeft: 'auto' }} onClick={() => setShowCatalysts(true)}>+ add</button>
          </div>
        ) : (
        <>
        <SectionHeader num="05" title="Catalysts" hint="News, earnings, macro events (optional)" />
        <div className="card spacious">
          <AutoTextarea
            className="lg notes"
            value={form.catalysts}
            onChange={e => update('catalysts', e.target.value)}
            placeholder="CPI 14:30 · FOMC minutes 20:00 · AAPL earnings after close…"
          />
        </div>
        </>
        )}
      </div>

      {saveError && (
        <div className="notice red" style={{ marginTop: 20 }}>
          <strong style={{ color: 'var(--neg)' }}>Save failed.</strong> {saveError}
          {' '}<a href="/setup">Fix storage →</a>
        </div>
      )}
      {savedAt && !saveError && (
        <div className="notice green" style={{ marginTop: 20 }}>
          <strong style={{ color: 'var(--pos)' }}>Saved ✓</strong> {new Date(savedAt).toLocaleTimeString()}
        </div>
      )}
      <div className="flex" style={{ marginTop: 24 }}>
        <button type="submit" className="lg" disabled={busy || blocked}>
          {busy ? 'Saving…' : (blocked ? 'Stand down to continue' : 'Save prep')}
        </button>
        <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function SectionHeader({ num, title, hint }) {
  return (
    <div className="section-header">
      <span className="num">{num}</span>
      <span className="title">{title}</span>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

function Rating({ label, value, onChange }) {
  return (
    <div>
      <label>{label}</label>
      <div className="rating-pills">
        {[1,2,3,4,5].map(n => (
          <span key={n} className={'p' + (value >= n ? ' on' : '')} onClick={() => onChange(n)}>{n}</span>
        ))}
      </div>
    </div>
  );
}

// ============ READ-ONLY VIEW ============
function View({ form, hs, onEdit }) {
  const empty = !form.dOpenTags.length && !form.context && !form.longs && !form.shorts && !form.discipline;
  if (empty) {
    return (
      <div className="empty">
        <div className="big">No prep for {form.date}</div>
        <div>Write the plan before the open. Half the trade is the prep.</div>
        <div className="small">Plan the trade. Trade the plan.</div>
        <div style={{ marginTop: 20 }}><button onClick={onEdit}>Start prep</button></div>
      </div>
    );
  }
  return (
    <div className="prep-view">
      {hs && (
        <div className="prep-block" style={{ borderLeftColor: 'var(--amber)' }}>
          <h3>Headspace</h3>
          <div className="flex" style={{ gap: 24, flexWrap: 'wrap' }}>
            <Stat label="Sleep" v={hs.sleep} />
            <Stat label="Food"  v={hs.food}  />
            <Stat label="Mind"  v={hs.mind}  />
          </div>
          {hs.note && <div className="dim" style={{ marginTop: 10 }}>{hs.note}</div>}
        </div>
      )}

      <div className="prep-block">
        <h3>dOpen</h3>
        <div className="chips" style={{ marginBottom: form.dOpenNote ? 10 : 0 }}>
          {form.dOpenTags.map(t => <span key={t} className="chip on">{t}</span>)}
        </div>
        {form.dOpenNote && <div className="dim">{form.dOpenNote}</div>}
      </div>

      {form.bias && (
        <div className="prep-block">
          <h3>Bias</h3>
          <div className="bias-text">{form.bias}</div>
        </div>
      )}

      {form.context && (
        <div className="prep-block context">
          <h3>Context</h3>
          {form.context.split('\n').filter(Boolean).map((l, i) => <div key={i} className="line">{cleanLead(l)}</div>)}
        </div>
      )}

      {form.longs && (
        <div className="prep-block longs">
          <h3>Longs</h3>
          {form.longs.split('\n').filter(Boolean).map((l, i) => <div key={i} className="line">{cleanLead(l)}</div>)}
        </div>
      )}

      {form.shorts && (
        <div className="prep-block shorts">
          <h3>Shorts</h3>
          {form.shorts.split('\n').filter(Boolean).map((l, i) => <div key={i} className="line">{cleanLead(l)}</div>)}
        </div>
      )}

      {(form.sweep4h || form.sweepD || form.erl || form.fvg4h || form.fvgD) && (
        <div className="prep-block" style={{ borderLeftColor: 'var(--purple, #b78cf5)' }}>
          <h3>Liquidity & FVG</h3>
          <div className="grid-2" style={{ gap: 18, marginTop: 8 }}>
            {form.sweep4h && <FvgField label="4H sweeps"  text={form.sweep4h} />}
            {form.sweepD  && <FvgField label="Daily sweeps" text={form.sweepD} />}
            {form.erl     && <FvgField label="ERL"        text={form.erl} />}
            {form.fvg4h   && <FvgField label="4H FVG"     text={form.fvg4h} />}
            {form.fvgD    && <FvgField label="D FVG"      text={form.fvgD} />}
          </div>
        </div>
      )}

      {form.discipline && (
        <div className="prep-block discipline">
          <h3>Discipline</h3>
          {form.discipline.split('\n').filter(Boolean).map((l, i) => <div key={i} className="line">{cleanLead(l)}</div>)}
        </div>
      )}

      {form.catalysts && (
        <div className="prep-block">
          <h3>Catalysts / News</h3>
          {form.catalysts.split('\n').filter(Boolean).map((l, i) => <div key={i} className="line">{cleanLead(l)}</div>)}
        </div>
      )}

      <div className="flex">
        <button onClick={onEdit}>Edit</button>
      </div>
    </div>
  );
}

function cleanLead(s) {
  return s.replace(/^[•\-\*]\s?/, '');
}

function Stat({ label, v }) {
  const color = v >= 4 ? 'var(--green-bright)' : v >= 3 ? 'var(--fg)' : v >= 2 ? 'var(--amber)' : 'var(--red)';
  return (
    <div>
      <div className="label-mini" style={{ marginBottom: 4 }}>{label}</div>
      <div className="mono" style={{ fontSize: 22, color, fontWeight: 600 }}>{v}<span className="muted" style={{ fontSize: 13 }}>/5</span></div>
    </div>
  );
}

function FvgField({ label, text }) {
  return (
    <div>
      <div className="label-mini" style={{ marginBottom: 6 }}>{label}</div>
      {text.split('\n').filter(Boolean).map((l, i) => (
        <div key={i} style={{ color: 'var(--fg)', fontSize: 14, lineHeight: 1.55, marginTop: 2 }}>
          <span style={{ color: 'var(--muted)', marginRight: 8 }}>•</span>{l.replace(/^[•\-\*]\s?/, '')}
        </div>
      ))}
    </div>
  );
}
