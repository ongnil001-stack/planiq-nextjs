import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import ThemeProvider from '@/components/ThemeProvider';

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
  icons: { apple: '/icons/icon-180.png' },
};

export const viewport: Viewport = {
  themeColor: '#0F0E17',
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
        {/* No-flash theme script — runs synchronously before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('planiq_theme');var valid=['focused','soft','dark','colorful','minimal','pixel','lady'];if(t&&valid.indexOf(t)>-1){document.documentElement.setAttribute('data-theme',t);}else{document.documentElement.setAttribute('data-theme','focused');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider />
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
        {/* Version label */}
        <div
          style={{
            position: 'fixed',
            bottom: '4px',
            right: '8px',
            fontSize: '9px',
            fontFamily: 'Sora, sans-serif',
            fontWeight: 600,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'rgba(124,106,240,0.3)',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          PlanIQ {APP_VERSION}
        </div>
      </body>
    </html>
  );
}
