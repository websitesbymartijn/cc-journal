'use client';

export function SkeletonLine({ w = '100%', h = 14, mb = 8 }) {
  return <div className="skeleton" style={{ width: w, height: h, marginBottom: mb }} />;
}

export function SkeletonCard({ height = 110 }) {
  return (
    <div className="card">
      <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: height - 36, width: '70%' }} />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i}><div className="skeleton" style={{ height: 12, width: i === 8 ? 40 : '70%' }} /></td>
      ))}
    </tr>
  );
}
