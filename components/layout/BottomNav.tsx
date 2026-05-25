'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== '/schedule/new' && pathname.startsWith(href + '/'));

  return (
    <>
      {/* Outer safe-area wrapper — pushes pill up from bottom edge */}
      <div className="bnav-wrap">
        <nav className="bnav">

          {/* Home */}
          <Link href="/dashboard" className={`ni${isActive('/dashboard') ? ' on' : ''}`} aria-label="Home">
            <span className="ni-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M3 9.5L11 3L19 9.5V19C19 19.55 18.55 20 18 20H14V15H8V20H4C3.45 20 3 19.55 3 19V9.5Z"
                  stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="ni-lbl">Home</span>
            <span className="ni-bar" />
          </Link>

          {/* Schedule */}
          <Link href="/calendar" className={`ni${isActive('/calendar') ? ' on' : ''}`} aria-label="Schedule">
            <span className="ni-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="1.7"/>
                <path d="M3 10H19" stroke="currentColor" strokeWidth="1.7"/>
                <path d="M8 3V7M14 3V7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                <circle cx="8" cy="14" r="1" fill="currentColor"/>
                <circle cx="11" cy="14" r="1" fill="currentColor"/>
                <circle cx="14" cy="14" r="1" fill="currentColor"/>
              </svg>
            </span>
            <span className="ni-lbl">Schedule</span>
            <span className="ni-bar" />
          </Link>

          {/* FAB — circular add button with glow ring */}
          <Link href="/schedule/new" className="ni-fab" aria-label="Add schedule item">
            <span className="ni-fab-ring" aria-hidden="true" />
            <span className="ni-fab-inner">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 5V17M5 11H17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
          </Link>

          {/* Priorities */}
          <Link href="/ai-analysis" className={`ni${isActive('/ai-analysis') ? ' on' : ''}`} aria-label="Priorities">
            <span className="ni-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M11 3L13.5 8.5L19.5 9.3L15.2 13.4L16.4 19.3L11 16.4L5.6 19.3L6.8 13.4L2.5 9.3L8.5 8.5L11 3Z"
                  stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="ni-lbl">Priorities</span>
            <span className="ni-bar" />
          </Link>

          {/* Profile */}
          <Link href="/profile" className={`ni${isActive('/profile') ? ' on' : ''}`} aria-label="Profile">
            <span className="ni-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="8" r="4" stroke="currentColor" strokeWidth="1.7"/>
                <path d="M3 20C3 16.13 6.58 13 11 13C15.42 13 19 16.13 19 20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            </span>
            <span className="ni-lbl">Profile</span>
            <span className="ni-bar" />
          </Link>

        </nav>
      </div>

      <style jsx>{`
        /* ── Outer wrapper ── */
        .bnav-wrap {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 200;
          padding: 0 14px calc(env(safe-area-inset-bottom, 0px) + 10px);
          pointer-events: none;
        }

        /* ── Floating pill ── */
        .bnav {
          pointer-events: all;
          display: flex;
          align-items: center;
          justify-content: space-around;
          height: 66px;
          background: rgba(8, 10, 20, 0.88);
          backdrop-filter: blur(32px) saturate(180%);
          -webkit-backdrop-filter: blur(32px) saturate(180%);
          border-radius: 26px;
          /* Single subtle white hairline — NO colored glow */
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 8px 32px rgba(0,0,0,0.55);
          padding: 0 6px;
          position: relative;
          overflow: visible;
        }

        /* ── Regular nav item ── */
        .ni {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 7px 8px 8px;
          border-radius: 18px;
          min-width: 54px;
          text-decoration: none;
          color: rgba(255,255,255,0.30);
          transition: color .2s ease, background .2s ease, box-shadow .2s ease;
          position: relative;
          flex: 1;
          height: 52px;
        }
        .ni:active { opacity: .75; }

        /* Active — dark frosted card with colored label */
        .ni.on {
          color: var(--cyan, #00C6FF);
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .ni-icon-wrap {
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .ni-lbl {
          font-size: 10px; font-weight: 600;
          letter-spacing: .2px; line-height: 1;
        }

        /* Active underline bar — matches theme accent */
        .ni-bar {
          position: absolute;
          bottom: 4px; left: 50%;
          transform: translateX(-50%);
          width: 0; height: 2px;
          border-radius: 2px;
          background: var(--cyan, #00C6FF);
          box-shadow: 0 0 6px var(--cyan, #00C6FF);
          transition: width .22s cubic-bezier(.4,0,.2,1);
        }
        .ni.on .ni-bar { width: 18px; }

        /* ── FAB ── */
        .ni-fab {
          position: relative;
          width: 56px; height: 56px;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          text-decoration: none;
          margin-top: -18px;
          z-index: 10;
        }

        /* FAB ring — clean hairline only, zero glow bleed */
        .ni-fab-ring {
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,0.15);
          pointer-events: none;
        }

        /* Inner dark circle button */
        .ni-fab-inner {
          position: relative;
          width: 50px; height: 50px;
          border-radius: 50%;
          background: rgba(14, 16, 30, 0.95);
          border: 1px solid rgba(255,255,255,0.13);
          display: flex; align-items: center; justify-content: center;
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.5),
            0 8px 28px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.12);
          transition: transform .14s ease, box-shadow .14s ease;
          z-index: 1;
        }

        .ni-fab:active .ni-fab-inner {
          transform: scale(0.91);
          box-shadow: 0 2px 10px rgba(0,0,0,0.5);
        }
        .ni-fab:active .ni-fab-ring { border-color: rgba(255,255,255,0.25); }
      `}</style>
    </>
  );
}
