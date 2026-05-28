'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * app/error.tsx — Route-level error boundary.
 * Catches errors within page/layout components (but not in the root layout).
 */
export default function Error({
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
    <div style={{
      minHeight: '100dvh', background: 'var(--bg, #0E0D18)',
      color: 'var(--dark, #E8E6FF)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center', padding: '0 32px', maxWidth: 360 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'rgba(255,107,107,.12)',
          border: '1.5px solid rgba(255,107,107,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-.3px' }}>
          Oops — something broke
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(232,230,255,.5)', lineHeight: 1.6, margin: '0 0 22px' }}>
          This error has been reported. Try refreshing, or tap below to recover.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre style={{
            fontSize: 11, color: 'rgba(255,107,107,.7)',
            background: 'rgba(255,107,107,.06)',
            border: '1px solid rgba(255,107,107,.15)',
            borderRadius: 8, padding: '10px 12px', textAlign: 'left',
            marginBottom: 18, overflowX: 'auto', lineHeight: 1.5,
          }}>
            {error.message}
          </pre>
        )}
        <button
          onClick={reset}
          style={{
            padding: '11px 28px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #7C6AF0, #9B8AF4)',
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 14px rgba(124,106,240,.35)',
          }}>
          Try Again
        </button>
      </div>
    </div>
  );
}
