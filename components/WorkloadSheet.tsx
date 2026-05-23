'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Schedule } from '@/types/database';
import { formatTime, PRIORITY_COLORS } from '@/lib/utils';
import { useChartColors, type ChartColors } from '@/lib/useChartColors';

interface Props {
  open: boolean;
  onClose: () => void;
  weekDays: Date[];
  scheduleDayMap: Record<string, Schedule[]>;
  weekWorkload: number[];
  weekRange: string;
  latestAnalysisSummary?: string | null;
}

type Filter = 'all' | 'overloaded' | 'heavy' | 'balanced' | 'light' | 'conflict';

const DAY_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_SHORT = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function getStatus(load: number, ch: ChartColors): { label: string; color: string; bg: string; icon: string; filter: Filter } {
  if (load >= 90) return { label: 'Overloaded', color: ch.full,  bg: ch.full  + '22', icon: '🔴', filter: 'overloaded' };
  if (load >= 70) return { label: 'Heavy Load', color: ch.warn,  bg: ch.warn  + '22', icon: '🟡', filter: 'heavy' };
  if (load >= 40) return { label: 'Balanced',   color: ch.ok,    bg: ch.ok    + '22', icon: '🟢', filter: 'balanced' };
  if (load >= 10) return { label: 'Light Day',  color: ch.mid,   bg: ch.mid   + '22', icon: '🔵', filter: 'light' };
  return             { label: 'Free',          color: '#8B8FAD', bg: 'rgba(139,143,173,.08)', icon: '⚪', filter: 'light' };
}

function hasConflict(schedules: Schedule[]): boolean {
  if (schedules.length < 2) return false;
  const sorted = [...schedules].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  for (let i = 0; i < sorted.length - 1; i++) {
    const endA   = sorted[i].end_time ? new Date(sorted[i].end_time!).getTime() : 0;
    const startB = new Date(sorted[i + 1].start_time).getTime();
    if (endA > startB) return true;
  }
  return false;
}

function getDayAiInsight(day: Date, tasks: Schedule[], load: number): string {
  const name = DAY_FULL[day.getDay()];
  const conflict = hasConflict(tasks);
  const highPri  = tasks.filter(t => t.priority === 'high' && !t.is_completed);
  const done     = tasks.filter(t => t.is_completed).length;

  if (conflict)      return `⚡ Schedule conflict detected on ${name}. Overlapping tasks need to be rescheduled to avoid missed commitments.`;
  if (load >= 90)    return `🔴 ${name} is overloaded with ${tasks.length} tasks. Consider moving ${highPri.length > 1 ? 'a low-priority task' : 'one item'} to a lighter day to reduce stress.`;
  if (load >= 70)    return `🟡 ${name} is heavy but manageable. Protect focus time in the morning and batch meetings in the afternoon.`;
  if (load >= 40)    return `✅ ${name} looks well-balanced. ${done > 0 ? `${done} task${done > 1 ? 's' : ''} already completed — good momentum.` : 'Great rhythm — keep it up.'}`;
  if (tasks.length)  return `🔵 ${name} is a light day. A good opportunity to tackle deep work or get ahead on upcoming tasks.`;
  return               `💡 ${name} has no scheduled tasks — use this as buffer time or plan something meaningful.`;
}

