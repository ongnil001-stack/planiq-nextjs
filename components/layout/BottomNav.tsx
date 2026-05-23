'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard',    icon: '⊞', label: 'Home' },
  { href: '/calendar',     icon: '📅', label: 'Schedule' },
  { href: '/schedule/new', icon: '+',  label: 'Add', fab: true },
  { href: '/ai-analysis',  icon: '✦',  label: 'Priorities' },
  { href: '/profile',      icon: '👤', label: 'Profile' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bnav">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || (item.href !== '/schedule/new' && pathname.startsWith(item.href + '/'));
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
          bottom: 0; left: 0; right: 0;
          height: 76px;
          background: rgba(16, 17, 35, 0.95);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-top: 1px solid rgba(255,255,255,0.07);
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
          gap: 4px;
          padding: 8px 4px;
          text-decoration: none;
          color: rgba(255,255,255,0.3);
          transition: color .18s;
          border-radius: 12px;
        }
        .nav-item.active { color: #7C6AF0; }
        .nav-item:active { background: rgba(124,106,240,0.12); }
        .nav-icon { font-size: 20px; line-height: 1; }
        .nav-label { font-size: 10px; font-weight: 600; letter-spacing: .3px; }
        .fab {
          width: 54px;
          height: 54px;
          background: linear-gradient(135deg, #6C5CE7, #A78BFA);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          box-shadow: 0 6px 24px rgba(108,92,231,0.5);
          transition: transform .15s, box-shadow .15s;
          flex-shrink: 0;
          margin-bottom: 4px;
        }
        .fab:active { transform: scale(.93); box-shadow: 0 3px 12px rgba(108,92,231,0.35); }
        .fab-icon { font-size: 28px; color: #fff; font-weight: 300; line-height: 1; }
      `}</style>
    </nav>
  );
}
