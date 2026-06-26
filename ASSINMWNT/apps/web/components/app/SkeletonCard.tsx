export default function SkeletonCard() {
  return (
    <div className="credential-card" style={{ pointerEvents: 'none', gap: 16 }}>
      <div className="skeleton skeleton-avatar" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="skeleton skeleton-text" style={{ width: '60%' }} />
        <div className="skeleton skeleton-text sm" />
        <div className="skeleton skeleton-text" style={{ width: '40%', height: 10 }} />
      </div>
    </div>
  );
}