function getFilterAiInsight(filter: Filter, weekDays: Date[], scheduleDayMap: Record<string,Schedule[]>, weekWorkload: number[]): string {
  switch (filter) {
    case 'overloaded': {
      const days = weekDays.filter((_,i) => weekWorkload[i] >= 90).map(d => DAY_FULL[d.getDay()]);
      return days.length
        ? `🔴 ${days.join(' and ')} ${days.length > 1 ? 'are' : 'is'} overloaded. Try moving low-priority tasks to lighter days to restore balance.`
        : `✅ No overloaded days this week — your schedule is well distributed.`;
    }
    case 'heavy': {
      const days = weekDays.filter((_,i) => weekWorkload[i] >= 70 && weekWorkload[i] < 90).map(d => DAY_FULL[d.getDay()]);
      return days.length
        ? `🟡 ${days.join(', ')} ${days.length > 1 ? 'have' : 'has'} a heavy load. Make sure to schedule breaks and protect focus blocks.`
        : `✅ No heavy days this week.`;
    }
    case 'balanced':
      return `🟢 These days have a healthy workload — maintain this rhythm. Balanced days are where your best work happens.`;
    case 'light':
      return `🔵 Light days are valuable — use them for deep work, planning ahead, or personal recovery. Don't let them go to waste.`;
    case 'conflict': {
      const conflictDays = weekDays.filter(d => hasConflict(scheduleDayMap[d.toDateString()] || [])).map(d => DAY_FULL[d.getDay()]);
      return conflictDays.length
        ? `⚡ Conflicts found on ${conflictDays.join(', ')}. Overlapping time blocks will cause missed tasks — reschedule one item per conflict.`
        : `✅ No scheduling conflicts this week. All time blocks are clean.`;
    }
    default:
      return `📋 Showing your full week overview. Tap any day to see its detailed schedule and AI recommendation.`;
  }
}

