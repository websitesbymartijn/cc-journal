'use client';

import { useEffect, useMemo, useState } from 'react';
import { useProfile } from '../_components/useProfile';

const DOPEN_TAGS = [
  'inside pdVA', 'outside pdVA (high)', 'outside pdVA (low)',
  'upper quartile', 'lower quartile', 'midpoint',
  'gap up', 'gap down', 'flat open',
  'inside pwVA', 'above pwVAH', 'below pwVAL',
  'at ATH', 'above ATH', 'near ATL',
];

export default function PrepPage() {
  const profile = useProfile();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(emptyPrep(today));

  useEffect(() => { load(); }, [profile]);

  async function load() {
    const d = await fetch(`/api/prep?user=${profile}`, { cache: 'no-store' }).then(r => r.json());
    setRows(d.prep || []);
    hydrateForDate(d.prep || [], date);
  }

  function hydrateForDate(all, d) {
    const existing = all.find(r => r.date === d);
    if (existing) {
      setForm({ ...emptyPrep(d), ...existing });
      setEdit(false);
    } else {
      setForm(emptyPrep(d));
      setEdit(true);
    }
  }

  useEffect(() => { if (rows.length) hydrateForDate(rows, date); }, [date]);

  function update(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function toggleTag(t) {
    setForm(f => ({
      ...f,
      dOpenTags: f.dOpenTags.includes(t)
        ? f.dOpenTags.filter(x => x !== t)
        : [...f.dOpenTags, t],
    }));
  }

  async function save() {
    setBusy(true);
    await fetch('/api/prep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, user: profile, date }),
    });
    setBusy(false);
    setEdit(false);
    load();
  }

  const existingDates = useMemo(
    () => [...new Set(rows.map(r => r.date))].sort().reverse(),
    [rows]
  );

  return (
    <div>
      <div className="flex between" style={{ marginBottom: 16 }}>
        <h1>Daily Prep <span className="sub">— set the plan before the open</span></h1>
        <div className="flex">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          {!edit && <button className="ghost" onClick={() => setEdit(true)}>Edit</button>}
        </div>
      </div>

      {existingDates.length > 0 && (
        <div className="flex wrap" style={{ marginBottom: 14, gap: 6 }}>
          <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>recent:</span>
          {existingDates.slice(0, 8).map(d => (
            <span
              key={d}
              className={'chip' + (d === date ? ' on' : '')}
              onClick={() => setDate(d)}
            >{d}</span>
          ))}
        </div>
      )}

      {edit ? (
        <EditForm
          form={form}
          update={update}
          toggleTag={toggleTag}
          save={save}
          busy={busy}
          onCancel={() => hydrateForDate(rows, date)}
          hasExisting={rows.some(r => r.date === date)}
        />
      ) : (
        <View form={form} onEdit={() => setEdit(true)} />
      )}
    </div>
  );
}

function emptyPrep(d) {
  return {
    date: d,
    dOpenTags: [],
    dOpenNote: '',
    context: '',
    longs: '',
    shorts: '',
    discipline: '',
    catalysts: '',
    bias: '',
  };
}

