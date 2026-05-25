'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== '/schedule/new' && pathname.startsWith(href + '/'));

  return (
    <nav className="bnav">

      {/* ── Home ── */}
      <Link href="/dashboard" className={`ni${isActive('/dashboard') ? ' on' : ''}`} aria-label="Home">
        <span className="ni-ico">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M3 10.5L12 3L21 10.5V21C21 21.55 20.55 22 20 22H15V17H9V22H4C3.45 22 3 21.55 3 21V10.5Z"
              stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className="ni-lbl">Home</span>
        <span className="ni-bar" />
      </Link>

      {/* ── Schedule ── */}
      <Link href="/calendar" className={`ni${isActive('/calendar') ? ' on' : ''}`} aria-label="Schedule">
        <span className="ni-ico">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="17" rx="3" stroke="currentColor" strokeWidth="1.7"/>
            <path d="M3 11H21" stroke="currentColor" strokeWidth="1.7"/>
            <path d="M8 3V7M16 3V7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            <circle cx="8.5" cy="15.5" r="1.1" fill="currentColor"/>
            <circle cx="12" cy="15.5" r="1.1" fill="currentColor"/>
            <circle cx="15.5" cy="15.5" r="1.1" fill="currentColor"/>
          </svg>
        </span>
        <span className="ni-lbl">Schedule</span>
        <span className="ni-bar" />
      </Link>

      {/* ── FAB — elevated centre button ── */}
      <div className="ni-fab-slot">
        <div className="ni-fab-shelf" />
        <Link href="/schedule/new" className="ni-fab" aria-label="Add">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </Link>
        <span className="ni-fab-lbl">Add</span>
      </div>

      {/* ── Priorities ── */}
      <Link href="/ai-analysis" className={`ni${isActive('/ai-analysis') ? ' on' : ''}`} aria-label="Priorities">
        <span className="ni-ico">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L14.5 9L21 9.75L16.4 14.1L17.8 20.5L12 17.3L6.2 20.5L7.6 14.1L3 9.75L9.5 9L12 3Z"
              stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className="ni-lbl">Priorities</span>
        <span className="ni-bar" />
      </Link>

      {/* ── Profile ── */}
      <Link href="/profile" className={`ni${isActive('/profile') ? ' on' : ''}`} aria-label="Profile">
        <span className="ni-ico">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7"/>
            <path d="M4 21C4 17.13 7.58 14 12 14C16.42 14 20 17.13 20 21"
              stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
        </span>
        <span className="ni-lbl">Profile</span>
        <span className="ni-bar" />
      </Link>

      <style jsx>{`

        /* ═══════════════════════════════════════════════════
           NAV BAR
           80px tappable zone + iPhone safe-area padding below.
           Taller than before for GCash-style breathing room.
        ═══════════════════════════════════════════════════ */
        .bnav {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 200;

          display: flex;
          align-items: stretch;
          justify-content: space-around;

          /* Tall zone */
          min-height: calc(80px + env(safe-area-inset-bottom, 0px));
          padding-bottom: env(safe-area-inset-bottom, 0px);

          background: rgba(8, 9, 18, 0.92);
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          border-top: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 -6px 32px rgba(0,0,0,0.50);
        }

        /* ═══════════════════════════════════════════════════
           STANDARD NAV ITEM
           Full 80px height, icon centred in upper portion,
           label sits comfortably below with space to breathe.
        ═══════════════════════════════════════════════════ */
        .ni {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          flex: 1;
          padding: 14px 4px 10px;

          text-decoration: none;
          color: rgba(255,255,255,0.35);
          position: relative;
          transition: color .18s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .ni:active { opacity: .55; transform: scale(0.94); transition: none; }
        .ni.on { color: var(--purple, #7C6AF0); }

        /* Icon container — generous touch zone */
        .ni-ico {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 36px;
        }

        /* Label */
        .ni-lbl {
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: .15px;
          line-height: 1;
          white-space: nowrap;
        }

        /* Active indicator — thin pill at top of item, like GCash */
        .ni-bar {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 28px;
          height: 3px;
          border-radius: 0 0 3px 3px;
          background: var(--purple, #7C6AF0);
          opacity: 0;
          transition: opacity .18s ease;
        }
        .ni.on .ni-bar { opacity: 1; }

        /* ═══════════════════════════════════════════════════
           FAB SLOT — centre column, same flex weight as others
           The shelf creates a visual notch behind the FAB.
        ═══════════════════════════════════════════════════ */
        .ni-fab-slot {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          position: relative;
          padding-bottom: 10px;
        }

        /* Subtle circular shelf behind the FAB */
        .ni-fab-shelf {
          position: absolute;
          top: -28px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 56px;
          border-radius: 50% 50% 0 0 / 100% 100% 0 0;
          background: rgba(8, 9, 18, 0.92);
          border-top: 1px solid rgba(255,255,255,0.07);
          border-left: 1px solid rgba(255,255,255,0.07);
          border-right: 1px solid rgba(255,255,255,0.07);
        }

        /* FAB button — 60px, floats above the bar */
        .ni-fab {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          margin-top: -30px;           /* lifts FAB above nav top edge */
          position: relative;
          z-index: 2;

          background: var(--gradient, linear-gradient(135deg, #7C6AF0 0%, #00C6FF 100%));
          box-shadow:
            0 6px 24px rgba(124,106,240,0.55),
            0 2px 8px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.22);

          text-decoration: none;
          transition: transform .14s ease, box-shadow .14s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .ni-fab:active {
          transform: scale(0.88);
          box-shadow:
            0 3px 12px rgba(124,106,240,0.40),
            0 1px 4px rgba(0,0,0,0.30),
            inset 0 1px 0 rgba(255,255,255,0.14);
        }

        /* "Add" label under FAB */
        .ni-fab-lbl {
          margin-top: 5px;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: .15px;
          line-height: 1;
          color: rgba(255,255,255,0.35);
          position: relative;
          z-index: 2;
        }
      `}</style>
    </nav>
  );
}
