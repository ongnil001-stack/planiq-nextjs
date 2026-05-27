export default function ProgressLoading() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg, #0B0C1A)',
      display: 'flex', flexDirection: 'column',
      padding: '0 0 88px',
    }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        .sk {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,.05) 25%,
            rgba(255,255,255,.10) 50%,
            rgba(255,255,255,.05) 75%
          );
          background-size: 800px 100%;
          animation: shimmer 1.4s infinite linear;
          border-radius: 10px;
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: '52px 20px 20px' }}>
        <div className="sk" style={{ width: 160, height: 22, marginBottom: 8 }} />
        <div className="sk" style={{ width: 220, height: 14 }} />
      </div>

      {/* Ring + streak row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px 20px' }}>
        <div className="sk" style={{ width: 130, height: 130, borderRadius: '50%' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="sk" style={{ height: 58, borderRadius: 14 }} />
          <div className="sk" style={{ height: 58, borderRadius: 14 }} />
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px' }}>
        {[1,2,3].map(i => <div key={i} className="sk" style={{ flex: 1, height: 78, borderRadius: 14 }} />)}
      </div>

      {/* Week trend */}
      <div className="sk" style={{ margin: '0 20px 16px', height: 100, borderRadius: 16 }} />

      {/* Activity list */}
      {[1,2,3].map(i => (
        <div key={i} className="sk" style={{ margin: '0 20px 8px', height: 56, borderRadius: 12 }} />
      ))}
    </div>
  );
}