function View({ form, onEdit }) {
  const empty = !form.dOpenTags.length && !form.context && !form.longs && !form.shorts && !form.discipline;
  if (empty) {
    return (
      <div className="empty">
        <div className="big">No prep for {form.date}</div>
        <div>Write the plan before the open — the trade is half-won.</div>
        <div className="small">Click Edit to start.</div>
        <div style={{ marginTop: 18 }}><button onClick={onEdit}>Start prep</button></div>
      </div>
    );
  }
  return (
    <div className="prep-view">
      <div className="prep-block">
        <h3>dOpen</h3>
        <div className="chips" style={{ marginBottom: form.dOpenNote ? 8 : 0 }}>
          {form.dOpenTags.map(t => <span key={t} className="chip on">{t}</span>)}
        </div>
        {form.dOpenNote && <div className="dim">{form.dOpenNote}</div>}
      </div>

      {form.bias && (
        <div className="prep-block">
          <h3>Bias</h3>
          <div>{form.bias}</div>
        </div>
      )}

      {form.context && (
        <div className="prep-block context">
          <h3>Context</h3>
          {form.context.split('\n').filter(Boolean).map((l, i) => <div key={i} className="line">{l}</div>)}
        </div>
      )}

      {form.longs && (
        <div className="prep-block longs">
          <h3>Longs</h3>
          {form.longs.split('\n').filter(Boolean).map((l, i) => <div key={i} className="line">{l}</div>)}
        </div>
      )}

      {form.shorts && (
        <div className="prep-block shorts">
          <h3>Shorts</h3>
          {form.shorts.split('\n').filter(Boolean).map((l, i) => <div key={i} className="line">{l}</div>)}
        </div>
      )}

      {form.discipline && (
        <div className="prep-block discipline">
          <h3>Discipline</h3>
          {form.discipline.split('\n').filter(Boolean).map((l, i) => <div key={i} className="line">{l}</div>)}
        </div>
      )}

      {form.catalysts && (
        <div className="prep-block">
          <h3>Catalysts / News</h3>
          {form.catalysts.split('\n').filter(Boolean).map((l, i) => <div key={i} className="line">{l}</div>)}
        </div>
      )}

      <div className="flex">
        <button onClick={onEdit}>Edit</button>
      </div>
    </div>
  );
}

function EditForm({ form, update, toggleTag, save, busy, onCancel, hasExisting }) {
  return (
    <form onSubmit={e => { e.preventDefault(); save(); }}>
      <div className="grid-2-1">
        <div className="card">
          <h3>dOpen</h3>
          <div className="chips" style={{ marginBottom: 10 }}>
            {DOPEN_TAGS.map(t => (
              <span
                key={t}
                className={'chip' + (form.dOpenTags.includes(t) ? ' on' : '')}
                onClick={() => toggleTag(t)}
              >{t}</span>
            ))}
          </div>
          <div className="field">
            <label>dOpen note</label>
            <input value={form.dOpenNote} onChange={e => update('dOpenNote', e.target.value)} placeholder="extra context on the open" />
          </div>
        </div>

        <div className="card">
          <h3>Bias</h3>
          <div className="field">
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

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Context</h3>
        <textarea
          value={form.context}
          onChange={e => update('context', e.target.value)}
          placeholder={"one bullet per line, e.g.\ntested lower value as support\nclaimed pwPOC"}
        />
      </div>

      <div className="grid-2" style={{ marginTop: 12 }}>
        <div className="card">
          <h3 style={{ color: 'var(--green)' }}>Longs</h3>
          <textarea
            value={form.longs}
            onChange={e => update('longs', e.target.value)}
            placeholder={"one bullet per line, e.g.\npdClose + dVWAP (scalp)\npdEQ + pdVAH + OVL (daytrade)"}
            className="tall"
          />
        </div>
        <div className="card">
          <h3 style={{ color: 'var(--red)' }}>Shorts</h3>
          <textarea
            value={form.shorts}
            onChange={e => update('shorts', e.target.value)}
            placeholder={"one bullet per line, e.g.\npwVAH only.. (daytrade)\nnone; close to ATH, market is strong"}
            className="tall"
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ color: 'var(--amber)' }}>Discipline</h3>
        <textarea
          value={form.discipline}
          onChange={e => update('discipline', e.target.value)}
          placeholder={"one rule per line, e.g.\ntrades: Sequence 9 + COT\nbe late rather than too early"}
        />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Catalysts / News (optional)</h3>
        <textarea
          value={form.catalysts}
          onChange={e => update('catalysts', e.target.value)}
          placeholder="CPI 14:30, FOMC minutes 20:00, earnings AAPL after close…"
        />
      </div>

      <div className="flex" style={{ marginTop: 16 }}>
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : (hasExisting ? 'Update prep' : 'Save prep')}</button>
        <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
