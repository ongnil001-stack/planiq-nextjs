'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { captureAppError } from '@/lib/sentry';

// ─── Types ────────────────────────────────────────────────────────────────────
type FeedbackType = 'bug' | 'feature' | 'general';

interface Props {
  open:         boolean;
  appVersion:   string;
  userId?:      string;
  onClose:      () => void;
}

// ─── Feedback type options ─────────────────────────────────────────────────────
const TYPES: { value: FeedbackType; label: string; icon: string; color: string; hint: string }[] = [
  {
    value: 'bug',
    label: 'Bug Report',
    icon: 'M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zm-1-11V7h2v4h-2zm0 4v-2h2v2h-2z',
    color: '#FF6B6B',
    hint: 'Something is broken or not working as expected.',
  },
  {
    value: 'feature',
    label: 'Feature Idea',
    icon: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
    color: '#FDCB6E',
    hint: 'Share an idea to make PlanIQ better.',
  },
  {
    value: 'general',
    label: 'General',
    icon: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z',
    color: '#74B9FF',
    hint: 'A comment, praise, or anything else.',
  },
];

export default function FeedbackSheet({ open, appVersion, userId, onClose }: Props) {
  const supabase = createClient();

  const [type,    setType]    = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Reset form when sheet opens
  useEffect(() => {
    if (open) {
      setType('bug'); setMessage('');
      setSending(false); setSent(false); setError(null);
    }
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow    = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow    = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow    = '';
      document.body.style.touchAction = '';
    };
  }, [open]);

  async function handleSend() {
    if (!message.trim()) { setError('Please describe your feedback before sending.'); return; }
    setSending(true); setError(null);
    try {
      const { error: dbErr } = await supabase.from('feedback').insert({
        user_id:     userId ?? null,
        type,
        message:     message.trim(),
        app_version: appVersion,
        user_agent:  typeof navigator !== 'undefined' ? navigator.userAgent : null,
        url:         typeof window !== 'undefined' ? window.location.href : null,
      });
      if (dbErr) throw dbErr;
      setSent(true);
      setTimeout(() => onClose(), 2200);
    } catch (e: unknown) {
      captureAppError(e, 'feedback_submit');
      setError((e as { message?: string }).message ?? 'Could not send feedback. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  const selectedType = TYPES.find(t => t.value === type)!;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9001,
        background: 'var(--glass-bg, rgba(14,13,24,.96))',
        border: '1.5px solid var(--glass-border, rgba(255,255,255,.09))',
        borderBottom: 'none',
        borderRadius: '22px 22px 0 0',
        padding: '0 0 max(env(safe-area-inset-bottom, 0px), 24px)',
        maxHeight: '88dvh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -12px 48px rgba(0,0,0,.5)',
      }}>
        {/* Handle */}
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: 'var(--border)',
          margin: '14px auto 0', flexShrink: 0,
        }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px 10px', flexShrink: 0,
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', letterSpacing: '-.3px' }}>
              Help &amp; Feedback
            </div>
            <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 1 }}>
              We read every submission.
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: 'var(--glass-bg2, rgba(255,255,255,.06))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--mid)',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {sent ? (
            /* ── Success state ── */
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 14, paddingTop: 32, paddingBottom: 32,
              textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(0,200,150,.12)', border: '1.5px solid rgba(0,200,150,.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#00C896" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)' }}>Thank you!</div>
              <div style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.5, maxWidth: 260 }}>
                Your feedback has been received. We use every report to make PlanIQ better.
              </div>
            </div>
          ) : (
            <>
              {/* Type selector */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                  Type
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {TYPES.map(t => (
                    <button key={t.value} onClick={() => setType(t.value)} style={{
                      padding: '10px 6px 9px',
                      borderRadius: 12,
                      background: type === t.value
                        ? `${t.color}18`
                        : 'var(--glass-bg2, rgba(255,255,255,.04))',
                      border: `1.5px solid ${type === t.value ? `${t.color}55` : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'background .15s, border-color .15s',
                      WebkitTapHighlightColor: 'transparent',
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d={t.icon} stroke={type === t.value ? t.color : 'var(--mid)'}
                          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '.3px',
                        color: type === t.value ? t.color : 'var(--mid)',
                        textTransform: 'uppercase',
                      }}>{t.label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 6, lineHeight: 1.4, paddingLeft: 2 }}>
                  {selectedType.hint}
                </div>
              </div>

              {/* Message */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                  Message <span style={{ color: '#FF6B6B', marginLeft: 2 }}>*</span>
                </div>
                <textarea
                  value={message}
                  onChange={e => { setMessage(e.target.value); setError(null); }}
                  placeholder={
                    type === 'bug'     ? 'Describe what happened, what you expected, and how to reproduce it…' :
                    type === 'feature' ? 'Describe the feature and the problem it would solve…' :
                                         'Share your thoughts, suggestions, or anything on your mind…'
                  }
                  rows={5}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--glass-bg2, rgba(255,255,255,.05))',
                    border: `1.5px solid ${error ? 'rgba(255,107,107,.5)' : 'var(--glass-border, rgba(255,255,255,.09))'}`,
                    borderRadius: 14, padding: '12px 14px',
                    color: 'var(--dark)', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6,
                    resize: 'none', outline: 'none',
                    transition: 'border-color .15s',
                  }}
                />
                {error && (
                  <div style={{ fontSize: 11, color: '#FF6B6B', marginTop: 5, fontWeight: 600 }}>
                    {error}
                  </div>
                )}
              </div>

              {/* Auto-collected info */}
              <div style={{
                background: 'var(--surf2, rgba(255,255,255,.03))',
                border: '1px solid var(--border)',
                borderRadius: 12, padding: '10px 14px',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
                  Auto-included with your report
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    ['App Version', `v${appVersion}`],
                    ['Platform',    typeof navigator !== 'undefined'
                      ? (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad') ? 'iOS' :
                         navigator.userAgent.includes('Android') ? 'Android' : 'Web')
                      : 'Web'],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'var(--mid)' }}>{label}</span>
                      <span style={{ fontSize: 11, color: 'var(--dark)', fontWeight: 600 }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                  background: sending || !message.trim()
                    ? 'var(--glass-bg2, rgba(255,255,255,.06))'
                    : `linear-gradient(135deg, ${selectedType.color}CC, ${selectedType.color}88)`,
                  color: sending || !message.trim() ? 'var(--mid)' : '#fff',
                  fontSize: 15, fontWeight: 800, letterSpacing: '-.2px',
                  cursor: sending || !message.trim() ? 'default' : 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background .2s, color .2s',
                  boxShadow: sending || !message.trim() ? 'none' : `0 4px 16px ${selectedType.color}44`,
                  WebkitTapHighlightColor: 'transparent',
                }}>
                {sending ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M4 10a6 6 0 1 1 1.2 3.6M4 14V10h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                    Sending…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                      <path d="M3 10l14-8-4 8 4 8-14-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Send Feedback
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
