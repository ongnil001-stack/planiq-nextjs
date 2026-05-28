import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import ThemeProvider from '@/components/ThemeProvider';
import PostHogProvider from '@/components/PostHogProvider';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0-early-access';

export const metadata: Metadata = {
  title: 'PlanIQ — Your AI Schedule Advisor',
  description: 'Smart scheduling, conflict detection, and AI-powered productivity insights.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PlanIQ',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#8B7CF6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PlanIQ" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png?v=2" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png?v=2" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144.png?v=2" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/icon-128.png?v=2" />
        <link rel="apple-touch-startup-image" href="/icons/icon-512.png?v=2" />
        {/* No-flash theme script — runs synchronously before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('planiq_theme');var valid=['focused','soft','dark','colorful','minimal','pixel','lady'];if(t&&valid.indexOf(t)>-1){document.documentElement.setAttribute('data-theme',t);document.body&&document.body.setAttribute('data-theme',t);}else{document.documentElement.setAttribute('data-theme','focused');}}catch(e){}})();`,
          }}
        />
        {/* SW cache-bust v2: unregister stale service workers so updated CSS/JS loads fresh */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var V='2';if('serviceWorker' in navigator){try{var stored=localStorage.getItem('planiq_sw_v');if(stored!==V){navigator.serviceWorker.getRegistrations().then(function(regs){regs.forEach(function(r){r.unregister();});localStorage.setItem('planiq_sw_v',V);if(regs.length>0){window.location.reload();}});}}catch(e){}}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider />
        <PostHogProvider>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              fontFamily: 'Sora, sans-serif',
              fontSize: '14px',
              fontWeight: '600',
              borderRadius: '12px',
              background: 'var(--surf2, #1E2038)',
              color: 'var(--dark, #fff)',
              border: '1px solid var(--border2, rgba(124,106,240,0.3))',
            },
          }}
        />
        <div style={{
          position: 'fixed', bottom: '4px', right: '8px',
          fontSize: '9px', fontFamily: 'Sora, sans-serif',
          fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase',
          color: 'rgba(124,106,240,0.3)', pointerEvents: 'none', zIndex: 9999,
        }}>
          PlanIQ {APP_VERSION}
        </div>
        </PostHogProvider>
      </body>
    </html>
  );
}
