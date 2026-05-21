'use client';
import { useEffect, useState } from 'react';
import { MANTRAS } from '../../lib/mantras';

export default function Mantra({ kind = 'bar' }) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    setI(Math.floor(Math.random() * MANTRAS.length));
    const t = setInterval(() => {
      setShown(false);
      setTimeout(() => {
        setI(v => (v + 1) % MANTRAS.length);
        setShown(true);
      }, 280);
    }, 8000);
    return () => clearInterval(t);
  }, []);

  if (kind === 'footer') {
    return <span className="mantra-mini" style={{ opacity: shown ? 1 : 0, transition: 'opacity 0.28s' }}>{MANTRAS[i]}</span>;
  }
  return (
    <div className="mantra-bar">
      <span className="tag-mini">mindset</span>
      <span className="quote" style={{ opacity: shown ? 1 : 0, transition: 'opacity 0.28s', display: 'inline-block' }}>{MANTRAS[i]}</span>
    </div>
  );
}
