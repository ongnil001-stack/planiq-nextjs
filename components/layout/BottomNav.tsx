'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== '/schedule/new' && pathname.startsWith(href + '/'));

  return (
    <nav className="bnav">
      <Link href="/dashboard" className={`ni ${isActive('/dashboard') ? 'on' : ''}`} aria-label="Home">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M3 9.5L11 3L19 9.5V19C19 19.55 18.55 20 18 20H14V15H8V20H4C3.45 20 3 19.55 3 19V9.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
        </svg>
        <span className="ni-lbl">Home</span>
      </Link>

      <Link href="/calendar" className={`ni ${isActive('/calendar') ? 'on' : ''}`} aria-label="Schedule">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="3" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="1.7"/>
          <path d="M3 10H19" stroke="currentColor" strokeWidth="1.7"/>
          <path d="M8 3V7M14 3V7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
          <circle cx="8" cy="14" r="1" fill="currentColor"/>
          <circle cx="11" cy="14" r="1" fill="currentColor"/>
          <circle cx="14" cy="14" r="1" fill="currentColor"/>
        </svg>
        <span className="ni-lbl">Schedule</span>
      </Link>

      <Link href="/schedule/new" className="ni-add" aria-label="Add schedule item">＋</Link>

      <Link href="/ai-analysis" className={`ni ${isActive('/ai-analysis') ? 'on' : ''}`} aria-label="Priorities">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 3L13.5 8.5L19.5 9.3L15.2 13.4L16.4 19.3L11 16.4L5.6 19.3L6.8 13.4L2.5 9.3L8.5 8.5L11 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
        </svg>
        <span className="ni-lbl">Priorities</span>
      </Link>

      <Link href="/profile" className={`ni ${isActive('/profile') ? 'on' : ''}`} aria-label="Profile">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="8" r="4" stroke="currentColor" strokeWidth="1.7"/>
          <path d="M3 20C3 16.13 6.58 13 11 13C15.42 13 19 16.13 19 20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
        </svg>
        <span className="ni-lbl">Profile</span>
      </Link>

      <style jsx>{`
        .bnav {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          height: 72px;
          background: var(--nav-glass, var(--nav-bg, rgba(15,14,23,.72)));
          backdrop-filter: var(--glass-blur, blur(20px));
          -webkit-backdrop-filter: var(--glass-blur, blur(20px));
          border-top: 1px solid var(--glass-border, rgba(255,255,255,.08));
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 0 6px 10px;
          z-index: 100;
          box-shadow: 0 -1px 0 var(--glass-border, rgba(255,255,255,.06)), 0 -8px 32px rgba(0,0,0,.18);
        }
        .ni {
          display: flex; flex-direction: column; align-items: center;
          gap: 4px; padding: 8px 12px;
          border-radius: 12px; transition: all .18s; min-width: 52px;
          color: var(--lite, rgba(255,255,255,.25));
          text-decoration: none;
        }
        .ni:active { background: var(--pur-lt, rgba(124,106,240,.12)); }
        .ni.on { color: var(--purple); }
        .ni-lbl { font-size: 10px; font-weight: 600; letter-spacing: .3px; }
        .ni-add {
          width: 54px; height: 54px;
          background: var(--gradient);
          border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 28px; color: #fff; line-height: 1; font-weight: 300;
          box-shadow: 0 8px 24px rgba(0,0,0,.25);
          margin-top: -12px;
          transition: transform .15s, box-shadow .15s;
          text-decoration: none;
          flex-shrink: 0;
        }
        .ni-add:active { transform: scale(.93); }
      `}</style>
    </nav>
  );
}
