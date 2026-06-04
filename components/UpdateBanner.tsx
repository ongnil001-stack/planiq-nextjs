'use client';

/**
 * UpdateBanner — global floating update notification
 * ─────────────────────────────────────────────────────────────────────────────
 * Appears on EVERY page when a new version is available (new SW waiting or
 * version/SHA mismatch detected). Gives the user a prominent, impossible-to-miss
 * chance to update on their own terms — before iOS might kill the app context.
 *
 * Design:
 *  • Fixed pill at the top of the screen, full-width
 *  • "Update Now" → clears caches, sends SKIP_WAITING to waiting SW, reloads
 *  • "Later" → hides for this session only (will reappear on next open)
 *  • Auto-dismissed once the app is up to date
 */

import { useState, useEffect, useCallback } from 'react';

const HAS_UPDATE_KEY = 'planiq_has_update';

export default function UpdateBanner() {
  const [show,     setShow]     = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    // Read from localStorage (set by useAppUpdate when hasUpdate || updateReady)
    const check = () => {
      setShow(localStorage.getItem(HAS_UPDATE_KEY) === '1');
    };
    check();
    window.addEventListener('storage', check);
    // Poll every 15s in case storage event doesn't fire in same tab
    const t = setInterval(check, 15_000);
    return () => { window.removeEventListener('storage', check); clearInterval(t); };
  }, []);

  const handleUpdate = useCallback(async () => {
    setApplying(true);
    try {
      // Tell the waiting SW to activate
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          await new Promise<void>(resolve => {
            navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
            setTimeout(resolve, 1500); // fallback timeout
          });
        } else {
          // No waiting SW — clear caches and reload for a fresh fetch
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        }
        // Clear all caches so new assets are fetched fresh
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      }
    } catch { /* still reload even if SW ops fail */ }
    window.location.reload();
  }, []);

  const handleLater = useCallback(() => {
    // Hide for this session; do NOT remove the localStorage key
    // (it will reappear on next app open if the update is still pending)
    setShow(false);
  }, []);

  if (!show) return null;

  return (
    <>
      <style>{`
        @keyframes slideDownBanner {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes pulseDotBanner {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.5; transform:scale(1.4); }
        }
      `}</style>

      <div style={{
        position: 'fixed',
        top: 'max(env(safe-area-inset-top, 0px), 0px)',
        left: 0, right: 0,
        zIndex: 9998,
        padding: '0 12px',
        paddingTop: 'max(env(safe-area-inset-top, 8px), 8px)',
        animation: 'slideDownBanner .3s cubic-bezier(.32,1,.52,1) both',
        pointerEvents: 'auto',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 14,
          background: 'var(--surf, #131424)',
          border: '1.5px solid var(--border2, rgba(124,106,240,.3))',
          boxShadow: '0 4px 24px rgba(0,0,0,.35), 0 1px 0 rgba(124,106,240,.12) inset',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
          {/* Pulsing dot */}
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--purple)', flexShrink: 0,
            animation: 'pulseDotBanner 1.4s ease-in-out infinite',
            boxShadow: '0 0 8px var(--purple)',
          }} />

          {/* Label */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--dark)', lineHeight: 1.2 }}>
              New update available
            </div>
            <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 1 }}>
              Tap Update Now to get the latest version
            </div>
          </div>

          {/* Later */}
          <button
            onClick={handleLater}
            style={{
              background: 'none', border: 'none',
              fontSize: 11, fontWeight: 600, color: 'var(--mid)',
              cursor: 'pointer', fontFamily: 'inherit',
              padding: '4px 6px', flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Later
          </button>

          {/* Update Now */}
          <button
            onClick={handleUpdate}
            disabled={applying}
            style={{
              background: applying ? 'rgba(124,106,240,.5)' : 'var(--purple)',
              border: 'none',
              borderRadius: 9,
              padding: '7px 12px',
              fontSize: 12, fontWeight: 800, color: '#fff',
              cursor: applying ? 'default' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 5,
              flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
              transition: 'background .15s',
            }}
          >
            {applying && (
              <svg width="11" height="11" viewBox="0 0 20 20" fill="none"
                style={{ animation: 'spin .9s linear infinite' }}>
                <path d="M4 10a6 6 0 1 1 1.2 3.6M4 14V10h4"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {applying ? 'Updating…' : 'Update Now'}
          </button>
        </div>
      </div>
    </>
  );
}
