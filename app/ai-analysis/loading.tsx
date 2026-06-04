export default function AIAnalysisLoading() {
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
      <div style={{ padding: '52px 20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="sk" style={{ width: 160, height: 22, marginBottom: 8 }} />
          <div className="sk" style={{ width: 220, height: 14 }} />
        </div>
        <div className="sk" style={{ width: 80, height: 36, borderRadius: 20 }} />
      </div>

      {/* Tab row */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 20px' }}>
        {[1,2,3].map(i => <div key={i} className="sk" style={{ flex: 1, height: 34, borderRadius: 20 }} />)}
      </div>

      {/* Summary card */}
      <div style={{ margin: '0 20px 14px', padding: 20, background: 'rgba(255,255,255,.04)', borderRadius: 18, border: '1px solid rgba(255,255,255,.07)' }}>
        <div className="sk" style={{ width: 120, height: 14, marginBottom: 12 }} />
        <div className="sk" style={{ width: '100%', height: 16, marginBottom: 8 }} />
        <div className="sk" style={{ width: '85%', height: 16, marginBottom: 8 }} />
        <div className="sk" style={{ width: '70%', height: 16 }} />
      </div>

      {/* Analysis cards */}
      {[110, 130, 90, 120].map((h, i) => (
        <div key={i} className="sk" style={{ margin: '0 20px 10px', height: h, borderRadius: 16 }} />
      ))}
    </div>
  );
}
