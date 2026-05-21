'use client';
import { useEffect, useState } from 'react';
import { MANTRAS } from '../../lib/mantras';

export default function Mantra({ kind = 'bar' }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(Math.floor(Math.random() * MANTRAS.length));
    const t = setInterval(() => setI(v => (v + 1) % MANTRAS.length), 7000);
    return () => clearInterval(t);
  }, []);

  if (kind === 'footer') {
    return <span className="mantra-mini">{MANTRAS[i]}</span>;
  }
  return (
    <div className="mantra-bar">
      <span className="tag-mini">mindset</span>
      <span className="quote">{MANTRAS[i]}</span>
    </div>
  );
}
