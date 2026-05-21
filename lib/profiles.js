export const PROFILES = [
  { id: 'martijn', name: 'Martijn', color: '#00ff9c' },
  { id: 'jente',   name: 'Jente',   color: '#ffb000' },
];

export function getProfile(id) {
  return PROFILES.find(p => p.id === id) || PROFILES[0];
}
