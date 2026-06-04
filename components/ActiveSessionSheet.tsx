'use client';

/**
 * ActiveSessionSheet — redesigned
 * ─────────────────────────────────────────────────────────────
 * Premium In-Progress view with theme-aware gradient ring.
 *
 * Ring uses --g-start / --g-end CSS variables so it automatically
 * matches the selected app theme (Ocean, Soft Professional, Dark, etc.)
 *
 * Layout:
 *  • Header: IN PROGRESS badge + task title + meta pills
 *  • Centered gradient ring (countdown or elapsed)
 *  • Stat pills: Elapsed | Total | Remaining
 *  • Today's Queue
 *  • Bottom CTAs: Complete (gradient) + Reschedule / Keep Going
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Schedule } from '@/types/database';
import { timeStrToDate, getSavedMinutes } from '@/lib/timeProgress';

interface Props {
  open:           boolean;
  onClose:        () => void;
  activeSchedule: Schedule;
  todaySchedules: Schedule[];
  onMarkComplete: (id: string) => Promise<void>;
  onSwitchTask?:  (s: Schedule) => void;
  onTimeUp?:      (s: Schedule, savedMins: number) => void;
  onReschedule?:  (s: Schedule) => void;
}

// ── helpers ────────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#FF3B30', high: '#FF6B8A', medium: '#FDCB6E', low: '#55D6C2',
};
const PRIORITY_BG: Record<string, string> = {
  critical: 'rgba(255,59,48,.12)', high: 'rgba(255,107,138,.12)',
  medium:   'rgba(253,203,110,.12)', low: 'rgba(85,214,194,.12)',
};

function pad(n: number) { return String(Math.floor(n)).padStart(2, '0'); }

function fmtElapsed(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${pad(m)}m`;
  return `${pad(m)}:${pad(sec)}`;
}

function fmtCountdown(s: number): string {
  if (s <= 0) return '00:00';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// ── Theme-aware gradient ring ──────────────────────────────────────────────────

function TimerRing({
  pct, countdown, elapsed, hasEndTime, isTimeUp,
}: {
  pct: number; countdown: number; elapsed: number;
  hasEndTime: boolean; isTimeUp: boolean;
}) {
  const SIZE   = 224;
  const STROKE = 15;
  const r      = (SIZE - STROKE * 2) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(Math.max(pct, 0), 1));
  const cx     = SIZE / 2;

  // Tip of the arc position (for the leading dot)
  const tipAngleDeg = pct * 360 - 90;
  const tipRad      = tipAngleDeg * (Math.PI / 180);
  const tipX        = cx + r * Math.cos(tipRad);
  const tipY        = cx + r * Math.sin(tipRad);

  const mainLabel = hasEndTime ? fmtCountdown(countdown) : fmtElapsed(elapsed);
  const subLabel  = hasEndTime
    ? (isTimeUp ? 'TIME UP' : 'REMAINING')
    : 'ELAPSED';

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: 'visible' }}>
        <defs>
          {/* Main gradient — inherits theme colors from CSS vars */}
          <linearGradient id="iq-ring-grad" x1="0" y1="0" x2={SIZE} y2={SIZE} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   style={{ stopColor: 'var(--g-start, #00C6FF)', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: 'var(--g-end, #0066FF)',   stopOpacity: 1 }} />
          </linearGradient>
          {/* Track tint gradient (very faint) */}
          <linearGradient id="iq-track-grad" x1="0" y1="0" x2={SIZE} y2={SIZE} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   style={{ stopColor: 'var(--g-start, #00C6FF)', stopOpacity: 0.12 }} />
            <stop offset="100%" style={{ stopColor: 'var(--g-end, #0066FF)',   stopOpacity: 0.06 }} />
          </linearGradient>
          {/* Soft outer glow */}
          <filter id="iq-glow-out" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur"/>
            <feFlood floodColor="var(--g-start, #00C6FF)" floodOpacity="0.35" result="color"/>
            <feComposite in="color" in2="blur" operator="in" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/></feMerge>
          </filter>
          {/* Arc glow */}
          <filter id="iq-arc-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
          {/* Leading dot glow */}
          <filter id="iq-dot-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5"/>
          </filter>
        </defs>

        {/* ── Outer ambient glow (behind everything) */}
        {pct > 0.04 && (
          <circle cx={cx} cy={cx} r={r} fill="none"
            stroke="url(#iq-ring-grad)" strokeWidth={STROKE + 12}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cx})`}
            filter="url(#iq-glow-out)"
            style={{ opacity: 0.22, transition: 'stroke-dashoffset 1s linear' }}
          />
        )}

        {/* ── Track base ring */}
        <circle cx={cx} cy={cx} r={r} fill="none"
          stroke="url(#iq-track-grad)" strokeWidth={STROKE}
          style={{ opacity: 0.9 }}
        />
        {/* Track hairline border */}
        <circle cx={cx} cy={cx} r={r} fill="none"
          style={{ stroke: 'var(--border)' }} strokeWidth={0.8}
        />

        {/* ── Progress arc */}
        <circle cx={cx} cy={cx} r={r} fill="none"
          stroke="url(#iq-ring-grad)" strokeWidth={STROKE}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
          filter="url(#iq-arc-glow)"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />

        {/* ── Leading dot at arc tip */}
        {pct > 0.03 && pct < 0.999 && (
          <>
            {/* Glow shadow behind dot */}
            <circle cx={tipX} cy={tipY} r={STROKE * 0.7}
              fill="var(--g-end, #0066FF)"
              filter="url(#iq-dot-glow)"
              style={{ opacity: 0.5 }}
            />
            {/* Solid dot */}
            <circle cx={tipX} cy={tipY} r={STROKE * 0.55}
              fill="var(--g-end, #0066FF)"
            />
            {/* White centre highlight */}
            <circle cx={tipX - STROKE * 0.12} cy={tipY - STROKE * 0.12}
              r={STROKE * 0.2}
              fill="rgba(255,255,255,0.55)"
            />
          </>
        )}

        {/* ── Centre: main timer */}
        <text x={cx} y={cx - 14} textAnchor="middle"
          fill={isTimeUp ? 'var(--coral, #FF5C7A)' : 'var(--dark, #fff)'}
          fontSize={countdown >= 3600 || elapsed >= 3600 ? 32 : 44}
          fontWeight="900" fontFamily="inherit"
          style={{ letterSpacing: '-1.5px', fontVariantNumeric: 'tabular-nums' }}>
          {mainLabel}
        </text>
        <text x={cx} y={cx + 12} textAnchor="middle"
          style={{ fill: isTimeUp ? 'var(--coral, #FF5C7A)' : 'var(--mid)' }}
          fontSize={10} fontWeight="800" fontFamily="inherit"
          letterSpacing="1.2">
          {subLabel}
        </text>
        {/* Progress % */}
        <text x={cx} y={cx + 30} textAnchor="middle"
          style={{ fill: 'var(--lite)' }}
          fontSize={10} fontWeight="600" fontFamily="inherit">
          {Math.round(pct * 100)}% complete
        </text>
      </svg>
    </div>
  );
}

// ── Stat pill ──────────────────────────────────────────────────────────────────

function StatPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '10px 6px',
      background: accent ? 'var(--pur-lt, rgba(124,106,240,.12))' : 'var(--glass-bg2, rgba(255,255,255,.04))',
      border: `1px solid ${accent ? 'var(--border2)' : 'var(--glass-border, rgba(255,255,255,.08))'}`,
      borderRadius: 14,
    }}>
      <div style={{
        fontSize: 16, fontWeight: 900, lineHeight: 1,
        color: accent ? 'var(--purple)' : 'var(--dark)',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-.3px',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 9, fontWeight: 800, marginTop: 4,
        color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.6px',
      }}>
        {label}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ActiveSessionSheet({
  open, onClose,
  activeSchedule, todaySchedules,
  onMarkComplete, onSwitchTask,
  onTimeUp, onReschedule,
}: Props) {
  const timeUpFiredRef = useRef(false);
  const [, setTick]      = useState(0);
  const [completing, setCompleting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live clock
  useEffect(() => {
    if (!open) { timeUpFiredRef.current = false; return; }
    intervalRef.current = setInterval(() => {
      setTick(t => t + 1);
      if (!timeUpFiredRef.current && onTimeUp && activeSchedule.end_time) {
        const endNow = timeStrToDate(activeSchedule.end_time);
        if (new Date() >= endNow) {
          timeUpFiredRef.current = true;
          const saved = getSavedMinutes(activeSchedule.end_time, new Date());
          onTimeUp(activeSchedule, saved);
        }
      }
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeSchedule.id]);

  // Time calculations
  const now        = new Date();
  const startD     = timeStrToDate(activeSchedule.start_time);
  const endD       = activeSchedule.end_time ? timeStrToDate(activeSchedule.end_time) : null;
  const hasEndTime = !!endD;

  const elapsedSec = Math.max(0, Math.floor((now.getTime() - startD.getTime()) / 1000));
  const totalSec   = endD ? Math.max(1, Math.floor((endD.getTime() - startD.getTime()) / 1000)) : 0;
  const remainSec  = endD ? Math.max(0, Math.floor((endD.getTime() - now.getTime()) / 1000)) : 0;
  const pct        = hasEndTime
    ? Math.min(elapsedSec / totalSec, 1)
    : Math.min(elapsedSec / (60 * 60), 1);
  const isTimeUp   = hasEndTime && pct >= 1 && !activeSchedule.is_completed;

  const safePct     = isNaN(pct) ? 0 : pct;
  const safeElapsed = isNaN(elapsedSec) ? 0 : elapsedSec;
  const safeRemain  = isNaN(remainSec)  ? 0 : remainSec;
  const safeTotalSec = isNaN(totalSec) ? 0 : totalSec;

  // Scroll lock
  useEffect(() => {
    if (!open) return;
    const sy = window.scrollY;
    Object.assign(document.body.style, {
      position: 'fixed', top: `-${sy}px`, left: '0', right: '0',
      overflow: 'hidden', touchAction: 'none',
    });
    return () => {
      Object.assign(document.body.style, {
        position: '', top: '', left: '', right: '',
        overflow: '', touchAction: '',
      });
      window.scrollTo(0, sy);
    };
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  const handleComplete = useCallback(async () => {
    setCompleting(true);
    await onMarkComplete(activeSchedule.id);
    setCompleting(false);
    onClose();
  }, [activeSchedule.id, onMarkComplete, onClose]);

  const pColor = PRIORITY_COLOR[activeSchedule.priority] ?? 'var(--purple)';
  const pBg    = PRIORITY_BG[activeSchedule.priority]    ?? 'var(--pur-lt)';
  const timeFmt: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  const pendingCount = todaySchedules.filter(s => !s.is_completed).length;

  return (
    <>
      <style>{`
        @keyframes pulseDot {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.55; transform:scale(1.35); }
        }
        @keyframes spin {
          to { transform:rotate(360deg); }
        }
      `}</style>

      {/* Overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,.72)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .22s ease',
          touchAction: 'none',
        }}
        onClick={onClose}
      >
        {/* Sheet */}
        <div
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            maxHeight: '96dvh',
            borderRadius: '28px 28px 0 0',
            background: 'var(--surf, #131424)',
            border: '1px solid var(--glass-border, rgba(255,255,255,.09))',
            borderBottom: 'none',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            transform: open ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform .32s cubic-bezier(.32,1,.52,1)',
            boxShadow: '0 -12px 60px rgba(0,0,0,.55)',
          }}
          onClick={e => e.stopPropagation()}
        >

          {/* ── Drag handle */}
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'var(--border2)', margin: '12px auto 0', flexShrink: 0,
          }} />

          {/* ── Top bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 20px 0', flexShrink: 0,
          }}>
            {/* IN PROGRESS badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 13px', borderRadius: 20,
              background: 'var(--pur-lt, rgba(124,106,240,.12))',
              border: '1px solid var(--border2)',
              fontSize: 10, fontWeight: 900, letterSpacing: '.8px', color: 'var(--purple)',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--purple)', display: 'inline-block',
                animation: 'pulseDot 1.4s ease-in-out infinite',
              }} />
              IN PROGRESS
            </div>

            {/* End Session */}
            <button onClick={onClose} style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 20, padding: '5px 14px',
              fontSize: 12, fontWeight: 600, color: 'var(--mid)',
              cursor: 'pointer', fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
            }}>
              End Session
            </button>
          </div>

          {/* ── Task title + meta */}
          <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
            <h2 style={{
              fontSize: 21, fontWeight: 900, color: 'var(--dark)',
              letterSpacing: '-.4px', lineHeight: 1.25, margin: '0 0 10px',
            }}>
              {activeSchedule.title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {/* Time range chip */}
              {!isNaN(startD.getTime()) && (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--mid)',
                  background: 'var(--surf2)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '2px 8px',
                }}>
                  {startD.toLocaleTimeString('en-US', timeFmt)}
                  {endD && !isNaN(endD.getTime()) ? ` → ${endD.toLocaleTimeString('en-US', timeFmt)}` : ''}
                </span>
              )}
              {/* Type chip */}
              <span style={{
                fontSize: 11, fontWeight: 600, color: 'var(--mid)', textTransform: 'capitalize',
                background: 'var(--surf2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '2px 8px',
              }}>
                {activeSchedule.type}
              </span>
              {/* Priority chip */}
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '.4px',
                color: pColor, textTransform: 'uppercase',
                background: pBg, border: `1px solid ${pColor}30`,
                borderRadius: 8, padding: '2px 8px',
              }}>
                {activeSchedule.priority}
              </span>
            </div>
          </div>

          {/* Thin accent divider */}
          <div style={{
            height: 1, margin: '14px 20px 0',
            background: 'var(--gradient)',
            opacity: 0.18, flexShrink: 0,
          }} />

          {/* ── Scrollable body */}
          <div style={{
            flex: 1, overflowY: 'auto', overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
          }}>
            <div style={{ padding: '20px 20px 0' }}>

              {/* Ring */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                <TimerRing
                  pct={safePct} countdown={safeRemain}
                  elapsed={safeElapsed} hasEndTime={hasEndTime} isTimeUp={isTimeUp}
                />
              </div>

              {/* Stat pills */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
                <StatPill label="Elapsed" value={fmtElapsed(safeElapsed)} />
                {hasEndTime && safeTotalSec > 0 && (
                  <StatPill label="Total" value={fmtDuration(safeTotalSec)} accent />
                )}
                {hasEndTime && (
                  <StatPill
                    label={isTimeUp ? 'Ended' : 'Remaining'}
                    value={isTimeUp ? '—' : fmtCountdown(safeRemain)}
                  />
                )}
              </div>

              {/* Today's Queue */}
              {todaySchedules.length > 0 && (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 8,
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, letterSpacing: '.8px',
                      textTransform: 'uppercase', color: 'var(--lite)',
                    }}>
                      Today&apos;s Queue
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: 'var(--mid)',
                    }}>
                      {pendingCount} pending
                    </span>
                  </div>

                  <div style={{
                    background: 'var(--surf2)', border: '1px solid var(--border)',
                    borderRadius: 16, overflow: 'hidden', marginBottom: 24,
                  }}>
                    {todaySchedules.map((s, i) => {
                      const isActive = s.id === activeSchedule.id;
                      const isDone   = s.is_completed;
                      const sStart   = timeStrToDate(s.start_time);
                      const sPColor  = PRIORITY_COLOR[s.priority] ?? 'var(--purple)';
                      return (
                        <button
                          key={s.id}
                          onClick={() => !isActive && onSwitchTask?.(s)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            width: '100%', padding: '11px 14px',
                            background: isActive
                              ? 'var(--pur-lt, rgba(124,106,240,.08))'
                              : 'transparent',
                            borderBottom: i < todaySchedules.length - 1
                              ? '1px solid var(--border)' : 'none',
                            cursor: isActive ? 'default' : 'pointer',
                            fontFamily: 'inherit', textAlign: 'left',
                            WebkitTapHighlightColor: 'transparent',
                          }}
                        >
                          {/* Status indicator */}
                          <span style={{
                            flexShrink: 0, width: 8, height: 8, borderRadius: '50%',
                            background: isDone
                              ? 'var(--mint, #00C896)'
                              : isActive ? 'var(--purple)' : sPColor,
                            boxShadow: isActive ? '0 0 8px var(--purple)' : 'none',
                          }} />

                          <span style={{
                            flex: 1, fontSize: 13,
                            fontWeight: isActive ? 700 : 500,
                            color: isDone ? 'var(--lite)'
                              : isActive ? 'var(--dark)' : 'var(--mid)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}>
                            {s.title}
                          </span>

                          {isActive ? (
                            <span style={{
                              fontSize: 9, fontWeight: 900, letterSpacing: '.5px',
                              color: 'var(--purple)', textTransform: 'uppercase',
                              background: 'var(--border2, rgba(255,255,255,.12))',
                              borderRadius: 6, padding: '2px 7px',
                            }}>
                              NOW
                            </span>
                          ) : (
                            <span style={{
                              fontSize: 11, fontWeight: 600,
                              color: isDone ? 'var(--mint)' : 'var(--lite)',
                              flexShrink: 0,
                            }}>
                              {isDone ? '✓' : sStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Bottom actions */}
          <div style={{
            padding: '14px 20px',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
            flexShrink: 0,
            borderTop: '1px solid var(--border)',
            background: 'var(--surf)',
          }}>

            {isTimeUp ? (
              /* ── TIME'S UP ──────────────────────────────────────── */
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(253,203,110,.07)',
                  border: '1px solid rgba(253,203,110,.20)',
                  borderRadius: 12, padding: '10px 14px', marginBottom: 12,
                }}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="10" cy="10" r="8" stroke="#FDCB6E" strokeWidth="1.6"/>
                    <path d="M10 6v4l2.5 2.5" stroke="#FDCB6E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#FDCB6E', flex: 1 }}>
                    Scheduled time ended — what happened?
                  </span>
                </div>

                <button onClick={handleComplete} disabled={completing} style={{
                  width: '100%', padding: '15px 0', marginBottom: 8,
                  borderRadius: 14, border: 'none',
                  background: completing
                    ? 'var(--pur-lt)'
                    : 'var(--gradient, linear-gradient(135deg,#00C6FF,#0066FF))',
                  color: '#fff', fontSize: 15, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: completing ? 'default' : 'pointer',
                  fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
                  boxShadow: completing ? 'none' : '0 4px 20px rgba(0,0,0,.22)',
                  letterSpacing: '.2px',
                }}>
                  {completing
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin .9s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2.5" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
                      </svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12l5 5 9-9" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                  }
                  {completing ? 'Marking complete…' : 'Yes, I Completed It'}
                </button>

                <button onClick={() => { onReschedule?.(activeSchedule); onClose(); }} style={{
                  width: '100%', padding: '14px 0', borderRadius: 14,
                  border: '1.5px solid var(--border)', background: 'var(--surf2)',
                  color: 'var(--dark)', fontSize: 14, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
                }}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10a6 6 0 1 0 1.2-3.6" stroke="var(--purple)" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M4 6v4h4" stroke="var(--purple)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Not Yet — Extend or Reschedule
                </button>
              </>

            ) : (
              /* ── IN PROGRESS ─────────────────────────────────────── */
              <>
                {/* Primary CTA */}
                <button onClick={handleComplete} disabled={completing} style={{
                  width: '100%', padding: '16px 0', marginBottom: 10,
                  borderRadius: 16, border: 'none',
                  background: completing
                    ? 'var(--pur-lt)'
                    : 'var(--gradient, linear-gradient(135deg,#00C6FF,#0066FF))',
                  color: '#fff', fontSize: 15, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: completing ? 'default' : 'pointer',
                  fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
                  boxShadow: completing ? 'none' : '0 4px 24px rgba(0,0,0,.22)',
                  letterSpacing: '.2px',
                }}>
                  {completing
                    ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin .9s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2.5" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
                      </svg>
                    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12l5 5 9-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                  }
                  {completing ? 'Marking complete…' : 'Mark as Completed'}
                </button>

                {/* Secondary row */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { onReschedule?.(activeSchedule); onClose(); }} style={{
                    flex: 1, padding: '12px 0', borderRadius: 12,
                    border: '1px solid var(--border)', background: 'var(--surf2)',
                    color: 'var(--mid)', fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    cursor: 'pointer', fontFamily: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                      <path d="M4 10a6 6 0 1 0 1.2-3.6" stroke="var(--mid)" strokeWidth="1.8" strokeLinecap="round"/>
                      <path d="M4 6v4h4" stroke="var(--mid)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Reschedule
                  </button>
                  <button onClick={onClose} style={{
                    flex: 1, padding: '12px 0', borderRadius: 12,
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--mid)', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                    Keep Going
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
