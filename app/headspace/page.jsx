'use client';

import { useEffect, useState } from 'react';
import { useProfile } from '../_components/useProfile';
import { localToday } from '../../lib/dates';
import AutoTextarea from '../_components/AutoTextarea';

export default function Headspace() {
  const profile = useProfile();
  const today = localToday();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ date: today, sleep: 3, food: 3, mind: 3, note: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, [profile]);

  async function load() {
    const d = await fetch(`/api/headspace?user=${profile}`, { cache: 'no-store' }).then(r => r.json());
    setRows(d.headspace || []);
    const existing = (d.headspace || []).find(r => r.date === form.date);
    if (existing) setForm({ date: existing.date, sleep: existing.sleep, food: existing.food, mind: existing.mind, note: existing.note || '' });
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
      <h1>Headspace <span className="sub">— sleep · food · mind</span></h1>
      <p className="dim">A trader's edge starts with their state. Log it once per day. 1 = bad, 5 = great.</p>

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
          <AutoTextarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="anything off today? Energy? Headspace?" />
        </div>
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </form>

      <h2 style={{ marginTop: 28 }}>History</h2>
      {rows.length === 0 ? (
        <div className="empty">
          <div className="big">Nothing logged yet</div>
          <div className="small">Sleep well, trade well.</div>
        </div>
      ) : (
        <div className="table-scroll"><table>
          <thead><tr><th>Date</th><th>Sleep</th><th>Food</th><th>Mind</th><th>Note</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.date}</td>
                <td><Bars n={r.sleep} /></td>
                <td><Bars n={r.food} /></td>
                <td><Bars n={r.mind} /></td>
                <td className="dim">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}

function Rating({ label, value, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="rating-pills">
        {[1,2,3,4,5].map(n => (
          <span key={n} className={'p' + (value >= n ? ' on' : '')} onClick={() => onChange(n)}>{n}</span>
        ))}
      </div>
    </div>
  );
}
function Bars({ n }) {
  return (
    <span className="rating-pills" style={{ display: 'inline-flex' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{
          width: 8, height: 14, borderRadius: 2,
          background: i <= n ? 'var(--green)' : 'var(--bg-2)',
          border: '1px solid var(--border-bright)',
          display: 'inline-block', marginRight: 2,
        }} />
      ))}
    </span>
  );
}
