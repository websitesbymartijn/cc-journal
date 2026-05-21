'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PROFILES } from '../../lib/profiles';

const LINKS = [
  { href: '/',           label: 'Dashboard' },
  { href: '/new',        label: 'New Trade' },
  { href: '/trades',     label: 'Trades' },
  { href: '/headspace',  label: 'Headspace' },
  { href: '/review',     label: 'Review' },
];

export default function Nav() {
  const pathname = usePathname();
  const [profile, setProfile] = useState('martijn');

  useEffect(() => {
    const p = typeof window !== 'undefined' ? localStorage.getItem('cc-profile') : null;
    if (p) setProfile(p);
  }, []);

  function pick(id) {
    setProfile(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cc-profile', id);
      window.dispatchEvent(new CustomEvent('cc-profile-change', { detail: id }));
    }
  }

  return (
    <header className="topbar">
      <div className="brand">CC<span className="dot">.</span>JOURNAL</div>
      <nav className="nav">
        {LINKS.map(l => {
          const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={active ? 'active' : ''}>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="profile-switch">
        <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>profile</span>
        {PROFILES.map(p => (
          <span
            key={p.id}
            className={'pill' + (profile === p.id ? ' active' : '')}
            style={profile === p.id ? { background: p.color, borderColor: p.color } : {}}
            onClick={() => pick(p.id)}
          >
            {p.name}
          </span>
        ))}
      </div>
    </header>
  );
}
