'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import FocusHubSheet from '@/components/FocusHubSheet';

export default function BottomNav() {
  const pathname = usePathname();
  const [hubOpen, setHubOpen] = useState(false);
  const [updateBadge, setUpdateBadge] = useState(false);

  // Read update badge from localStorage (written by useAppUpdate when hasUpdate=true)
  useEffect(() => {
    const check = () => setUpdateBadge(localStorage.getItem('planiq_has_update') === '1');
    check();
    window.addEventListener('storage', check);
    // Also poll every 30s in case the storage event doesn't fire cross-tab
    const t = setInterval(check, 30_000);
    return () => { window.removeEventListener('storage', check); clearInterval(t); };
  }, []);

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href + '/'));

  // ── Shared style helpers ─────────────────────────────────────────────────
  // ALL colours come from CSS variables so every theme (dark, soft, colorful,
  // minimal, pixel, lady …) is handled automatically by globals.css.
  const NAV: React.CSSProperties = {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    zIndex: 200,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: '10px',
    paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
    minHeight: 'calc(64px + max(env(safe-area-inset-bottom, 0px), 20px))',
    // Theme-aware background — dark themes: deep navy/black; light themes: warm/cool tint
    background: 'var(--nav-glass)',
    backdropFilter: 'blur(28px) saturate(160%)',
    WebkitBackdropFilter: 'blur(28px) saturate(160%)',
    // Theme-aware border and shadow
    borderTop: '1px solid var(--border)',
    boxShadow: 'var(--nav-shadow)',
    transition: 'background 0.25s ease, border-color 0.25s ease',
  };

  // Active = theme accent colour; Inactive = --nav-inactive (legible on both light and dark)
  const ITEM = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    flex: 1,
    minWidth: 0,
    padding: '0 6px',
    minHeight: '52px',
    textDecoration: 'none',
    color: active ? 'var(--nav-active, var(--purple))' : 'var(--nav-inactive)',
    position: 'relative',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    transition: 'color 0.2s ease',
  });

  const ICO: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '28px', height: '28px', flexShrink: 0,
  };

  const LBL: React.CSSProperties = {
    fontSize: '10px', fontWeight: 600,
    letterSpacing: '.2px', lineHeight: 1,
    whiteSpace: 'nowrap', fontFamily: 'inherit',
  };

  // Active indicator bar at the very top of the nav
  const BAR = (active: boolean): React.CSSProperties => ({
    position: 'absolute', top: '-10px', left: '50%',
    transform: 'translateX(-50%)',
    width: '24px', height: '3px',
    borderRadius: '0 0 3px 3px',
    background: 'var(--nav-active, var(--purple))',
    opacity: active ? 1 : 0,
    transition: 'opacity .18s ease',
  });

  const FAB_COL: React.CSSProperties = {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: '5px', flex: 1, minWidth: 0, padding: '0 6px',
    minHeight: '52px', position: 'relative',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    userSelect: 'none', WebkitUserSelect: 'none',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit',
  };

  const FAB_BTN: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, width: '48px', height: '48px',
    borderRadius: '50%',
    marginTop: '-18px',
    background: hubOpen
      ? 'linear-gradient(135deg,#9B8FFF 0%,#40D8FF 100%)'
      : 'var(--gradient, linear-gradient(135deg,#7C6AF0 0%,#00C6FF 100%))',
    boxShadow: [
      // Ring uses --nav-glass so it blends seamlessly on both light and dark navbars
      '0 0 0 4px var(--nav-glass)',
      '0 4px 20px rgba(0,0,0,0.35)',
      '0 2px 6px rgba(0,0,0,0.22)',
      'inset 0 1px 0 rgba(255,255,255,0.22)',
    ].join(', '),
    transition: 'transform .14s ease, box-shadow .14s ease',
  };

  const FAB_LBL: React.CSSProperties = {
    ...LBL,
    color: hubOpen ? 'var(--nav-active, var(--purple))' : 'var(--nav-inactive)',
    transition: 'color 0.2s ease',
  };

  return (
    <>
      {/* Height spacer so page content doesn't hide under nav */}
      <div style={{
        height: 'calc(64px + max(env(safe-area-inset-bottom, 0px), 20px))',
        flexShrink: 0, pointerEvents: 'none',
      }} aria-hidden />

      <nav style={NAV}>

        {/* ── Home ── */}
        <Link href="/dashboard" prefetch={true} style={ITEM(isActive('/dashboard'))} aria-label="Home">
          <span style={BAR(isActive('/dashboard'))} />
          <span style={ICO}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 10.5L12 3L21 10.5V21C21 21.55 20.55 22 20 22H15V17H9V22H4C3.45 22 3 21.55 3 21V10.5Z"
                stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
            </svg>
          </span>
          <span style={LBL}>Home</span>
        </Link>

        {/* ── Schedule ── */}
        <Link href="/calendar"  prefetch={true} style={ITEM(isActive('/calendar'))} aria-label="Schedule">
          <span style={BAR(isActive('/calendar'))} />
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

        {/* ── Focus Hub FAB ── */}
        <button
          style={FAB_COL}
          onClick={() => setHubOpen(true)}
          aria-label="Focus Hub"
        >
          <span style={FAB_BTN}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L4.09 12.11C3.69 12.59 4.04 13.33 4.67 13.33H11L10.5 21.5C10.47 22 11.13 22.22 11.42 21.81L20.24 10.25C20.61 9.75 20.25 9.04 19.63 9.04H13.5L13 2Z"
                fill="white"/>
            </svg>
          </span>
          <span style={FAB_LBL}>Focus Hub</span>
        </button>

        {/* ── Progress ── */}
        <Link href="/progress"  prefetch={true} style={ITEM(isActive('/progress'))} aria-label="Progress">
          <span style={BAR(isActive('/progress'))} />
          <span style={ICO}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3"  y="14" width="4" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.7"/>
              <rect x="10" y="9"  width="4" height="12" rx="1.2" stroke="currentColor" strokeWidth="1.7"/>
              <rect x="17" y="4"  width="4" height="17" rx="1.2" stroke="currentColor" strokeWidth="1.7"/>
            </svg>
          </span>
          <span style={LBL}>Progress</span>
        </Link>

        {/* ── Profile ── */}
        <Link href="/profile"   prefetch={true} style={ITEM(isActive('/profile'))} aria-label="Profile">
          <span style={BAR(isActive('/profile'))} />
          {updateBadge && (
            <span style={{
              position: 'absolute',
              top: 6, right: 'calc(50% - 16px)',
              width: 8, height: 8,
              borderRadius: '50%',
              background: 'var(--coral, #FF5C7A)',
              border: '1.5px solid var(--nav-glass)',
              animation: 'pulseDot 1.4s ease-in-out infinite',
            }} />
          )}
          <span style={ICO}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7"/>
              <path d="M4 21C4 17.13 7.58 14 12 14C16.42 14 20 17.13 20 21"
                stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
          </span>
          <span style={LBL}>Profile</span>
        </Link>

      </nav>

      {/* Focus Hub Sheet */}
      <FocusHubSheet open={hubOpen} onClose={() => setHubOpen(false)} />
    <style>{`@keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.35)}}`}</style>
    </>
  );
}
