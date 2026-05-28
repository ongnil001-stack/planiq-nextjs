'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * global-error.tsx — Root-level error boundary for Next.js App Router.
 * Catches errors that happen inside app/layout.tsx itself.
 * Must include <html> and <body> tags.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        margin: 0, minHeight: '100dvh',
        background: '#0E0D18', color: '#E8E6FF',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', padding: '0 32px', maxWidth: 360 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(255,107,107,.12)',
            border: '1.5px solid rgba(255,107,107,.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-.3px' }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(232,230,255,.5)', lineHeight: 1.6, margin: '0 0 24px' }}>
            PlanIQ hit an unexpected error. This has been reported automatically.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '12px 32px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #7C6AF0, #9B8AF4)',
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 16px rgba(124,106,240,.4)',
            }}>
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
