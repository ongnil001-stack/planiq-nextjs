'use client';

import { useState, useEffect } from 'react';
import { notificationsSupported, notificationPermission, setupPushNotifications } from '@/lib/notifications';

/**
 * Subtle banner shown once after the user saves their first schedule.
 * Appears at the top of the calendar — dismissible, never aggressive.
 */
export default function NotificationPrompt({ onDismiss }: { onDismiss?: () => void }) {
  const [visible,  setVisible]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<'idle'|'granted'|'denied'>('idle');

  useEffect(() => {
    if (notificationsSupported() && notificationPermission() === 'default') {
      setVisible(true);
    }
  }, []);

  if (!visible || notificationPermission() === 'granted') return null;

  async function handleEnable() {
    setLoading(true);
    const status = await setupPushNotifications();
    setLoading(false);
    if (status === 'granted') {
      setResult('granted');
      setTimeout(() => { setVisible(false); onDismiss?.(); }, 2000);
    } else {
      setResult('denied');
    }
  }

  function handleDismiss() {
    setVisible(false);
    onDismiss?.();
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      /* Theme-aware: pur-lt is correctly tinted per theme */
      background: 'var(--pur-lt, rgba(124,106,240,.10))',
      border: '1px solid var(--border2, rgba(124,106,240,.28))',
      borderRadius: 14, margin: '0 0 14px',
    }}>
      {/* Bell icon */}
      <div style={{ flexShrink: 0, fontSize: 20, lineHeight: 1 }}>
        {result === 'granted' ? '✓' : result === 'denied' ? '🔕' : '🔔'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {result === 'granted' ? (
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--purple)' }}>
            Reminders enabled — you&apos;ll be notified before each event.
          </p>
        ) : result === 'denied' ? (
          /* Fix: was rgba(255,255,255,.5) — invisible on light themes */
          <p style={{ margin: 0, fontSize: 13, color: 'var(--mid)' }}>
            Notifications blocked. Enable them in your browser settings to get reminders.
          </p>
        ) : (
          <>
            <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 700,
              /* var(--dark) = dark text on light themes, light text on dark themes */
              color: 'var(--dark)' }}>
              Enable activity reminders
            </p>
            {/* Fix: was rgba(255,255,255,.42) — invisible on light themes */}
            <p style={{ margin: 0, fontSize: 11, color: 'var(--mid)', lineHeight: 1.45 }}>
              Get notified before your events and tasks start.
            </p>
          </>
        )}
      </div>

      {result === 'idle' && (
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleEnable}
            disabled={loading}
            style={{
              padding: '8px 14px', borderRadius: 10, border: 'none',
              background: 'var(--purple)', color: '#fff',
              fontSize: 12, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              fontFamily: 'inherit', opacity: loading ? 0.7 : 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {loading ? 'Enabling…' : 'Enable'}
          </button>
          {/* Fix: was rgba(255,255,255,.4) text + rgba(255,255,255,.07) bg — invisible on light */}
          <button
            onClick={handleDismiss}
            style={{
              padding: '8px 10px', borderRadius: 10,
              background: 'var(--glass-bg2, rgba(255,255,255,.06))',
              border: '1px solid var(--border)',
              color: 'var(--mid)',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Later
          </button>
        </div>
      )}
    </div>
  );
}
