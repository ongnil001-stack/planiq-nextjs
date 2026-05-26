'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import FocusHubSheet from '@/components/FocusHubSheet';

export default function BottomNav() {
  const pathname = usePathname();
  const [hubOpen, setHubOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href + '/'));

  // ── Shared style helpers ─────────────────────────────────────────────────
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
    background: 'rgba(8, 9, 18, 0.94)',
    backdropFilter: 'blur(28px) saturate(160%)',
    WebkitBackdropFilter: 'blur(28px) saturate(160%)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.50)',
  };

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
    color: active ? 'var(--purple, #7C6AF0)' : 'rgba(255,255,255,0.40)',
    position: 'relative',
    WebkitTapHighlightColor: 'transparent',
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

  const BAR = (active: boolean): React.CSSProperties => ({
    position: 'absolute', top: '-10px', left: '50%',
    transform: 'translateX(-50%)',
    width: '24px', height: '3px',
    borderRadius: '0 0 3px 3px',
    background: 'var(--purple, #7C6AF0)',
    opacity: active ? 1 : 0,
    transition: 'opacity .18s ease',
  });

  const FAB_COL: React.CSSProperties = {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: '5px', flex: 1, minWidth: 0, padding: '0 6px',
    minHeight: '52px', position: 'relative',
    WebkitTapHighlightColor: 'transparent',
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
      '0 0 0 4px rgba(8,9,18,0.94)',
      '0 4px 20px rgba(124,106,240,0.55)',
      '0 2px 6px rgba(0,0,0,0.35)',
      'inset 0 1px 0 rgba(255,255,255,0.22)',
    ].join(', '),
    transition: 'transform .14s ease, box-shadow .14s ease',
  };

  const FAB_LBL: React.CSSProperties = {
    ...LBL,
    color: hubOpen ? 'var(--purple, #7C6AF0)' : 'rgba(255,255,255,0.40)',
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
        <Link href="/dashboard" style={ITEM(isActive('/dashboard'))} aria-label="Home">
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
        <Link href="/calendar" style={ITEM(isActive('/calendar'))} aria-label="Schedule">
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
            {/* Lightning bolt — signals AI/intelligence */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L4.09 12.11C3.69 12.59 4.04 13.33 4.67 13.33H11L10.5 21.5C10.47 22 11.13 22.22 11.42 21.81L20.24 10.25C20.61 9.75 20.25 9.04 19.63 9.04H13.5L13 2Z"
                fill="white"/>
            </svg>
          </span>
          <span style={FAB_LBL}>Focus Hub</span>
        </button>

        {/* ── Progress ── */}
        <Link href="/progress" style={ITEM(isActive('/progress'))} aria-label="Progress">
          <span style={BAR(isActive('/progress'))} />
          <span style={ICO}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 17l4-5 4 3 4-7 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 21h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              <path d="M3 3v18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
          </span>
          <span style={LBL}>Progress</span>
        </Link>

        {/* ── Profile ── */}
        <Link href="/profile" style={ITEM(isActive('/profile'))} aria-label="Profile">
          <span style={BAR(isActive('/profile'))} />
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
    </>
  );
}
