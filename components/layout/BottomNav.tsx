'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== '/schedule/new' && pathname.startsWith(href + '/'));

  // ── Shared inline style objects ──────────────────────────────
  const NAV: React.CSSProperties = {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    zIndex: 200,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',          // align to top of content zone
    justifyContent: 'space-around',
    paddingTop: '10px',
    paddingBottom: 'env(safe-area-inset-bottom, 8px)',
    minHeight: 'calc(68px + env(safe-area-inset-bottom, 0px))',
    background: 'rgba(8, 9, 18, 0.92)',
    backdropFilter: 'blur(28px) saturate(160%)',
    WebkitBackdropFilter: 'blur(28px) saturate(160%)',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.45)',
  };

  const ITEM = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '4px',
    flex: 1,
    minWidth: 0,
    padding: '0 4px',
    minHeight: '48px',
    textDecoration: 'none',
    color: active ? 'var(--purple, #7C6AF0)' : 'rgba(255,255,255,0.40)',
    position: 'relative',
    WebkitTapHighlightColor: 'transparent',
  });

  const ICO: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '28px',
    flexShrink: 0,
  };

  const LBL: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '.15px',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  };

  const DOT = (active: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '24px',
    height: '3px',
    borderRadius: '0 0 3px 3px',
    background: 'var(--purple, #7C6AF0)',
    opacity: active ? 1 : 0,
  });

  // FAB column — same flex slot, button pops slightly above
  const FAB_COL: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '4px',
    flex: 1,
    minWidth: 0,
    padding: '0 4px',
    minHeight: '48px',
    WebkitTapHighlightColor: 'transparent',
  };

  const FAB_BTN: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    marginTop: '-14px',               // pops above nav top edge
    background: 'var(--gradient, linear-gradient(135deg,#7C6AF0 0%,#00C6FF 100%))',
    boxShadow: '0 4px 18px rgba(124,106,240,0.55), 0 2px 6px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.20)',
    textDecoration: 'none',
  };

  const FAB_LBL: React.CSSProperties = {
    ...LBL,
    color: 'rgba(255,255,255,0.40)',
  };

  return (
    <nav style={NAV}>

      {/* ── Home ── */}
      <Link href="/dashboard" style={ITEM(isActive('/dashboard'))} aria-label="Home">
        <span style={DOT(isActive('/dashboard'))} />
        <span style={ICO}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 10.5L12 3L21 10.5V21C21 21.55 20.55 22 20 22H15V17H9V22H4C3.45 22 3 21.55 3 21V10.5Z"
              stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
          </svg>
        </span>
        <span style={LBL}>Home</span>
      </Link>

      {/* ── Schedule ── */}
      <Link href="/calendar" style={ITEM(isActive('/calendar'))} aria-label="Schedule">
        <span style={DOT(isActive('/calendar'))} />
        <span style={ICO}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="17" rx="3" stroke="currentColor" strokeWidth="1.7"/>
            <path d="M3 11H21" stroke="currentColor" strokeWidth="1.7"/>
            <path d="M8 3V7M16 3V7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            <circle cx="8.5" cy="15.5" r="1.1" fill="currentColor"/>
            <circle cx="12" cy="15.5" r="1.1" fill="currentColor"/>
            <circle cx="15.5" cy="15.5" r="1.1" fill="currentColor"/>
          </svg>
        </span>
        <span style={LBL}>Schedule</span>
      </Link>

      {/* ── FAB ── */}
      <div style={FAB_COL}>
        <Link href="/schedule/new" style={FAB_BTN} aria-label="Add">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </Link>
        <span style={FAB_LBL}>Add</span>
      </div>

      {/* ── Priorities ── */}
      <Link href="/ai-analysis" style={ITEM(isActive('/ai-analysis'))} aria-label="Priorities">
        <span style={DOT(isActive('/ai-analysis'))} />
        <span style={ICO}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L14.5 9L21 9.75L16.4 14.1L17.8 20.5L12 17.3L6.2 20.5L7.6 14.1L3 9.75L9.5 9L12 3Z"
              stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
          </svg>
        </span>
        <span style={LBL}>Priorities</span>
      </Link>

      {/* ── Profile ── */}
      <Link href="/profile" style={ITEM(isActive('/profile'))} aria-label="Profile">
        <span style={DOT(isActive('/profile'))} />
        <span style={ICO}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7"/>
            <path d="M4 21C4 17.13 7.58 14 12 14C16.42 14 20 17.13 20 21"
              stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
        </span>
        <span style={LBL}>Profile</span>
      </Link>

      {/* Keyframe for active dot pulse — only animation needs a style tag */}
      <style>{`
        @keyframes navPop { 0%,100%{transform:scale(1)} 50%{transform:scale(0.92)} }
      `}</style>
    </nav>
  );
}
