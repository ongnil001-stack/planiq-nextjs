'use client';

/**
 * ProgressDetailsSheet
 * ─────────────────────────────────────────────────────────────
 * Bottom sheet that opens when the user taps the progress bar
 * on the Dashboard. Shows a detailed breakdown of today's
 * productivity, streaks, scores, and recent wins.
 */

import { useEffect, useRef } from 'react';
import type { Schedule } from '@/types/database';

interface Props {
  open: boolean;
  onClose: () => void;
  todaySchedules: Schedule[];
  weekSchedules:  Schedule[];
  streakDays:     number;
  workloadScore:  number;
}

// ── helpers ───────────────────────────────────────────────────────────────────
function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

function startOfWeek(d: Date) {
  const c = new Date(d);
  c.setDate(c.getDate() - c.getDay());
  c.setHours(0, 0, 0, 0);
  return c;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ── Ring SVG ──────────────────────────────────────────────────────────────────
function RingMeter({ pct, size = 130, stroke = 10 }: { pct: number; size?: number; stroke?: number }) {
  const r   = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  const cx = size / 2;

  // Color: 0% red → 50% amber → 100% mint
  const color = pct >= 80 ? '#00C896' : pct >= 50 ? '#FDCB6E' : pct >= 25 ? '#7C6AF0' : '#FF6B8A';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track */}
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke="rgba(255,255,255,.07)" strokeWidth={stroke} />
      {/* Progress arc */}
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.25,.8,.25,1), stroke .4s ease' }}
      />
      {/* Center text */}
      <text x={cx} y={cx - 6} textAnchor="middle"
        fill="var(--dark, #fff)" fontSize={pct === 100 ? 22 : 26} fontWeight="900"
        fontFamily="inherit">
        {pct === 100 ? '🎉' : `${pct}%`}
      </text>
      <text x={cx} y={cx + 14} textAnchor="middle"
        fill="rgba(255,255,255,.45)" fontSize={10} fontWeight="600"
        fontFamily="inherit">
        {pct === 100 ? 'All done!' : 'of today done'}
      </text>
    </svg>
  );
}

