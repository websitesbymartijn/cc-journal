'use client';
import { useEffect, useState } from 'react';

export function useProfile() {
  const [profile, setProfile] = useState('martijn');
  useEffect(() => {
    const p = typeof window !== 'undefined' ? localStorage.getItem('cc-profile') : null;
    if (p) setProfile(p);
    function onChange(e) { setProfile(e.detail); }
    window.addEventListener('cc-profile-change', onChange);
    return () => window.removeEventListener('cc-profile-change', onChange);
  }, []);
  return profile;
}
