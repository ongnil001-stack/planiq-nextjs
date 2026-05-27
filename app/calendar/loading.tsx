export default function CalendarLoading() {
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

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '52px 16px 16px' }}>
        <div className="sk" style={{ width: 60, height: 32, borderRadius: 20 }} />
        {[1,2,3,4].map(i => <div key={i} className="sk" style={{ flex: 1, height: 32, borderRadius: 20 }} />)}
        <div className="sk" style={{ width: 32, height: 32, borderRadius: 20 }} />
      </div>

      {/* Calendar grid */}
      <div style={{ margin: '0 16px 16px', padding: 16, background: 'rgba(255,255,255,.04)', borderRadius: 18, border: '1px solid rgba(255,255,255,.07)' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 12 }}>
          {[1,2,3,4,5,6,7].map(i => (
            <div key={i} className="sk" style={{ height: 16, borderRadius: 6 }} />
          ))}
        </div>
        {/* Calendar cells - 5 rows */}
        {[1,2,3,4,5].map(row => (
          <div key={row} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {[1,2,3,4,5,6,7].map(col => (
              <div key={col} className="sk" style={{ height: 44, borderRadius: 8 }} />
            ))}
          </div>
        ))}
      </div>

      {/* Event list */}
      {[1,2,3].map(i => (
        <div key={i} className="sk" style={{ margin: '0 16px 8px', height: 64, borderRadius: 14 }} />
      ))}
    </div>
  );
}
