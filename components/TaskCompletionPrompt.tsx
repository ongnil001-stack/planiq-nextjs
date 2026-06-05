'use client';

/**
 * TaskCompletionPrompt — redesigned
 * ──────────────────────────────────────────────────────────────────────────────
 * Bottom sheet that appears when an active task's scheduled end_time is reached.
 *
 * Actions (in order of visual prominence):
 *   ✅  Yes, I Completed It      → onMarkComplete(id)   — primary gradient button
 *   🔄  Not Yet — Reschedule     → onReschedule(s)      — secondary outlined
 *   ❌  Missed / Skip            → onMissedSkip(id)     — destructive quiet
 *   ⏰  Remind me later          → onDismiss()          — ghost text
 */

import type { Schedule } from '@/types/database';
import { formatSavedTime } from '@/lib/timeProgress';

interface Props {
  open:            boolean;
  schedule:        Schedule;
  savedMins?:      number;
  onMarkComplete:  (id: string) => Promise<void>;
  onReschedule:    (s: Schedule) => void;
  onMissedSkip?:   (id: string) => void;
  onDismiss:       () => void;
}

export default function TaskCompletionPrompt({
  open, schedule, savedMins = 0,
  onMarkComplete, onReschedule, onMissedSkip, onDismiss,
}: Props) {

  return (
    <>
      <style>{`@keyframes tcpSlide { from{transform:translateY(100%)} to{transform:translateY(0)} }`}</style>

      {/* Overlay */}
      <div
        onClick={onDismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,.60)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .22s ease',
        }}
      >
        {/* Sheet */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            borderRadius: '26px 26px 0 0',
            background: 'var(--surf, #131424)',
            border: '1px solid var(--glass-border, rgba(255,255,255,.09))',
            borderBottom: 'none',
            boxShadow: '0 -12px 60px rgba(0,0,0,.45)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
            transform: open ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform .32s cubic-bezier(.32,1,.52,1)',
          }}
        >
          {/* Drag handle */}
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'var(--border2, rgba(255,255,255,.15))',
            margin: '12px auto 0',
          }} />

          {/* ── Header section ───────────────────────────────────────────────── */}
          <div style={{
            padding: '24px 24px 0',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textAlign: 'center',
          }}>
            {/* Clock icon */}
            <div style={{
              width: 60, height: 60, borderRadius: 18,
              background: 'var(--pur-lt, rgba(124,106,240,.12))',
              border: '1.5px solid var(--border2, rgba(124,106,240,.25))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="var(--purple, #7C6AF0)" strokeWidth="1.8"/>
                <path d="M12 7v5l3.5 3.5" stroke="var(--purple, #7C6AF0)" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="1.5" fill="var(--purple, #7C6AF0)"/>
              </svg>
            </div>

            {/* "Time's up!" */}
            <div style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '.8px',
              textTransform: 'uppercase',
              color: 'var(--purple, #7C6AF0)',
              marginBottom: 6,
            }}>
              Time&apos;s up
            </div>

            {/* Primary question */}
            <div style={{
              fontSize: 22, fontWeight: 900, color: 'var(--dark)',
              lineHeight: 1.25, letterSpacing: '-.3px',
              marginBottom: 14,
            }}>
              Did you finish this task?
            </div>

            {/* Task name — prominent pill */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px',
              background: 'var(--glass-bg2, rgba(255,255,255,.06))',
              border: '1.5px solid var(--border2, rgba(124,106,240,.22))',
              borderRadius: 14,
              maxWidth: '100%',
              marginBottom: 4,
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="3" stroke="var(--purple,#7C6AF0)" strokeWidth="1.5"/>
                <path d="M5 8l2 2 4-4" stroke="var(--purple,#7C6AF0)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{
                fontSize: 16, fontWeight: 800, color: 'var(--dark)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 240,
              }}>
                {schedule.title}
              </span>
            </div>

            {/* Saved time badge — only if ahead of schedule */}
            {savedMins > 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 10,
                fontSize: 12, fontWeight: 700, color: '#00C896',
                background: 'rgba(0,200,150,.10)',
                border: '1px solid rgba(0,200,150,.22)',
                borderRadius: 10, padding: '5px 12px',
              }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v4l2.5 2.5" stroke="#00C896" strokeWidth="1.8" strokeLinecap="round"/>
                  <circle cx="8" cy="8" r="6" stroke="#00C896" strokeWidth="1.5"/>
                </svg>
                {formatSavedTime(savedMins)} ahead of schedule!
              </div>
            )}
          </div>

          {/* ── Action buttons ───────────────────────────────────────────────── */}
          <div style={{
            padding: '24px 20px 8px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>

            {/* PRIMARY — Yes, I Completed It */}
            <button
              onClick={() => onMarkComplete(schedule.id)}
              style={{
                width: '100%', padding: '16px',
                background: 'var(--gradient, linear-gradient(135deg,#00C896,#00a87a))',
                border: 'none', borderRadius: 16, cursor: 'pointer',
                fontSize: 16, fontWeight: 800, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                fontFamily: 'inherit', letterSpacing: '.01em',
                boxShadow: '0 4px 20px rgba(0,200,150,.28)',
                WebkitTapHighlightColor: 'transparent',
                transition: 'opacity .12s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M4 10l5 5 7-8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Yes, I Completed It
            </button>

            {/* SECONDARY — Not Yet */}
            <button
              onClick={() => onReschedule(schedule)}
              style={{
                width: '100%', padding: '15px',
                background: 'var(--glass-bg2, rgba(255,255,255,.05))',
                border: '1.5px solid var(--border2, rgba(124,106,240,.22))',
                borderRadius: 16, cursor: 'pointer',
                fontSize: 14, fontWeight: 700, color: 'var(--dark)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M4 10a6 6 0 1 0 1.2-3.6"
                  stroke="var(--purple,#7C6AF0)" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M4 6v4h4"
                  stroke="var(--purple,#7C6AF0)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Not Yet — Extend or Reschedule
            </button>

            {/* DESTRUCTIVE — Missed / Skip */}
            <button
              onClick={() => onMissedSkip ? onMissedSkip(schedule.id) : onDismiss()}
              style={{
                width: '100%', padding: '14px',
                background: 'rgba(255,59,48,.06)',
                border: '1.5px solid rgba(255,59,48,.16)',
                borderRadius: 16, cursor: 'pointer',
                fontSize: 14, fontWeight: 700, color: '#FF6060',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="#FF6060" strokeWidth="1.7"/>
                <path d="M7 7l6 6M13 7l-6 6" stroke="#FF6060" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
              Missed / Skip
            </button>

            {/* GHOST — Remind me later */}
            <button
              onClick={onDismiss}
              style={{
                width: '100%', padding: '12px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                color: 'var(--mid)', opacity: .75,
                fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Remind me later
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
