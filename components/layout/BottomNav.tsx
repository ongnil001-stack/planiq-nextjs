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
        /* ── Outer wrapper: safe area + positioning ── */
        .bnav-wrap {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 200;
          /* Push pill up from bottom, accounting for iOS home bar */
          padding: 0 16px calc(env(safe-area-inset-bottom, 0px) + 12px);
          pointer-events: none; /* wrapper transparent; nav gets clicks */
        }

        /* ── Floating pill container ── */
        .bnav {
          pointer-events: all;
          display: flex;
          align-items: center;
          justify-content: space-around;
          height: 68px;
          /* Glassmorphism: dark semi-transparent base + blur */
          background: rgba(12, 14, 26, 0.78);
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          /* Pill shape */
          border-radius: 28px;
          /* Subtle light border top + glow inner */
          border: 1px solid rgba(255,255,255,0.09);
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.4),
            0 8px 40px rgba(0,0,0,0.55),
            inset 0 1px 0 rgba(255,255,255,0.07);
          padding: 0 8px;
          /* Subtle ambient glow underneath matching theme */
          position: relative;
          overflow: visible;
        }

        /* Glow halo under the pill */
        .bnav::after {
          content: '';
          position: absolute;
          bottom: -8px; left: 20%; right: 20%;
          height: 20px;
          background: radial-gradient(ellipse, var(--purple, #7C6AF0) 0%, transparent 70%);
          opacity: 0.18;
          filter: blur(8px);
          pointer-events: none;
        }

        /* ── Regular nav item ── */
        .ni {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 8px 10px 6px;
          border-radius: 16px;
          min-width: 56px;
          text-decoration: none;
          color: rgba(255,255,255,0.28);
          transition: color .2s, background .2s;
          position: relative;
          flex: 1;
        }
        .ni:active { background: rgba(255,255,255,.05); }

        /* Active state: dark inset card */
        .ni.on {
          color: var(--purple, #7C6AF0);
          background: rgba(0,0,0,0.35);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.3);
        }

        /* Icon wrapper — keeps icon from shrinking */
        .ni-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* Label */
        .ni-lbl {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .25px;
          line-height: 1;
        }

        /* Active underline bar */
        .ni-bar {
          position: absolute;
          bottom: 5px;
          left: 50%; transform: translateX(-50%);
          width: 0; height: 2.5px;
          border-radius: 2px;
          background: var(--purple, #7C6AF0);
          transition: width .25s cubic-bezier(.4,0,.2,1);
        }
        .ni.on .ni-bar { width: 20px; }

        /* ── FAB — circular elevated button ── */
        .ni-fab {
          position: relative;
          width: 58px; height: 58px;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          text-decoration: none;
          margin-top: -14px; /* lifts button above pill */
        }

        /* Glow ring — animated border */
        .ni-fab-ring {
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          background: conic-gradient(
            from 180deg,
            var(--purple, #7C6AF0) 0%,
            var(--cyan, #00C6FF) 40%,
            transparent 60%,
            var(--purple, #7C6AF0) 100%
          );
          opacity: 0.75;
          animation: fabSpin 4s linear infinite;
          filter: blur(1px);
        }

        @keyframes fabSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* Inner circle — the actual button face */
        .ni-fab-inner {
          position: relative;
          width: 52px; height: 52px;
          border-radius: 50%;
          background: rgba(10, 12, 24, 0.92);
          border: 1px solid rgba(255,255,255,0.12);
          display: flex; align-items: center; justify-content: center;
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.6),
            0 6px 24px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.1);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: transform .15s, box-shadow .15s;
          z-index: 1;
        }

        .ni-fab:active .ni-fab-inner {
          transform: scale(0.93);
          box-shadow: 0 2px 12px rgba(0,0,0,0.4);
        }
        .ni-fab:active .ni-fab-ring { opacity: 1; }
      `}</style>
    </>
  );
}