// ── Week trend dots ───────────────────────────────────────────────────────────
function WeekTrend({ weekSchedules }: { weekSchedules: Schedule[] }) {
  const now   = new Date();
  const start = startOfWeek(now);
  const days  = ['S','M','T','W','T','F','S'];

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', justifyContent: 'center' }}>
      {days.map((label, i) => {
        const d    = new Date(start); d.setDate(start.getDate() + i);
        const key  = toDateStr(d);
        const items = weekSchedules.filter(s => toDateStr(new Date(s.start_time)) === key);
        const done  = items.filter(s => s.is_completed).length;
        const total = items.length;
        const pct   = total ? done / total : 0;
        const isPast = d <= now;
        const isToday = key === toDateStr(now);

        const barH  = total ? Math.max(8, Math.round(pct * 40)) : 4;
        const color = pct >= 1 ? '#00C896' : pct > 0 ? '#7C6AF0' : isPast ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.06)';

        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 24, height: 44, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                width: '100%', height: barH, borderRadius: 4,
                background: color,
                outline: isToday ? `2px solid rgba(124,106,240,.6)` : 'none',
                outlineOffset: 1,
                transition: 'height .5s ease',
              }} />
            </div>
            <span style={{
              fontSize: 9, fontWeight: isToday ? 800 : 600,
              color: isToday ? 'var(--purple, #7C6AF0)' : 'rgba(255,255,255,.35)',
            }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProgressDetailsSheet({
  open, onClose,
  todaySchedules, weekSchedules,
  streakDays, workloadScore,
}: Props) {

  const now     = new Date();
  const today   = toDateStr(now);

  // Stats
  const todayItems   = todaySchedules;
  const completed    = todayItems.filter(s => s.is_completed);
  const pending      = todayItems.filter(s => !s.is_completed);
  const progressPct  = todayItems.length ? Math.round((completed.length / todayItems.length) * 100) : 0;

  // Overdue = pending items whose start_time is in the past
  const overdue = pending.filter(s => new Date(s.start_time) < now);

  // Recent wins (last 4 completed)
  const recentWins = [...completed]
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
    .slice(0, 4);

  // Productivity label
  const prodLabel =
    workloadScore >= 85 ? 'Overloaded'
    : workloadScore >= 65 ? 'Moderate'
    : workloadScore >= 30 ? 'On Track' : 'Light Load';
  const prodColor =
    workloadScore >= 85 ? '#FF6B8A'
    : workloadScore >= 65 ? '#FDCB6E'
    : workloadScore >= 30 ? '#00C896' : '#7C6AF0';

  // Scroll lock
  useEffect(() => {
    if (!open) return;
    const sy = window.scrollY;
    document.body.style.position    = 'fixed';
    document.body.style.top         = `-${sy}px`;
    document.body.style.left        = '0';
    document.body.style.right       = '0';
    document.body.style.overflow    = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.position    = '';
      document.body.style.top         = '';
      document.body.style.left        = '';
      document.body.style.right       = '';
      document.body.style.overflow    = '';
      document.body.style.touchAction = '';
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

  // ── styles ─────────────────────────────────────────────────────────────────
  const OVERLAY: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 300,
    background: 'rgba(0,0,0,.55)',
    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
    opacity: open ? 1 : 0,
    pointerEvents: open ? 'auto' : 'none',
    transition: 'opacity .22s ease',
    touchAction: 'none',
  };

  const SHEET: React.CSSProperties = {
    position:   'absolute', bottom: 0, left: 0, right: 0,
    maxHeight:  '88dvh',
    borderRadius: '24px 24px 0 0',
    background: 'var(--surf, #131424)',
    border:     '1px solid var(--glass-border, rgba(255,255,255,.09))',
    borderBottom: 'none',
    display:    'flex', flexDirection: 'column',
    overflow:   'hidden',
    transform:  open ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform .32s cubic-bezier(.32,1,.52,1)',
  };

  const STAT_CARD = (accent: string): React.CSSProperties => ({
    flex: 1,
    background: `rgba(${hexToRgb(accent)},.08)`,
    border: `1px solid rgba(${hexToRgb(accent)},.18)`,
    borderRadius: 14, padding: '12px 10px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  });

  const WIN_ROW: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px',
    background: 'rgba(0,200,150,.06)',
    border: '1px solid rgba(0,200,150,.14)',
    borderRadius: 12, marginBottom: 7,
  };

  return (
    <div style={OVERLAY} onClick={onClose}>
      <div style={SHEET} onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.18)', margin: '12px auto 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 20,
            background: 'rgba(124,106,240,.12)', border: '1px solid rgba(124,106,240,.22)',
            fontSize: 11, fontWeight: 700, letterSpacing: '.4px', color: 'var(--purple)',
            marginBottom: 6,
          }}>
            {/* mini chart bars icon */}
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="7" width="3" height="6" rx="1" fill="currentColor" opacity=".6"/>
              <rect x="5.5" y="4" width="3" height="9" rx="1" fill="currentColor" opacity=".8"/>
              <rect x="10" y="1" width="3" height="12" rx="1" fill="currentColor"/>
            </svg>
            TODAY&apos;S PROGRESS
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--dark)', letterSpacing: '-.5px', lineHeight: 1.1 }}>
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '16px 20px',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom, 28px))',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          overscrollBehavior: 'contain',
        }}>

          {/* ── Ring + streak side by side ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <RingMeter pct={progressPct} size={130} stroke={11} />
            <div style={{ flex: 1 }}>
              {/* Streak */}
              <div style={{
                background: 'rgba(253,203,110,.10)', border: '1px solid rgba(253,203,110,.22)',
                borderRadius: 14, padding: '10px 12px', marginBottom: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C12 2 8 7.5 8 11.5a4 4 0 008 0C16 7.5 12 2 12 2z" fill="#FDCB6E" opacity=".7"/>
                    <path d="M12 13a2 2 0 01-2-2c0-1.4 1.2-3.2 2-4.5.8 1.3 2 3.1 2 4.5a2 2 0 01-2 2z" fill="#FDCB6E"/>
                  </svg>
                  <span style={{ fontSize: 24, fontWeight: 900, color: '#FDCB6E', lineHeight: 1 }}>{streakDays}</span>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', fontWeight: 600, marginTop: 3 }}>
                  day streak 🔥
                </div>
              </div>
              {/* Score */}
              <div style={{
                background: `rgba(${hexToRgb(prodColor)},.10)`,
                border: `1px solid rgba(${hexToRgb(prodColor)},.22)`,
                borderRadius: 14, padding: '10px 12px',
              }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: prodColor, lineHeight: 1 }}>
                  {workloadScore}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', fontWeight: 600, marginTop: 3 }}>
                  {prodLabel}
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats row ── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <div style={STAT_CARD('#00C896')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#00C896" strokeWidth="1.8"/>
                <path d="M8 12l3 3 5-5" stroke="#00C896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#00C896', lineHeight: 1 }}>{completed.length}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', fontWeight: 600, textAlign: 'center' }}>Done</div>
            </div>
            <div style={STAT_CARD('#7C6AF0')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#7C6AF0" strokeWidth="1.8"/>
                <path d="M12 7v5l3 3" stroke="#7C6AF0" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--purple)', lineHeight: 1 }}>{pending.length}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', fontWeight: 600, textAlign: 'center' }}>Pending</div>
            </div>
            <div style={STAT_CARD(overdue.length > 0 ? '#FF6B8A' : 'rgba(255,255,255,.3)')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 4L3 19h18L12 4z" stroke={overdue.length > 0 ? '#FF6B8A' : 'rgba(255,255,255,.25)'}
                  strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M12 10v4M12 16.5v.5"
                  stroke={overdue.length > 0 ? '#FF6B8A' : 'rgba(255,255,255,.25)'}
                  strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <div style={{ fontSize: 22, fontWeight: 900, color: overdue.length > 0 ? '#FF6B8A' : 'rgba(255,255,255,.35)', lineHeight: 1 }}>
                {overdue.length}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', fontWeight: 600, textAlign: 'center' }}>Overdue</div>
            </div>
          </div>

          {/* ── This week trend ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: 12 }}>
              This Week
            </div>
            <div style={{
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.07)',
              borderRadius: 16, padding: '16px 12px',
            }}>
              <WeekTrend weekSchedules={weekSchedules} />
            </div>
          </div>

          {/* ── Recent wins ── */}
          {recentWins.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: 12 }}>
                Recent Wins
              </div>
              {recentWins.map(s => {
                const startD = new Date(s.start_time);
                const timeFmt: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
                return (
                  <div key={s.id} style={WIN_ROW}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(0,200,150,.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12l5 5 9-9" stroke="#00C896" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2, fontWeight: 600 }}>
                        {startD.toLocaleTimeString('en-US', timeFmt)} · {s.type}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 8,
                      background: 'rgba(0,200,150,.15)', color: '#00C896',
                      letterSpacing: '.3px', flexShrink: 0,
                    }}>✓ Done</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Still pending */}
          {pending.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: 12, marginTop: recentWins.length ? 16 : 0 }}>
                Still Pending
              </div>
              {pending.slice(0, 4).map(s => {
                const isOvd = new Date(s.start_time) < now;
                const startD = new Date(s.start_time);
                const timeFmt: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
                return (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px',
                    background: isOvd ? 'rgba(255,107,138,.06)' : 'rgba(255,255,255,.04)',
                    border: `1px solid ${isOvd ? 'rgba(255,107,138,.18)' : 'rgba(255,255,255,.07)'}`,
                    borderRadius: 12, marginBottom: 7,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: isOvd ? 'rgba(255,107,138,.14)' : 'rgba(124,106,240,.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        {isOvd
                          ? <path d="M12 4L3 19h18L12 4z" stroke="#FF6B8A" strokeWidth="2" strokeLinejoin="round"/>
                          : <path d="M12 7v5l3 3" stroke="#7C6AF0" strokeWidth="2" strokeLinecap="round"/>
                        }
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: 10, color: isOvd ? '#FF6B8A' : 'rgba(255,255,255,.4)', marginTop: 2, fontWeight: 600 }}>
                        {isOvd ? '⚠ Overdue · ' : ''}{startD.toLocaleTimeString('en-US', timeFmt)}
                      </div>
                    </div>
                  </div>
                );
              })}
              {pending.length > 4 && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', textAlign: 'center', marginTop: 4, fontWeight: 600 }}>
                  +{pending.length - 4} more pending
                </div>
              )}
            </div>
          )}

          {/* All done state */}
          {completed.length > 0 && pending.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '20px 0',
              background: 'rgba(0,200,150,.06)', border: '1px solid rgba(0,200,150,.15)',
              borderRadius: 16, marginTop: 8,
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#00C896' }}>Everything done!</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>
                You cleared all {completed.length} tasks today.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
