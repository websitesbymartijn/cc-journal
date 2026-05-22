'use client';

import { useEffect, useMemo, useState } from 'react';
import { useProfile } from '../_components/useProfile';
import { localToday } from '../../lib/dates';
import AutoTextarea from '../_components/AutoTextarea';

const MOODS = [
  { v: 'flowing',   label: 'Flowing' },
  { v: 'focused',   label: 'Focused' },
  { v: 'neutral',   label: 'Neutral' },
  { v: 'rattled',   label: 'Rattled' },
  { v: 'tilted',    label: 'Tilted' },
  { v: 'detached',  label: 'Detached' },
  { v: 'patient',   label: 'Patient' },
  { v: 'impulsive', label: 'Impulsive' },
];

export default function PostPage() {
  const profile = useProfile();
  const today = localToday();
  const [date, setDate] = useState(today);
  const [allPosts, setAllPosts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(empty(today));
  const [saveError, setSaveError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => { load(); }, [profile]);

  async function load() {
    const d = await fetch(`/api/post?user=${profile}`, { cache: 'no-store' }).then(r => r.json());
    setAllPosts(d.post || []);
    hydrate(d.post || [], date);
  }
  function hydrate(rows, d) {
    const existing = rows.find(r => r.date === d);
    if (existing) {
      setForm({ ...empty(d), ...existing });
      setEdit(false);
    } else {
      setForm(empty(d));
      setEdit(true);
    }
  }
  useEffect(() => { if (allPosts.length) hydrate(allPosts, date); /* eslint-disable-next-line */ }, [date]);

  function update(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    setBusy(true);
    setSaveError(null);
    try {
      const r = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, user: profile, date }),
      });
      if (!r.ok) throw new Error('post save failed: ' + r.status + ' ' + (await r.text()));
      setBusy(false);
      setEdit(false);
      setSavedAt(new Date());
      load();
    } catch (e) {
      setBusy(false);
      setSaveError(String(e.message || e));
    }
  }

  const recent = useMemo(
    () => [...new Set(allPosts.map(r => r.date))].sort().reverse(),
    [allPosts]
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="flex between" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        <h1>Daily post <span className="sub">— end-of-day reflection</span></h1>
        <div className="flex">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          {!edit && <button className="ghost" onClick={() => setEdit(true)}>Edit</button>}
        </div>
      </div>

      {recent.length > 0 && (
        <div className="flex wrap" style={{ marginBottom: 18, gap: 6 }}>
          <span className="label-mini">recent</span>
          {recent.slice(0, 10).map(d => (
            <span key={d} className={'chip' + (d === date ? ' on' : '')} onClick={() => setDate(d)}>{d}</span>
          ))}
        </div>
      )}

      {edit ? <EditForm form={form} update={update} save={save} busy={busy} saveError={saveError} savedAt={savedAt} onCancel={() => hydrate(allPosts, date)} hasExisting={allPosts.some(r => r.date === date)} />
            : <View form={form} onEdit={() => setEdit(true)} />}
    </div>
  );
}

function empty(d) {
  return { date: d, mood: '', summary: '', worked: '', didntWork: '', lesson: '', gratitude: '' };
}

function EditForm({ form, update, save, busy, saveError, savedAt, onCancel, hasExisting }) {
  const [showGratitude, setShowGratitude] = useState(!!form.gratitude);
  return (
    <form onSubmit={e => { e.preventDefault(); save(); }}>
      <SectionHeader num="00" title="Mood at close" hint="One word for the day" />
      <div className="card spacious">
        <div className="chips">
          {MOODS.map(m => (
            <span key={m.v} className={'chip lg' + (form.mood === m.v ? ' on' : '')} onClick={() => update('mood', m.v)}>{m.label}</span>
          ))}
        </div>
      </div>

      <SectionHeader num="01" title="What happened" hint="The day in your own words" />
      <div className="card spacious">
        <AutoTextarea
          className="xl"
          value={form.summary}
          onChange={e => update('summary', e.target.value)}
          placeholder="Was it a slow chop day? Did the plan hold? Did you take what the market gave you?"
        />
      </div>

      <SectionHeader num="02" title="Reflection" hint="What worked, what didn't" />
      <div className="card spacious">
        <AutoTextarea
          className="lg"
          value={form.worked}
          onChange={e => update('worked', e.target.value)}
          placeholder={'What went right today. What you nailed. What you forced.\n\nUse + and - lines if it helps:\n+ patient through the chop\n- chased the 14:30 spike'}
        />
      </div>

      <SectionHeader num="03" title="Lesson" hint="One sentence — the takeaway you keep" />
      <div className="card spacious" style={{ borderLeft: '3px solid var(--amber)' }}>
        <AutoTextarea
          className="lg"
          value={form.lesson}
          onChange={e => update('lesson', e.target.value)}
          placeholder="If I do one thing differently tomorrow…"
        />
      </div>

      {(form.gratitude || showGratitude) ? (
        <>
          <SectionHeader num="04" title="Gratitude" hint="Anything from the day worth remembering" />
          <div className="card spacious">
            <AutoTextarea
              value={form.gratitude}
              onChange={e => update('gratitude', e.target.value)}
              placeholder="A clean exit. A good coffee. A clear head."
            />
          </div>
        </>
      ) : (
        <div className="section-header">
          <span className="num">04</span>
          <span className="title">Gratitude</span>
          <button type="button" className="ghost sm" style={{ marginLeft: 'auto' }} onClick={() => setShowGratitude(true)}>+ add</button>
        </div>
      )}

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
        <button type="submit" className="lg" disabled={busy}>{busy ? 'Saving…' : (hasExisting ? 'Update post' : 'Save post')}</button>
        <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function View({ form, onEdit }) {
  const empty = !form.summary && !form.worked && !form.didntWork && !form.lesson && !form.gratitude;
  if (empty) {
    return (
      <div className="empty">
        <div className="big">No post for {form.date}</div>
        <div>Closing the loop is half the edge. Write a few lines on how the day went.</div>
        <div className="small">The lesson is the asset. The trade is the receipt.</div>
        <div style={{ marginTop: 20 }}><button onClick={onEdit}>Write today's post</button></div>
      </div>
    );
  }
  return (
    <div className="prep-view">
      {form.mood && (
        <div className="post-block">
          <h3>Mood at close</h3>
          <div className="bias-text" style={{ fontSize: 18 }}>{capitalize(form.mood)}</div>
        </div>
      )}
      {form.summary && <Block label="What happened" body={form.summary} />}
      {form.worked   && <Block label="What worked" body={form.worked} accent="var(--pos)" />}
      {form.didntWork && <Block label="What didn't" body={form.didntWork} accent="var(--neg)" />}
      {form.lesson   && <Block label="Lesson" body={form.lesson} accent="var(--amber)" />}
      {form.gratitude && <Block label="Gratitude" body={form.gratitude} />}

      <div className="flex"><button onClick={onEdit}>Edit</button></div>
    </div>
  );
}

function Block({ label, body, accent }) {
  return (
    <div className="post-block" style={accent ? { borderLeftColor: accent } : {}}>
      <h3>{label}</h3>
      <div className="body">{body}</div>
    </div>
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

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
