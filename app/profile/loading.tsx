export default function ProfileLoading() {
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

      {/* Avatar hero */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, paddingBottom: 24 }}>
        <div className="sk" style={{ width: 88, height: 88, borderRadius: '50%', marginBottom: 14 }} />
        <div className="sk" style={{ width: 140, height: 20, marginBottom: 8 }} />
        <div className="sk" style={{ width: 100, height: 14 }} />
      </div>

      {/* Achievements row */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px', overflow: 'hidden' }}>
        {[72, 90, 80, 68].map((w, i) => (
          <div key={i} className="sk" style={{ width: w, height: 64, borderRadius: 14, flexShrink: 0 }} />
        ))}
      </div>

      {/* Settings cards */}
      {[1,2,3,4].map(i => (
        <div key={i} className="sk" style={{ margin: '0 16px 10px', height: 54, borderRadius: 14 }} />
      ))}

      {/* Theme selector */}
      <div style={{ margin: '12px 16px 0', padding: 16, background: 'rgba(255,255,255,.04)', borderRadius: 18, border: '1px solid rgba(255,255,255,.07)' }}>
        <div className="sk" style={{ width: 100, height: 14, marginBottom: 14 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="sk" style={{ flex: 1, height: 56, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
