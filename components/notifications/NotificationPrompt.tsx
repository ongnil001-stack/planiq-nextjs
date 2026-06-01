'use client';

import { useState, useEffect } from 'react';
import { notificationsSupported, notificationPermission, setupPushNotifications } from '@/lib/notifications';

/**
 * Subtle banner shown once after the user saves their first schedule.
 * Appears at the top of the calendar — dismissible, never aggressive.
 * Pass `show={true}` to display it.
 */
export default function NotificationPrompt({ onDismiss }: { onDismiss?: () => void }) {
  const [visible,  setVisible]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<'idle'|'granted'|'denied'>('idle');

  useEffect(() => {
    // Only show if notifications are supported and not yet decided
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
      padding: '11px 16px',
      background: 'rgba(124,106,240,0.10)',
      border: '1px solid rgba(124,106,240,0.28)',
      borderRadius: 14, margin: '0 0 14px',
    }}>
      {/* Bell icon */}
      <div style={{ flexShrink: 0, fontSize: 20, lineHeight: 1 }}>
        {result === 'granted' ? '✓' : result === 'denied' ? '🔕' : '🔔'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {result === 'granted' ? (
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#A78BFA' }}>
            Reminders enabled — you'll be notified before each event.
          </p>
        ) : result === 'denied' ? (
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            Notifications blocked. Enable them in your browser settings to get reminders.
          </p>
        ) : (
          <>
            <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: 'var(--dark, #fff)' }}>
              Enable activity reminders
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>
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
              padding: '7px 14px', borderRadius: 10, border: 'none',
              background: 'var(--purple, #7C6AF0)', color: '#fff',
              fontSize: 12, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
              fontFamily: 'inherit', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Enabling…' : 'Enable'}
          </button>
          <button
            onClick={handleDismiss}
            style={{
              padding: '7px 10px', borderRadius: 10,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.4)', fontSize: 12,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Later
          </button>
        </div>
      )}
    </div>
  );
}
