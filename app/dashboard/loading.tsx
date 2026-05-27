// Shown IMMEDIATELY when the user taps Home — before any server query runs.
// Next.js streams this to the browser while DashboardPage fetches data.

export default function DashboardLoading() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg, #0B0C1A)',
      display: 'flex', flexDirection: 'column',
      padding: '0 0 88px',
      overflow: 'hidden',
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
      <div style={{ padding: '56px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="sk" style={{ width: 180, height: 22, marginBottom: 8 }} />
          <div className="sk" style={{ width: 110, height: 14 }} />
        </div>
        <div className="sk" style={{ width: 44, height: 44, borderRadius: '50%' }} />
      </div>

      {/* Today card */}
      <div style={{ margin: '0 16px 12px', padding: 16, background: 'rgba(255,255,255,.04)', borderRadius: 18, border: '1px solid rgba(255,255,255,.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div className="sk" style={{ width: 140, height: 18, marginBottom: 7 }} />
            <div className="sk" style={{ width: 100, height: 12 }} />
          </div>
          <div className="sk" style={{ width: 80, height: 26, borderRadius: 20 }} />
        </div>
        {/* Progress bar */}
        <div className="sk" style={{ width: '100%', height: 44, borderRadius: 10, marginBottom: 8 }} />
        <div className="sk" style={{ width: '100%', height: 38, borderRadius: 10 }} />
      </div>

      {/* Quick stats row */}
      <div style={{ display: 'flex', gap: 10, margin: '0 16px 12px' }}>
        {[1,2,3].map(i => (
          <div key={i} className="sk" style={{ flex: 1, height: 72, borderRadius: 14 }} />
        ))}
      </div>

      {/* Weekly bar chart card */}
      <div style={{ margin: '0 16px 12px', padding: 16, background: 'rgba(255,255,255,.04)', borderRadius: 18, border: '1px solid rgba(255,255,255,.07)' }}>
        <div className="sk" style={{ width: 130, height: 14, marginBottom: 16 }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70 }}>
          {[65,40,85,55,70,30,50].map((h, i) => (
            <div key={i} className="sk" style={{ flex: 1, height: `${h}%`, borderRadius: '4px 4px 0 0' }} />
          ))}
        </div>
      </div>

      {/* Two more cards */}
      {[90, 76].map((h, i) => (
        <div key={i} className="sk" style={{ margin: '0 16px 12px', height: h, borderRadius: 18 }} />
      ))}
    </div>
  );
}
