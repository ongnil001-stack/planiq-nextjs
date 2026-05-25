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

      {/* FAB — elevated above nav bar */}
      <div className="ni-fab-wrap">
        <Link href="/schedule/new" className="ni-fab" aria-label="Add">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.4" strokeLinecap="round"/>
          </svg>
        </Link>
      </div>

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
        /* ─────────────────────────────────────────────────────────
           NAV BAR
           Height is split into two zones:
           • 68px of visible tappable area (up from 62px)
           • + env(safe-area-inset-bottom) for the iPhone home bar
           Content is vertically centred in the 68px zone only —
           the safe-area zone is purely padding below.
        ───────────────────────────────────────────────────────── */
        .bnav {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 200;

          display: flex;
          align-items: flex-start;          /* align to top of content zone */
          justify-content: space-around;

          /* Visible zone + safe-area padding */
          padding-top: 10px;                /* push content up from raw bottom */
          padding-bottom: env(safe-area-inset-bottom, 8px);
          min-height: calc(68px + env(safe-area-inset-bottom, 0px));

          background: rgba(8, 9, 18, 0.88);
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          border-top: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 -4px 24px rgba(0,0,0,0.40);
        }

        /* ─────────────────────────────────────────────────────────
           STANDARD NAV ITEM
           Minimum 48×48px touch target (Apple HIG / Material).
           Icon + label are centred in that space.
        ───────────────────────────────────────────────────────── */
        .ni {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          flex: 1;

          /* 48px minimum tap height in the visible zone */
          min-height: 48px;
          padding: 0 6px;

          text-decoration: none;
          color: rgba(255,255,255,0.32);
          position: relative;
          transition: color .18s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .ni:active { opacity: .60; transform: scale(0.95); transition: none; }

        /* Active colour */
        .ni.on { color: var(--purple, #7C6AF0); }

        .ni-ico {
          display: flex;
          align-items: center;
          justify-content: center;
          /* Slightly larger icon area for easier scanning */
          width: 28px;
          height: 28px;
        }

        .ni-lbl {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .2px;
          line-height: 1;
        }

        /* Active indicator dot — sits just below label, not near screen edge */
        .ni-dot {
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px; height: 4px;
          border-radius: 50%;
          background: var(--purple, #7C6AF0);
          opacity: 0;
          transition: opacity .18s ease;
        }
        .ni.on .ni-dot { opacity: 1; }

        /* ─────────────────────────────────────────────────────────
           FAB WRAPPER — reserves the same flex slot as nav items
           The actual button floats above the bar via negative margin.
        ───────────────────────────────────────────────────────── */
        .ni-fab-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          /* Pull the FAB up so it sits above the nav bar */
          margin-top: -22px;
        }

        /* ─────────────────────────────────────────────────────────
           FAB BUTTON
           56px (up from 50px) — matches Material Design M3 FAB size.
           Elevated above the nav bar for clear visual hierarchy
           and easier thumb reach from the centre of the screen.
        ───────────────────────────────────────────────────────── */
        .ni-fab {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 56px;
          height: 56px;
          border-radius: 50%;

          background: var(--gradient, linear-gradient(135deg, #7C6AF0, #00C6FF));

          box-shadow:
            0 6px 20px rgba(0,0,0,0.45),
            0 2px 6px rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.18);

          text-decoration: none;
          transition: transform .14s ease, box-shadow .14s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .ni-fab:active {
          transform: scale(0.90);
          box-shadow:
            0 3px 10px rgba(0,0,0,0.40),
            inset 0 1px 0 rgba(255,255,255,0.12);
        }
      `}</style>
    </nav>
  );
}
