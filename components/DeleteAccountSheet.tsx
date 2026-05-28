'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { track } from '@/lib/analytics';
import { captureAppError } from '@/lib/sentry';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DeleteAccountSheet({ open, onClose }: Props) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const confirmed = confirmText.trim().toUpperCase() === 'DELETE';

  async function handleDelete() {
    if (!confirmed || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Deletion failed. Please try again.');
        setLoading(false);
        return;
      }

      // Track before signing out (identity will be cleared)
      track('sign_out');

      // Sign out client-side session
      const supabase = createClient();
      await supabase.auth.signOut();

      // Clear local storage
      try {
        localStorage.clear();
      } catch {}

      toast.success('Your account has been deleted.');
      router.push('/');
    } catch (err: any) {
      captureAppError(err, 'auth');
      toast.error('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => { if (!loading) onClose(); }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: 'var(--card, #1a1a2e)',
        borderRadius: '20px 20px 0 0',
        padding: '0 0 env(safe-area-inset-bottom, 20px)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderBottom: 'none',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div style={{ padding: '16px 24px 28px' }}>

          {/* Warning icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: 20, fontWeight: 800, color: 'var(--dark)',
            textAlign: 'center', margin: '0 0 8px',
          }}>
            Delete Account
          </h2>

          {/* Warning text */}
          <p style={{
            fontSize: 13, color: 'var(--mid)',
            textAlign: 'center', lineHeight: 1.5,
            margin: '0 0 20px',
          }}>
            This will permanently delete your account and all data including schedules, progress, and awards.
            <span style={{ color: '#EF4444', fontWeight: 700 }}> This cannot be undone.</span>
          </p>

          {/* What gets deleted */}
          <div style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: 12, padding: '12px 14px',
            marginBottom: 20,
          }}>
            {[
              'All schedules and tasks',
              'Progress history and streaks',
              'Awards and badges',
              'Profile and avatar',
              'Your login credentials',
            ].map((item) => (
              <div key={item} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12, color: 'var(--mid)',
                padding: '3px 0',
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="#EF4444" strokeWidth="1.2"/>
                  <path d="M4 6l1.5 1.5L8 4" stroke="#EF4444" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {item}
              </div>
            ))}
          </div>

          {/* Confirm input */}
          <p style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 8 }}>
            Type <strong style={{ color: '#EF4444', letterSpacing: 1 }}>DELETE</strong> to confirm:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            disabled={loading}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 14px',
              background: 'var(--input-bg, rgba(255,255,255,0.05))',
              border: `1.5px solid ${confirmed ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 10,
              color: confirmed ? '#EF4444' : 'var(--dark)',
              fontSize: 15, fontWeight: 700,
              fontFamily: 'inherit',
              letterSpacing: confirmed ? 2 : 0,
              outline: 'none',
              marginBottom: 20,
              transition: 'border-color 0.2s, color 0.2s',
            }}
          />

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { if (!loading) { onClose(); setConfirmText(''); } }}
              disabled={loading}
              style={{
                flex: 1, padding: '13px 0',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, color: 'var(--dark)',
                fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                opacity: loading ? 0.5 : 1,
              }}>
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!confirmed || loading}
              style={{
                flex: 1, padding: '13px 0',
                background: confirmed ? '#EF4444' : 'rgba(239,68,68,0.15)',
                border: `1px solid ${confirmed ? '#EF4444' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: 12,
                color: confirmed ? '#fff' : 'rgba(239,68,68,0.4)',
                fontSize: 14, fontWeight: 700,
                cursor: confirmed && !loading ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              {loading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="31.4" strokeDashoffset="10"/>
                  </svg>
                  Deleting…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Delete Account
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