export default function WorkloadSheet({
  open, onClose, weekDays, scheduleDayMap, weekWorkload, weekRange, latestAnalysisSummary,
}: Props) {
  const today = new Date();
  const ch    = useChartColors();
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const [expandedDay, setExpandedDay]   = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset state when sheet opens
  useEffect(() => {
    if (open) { setActiveFilter('all'); setExpandedDay(null); }
  }, [open]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  const totalTasks    = weekDays.reduce((s, d) => s + (scheduleDayMap[d.toDateString()]?.length || 0), 0);
  const overloadCount = weekWorkload.filter(l => l >= 90).length;
  const heavyCount    = weekWorkload.filter(l => l >= 70 && l < 90).length;
  const balancedCount = weekWorkload.filter(l => l >= 40 && l < 90).length;
  const conflictCount = weekDays.filter(d => hasConflict(scheduleDayMap[d.toDateString()] || [])).length;

  // Filter days based on active chip
  const visibleDays = weekDays.filter((d, i) => {
    const load     = weekWorkload[i];
    const tasks    = scheduleDayMap[d.toDateString()] || [];
    const conflict = hasConflict(tasks);
    switch (activeFilter) {
      case 'overloaded': return load >= 90;
      case 'heavy':      return load >= 70 && load < 90;
      case 'balanced':   return load >= 40 && load < 90;
      case 'light':      return load < 40;
      case 'conflict':   return conflict;
      default:           return true;
    }
  });

  const aiInsight = activeFilter === 'all' && latestAnalysisSummary
    ? latestAnalysisSummary
    : getFilterAiInsight(activeFilter, weekDays, scheduleDayMap, weekWorkload);

  function handleChip(f: Filter) {
    setActiveFilter(prev => prev === f ? 'all' : f);
    setExpandedDay(null);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDayClick(key: string) {
    setExpandedDay(prev => prev === key ? null : key);
  }

  if (!open) return null;

  const CHIPS: { filter: Filter; label: string; count: number; color: string; bg: string; border: string }[] = [
    { filter: 'overloaded', label: `🔴 ${overloadCount} Overloaded`, count: overloadCount, color: ch.full, bg: ch.full + '1F', border: ch.full + '50' },
    { filter: 'heavy',      label: `🟡 ${heavyCount} Heavy`,         count: heavyCount,    color: ch.warn, bg: ch.warn + '1F', border: ch.warn + '50' },
    { filter: 'balanced',   label: `🟢 ${balancedCount} Balanced`,   count: balancedCount, color: ch.ok,   bg: ch.ok   + '1F', border: ch.ok   + '50' },
    { filter: 'conflict',   label: `⚡ ${conflictCount} Conflict`,   count: conflictCount, color: ch.c3,   bg: ch.c3   + '1F', border: ch.c3   + '50' },
    { filter: 'all',        label: `📋 ${totalTasks} Total`,         count: totalTasks,    color: 'var(--purple)', bg: 'var(--pur-lt)', border: 'rgba(139,124,246,.30)' },
  ];

  return (
    <div className="wl-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wl-sheet">

        {/* ── Sticky Header ── */}
        <div className="wl-hdr">
          <div className="wl-drag" />
          <div className="wl-top-row">
            <div>
              <div className="wl-title">Workload Balance</div>
              <div className="wl-sub">
                {activeFilter === 'all'
                  ? `Week of ${weekRange} · ${totalTasks} tasks`
                  : `Filtered: ${CHIPS.find(c => c.filter === activeFilter)?.label} · tap chip to clear`}
              </div>
            </div>
            <button className="wl-close" onClick={onClose} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Filter chips — ALL clickable */}
          <div className="wl-chips-row">
            {CHIPS.map(c => (
              <button
                key={c.filter}
                className={`wl-chip${activeFilter === c.filter ? ' active' : ''}`}
                style={{
                  color: c.color,
                  background: activeFilter === c.filter ? c.bg : 'transparent',
                  borderColor: activeFilter === c.filter ? c.border : 'var(--border2)',
                  boxShadow: activeFilter === c.filter ? `0 0 0 1px ${c.border}` : 'none',
                }}
                onClick={() => handleChip(c.filter)}
              >
                {c.label}
                {activeFilter === c.filter && <span className="chip-x">✕</span>}
              </button>
            ))}
          </div>
        </div>

        {/* ── AI Insight Banner ── */}
        <div className="wl-ai">
          <div className="wl-ai-icon">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M9 2L4 9H8L7 14L12 7.5H8.5L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="wl-ai-txt">{aiInsight}</div>
        </div>

        {/* ── Day List ── */}
        <div className="wl-scroll" ref={scrollRef}>

          {visibleDays.length === 0 && (
            <div className="wl-empty">
              <div className="wl-empty-icon">✅</div>
              <div className="wl-empty-txt">No days match this filter</div>
              <button className="wl-clear-btn" onClick={() => setActiveFilter('all')}>Show all days</button>
            </div>
          )}

          {visibleDays.map((day) => {
            const key      = day.toDateString();
            const idx      = weekDays.findIndex(d => d.toDateString() === key);
            const load     = weekWorkload[idx] ?? 0;
            const tasks    = scheduleDayMap[key] || [];
            const status   = getStatus(load, ch);
            const conflict = hasConflict(tasks);
            const isToday  = key === today.toDateString();
            const isPast   = day < today && !isToday;
            const expanded = expandedDay === key;
            const dayInsight = getDayAiInsight(day, tasks, load);

            return (
              <div
                key={key}
                className={`wl-day${isToday ? ' is-today' : ''}${isPast ? ' is-past' : ''}${expanded ? ' is-expanded' : ''}`}
                onClick={() => handleDayClick(key)}
              >
                {/* Day header row */}
                <div className="wl-day-hdr">
                  {/* Day label */}
                  <div className="wl-day-id">
                    <div className={`wl-day-name${isToday ? ' today' : ''}`}>
                      {isToday && <span className="today-pip" />}
                      {DAY_SHORT[day.getDay()]}
                    </div>
                    <div className="wl-day-num">{day.getDate()}</div>
                  </div>

                  {/* Load bar */}
                  <div className="wl-bar-wrap">
                    <div className="wl-bar-track">
                      <div className="wl-bar-fill" style={{
                        width: `${load}%`,
                        background: load >= 90
                          ? `linear-gradient(90deg,${ch.full},${ch.full}CC)`
                          : load >= 70
                          ? `linear-gradient(90deg,${ch.warn},${ch.warn}CC)`
                          : load >= 40
                          ? `linear-gradient(90deg,${ch.c1},${ch.ok})`
                          : `linear-gradient(90deg,${ch.mid},${ch.c2})`,
                      }} />
                    </div>
                    <span className="wl-bar-pct">{load}%</span>
                  </div>

                  {/* Status badge */}
                  <div className="wl-badge" style={{ background: conflict ? ch.c3 + '22' : status.bg, color: conflict ? ch.c3 : status.color }}>
                    {conflict ? '⚡ Conflict' : `${status.icon} ${status.label}`}
                  </div>

                  {/* Expand chevron */}
                  <div className="wl-chev" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                {/* Task count pill (collapsed) */}
                {!expanded && tasks.length > 0 && (
                  <div className="wl-task-preview">
                    {tasks.slice(0, 3).map(t => (
                      <div key={t.id} className="wl-tp-dot" style={{ background: PRIORITY_COLORS[t.priority] || '#8B8FAD' }} />
                    ))}
                    <span className="wl-tp-count">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
                    <span className="wl-tp-hint">tap to expand</span>
                  </div>
                )}
                {!expanded && tasks.length === 0 && (
                  <div className="wl-task-preview">
                    <span className="wl-tp-count" style={{ color: 'var(--lite)' }}>No tasks</span>
                    {!isPast && <span className="wl-free-tag">Available</span>}
                  </div>
                )}

                {/* ── Expanded detail ── */}
                {expanded && (
                  <div className="wl-detail" onClick={e => e.stopPropagation()}>

                    {/* Per-day AI insight */}
                    <div className="wl-day-ai">
                      <span className="wl-day-ai-ico">💡</span>
                      <span className="wl-day-ai-txt">{dayInsight}</span>
                    </div>

                    {/* Full task list */}
                    {tasks.length === 0 ? (
                      <div className="wl-no-tasks">No tasks scheduled for {DAY_FULL[day.getDay()]}</div>
                    ) : (
                      <div className="wl-task-list">
                        {tasks.map(t => (
                          <div key={t.id} className={`wl-task${t.is_completed ? ' done' : ''}`}>
                            <div className="wl-t-left">
                              <div className="wl-t-dot" style={{ background: PRIORITY_COLORS[t.priority] || '#8B8FAD' }} />
                              <div className="wl-t-info">
                                <div className="wl-t-name">{t.title}</div>
                                <div className="wl-t-time">
                                  {formatTime(t.start_time)}
                                  {t.end_time ? ` – ${formatTime(t.end_time)}` : ''}
                                  {t.is_completed ? ' · ✓ Done' : ''}
                                </div>
                              </div>
                            </div>
                            <div className="wl-t-pri" style={{
                              color: PRIORITY_COLORS[t.priority],
                              background: (PRIORITY_COLORS[t.priority] || '#8B8FAD') + '1A',
                            }}>
                              {t.priority?.toUpperCase()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="wl-day-stats">
                      <div className="wl-ds">
                        <div className="wl-ds-v">{tasks.length}</div>
                        <div className="wl-ds-l">Tasks</div>
                      </div>
                      <div className="wl-ds-sep" />
                      <div className="wl-ds">
                        <div className="wl-ds-v">{tasks.filter(t => t.is_completed).length}</div>
                        <div className="wl-ds-l">Done</div>
                      </div>
                      <div className="wl-ds-sep" />
                      <div className="wl-ds">
                        <div className="wl-ds-v">{tasks.filter(t => t.priority === 'high').length}</div>
                        <div className="wl-ds-l">High Pri</div>
                      </div>
                      <div className="wl-ds-sep" />
                      <div className="wl-ds">
                        <div className="wl-ds-v" style={{ color: status.color }}>{load}%</div>
                        <div className="wl-ds-l">Load</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ height: 40 }} />
        </div>
      </div>

      <style jsx>{`
        /* Backdrop */
        .wl-backdrop {
          position:fixed; inset:0; z-index:200;
          background:rgba(0,0,0,.55); backdrop-filter:blur(4px);
          -webkit-backdrop-filter:blur(4px);
          display:flex; align-items:flex-end;
          animation:bdFade .2s ease;
        }
        @keyframes bdFade { from{opacity:0} to{opacity:1} }

        /* Sheet */
        .wl-sheet {
          width:100%; max-height:92vh;
          background:var(--bg2,#111326);
          border-radius:24px 24px 0 0;
          border-top:1px solid var(--border2);
          display:flex; flex-direction:column;
          overflow:hidden;
          animation:sheetUp .3s cubic-bezier(.32,1,.46,1);
        }
        @keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }

        /* Sticky header */
        .wl-hdr {
          padding:0 18px 10px;
          border-bottom:1px solid var(--border);
          flex-shrink:0; background:var(--bg2,#111326);
        }
        .wl-drag {
          width:40px; height:4px; background:var(--border2);
          border-radius:2px; margin:10px auto 12px;
        }
        .wl-top-row {
          display:flex; align-items:flex-start;
          justify-content:space-between; margin-bottom:10px;
        }
        .wl-title { font-size:20px; font-weight:800; color:var(--dark); letter-spacing:-.4px; }
        .wl-sub   { font-size:11px; color:var(--mid); margin-top:3px; font-weight:500; }
        .wl-close {
          width:32px; height:32px; border-radius:50%;
          background:var(--surf2); border:1px solid var(--border);
          color:var(--mid); display:flex; align-items:center; justify-content:center;
          cursor:pointer; flex-shrink:0; transition:background .15s;
        }
        .wl-close:active { background:var(--surf3,#272540); }

        /* Filter chips */
        .wl-chips-row {
          display:flex; gap:6px; flex-wrap:wrap; padding-bottom:2px;
          overflow-x:auto; scrollbar-width:none;
        }
        .wl-chips-row::-webkit-scrollbar { display:none; }
        .wl-chip {
          padding:5px 11px; border-radius:20px;
          font-size:11px; font-weight:700;
          border:1px solid var(--border2);
          cursor:pointer; font-family:inherit;
          transition:all .15s; white-space:nowrap;
          display:flex; align-items:center; gap:4px;
        }
        .wl-chip:active { opacity:.75; transform:scale(.96); }
        .wl-chip.active { font-weight:800; }
        .chip-x { font-size:9px; opacity:.7; }

        /* AI banner */
        .wl-ai {
          display:flex; align-items:flex-start; gap:10px;
          margin:10px 18px 0;
          padding:11px 13px;
          background:var(--amber-lt,rgba(253,203,110,.08));
          border:1px solid var(--amber,rgba(253,203,110,.2));
          border-radius:13px; flex-shrink:0;
        }
        .wl-ai-icon {
          width:26px; height:26px; border-radius:8px;
          background:var(--amber-lt); color:var(--amber,#FDCB6E);
          display:flex; align-items:center; justify-content:center;
          flex-shrink:0;
        }
        .wl-ai-txt { font-size:12px; color:var(--dark); line-height:1.55; font-weight:500; flex:1; }

        /* Scroll area */
        .wl-scroll {
          flex:1; overflow-y:auto; padding:10px 18px 0;
          -webkit-overflow-scrolling:touch; scrollbar-width:none;
        }
        .wl-scroll::-webkit-scrollbar { display:none; }

        /* Empty state */
        .wl-empty { text-align:center; padding:40px 0; }
        .wl-empty-icon { font-size:36px; margin-bottom:10px; }
        .wl-empty-txt { font-size:14px; color:var(--mid); font-weight:600; margin-bottom:14px; }
        .wl-clear-btn {
          padding:9px 20px; background:var(--pur-lt); color:var(--purple);
          border:none; border-radius:10px; font-size:13px; font-weight:700;
          cursor:pointer; font-family:inherit;
        }

        /* Day card */
        .wl-day {
          background:var(--surf); border-radius:16px;
          border:1px solid var(--border);
          margin-bottom:8px; cursor:pointer;
          transition:border-color .15s, background .15s;
          overflow:hidden;
        }
        .wl-day:active { background:var(--surf2); }
        .wl-day.is-today { border-color:var(--purple); box-shadow:0 0 0 1px var(--purple); }
        .wl-day.is-past  { opacity:.55; }
        .wl-day.is-expanded { border-color:var(--border2); }

        /* Day header */
        .wl-day-hdr {
          display:flex; align-items:center; gap:10px;
          padding:11px 14px 6px;
        }
        .wl-day-id { flex-shrink:0; width:46px; }
        .wl-day-name {
          font-size:9px; font-weight:800; color:var(--mid);
          text-transform:uppercase; letter-spacing:.6px;
          display:flex; align-items:center; gap:4px;
        }
        .wl-day-name.today { color:var(--purple); }
        .today-pip {
          width:5px; height:5px; border-radius:50%;
          background:var(--purple); flex-shrink:0;
        }
        .wl-day-num { font-size:16px; font-weight:800; color:var(--dark); line-height:1.2; }

        /* Load bar */
        .wl-bar-wrap { flex:1; display:flex; align-items:center; gap:6px; }
        .wl-bar-track { flex:1; height:5px; background:var(--border2); border-radius:3px; overflow:hidden; }
        .wl-bar-fill  { height:100%; border-radius:3px; transition:width .5s ease; }
        .wl-bar-pct   { font-size:10px; color:var(--mid); font-weight:700; width:26px; text-align:right; flex-shrink:0; }

        /* Status badge */
        .wl-badge {
          font-size:10px; font-weight:700;
          padding:3px 9px; border-radius:20px;
          flex-shrink:0; letter-spacing:.2px;
        }

        /* Chevron */
        .wl-chev {
          color:var(--mid); flex-shrink:0;
          transition:transform .2s ease;
        }

        /* Task preview (collapsed) */
        .wl-task-preview {
          display:flex; align-items:center; gap:5px;
          padding:0 14px 9px;
        }
        .wl-tp-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
        .wl-tp-count { font-size:11px; color:var(--mid); font-weight:600; }
        .wl-tp-hint  { font-size:10px; color:var(--lite); margin-left:4px; }
        .wl-free-tag {
          font-size:10px; font-weight:700; color:var(--mint);
          background:var(--mint-lt); padding:2px 8px; border-radius:20px; margin-left:4px;
        }

        /* Expanded detail */
        .wl-detail {
          border-top:1px solid var(--border);
          padding:10px 14px 12px;
          background:var(--surf2);
        }

        /* Per-day AI insight */
        .wl-day-ai {
          display:flex; gap:8px; align-items:flex-start;
          background:var(--pur-lt); border-radius:10px;
          padding:9px 11px; margin-bottom:10px;
        }
        .wl-day-ai-ico { font-size:13px; flex-shrink:0; }
        .wl-day-ai-txt { font-size:11px; color:var(--dark); line-height:1.5; font-weight:500; flex:1; }

        /* Task list */
        .wl-task-list { display:flex; flex-direction:column; gap:6px; margin-bottom:10px; }
        .wl-task {
          display:flex; align-items:center; justify-content:space-between;
          gap:10px; padding:8px 10px;
          background:var(--surf); border-radius:10px;
          border:1px solid var(--border);
        }
        .wl-task.done { opacity:.4; }
        .wl-t-left { display:flex; align-items:center; gap:8px; flex:1; min-width:0; }
        .wl-t-dot  { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .wl-t-info { flex:1; min-width:0; }
        .wl-t-name { font-size:12px; font-weight:600; color:var(--dark); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .wl-t-time { font-size:10px; color:var(--mid); margin-top:1px; }
        .wl-t-pri  { font-size:9px; font-weight:700; padding:3px 7px; border-radius:6px; flex-shrink:0; }

        /* No tasks */
        .wl-no-tasks { font-size:12px; color:var(--lite); text-align:center; padding:10px 0 4px; }

        /* Day stats row */
        .wl-day-stats {
          display:flex; background:var(--surf); border-radius:10px;
          border:1px solid var(--border); overflow:hidden;
        }
        .wl-ds { flex:1; text-align:center; padding:8px 4px; }
        .wl-ds-v { font-size:16px; font-weight:800; color:var(--dark); }
        .wl-ds-l { font-size:9px; color:var(--mid); font-weight:600; text-transform:uppercase; letter-spacing:.4px; margin-top:1px; }
        .wl-ds-sep { width:1px; background:var(--border); margin:6px 0; flex-shrink:0; }
      `}</style>
    </div>
  );
}
