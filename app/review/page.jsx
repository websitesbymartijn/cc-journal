'use client';

import { useEffect, useState } from 'react';
import { useProfile } from '../_components/useProfile';

export default function ReviewPage() {
  const profile = useProfile();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    weekStart: isoWeekStart(new Date()),
    followedProcess: '',
    aPlusActuallyAPlus: '',
    nextWeekPlay: '',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, [profile]);

  async function load() {
    const d = await fetch(`/api/review?user=${profile}`, { cache: 'no-store' }).then(r => r.json());
    setRows(d.reviews || []);
    const existing = (d.reviews || []).find(r => r.weekStart === form.weekStart);
    if (existing) setForm({ ...form, ...existing });
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, user: profile }),
    });
    setBusy(false);
    load();
  }

  return (
    <div>
      <h1>Weekly Review <span className="sub">— Friday close</span></h1>
      <p className="dim">Three questions. Without this, the journal is a graveyard of tickets.</p>

      <form onSubmit={save} className="card">
        <div className="field">
          <label>Week starting (Monday)</label>
          <input type="date" value={form.weekStart} onChange={e => setForm({ ...form, weekStart: e.target.value })} />
        </div>
        <div className="field">
          <label>Did I follow my process?</label>
          <textarea value={form.followedProcess} onChange={e => setForm({ ...form, followedProcess: e.target.value })} />
        </div>
        <div className="field">
          <label>Were my A+ setups actually A+?</label>
          <textarea value={form.aPlusActuallyAPlus} onChange={e => setForm({ ...form, aPlusActuallyAPlus: e.target.value })} />
        </div>
        <div className="field">
          <label>Highest-probability play for next week?</label>
          <textarea value={form.nextWeekPlay} onChange={e => setForm({ ...form, nextWeekPlay: e.target.value })} />
        </div>
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save review'}</button>
      </form>

      <h2 style={{ marginTop: 28 }}>Past reviews</h2>
      {rows.length === 0 ? (
        <div className="empty"><div className="big">No reviews yet</div><div className="small">Process over outcome — always.</div></div>
      ) : (
        <div className="grid-2">
          {rows.map(r => (
            <div key={r.id} className="card">
              <h3>Week of {r.weekStart}</h3>
              <KV k="Process" v={r.followedProcess} />
              <KV k="A+" v={r.aPlusActuallyAPlus} />
              <KV k="Next" v={r.nextWeekPlay} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div style={{ padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
      <div className="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{k}</div>
      <div>{v || <span className="muted">—</span>}</div>
    </div>
  );
}
function isoWeekStart(d) {
  const date = new Date(d);
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}
