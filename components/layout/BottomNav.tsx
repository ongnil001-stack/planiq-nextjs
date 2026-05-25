'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== '/schedule/new' && pathname.startsWith(href + '/'));

  return (
    <nav className="bnav">

      {/* Home */}
      <Link href="/dashboard" className={`ni${isActive('/dashboard') ? ' on' : ''}`} aria-label="Home">
        <span className="ni-ico">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
            <path d="M3 10.5L12 3L21 10.5V21C21 21.55 20.55 22 20 22H15V17H9V22H4C3.45 22 3 21.55 3 21V10.5Z"
              stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className="ni-lbl">Home</span>
        <span className="ni-dot" />
      </Link>

      {/* Schedule */}
      <Link href="/calendar" className={`ni${isActive('/calendar') ? ' on' : ''}`} aria-label="Schedule">
        <span className="ni-ico">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="17" rx="3" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M3 11H21" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M8 3V7M16 3V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <circle cx="8.5" cy="15.5" r="1" fill="currentColor"/>
            <circle cx="12" cy="15.5" r="1" fill="currentColor"/>
            <circle cx="15.5" cy="15.5" r="1" fill="currentColor"/>
          </svg>
        </span>
        <span className="ni-lbl">Schedule</span>
        <span className="ni-dot" />
      </Link>

      {/* FAB */}
      <Link href="/schedule/new" className="ni-fab" aria-label="Add">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </Link>

      {/* Priorities */}
      <Link href="/ai-analysis" className={`ni${isActive('/ai-analysis') ? ' on' : ''}`} aria-label="Priorities">
        <span className="ni-ico">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L14.5 9L21 9.75L16.4 14.1L17.8 20.5L12 17.3L6.2 20.5L7.6 14.1L3 9.75L9.5 9L12 3Z"
              stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className="ni-lbl">Priorities</span>
        <span className="ni-dot" />
      </Link>

      {/* Profile */}
      <Link href="/profile" className={`ni${isActive('/profile') ? ' on' : ''}`} aria-label="Profile">
        <span className="ni-ico">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M4 21C4 17.13 7.58 14 12 14C16.42 14 20 17.13 20 21"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </span>
        <span className="ni-lbl">Profile</span>
        <span className="ni-dot" />
      </Link>

      <style jsx>{`
        /* ── Nav bar — full width, edge to edge, no pill shape ── */
        .bnav {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 200;

          display: flex;
          align-items: center;
          justify-content: space-around;

          height: calc(62px + env(safe-area-inset-bottom, 0px));
          padding-bottom: env(safe-area-inset-bottom, 0px);
          padding-top: 0;

          /* Glass base */
          background: rgba(8, 9, 18, 0.85);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);

          /* Single clean top border — no glow, no spread */
          border-top: 1px solid rgba(255,255,255,0.07);

          /* Subtle drop shadow upward */
          box-shadow: 0 -4px 20px rgba(0,0,0,0.35);
        }

        /* ── Standard nav item ── */
        .ni {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          flex: 1;
          height: 100%;
          padding-top: 10px;
          text-decoration: none;
          color: rgba(255,255,255,0.30);
          position: relative;
          transition: color .18s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .ni:active { opacity: .65; }

        /* Active colour — uses theme purple */
        .ni.on { color: var(--purple, #7C6AF0); }

        .ni-ico {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ni-lbl {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .2px;
          line-height: 1;
        }

        /* Active indicator dot under label */
        .ni-dot {
          position: absolute;
          bottom: 6px;
          left: 50%; transform: translateX(-50%);
          width: 4px; height: 4px;
          border-radius: 50%;
          background: var(--purple, #7C6AF0);
          opacity: 0;
          transition: opacity .18s ease;
        }
        .ni.on .ni-dot { opacity: 1; }

        /* ── FAB — elevated circle, sits in the center ── */
        .ni-fab {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          margin-bottom: 4px;

          /* Gradient fill matching app theme */
          background: var(--gradient, linear-gradient(135deg, #7C6AF0, #00C6FF));

          /* Clean shadow — no colored spread */
          box-shadow:
            0 4px 16px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.15);

          text-decoration: none;
          transition: transform .13s ease, box-shadow .13s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .ni-fab:active {
          transform: scale(0.91);
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        }
      `}</style>
    </nav>
  );
}
