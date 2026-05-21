'use client';

import { useEffect, useState } from 'react';
import { useProfile } from '../_components/useProfile';

export default function Headspace() {
  const profile = useProfile();
  const today = new Date().toISOString().slice(0, 10);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ date: today, sleep: 3, food: 3, mind: 3, note: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, [profile]);

  async function load() {
    const d = await fetch(`/api/headspace?user=${profile}`, { cache: 'no-store' }).then(r => r.json());
    setRows(d.headspace || []);
    const existing = (d.headspace || []).find(r => r.date === form.date);
    if (existing) {
      setForm({ date: existing.date, sleep: existing.sleep, food: existing.food, mind: existing.mind, note: existing.note || '' });
    }
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    await fetch('/api/headspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, user: profile }),
    });
    setBusy(false);
    load();
  }

  return (
    <div>
      <h1>Headspace</h1>
      <p className="muted">Severin: log it once per day. Sleep, food, mind. 1 = bad, 5 = great.</p>

      <form onSubmit={save} className="card" style={{ maxWidth: 540 }}>
        <div className="field">
          <label>Date</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        </div>
        <Rating label="Sleep" value={form.sleep} onChange={v => setForm({ ...form, sleep: v })} />
        <Rating label="Food" value={form.food} onChange={v => setForm({ ...form, food: v })} />
        <Rating label="Mind" value={form.mind} onChange={v => setForm({ ...form, mind: v })} />
        <div className="field">
          <label>Note</label>
          <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
        </div>
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </form>

      <h2 style={{ marginTop: 24 }}>History</h2>
      {rows.length === 0 ? (
        <div className="muted">No entries yet.</div>
      ) : (
        <table>
          <thead><tr><th>Date</th><th>Sleep</th><th>Food</th><th>Mind</th><th>Note</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.date}</td>
                <td>{r.sleep}</td>
                <td>{r.food}</td>
                <td>{r.mind}</td>
                <td className="muted">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Rating({ label, value, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="confluence-pills">
        {[1,2,3,4,5].map(n => (
          <span
            key={n}
            className={'p' + (value >= n ? ' on' : '')}
            onClick={() => onChange(n)}
          >{n}</span>
        ))}
      </div>
    </div>
  );
}
