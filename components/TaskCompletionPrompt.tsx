'use client';

/**
 * TaskCompletionPrompt
 * ──────────────────────────────────────────────────────────────────────────────
 * Bottom sheet that appears when an active task's scheduled end_time is reached.
 * Asks: "Did you finish [Task Name]?"
 *
 * • Yes, Done   → calls onMarkComplete(id)
 * • Not Yet     → calls onReschedule(schedule)  → opens AddScheduleSheet to extend
 * • Dismiss     → calls onDismiss() (snoozes the prompt for this task)
 */

import type { Schedule } from '@/types/database';
import { formatSavedTime } from '@/lib/timeProgress';

interface Props {
  open:            boolean;
  schedule:        Schedule;
  savedMins?:      number;        // if completing early, show saved time
  onMarkComplete:  (id: string) => Promise<void>;
  onReschedule:    (s: Schedule) => void;
  onDismiss:       () => void;
}

export default function TaskCompletionPrompt({
  open, schedule, savedMins = 0,
  onMarkComplete, onReschedule, onDismiss,
}: Props) {

  const typeColor: Record<string, string> = {
    task: '#7C6AF0', event: '#00C6FF', reminder: '#FDCB6E',
    block: '#FF6B8A',
  };
  const accent = typeColor[schedule.type ?? 'task'] ?? '#7C6AF0';

  const OVERLAY: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 400,
    background: 'rgba(0,0,0,.55)',
    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
    opacity: open ? 1 : 0,
    pointerEvents: open ? 'auto' : 'none',
    transition: 'opacity .2s ease',
  };

  const SHEET: React.CSSProperties = {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderRadius: '22px 22px 0 0',
    background: 'var(--surf, #131424)',
    border: '1px solid var(--glass-border, rgba(255,255,255,.09))',
    borderBottom: 'none',
    padding: '0 0 env(safe-area-inset-bottom, 24px)',
    transform: open ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform .3s cubic-bezier(.32,1,.52,1)',
  };

  return (
    <div style={OVERLAY} onClick={onDismiss}>
      <div style={SHEET} onClick={e => e.stopPropagation()}>
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.15)', margin: '10px auto 0' }} />

        {/* Header */}
        <div style={{ padding: '20px 20px 0', textAlign: 'center' }}>
          {/* Bell ring icon */}
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 14px',
            background: `${accent}22`,
            border: `1.5px solid ${accent}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 2a7 7 0 0 0-7 7c0 4-2.5 5.5-2.5 5.5h19S19 13 19 9a7 7 0 0 0-7-7z"
                stroke={accent} strokeWidth="1.7" strokeLinejoin="round"/>
              <path d="M13.73 19a2 2 0 0 1-3.46 0"
                stroke={accent} strokeWidth="1.7" strokeLinecap="round"/>
              <circle cx="12" cy="2" r="1" fill={accent}/>
            </svg>
          </div>

          <div style={{ fontSize: 13, color: 'var(--mid)', fontWeight: 600, marginBottom: 4 }}>
            Time's up!
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', lineHeight: 1.3, marginBottom: 6 }}>
            Did you finish
          </div>
          <div style={{
            display: 'inline-block',
            fontSize: 15, fontWeight: 700, color: accent,
            background: `${accent}18`, borderRadius: 8,
            padding: '4px 12px', marginBottom: 16, maxWidth: '90%',
          }}>
            {schedule.title}
          </div>

          {savedMins > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 12, color: '#00C896', fontWeight: 700,
              background: 'rgba(0,200,150,.1)', borderRadius: 8, padding: '6px 14px',
              marginBottom: 6,
            }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M8 2v4l3 2" stroke="#00C896" strokeWidth="1.8" strokeLinecap="round"/>
                <circle cx="8" cy="8" r="6" stroke="#00C896" strokeWidth="1.5"/>
              </svg>
              You saved {formatSavedTime(savedMins)} ahead of schedule!
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ padding: '16px 20px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Yes, Done */}
          <button
            onClick={() => onMarkComplete(schedule.id)}
            style={{
              width: '100%', padding: '15px',
              background: 'linear-gradient(135deg, #00C896, #00a87a)',
              border: 'none', borderRadius: 14, cursor: 'pointer',
              fontSize: 15, fontWeight: 800, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'inherit', letterSpacing: '.01em',
              boxShadow: '0 4px 16px rgba(0,200,150,.3)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M4 10l5 5 7-8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Yes, Mark as Complete
          </button>

          {/* Not Yet — reschedule */}
          <button
            onClick={() => onReschedule(schedule)}
            style={{
              width: '100%', padding: '14px',
              background: 'var(--glass-bg2, rgba(255,255,255,.06))',
              border: '1.5px solid var(--glass-border, rgba(255,255,255,.1))',
              borderRadius: 14, cursor: 'pointer',
              fontSize: 14, fontWeight: 700, color: 'var(--dark)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'inherit',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M4 10a6 6 0 1 0 1.2-3.6" stroke="var(--purple)" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M4 6v4h4" stroke="var(--purple)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Not Yet — Extend or Reschedule
          </button>

          {/* Dismiss */}
          <button
            onClick={onDismiss}
            style={{
              width: '100%', padding: '10px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: 'var(--mid)',
              fontFamily: 'inherit',
            }}
          >
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}
