'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard',    icon: '⊞', label: 'Home' },
  { href: '/calendar',     icon: '📅', label: 'Calendar' },
  { href: '/schedule/new', icon: '+',  label: 'Add', fab: true },
  { href: '/ai-analysis',  icon: '✦',  label: 'AI' },
  { href: '/profile',      icon: '👤', label: 'Profile' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bnav">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        if (item.fab) {
          return (
            <Link key={item.href} href={item.href} className="fab">
              <span className="fab-icon">{item.icon}</span>
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${active ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        );
      })}

      <style jsx>{`
        .bnav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 72px;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 0 8px env(safe-area-inset-bottom, 0);
          z-index: 100;
        }
        .nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 8px 4px;
          text-decoration: none;
          color: var(--lite);
          transition: color .18s;
          border-radius: 12px;
        }
        .nav-item.active { color: var(--purple); }
        .nav-item:active { background: var(--pur-lt); }
        .nav-icon { font-size: 20px; line-height: 1; }
        .nav-label { font-size: 10px; font-weight: 600; letter-spacing: .3px; }
        .fab {
          width: 52px;
          height: 52px;
          background: var(--gradient);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          box-shadow: 0 6px 20px rgba(108,92,231,.40);
          transition: transform .15s, box-shadow .15s;
          flex-shrink: 0;
        }
        .fab:active { transform: scale(.93); box-shadow: 0 3px 10px rgba(108,92,231,.30); }
        .fab-icon { font-size: 26px; color: #fff; font-weight: 300; line-height: 1; }
      `}</style>
    </nav>
  );
}
