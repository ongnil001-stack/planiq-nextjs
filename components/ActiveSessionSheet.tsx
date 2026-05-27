'use client';

/**
 * ActiveSessionSheet
 * ─────────────────────────────────────────────────────────────
 * Full-screen focused session view. Opens when the user taps
 * the Dashboard progress bar while a task is in progress.
 *
 * Shows:
 *  • Real-time elapsed timer (or countdown if end_time exists)
 *  • Animated progress ring (% of task window elapsed)
 *  • Task name, type, priority, start time
 *  • Today's queue (all tasks, active one highlighted)
 *  • Mark as Complete CTA
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Schedule } from '@/types/database';
import { timeStrToDate, getSavedMinutes } from '@/lib/timeProgress';

interface Props {
  open:             boolean;
  onClose:          () => void;
  activeSchedule:   Schedule;               // the currently in-progress task
  todaySchedules:   Schedule[];
  onMarkComplete:   (id: string) => Promise<void>;
  onSwitchTask?:    (s: Schedule) => void;  // tap a queue item to switch focus
  onTimeUp?:        (s: Schedule, savedMins: number) => void; // fired when countdown hits 0
  onReschedule?:    (s: Schedule) => void;  // passed through from dashboard
}

// ── helpers ───────────────────────────────────────────────────────────────────
const PRIORITY_COLOR: Record<string, string> = {
  critical: '#FF3B30', high: '#FF6B8A', medium: '#FDCB6E', low: '#55D6C2',
};

function pad(n: number) { return String(Math.floor(n)).padStart(2, '0'); }

function fmtElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${pad(m)}m`;
  return `${pad(m)}:${pad(s)}`;
}

function fmtCountdown(seconds: number) {
  if (seconds <= 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

// ── Ring SVG ──────────────────────────────────────────────────────────────────
function TimerRing({
  pct, countdown, elapsed, hasEndTime,
}: {
  pct: number; countdown: number; elapsed: number; hasEndTime: boolean;
}) {
  const SIZE   = 180;
  const STROKE = 11;
  const r      = (SIZE - STROKE * 2) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(Math.max(pct, 0), 1));
  const cx     = SIZE / 2;

  // Color shifts: 0-30% purple, 30-70% cyan, 70-100% mint
  const color = pct >= 0.7 ? '#00C896' : pct >= 0.3 ? '#00C6FF' : '#7C6AF0';

  const mainLabel    = hasEndTime ? fmtCountdown(countdown) : fmtElapsed(elapsed);
  const subLabel     = hasEndTime ? 'remaining' : 'elapsed';
  const elapsedLabel = hasEndTime
    ? `Elapsed: ${fmtElapsed(elapsed)}`
    : `${Math.round(pct * 100)}% complete`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Glow filter */}
        <defs>
          <filter id="ring-glow">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>
        {/* Track */}
        <circle cx={cx} cy={cx} r={r} fill="none"
          stroke="rgba(255,255,255,.07)" strokeWidth={STROKE}/>
        {/* Progress arc */}
        <circle cx={cx} cy={cx} r={r} fill="none"
          stroke={color} strokeWidth={STROKE}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
          filter="url(#ring-glow)"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke .4s ease' }}
        />
        {/* Timer text */}
        <text x={cx} y={cx - 8} textAnchor="middle"
          fill="var(--dark, #fff)" fontSize={38} fontWeight="900" fontFamily="inherit">
          {mainLabel}
        </text>
        <text x={cx} y={cx + 18} textAnchor="middle"
          fill="rgba(255,255,255,.45)" fontSize={12} fontWeight="600" fontFamily="inherit">
          {subLabel}
        </text>
      </svg>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>
        {elapsedLabel}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ActiveSessionSheet({
  open, onClose,
  activeSchedule, todaySchedules,
  onMarkComplete, onSwitchTask,
  onTimeUp, onReschedule,
}: Props) {
  const timeUpFiredRef = useRef(false);
  const [tick,       setTick]       = useState(0);  // triggers re-render every second
  const [completing, setCompleting] = useState(false);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Live clock + onTimeUp trigger ─────────────────────────────────────────
  useEffect(() => {
    if (!open) { timeUpFiredRef.current = false; return; }
    intervalRef.current = setInterval(() => {
      setTick(t => t + 1);
      // Fire onTimeUp once when the countdown reaches 0
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

  // ── Compute times ───────────────────────────────────────────────────────────
  const now       = new Date();
  const startD    = timeStrToDate(activeSchedule.start_time);
  const endD      = activeSchedule.end_time ? timeStrToDate(activeSchedule.end_time) : null;
  const hasEndTime = !!endD;

  const elapsedSec  = Math.max(0, Math.floor((now.getTime() - startD.getTime()) / 1000));
  const totalSec    = endD ? Math.max(1, Math.floor((endD.getTime() - startD.getTime()) / 1000)) : 0;
  const remainSec   = endD ? Math.max(0, Math.floor((endD.getTime() - now.getTime()) / 1000)) : 0;
  const pct         = hasEndTime
    ? Math.min(elapsedSec / totalSec, 1)
    : Math.min(elapsedSec / (60 * 60), 1); // fallback: 1h = 100%
  const isTimeUp    = hasEndTime && pct >= 1 && !activeSchedule.is_completed;
  // Guard NaN from Invalid Date (before timeStrToDate fix kicks in on older data)
  const safePct     = isNaN(pct) ? 0 : pct;
  const safeElapsed = isNaN(elapsedSec) ? 0 : elapsedSec;
  const safeRemain  = isNaN(remainSec)  ? 0 : remainSec;

  // ── Scroll lock ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const sy = window.scrollY;
    document.body.style.position    = 'fixed';
    document.body.style.top         = `-${sy}px`;
    document.body.style.left        = document.body.style.right = '0';
    document.body.style.overflow    = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.position = document.body.style.top = '';
      document.body.style.left     = document.body.style.right = '';
      document.body.style.overflow = document.body.style.touchAction = '';
      window.scrollTo(0, sy);
    };
  }, [open]);

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

  const pColor = PRIORITY_COLOR[activeSchedule.priority] ?? '#7C6AF0';
  const timeFmt: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const OVERLAY: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 300,
    background: 'rgba(0,0,0,.65)',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    opacity: open ? 1 : 0,
    pointerEvents: open ? 'auto' : 'none',
    transition: 'opacity .22s ease',
    touchAction: 'none',
  };

  const SHEET: React.CSSProperties = {
    position:   'absolute', bottom: 0, left: 0, right: 0,
    maxHeight:  '94dvh',
    borderRadius: '24px 24px 0 0',
    background: 'var(--surf, #131424)',
    border:     '1px solid var(--glass-border, rgba(255,255,255,.09))',
    borderBottom: 'none',
    display:    'flex', flexDirection: 'column', overflow: 'hidden',
    transform:  open ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform .32s cubic-bezier(.32,1,.52,1)',
  };

  return (
    <div style={OVERLAY} onClick={onClose}>
      <div style={SHEET} onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,.18)', margin:'12px auto 0', flexShrink:0 }}/>

        {/* Top bar */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'12px 20px 0', flexShrink:0,
        }}>
          {/* In Progress badge */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:6,
            padding:'4px 12px', borderRadius:20,
            background:'rgba(0,200,150,.12)', border:'1px solid rgba(0,200,150,.25)',
            fontSize:11, fontWeight:800, letterSpacing:'.4px', color:'#00C896',
          }}>
            <span style={{
              width:6, height:6, borderRadius:'50%', background:'#00C896', display:'inline-block',
              animation:'pulseDot 1.4s ease-in-out infinite',
            }}/>
            In Progress
          </div>

          {/* End session */}
          <button
            onClick={onClose}
            style={{
              background:'rgba(255,107,138,.10)', border:'1px solid rgba(255,107,138,.22)',
              borderRadius:20, padding:'4px 12px',
              fontSize:11, fontWeight:700, color:'#FF6B8A',
              cursor:'pointer', fontFamily:'inherit', WebkitTapHighlightColor:'transparent',
            }}
          >
            End Session
          </button>
        </div>

        {/* Task header */}
        <div style={{ padding:'14px 20px 0', flexShrink:0 }}>
          <h2 style={{
            fontSize:22, fontWeight:900, color:'var(--dark)', letterSpacing:'-.5px',
            lineHeight:1.2, margin:'0 0 6px',
          }}>
            {activeSchedule.title}
          </h2>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            <span style={{ fontSize:12, color:'var(--mid)', fontWeight:600 }}>
              {isNaN(startD.getTime())
                ? 'Scheduled task'
                : startD.toLocaleTimeString('en-US', timeFmt)}
              {endD && !isNaN(endD.getTime())
                ? ` – ${endD.toLocaleTimeString('en-US', timeFmt)}` : ''}
            </span>
            <span style={{ color:'rgba(255,255,255,.2)' }}>·</span>
            <span style={{ fontSize:11, color:'var(--mid)', fontWeight:600, textTransform:'capitalize' }}>
              {activeSchedule.type}
            </span>
            <span style={{ color:'rgba(255,255,255,.2)' }}>·</span>
            <span style={{
              fontSize:10, fontWeight:800, letterSpacing:'.3px',
              color:pColor, textTransform:'uppercase',
            }}>
              {activeSchedule.priority}
            </span>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{
          flex:1, overflowY:'auto', padding:'20px 20px 0',
          WebkitOverflowScrolling:'touch', scrollbarWidth:'none', overscrollBehavior:'contain',
        }}>

          {/* Timer ring */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
            {/* key={tick} forces SVG to re-evaluate strokeDashoffset transition */}
            <TimerRing pct={safePct} countdown={safeRemain} elapsed={safeElapsed} hasEndTime={hasEndTime} />
          </div>

          {/* Today's Queue */}
          {todaySchedules.length > 0 && (
            <>
              <div style={{
                fontSize:10, fontWeight:800, letterSpacing:'1px',
                textTransform:'uppercase', color:'rgba(255,255,255,.35)',
                marginBottom:10,
              }}>
                Today&apos;s Queue
              </div>
              <div style={{
                background:'rgba(255,255,255,.04)',
                border:'1px solid rgba(255,255,255,.07)',
                borderRadius:16, overflow:'hidden', marginBottom:20,
              }}>
                {todaySchedules.map((s, i) => {
                  const isActive = s.id === activeSchedule.id;
                  const isDone   = s.is_completed;
                  const sStart   = timeStrToDate(s.start_time);
                  const sPColor  = PRIORITY_COLOR[s.priority] ?? '#7C6AF0';
                  return (
                    <button
                      key={s.id}
                      onClick={() => !isActive && onSwitchTask?.(s)}
                      style={{
                        display:'flex', alignItems:'center', gap:12,
                        width:'100%', padding:'11px 14px',
                        background: isActive ? 'rgba(0,200,150,.08)' : 'transparent',
                        borderBottom: i < todaySchedules.length - 1
                          ? '1px solid rgba(255,255,255,.05)' : 'none',
                        cursor: isActive ? 'default' : 'pointer',
                        fontFamily:'inherit', textAlign:'left',
                        WebkitTapHighlightColor:'transparent',
                      }}
                    >
                      {/* Dot / play indicator */}
                      <span style={{ flexShrink:0, width:8, height:8, borderRadius:'50%',
                        background: isDone ? 'rgba(0,200,150,.5)' : sPColor,
                        outline: isActive ? `2px solid ${sPColor}` : 'none', outlineOffset:2,
                      }}>
                        {isActive && (
                          <svg width="6" height="6" viewBox="0 0 10 10" fill={sPColor}
                            style={{ position:'relative', left:'1px', top:'-7px' }}>
                            <polygon points="2,1 9,5 2,9"/>
                          </svg>
                        )}
                      </span>

                      <span style={{
                        flex:1, fontSize:13, fontWeight: isActive ? 700 : 600,
                        color: isDone ? 'rgba(255,255,255,.35)' : isActive ? 'var(--dark)' : 'var(--mid)',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                        textDecoration: isDone ? 'line-through' : 'none',
                      }}>
                        {isActive && '▶ '}{s.title}
                      </span>

                      <span style={{ fontSize:11, fontWeight:700,
                        color: isActive ? '#00C896' : 'rgba(255,255,255,.35)', flexShrink:0 }}>
                        {sStart.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', hour12:true })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Bottom action area ──────────────────────────────────────────────── */}
        <div style={{
          padding:'12px 20px',
          paddingBottom:'max(20px, env(safe-area-inset-bottom, 20px))',
          flexShrink:0,
          borderTop:'1px solid rgba(255,255,255,.06)',
        }}>

          {isTimeUp ? (
            /* ── TIME'S UP: ask what happened ─────────────────────────────── */
            <>
              {/* Banner */}
              <div style={{
                display:'flex', alignItems:'center', gap:8,
                background:'rgba(253,203,110,.1)', border:'1px solid rgba(253,203,110,.25)',
                borderRadius:12, padding:'10px 14px', marginBottom:12,
              }}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink:0 }}>
                  <circle cx="10" cy="10" r="8" stroke="#FDCB6E" strokeWidth="1.6"/>
                  <path d="M10 6v4l2.5 2.5" stroke="#FDCB6E" strokeWidth="1.6"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div style={{ fontSize:12, fontWeight:700, color:'#FDCB6E', flex:1 }}>
                  Scheduled time ended — what happened?
                </div>
              </div>

              {/* ✅ Yes, I completed it */}
              <button
                onClick={handleComplete}
                disabled={completing}
                style={{
                  width:'100%', padding:'15px 0', marginBottom:10,
                  borderRadius:14, border:'none',
                  background: completing
                    ? 'rgba(0,200,150,.4)'
                    : 'linear-gradient(135deg, #00C896 0%, #00A878 100%)',
                  color:'#fff', fontSize:15, fontWeight:800,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  cursor: completing ? 'default' : 'pointer',
                  fontFamily:'inherit', WebkitTapHighlightColor:'transparent',
                  boxShadow: completing ? 'none' : '0 4px 16px rgba(0,200,150,.3)',
                  letterSpacing:'.2px',
                }}
              >
                {completing ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    style={{ animation:'spin .9s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2.5"
                      strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12l5 5 9-9" stroke="#fff" strokeWidth="2.4"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {completing ? 'Marking complete…' : 'Yes, I Completed It'}
              </button>

              {/* 🔄 Not yet — reschedule */}
              <button
                onClick={() => { onReschedule?.(activeSchedule); onClose(); }}
                style={{
                  width:'100%', padding:'14px 0',
                  borderRadius:14, border:'1.5px solid rgba(255,255,255,.12)',
                  background:'rgba(255,255,255,.05)',
                  color:'var(--dark)', fontSize:14, fontWeight:700,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  cursor:'pointer', fontFamily:'inherit',
                  WebkitTapHighlightColor:'transparent',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10a6 6 0 1 0 1.2-3.6" stroke="var(--purple)"
                    strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M4 6v4h4" stroke="var(--purple)"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Not Yet — Extend or Reschedule
              </button>
            </>

          ) : (
            /* ── IN PROGRESS: done early + end session ─────────────────────── */
            <>
              <button
                onClick={handleComplete}
                disabled={completing}
                style={{
                  width:'100%', padding:'16px 0', marginBottom:9,
                  borderRadius:16, border:'none',
                  background: completing
                    ? 'rgba(0,200,150,.4)'
                    : 'linear-gradient(135deg, #00C896 0%, #00A878 100%)',
                  color:'#fff', fontSize:16, fontWeight:800,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  cursor: completing ? 'default' : 'pointer',
                  fontFamily:'inherit', WebkitTapHighlightColor:'transparent',
                  boxShadow: completing ? 'none' : '0 4px 20px rgba(0,200,150,.35)',
                  letterSpacing:'.2px',
                }}
              >
                {completing ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    style={{ animation:'spin .9s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2.5"
                      strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12l5 5 9-9" stroke="#fff" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {completing ? 'Marking complete…' : '✓ Done Early'}
              </button>

              <button
                onClick={onClose}
                style={{
                  width:'100%', padding:'11px 0',
                  background:'transparent', border:'none',
                  color:'var(--mid)', fontSize:13, fontWeight:600,
                  cursor:'pointer', fontFamily:'inherit',
                }}
              >
                End Session (keep as pending)
              </button>
            </>
          )}

        </div>

      </div>
    </div>
  );
}
