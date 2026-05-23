'use client';

import { useEffect, useRef } from 'react';
import type { Schedule } from '@/types/database';
import { formatTime, PRIORITY_COLORS } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  weekDays: Date[];
  scheduleDayMap: Record<string, Schedule[]>;
  weekWorkload: number[];
  weekRange: string;
  latestAnalysisSummary?: string | null;
}

const DAY_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_SHORT = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function getStatus(load: number): { label: string; color: string; bg: string; icon: string } {
  if (load >= 90) return { label: 'Overloaded',  color: '#FF6B8A', bg: 'rgba(255,107,138,.12)', icon: '🔴' };
  if (load >= 70) return { label: 'Heavy Load',  color: '#FDCB6E', bg: 'rgba(253,203,110,.12)', icon: '🟡' };
  if (load >= 40) return { label: 'Balanced',    color: '#2DD4BF', bg: 'rgba(45,212,191,.12)',  icon: '🟢' };
  if (load >= 10) return { label: 'Light Day',   color: '#74B9FF', bg: 'rgba(116,185,255,.12)', icon: '🔵' };
  return             { label: 'Free',           color: '#8B8FAD', bg: 'rgba(139,143,173,.08)', icon: '⚪' };
}

function hasConflict(schedules: Schedule[]): boolean {
  if (schedules.length < 2) return false;
  const sorted = [...schedules].sort((a, b) =>
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  for (let i = 0; i < sorted.length - 1; i++) {
    const endA = sorted[i].end_time ? new Date(sorted[i].end_time!).getTime() : 0;
    const startB = new Date(sorted[i + 1].start_time).getTime();
    if (endA > startB) return true;
  }
  return false;
}

function generateAiInsight(weekDays: Date[], scheduleDayMap: Record<string, Schedule[]>, weekWorkload: number[]): string {
  const today = new Date();
  const maxLoad = Math.max(...weekWorkload);
  const maxIdx  = weekWorkload.indexOf(maxLoad);
  const overloadedDays = weekWorkload.map((l, i) => ({ l, i })).filter(d => d.l >= 90);
  const lightDays      = weekWorkload.map((l, i) => ({ l, i })).filter(d => d.l < 20 && d.l > 0);
  const conflicts      = weekDays.filter(d => hasConflict(scheduleDayMap[d.toDateString()] || []));

  if (conflicts.length > 0) {
    const day = DAY_FULL[conflicts[0].getDay()];
    return `⚠️ Conflict detected on ${day}. Two or more tasks overlap — consider rescheduling one to an available slot.`;
  }
  if (overloadedDays.length > 1) {
    return `🔴 ${overloadedDays.length} days this week are overloaded. Spreading tasks more evenly could reduce stress and improve focus quality.`;
  }
  if (overloadedDays.length === 1) {
    const heavyDay = DAY_FULL[overloadedDays[0].i];
    const lightDay = lightDays.length > 0 ? DAY_FULL[lightDays[0].i] : null;
    return lightDay
      ? `🟡 ${heavyDay} looks overloaded. Consider moving one low-priority task to ${lightDay} which has available capacity.`
      : `🟡 ${heavyDay} looks overloaded. Try splitting heavy tasks across the week for a more sustainable pace.`;
  }
  if (maxLoad >= 70) {
    return `✅ Your week looks manageable. ${DAY_FULL[maxIdx]} is your busiest day — make sure to schedule recovery time after it.`;
  }
  if (lightDays.length >= 4) {
    return `💡 You have a light week ahead. This is a great time to tackle deep work or plan ahead for next week.`;
  }
  return `✅ Your workload looks well-balanced this week. Keep maintaining this rhythm for sustained productivity.`;
}

export default function WorkloadSheet({
  open, onClose, weekDays, scheduleDayMap, weekWorkload, weekRange, latestAnalysisSummary,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  // Close on backdrop tap
  function onBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const aiInsight = latestAnalysisSummary || generateAiInsight(weekDays, scheduleDayMap, weekWorkload);
  const totalTasks = weekDays.reduce((sum, d) => sum + (scheduleDayMap[d.toDateString()]?.length || 0), 0);
  const overloadCount = weekWorkload.filter(l => l >= 90).length;
  const balancedCount = weekWorkload.filter(l => l >= 40 && l < 90).length;

  if (!open) return null;

  return (
    <div className="wl-backdrop" onClick={onBackdrop}>
      <div className="wl-sheet" ref={sheetRef}>

        {/* ── Header ── */}
        <div className="wl-sheet-hdr">
          <div className="wl-sheet-drag" />
          <div className="wl-sheet-top">
            <div>
              <div className="wl-sheet-title">Workload Balance</div>
              <div className="wl-sheet-sub">Week of {weekRange} · {totalTasks} tasks</div>
            </div>
            <button className="wl-close-btn" onClick={onClose} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Summary chips */}
          <div className="wl-chips">
            <div className="wl-chip" style={{ background:'rgba(255,107,138,.12)', color:'#FF6B8A', borderColor:'rgba(255,107,138,.25)' }}>
              🔴 {overloadCount} Overloaded
            </div>
            <div className="wl-chip" style={{ background:'rgba(45,212,191,.12)', color:'#2DD4BF', borderColor:'rgba(45,212,191,.25)' }}>
              🟢 {balancedCount} Balanced
            </div>
            <div className="wl-chip" style={{ background:'rgba(139,124,246,.12)', color:'var(--purple)', borderColor:'rgba(139,124,246,.25)' }}>
              📋 {totalTasks} Total
            </div>
          </div>
        </div>

        {/* ── AI Insight banner ── */}
        <div className="wl-ai-banner">
          <div className="wl-ai-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M9 2L4 9H8L7 14L12 7.5H8.5L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="wl-ai-text">{aiInsight}</div>
        </div>

        {/* ── Scrollable day list ── */}
        <div className="wl-days-scroll">
          {weekDays.map((day, i) => {
            const key       = day.toDateString();
            const tasks     = scheduleDayMap[key] || [];
            const load      = weekWorkload[i];
            const status    = getStatus(load);
            const isToday   = key === today.toDateString();
            const conflict  = hasConflict(tasks);
            const isPast    = day < today && !isToday;

            return (
              <div key={key} className={`wl-day-row${isToday ? ' wl-day-today' : ''}${isPast ? ' wl-day-past' : ''}`}>

                {/* Day header */}
                <div className="wl-day-hdr">
                  <div className="wl-day-label">
                    <div className={`wl-day-num${isToday ? ' today' : ''}`}>
                      {isToday && <span className="today-dot" />}
                      {DAY_SHORT[i]}
                      <span className="wl-day-date">{day.getDate()}</span>
                    </div>
                  </div>

                  {/* Load bar */}
                  <div className="wl-day-bar-wrap">
                    <div className="wl-day-bar-track">
                      <div
                        className="wl-day-bar-fill"
                        style={{
                          width: `${load}%`,
                          background: load >= 90
                            ? 'linear-gradient(90deg,#FF6B8A,#FF4060)'
                            : load >= 70
                            ? 'linear-gradient(90deg,#FDCB6E,#F9A825)'
                            : load >= 40
                            ? 'linear-gradient(90deg,var(--g-start),var(--g-end))'
                            : 'linear-gradient(90deg,#74B9FF,#5AABF0)',
                        }}
                      />
                    </div>
                    <span className="wl-day-pct">{load}%</span>
                  </div>

                  {/* Status badge */}
                  <div
                    className="wl-status-badge"
                    style={{ background: status.bg, color: status.color, borderColor: status.color + '40' }}
                  >
                    {conflict ? '⚡ Conflict' : status.icon + ' ' + status.label}
                  </div>
                </div>

                {/* Task list for this day */}
                {tasks.length > 0 ? (
                  <div className="wl-task-list">
                    {tasks.slice(0, 4).map(t => (
                      <div key={t.id} className={`wl-task-item${t.is_completed ? ' done' : ''}`}>
                        <div className="wl-task-dot" style={{ background: PRIORITY_COLORS[t.priority] || '#8B8FAD' }} />
                        <div className="wl-task-info">
                          <div className="wl-task-name">{t.title}</div>
                          <div className="wl-task-time">{formatTime(t.start_time)}{t.end_time ? ` – ${formatTime(t.end_time)}` : ''}</div>
                        </div>
                        <div
                          className="wl-task-pri"
                          style={{
                            color: PRIORITY_COLORS[t.priority],
                            background: PRIORITY_COLORS[t.priority] + '18',
                          }}
                        >
                          {t.priority?.toUpperCase()}
                        </div>
                      </div>
                    ))}
                    {tasks.length > 4 && (
                      <div className="wl-task-more">+{tasks.length - 4} more tasks</div>
                    )}
                  </div>
                ) : (
                  <div className="wl-no-tasks">
                    <span>No tasks scheduled</span>
                    {!isPast && <span className="wl-free-tag">Available</span>}
                  </div>
                )}
              </div>
            );
          })}

          {/* Bottom padding */}
          <div style={{ height: 32 }} />
        </div>

      </div>

      <style jsx>{`
        /* ── Backdrop ── */
        .wl-backdrop {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: flex; align-items: flex-end;
          animation: fadeIn .2s ease;
        }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }

        /* ── Sheet ── */
        .wl-sheet {
          width: 100%;
          max-height: 92vh;
          background: var(--bg2, #111326);
          border-radius: 24px 24px 0 0;
          border-top: 1px solid var(--border2);
          display: flex; flex-direction: column;
          animation: slideUp .3s cubic-bezier(.32,1,.46,1);
          overflow: hidden;
        }
        @keyframes slideUp {
          from { transform: translateY(100%) }
          to   { transform: translateY(0)    }
        }

        /* ── Sheet header (sticky) ── */
        .wl-sheet-hdr {
          padding: 0 18px 12px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .wl-sheet-drag {
          width: 40px; height: 4px;
          background: var(--border2);
          border-radius: 2px; margin: 10px auto 14px;
        }
        .wl-sheet-top {
          display: flex; align-items: flex-start;
          justify-content: space-between; margin-bottom: 12px;
        }
        .wl-sheet-title { font-size: 20px; font-weight: 800; color: var(--dark); letter-spacing: -.4px; }
        .wl-sheet-sub   { font-size: 12px; color: var(--mid); margin-top: 3px; }
        .wl-close-btn {
          width: 34px; height: 34px; border-radius: 50%;
          background: var(--surf2); border: 1px solid var(--border);
          color: var(--mid); display: flex; align-items: center; justify-content: center;
          cursor: pointer; flex-shrink: 0;
          transition: background .15s;
        }
        .wl-close-btn:active { background: var(--surf3); }

        /* Summary chips */
        .wl-chips { display: flex; gap: 7px; flex-wrap: wrap; }
        .wl-chip {
          padding: 5px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 700;
          border: 1px solid transparent; letter-spacing: .2px;
        }

        /* AI Banner */
        .wl-ai-banner {
          display: flex; align-items: flex-start; gap: 10px;
          margin: 12px 18px 0;
          padding: 12px 14px;
          background: var(--amber-lt, rgba(253,203,110,.08));
          border: 1px solid var(--amber, rgba(253,203,110,.2));
          border-radius: 14px;
          flex-shrink: 0;
        }
        .wl-ai-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: var(--amber-lt, rgba(253,203,110,.15));
          color: var(--amber, #FDCB6E);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .wl-ai-text {
          font-size: 12px; color: var(--dark); line-height: 1.55;
          font-weight: 500; flex: 1;
        }

        /* ── Scrollable days ── */
        .wl-days-scroll {
          flex: 1; overflow-y: auto;
          padding: 12px 18px 0;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .wl-days-scroll::-webkit-scrollbar { display: none; }

        /* Day row */
        .wl-day-row {
          margin-bottom: 10px;
          background: var(--surf);
          border-radius: 16px;
          border: 1px solid var(--border);
          overflow: hidden;
          transition: border-color .15s;
        }
        .wl-day-row.wl-day-today {
          border-color: var(--purple);
          box-shadow: 0 0 0 1px var(--purple);
        }
        .wl-day-row.wl-day-past { opacity: .55; }

        /* Day header row */
        .wl-day-hdr {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 14px 8px;
        }
        .wl-day-label { flex-shrink: 0; width: 52px; }
        .wl-day-num {
          font-size: 11px; font-weight: 800; color: var(--mid);
          text-transform: uppercase; letter-spacing: .5px;
          display: flex; align-items: center; gap: 5px;
        }
        .wl-day-num.today { color: var(--purple); }
        .today-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--purple); flex-shrink: 0;
        }
        .wl-day-date { font-size: 13px; font-weight: 700; color: var(--dark); }

        /* Load bar */
        .wl-day-bar-wrap { flex: 1; display: flex; align-items: center; gap: 6px; }
        .wl-day-bar-track {
          flex: 1; height: 6px; background: var(--border2);
          border-radius: 3px; overflow: hidden;
        }
        .wl-day-bar-fill { height: 100%; border-radius: 3px; transition: width .5s ease; }
        .wl-day-pct { font-size: 10px; color: var(--mid); font-weight: 700; width: 28px; text-align: right; }

        /* Status badge */
        .wl-status-badge {
          font-size: 10px; font-weight: 700;
          padding: 4px 9px; border-radius: 20px;
          border: 1px solid transparent;
          flex-shrink: 0; letter-spacing: .2px;
        }

        /* Task list */
        .wl-task-list {
          padding: 0 14px 10px;
          display: flex; flex-direction: column; gap: 6px;
          border-top: 1px solid var(--border);
          padding-top: 8px;
        }
        .wl-task-item {
          display: flex; align-items: center; gap: 9px;
          padding: 7px 10px;
          background: var(--surf2); border-radius: 10px;
          border: 1px solid var(--border);
        }
        .wl-task-item.done { opacity: .4; }
        .wl-task-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .wl-task-info { flex: 1; min-width: 0; }
        .wl-task-name {
          font-size: 12px; font-weight: 600; color: var(--dark);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .wl-task-time { font-size: 10px; color: var(--mid); margin-top: 1px; }
        .wl-task-pri {
          font-size: 9px; font-weight: 700;
          padding: 3px 7px; border-radius: 6px; flex-shrink: 0;
        }
        .wl-task-more {
          font-size: 11px; color: var(--mid); font-weight: 600;
          text-align: center; padding: 4px 0;
        }

        /* Empty day */
        .wl-no-tasks {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 14px 10px;
          font-size: 12px; color: var(--lite);
        }
        .wl-free-tag {
          font-size: 10px; font-weight: 700;
          color: var(--mint); background: var(--mint-lt);
          padding: 3px 9px; border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
