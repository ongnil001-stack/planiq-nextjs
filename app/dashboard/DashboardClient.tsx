'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Schedule, AiAnalysis } from '@/types/database';
import { formatTime, PRIORITY_COLORS, TYPE_ICONS } from '@/lib/utils';
import BottomNav from '@/components/layout/BottomNav';
import WorkloadSheet from '@/components/WorkloadSheet';
import {
  loadFullPrefs,
  migrateFromV1,
  type DashboardFullPrefs,
  type DashboardCardKey,
  ALL_SHORTCUTS,
} from '@/lib/dashboardPrefs';
import { useChartColors } from '@/lib/useChartColors';

interface Props {
  profile: Profile | null;
  todaySchedules: Schedule[];
  weekSchedules: Schedule[];
  upcomingSchedules: Schedule[];
  latestAnalysis: AiAnalysis | null;
}

const GREETING = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const DAY_LABELS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const WEEK_WORKLOAD = [65, 80, 45, 100, 70, 57, 8];

export default function DashboardClient({ profile, todaySchedules, weekSchedules, upcomingSchedules, latestAnalysis }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const ch = useChartColors();
  const [, setCompletingId] = useState<string | null>(null);
  const [todayExpanded, setTodayExpanded] = useState(false);
  const [perfExpanded, setPerfExpanded] = useState(false);
  const [workloadOpen, setWorkloadOpen] = useState(false);
  const [prefs, setPrefs] = useState<DashboardFullPrefs | null>(null);

  const refreshPrefs = useCallback(() => {
    migrateFromV1();
    setPrefs(loadFullPrefs());
  }, []);

  useEffect(() => {
    refreshPrefs();
    window.addEventListener('focus', refreshPrefs);
    window.addEventListener('planiq_dash_prefs_changed', refreshPrefs);
    return () => {
      window.removeEventListener('focus', refreshPrefs);
      window.removeEventListener('planiq_dash_prefs_changed', refreshPrefs);
    };
  }, [refreshPrefs]);

  const completedToday = todaySchedules.filter((s) => s.is_completed).length;
  const totalToday = todaySchedules.length;
  const progressPct = totalToday ? Math.round((completedToday / totalToday) * 100) : 0;

  async function toggleComplete(schedule: Schedule) {
    setCompletingId(schedule.id);
    const { error } = await supabase
      .from('schedules')
      .update({ is_completed: !schedule.is_completed })
      .eq('id', schedule.id);
    if (error) toast.error('Could not update task');
    else router.refresh();
    setCompletingId(null);
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const workloadScore = latestAnalysis?.workload_score ?? 78;

  const workloadStatus =
    workloadScore >= 85 ? { label: 'Overloaded', color: ch.full,  badgeClass: 'attention' }
    : workloadScore >= 65 ? { label: 'Attention', color: ch.warn,  badgeClass: 'attention' }
    : workloadScore >= 30 ? { label: 'On Track',  color: ch.ok,    badgeClass: 'ok' }
    : { label: 'Light Day',  color: ch.mid,   badgeClass: 'ok' };

  const scoreLabel =
    workloadScore >= 85 ? 'Overloaded'
    : workloadScore >= 65 ? 'Moderate'
    : workloadScore >= 30 ? 'On Track' : 'Light';

  const streakDays = 7;
  const inProgress = todaySchedules.find((s) => !s.is_completed);

  const today = new Date();
  const todayDow = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - todayDow);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const scheduleDayMap: Record<string, Schedule[]> = {};
  weekSchedules.forEach((s) => {
    const key = new Date(s.start_time).toDateString();
    if (!scheduleDayMap[key]) scheduleDayMap[key] = [];
    scheduleDayMap[key].push(s);
  });
  const weekItemCount = weekSchedules.length;

  const todayLabel = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const todayDayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const weekRange = `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const insightText = latestAnalysis?.summary
    ? latestAnalysis.summary.slice(0, 60) + (latestAnalysis.summary.length > 60 ? '…' : '')
    : upcomingSchedules.length > 0
    ? `${upcomingSchedules.length} upcoming items — tap to review your week`
    : 'Add schedules to get AI workload insights';

  const circumference = 2 * Math.PI * 22.5;
  const strokeOffset = circumference * (1 - workloadScore / 100);

  // ── Prefs helpers ──────────────────────────────────────────────────────
  const cardOrder: DashboardCardKey[] = prefs?.order ?? [
    'todayCard', 'quickStats', 'pinnedShortcuts',
    'performanceCard', 'weeklySchedule', 'workloadBalance',
    'aiPriorities', 'upcomingTasks',
  ];

  const isVisible = (key: DashboardCardKey) => prefs?.visible[key] ?? true;
  const isCompact = (key: DashboardCardKey) => (prefs?.size[key] ?? 'full') === 'compact';

  const pinnedShortcutDefs = (prefs?.pinnedShortcuts ?? ['addTask', 'viewCalendar', 'viewPriorities'])
    .map(k => ALL_SHORTCUTS.find(s => s.key === k))
    .filter(Boolean) as typeof ALL_SHORTCUTS;

  // ── Card renderers ─────────────────────────────────────────────────────

  function renderTodayCard() {
    const compact = isCompact('todayCard');
    return (
      <div className="widget" key="todayCard">
        <div className="today-card" onClick={() => setTodayExpanded(!todayExpanded)}>
          <div className="tc-hdr">
            <div>
              <div className="tc-date-lbl" style={compact ? { fontSize: 16 } : {}}>{todayLabel}</div>
              <div className="tc-day-lbl">{todayDayName} · {totalToday} activities</div>
            </div>
            {workloadStatus.badgeClass === 'attention' ? (
              <div className="tc-status-badge attention">Attention</div>
            ) : (
              <div className="tc-status-badge ok">On Track</div>
            )}
          </div>

          {!compact && (
            <>
              {inProgress ? (
                <div className="tc-focus-bar" onClick={(e) => e.stopPropagation()}>
                  <div className="tc-focus-icon">▶</div>
                  <div className="tc-focus-info">
                    <div className="tc-focus-name">{inProgress.title}</div>
                    <div className="tc-prog-row">
                      <div className="tc-prog-bar"><div className="tc-prog-fill" style={{ width: `${progressPct}%` }} /></div>
                      <span className="tc-prog-txt">{progressPct}% · In Progress</span>
                    </div>
                  </div>
                  <div className="tc-focus-time">{formatTime(inProgress.start_time)}</div>
                </div>
              ) : (
                <div className="tc-focus-bar no-task" onClick={(e) => e.stopPropagation()}>
                  <div className="tc-focus-icon" style={{ opacity: .4 }}>◎</div>
                  <div className="tc-focus-info">
                    <div className="tc-focus-name" style={{ opacity: .5 }}>No active task</div>
                    <div className="tc-prog-row">
                      <div className="tc-prog-bar"><div className="tc-prog-fill" style={{ width: `${progressPct}%` }} /></div>
                      <span className="tc-prog-txt">{progressPct}% of today done</span>
                    </div>
                  </div>
                </div>
              )}

              <Link href="/ai-analysis" className="tc-insight-bar" onClick={(e) => e.stopPropagation()}>
                <div className="tc-ins-ico">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M8 2L3.5 8H7L6 12.5L10.5 6.5H7.2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="tc-ins-text">{insightText}</div>
                <div className="tc-ins-arrow">›</div>
              </Link>
            </>
          )}

          {compact && (
            <div className="tc-compact-row">
              <span className="tc-compact-stat"><strong>{completedToday}/{totalToday}</strong> done</span>
              <div className="tc-prog-bar" style={{ flex:1, margin: '0 8px' }}>
                <div className="tc-prog-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="tc-compact-pct">{progressPct}%</span>
            </div>
          )}
        </div>

        {todayExpanded && (
          <div className="ts-exp">
            {todaySchedules.length === 0 ? (
              <div className="ts-empty">
                <Link href="/schedule/new" className="ts-add-cta">+ Add your first task</Link>
              </div>
            ) : (
              todaySchedules.map((s) => (
                <div
                  key={s.id}
                  className={`tli ${s.is_completed ? 'done' : ''}`}
                  onClick={() => toggleComplete(s)}
                >
                  <div className="tli-time">
                    {formatTime(s.start_time).split(' ')[0]}<br/>
                    {formatTime(s.start_time).split(' ')[1]}
                  </div>
                  <div className="tli-dot" style={{ background: PRIORITY_COLORS[s.priority] }} />
                  <div className="tli-info">
                    <div className="tli-title">{s.title}</div>
                    <div className="tli-sub">{TYPE_ICONS[s.type]} {s.end_time ? `${formatTime(s.start_time)} – ${formatTime(s.end_time)}` : formatTime(s.start_time)}</div>
                  </div>
                  <div
                    className="tli-dur"
                    style={{
                      background: (s.priority === 'critical' || s.priority === 'high') ? ch.full + '28'
                        : s.priority === 'medium' ? ch.warn + '28' : ch.ok + '28',
                      color: (s.priority === 'critical' || s.priority === 'high') ? ch.full
                        : s.priority === 'medium' ? ch.warn : ch.ok,
                    }}
                  >
                    {s.priority.toUpperCase()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  function renderQuickStats() {
    const compact = isCompact('quickStats');
    return (
      <div className="widget" key="quickStats">
        <div className={`qs-card${compact ? ' qs-compact' : ''}`}>
          <div className="qs-stat">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="qs-icon" style={{ color: 'var(--amber)' }}>
              <path d="M10 3C10 3 7 6 7 9C7 10.66 8.34 12 10 12C11.66 12 13 10.66 13 9C13 6 10 3 10 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M10 12V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div className="qs-val" style={{ color: 'var(--amber)' }}>{streakDays}</div>
            <div className="qs-lbl">Streak</div>
          </div>
          <div className="qs-sep" />
          <div className="qs-stat">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="qs-icon" style={{ color: 'var(--mint)' }}>
              <path d="M4 10L8 14L16 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="qs-val" style={{ color: 'var(--mint)' }}>{completedToday}</div>
            <div className="qs-lbl">Done</div>
          </div>
          <div className="qs-sep" />
          <div className="qs-stat">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="qs-icon" style={{ color: 'var(--purple)' }}>
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div className="qs-val" style={{ color: 'var(--purple)' }}>{workloadScore}</div>
            <div className="qs-lbl">Score</div>
          </div>
        </div>
      </div>
    );
  }

  function renderPinnedShortcuts() {
    if (pinnedShortcutDefs.length === 0) return null;
    return (
      <div className="widget" key="pinnedShortcuts">
        <div className="ps-row">
          {pinnedShortcutDefs.map(sc => (
            <Link key={sc.key} href={sc.href} className="ps-btn" style={{ '--sc-color': sc.color } as React.CSSProperties}>
              <div className="ps-icon-wrap">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d={sc.iconPath} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  {sc.iconPath2 && <path d={sc.iconPath2} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>}
                </svg>
              </div>
              <span className="ps-label">{sc.label}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  function renderPerformanceCard() {
    const compact = isCompact('performanceCard');
    return (
      <div className="widget" key="performanceCard">
        <div className="perf-card" onClick={() => !compact && setPerfExpanded(!perfExpanded)}>
          <div className="pc-summary">
            <div className="pc-left">
              {!compact && (
                <div className="pc-ring">
                  <svg className="pc-ring-svg" viewBox="0 0 54 54" width="54" height="54">
                    <circle cx="27" cy="27" r="22.5" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="4"/>
                    <circle
                      cx="27" cy="27" r="22.5" fill="none"
                      stroke="url(#scoreGrad)" strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                      transform="rotate(-90 27 27)"
                      style={{ transition: 'stroke-dashoffset .6s ease' }}
                    />
                  </svg>
                  <div className="pc-score-num">{workloadScore}</div>
                </div>
              )}
              <div className="pc-info">
                <div className="pc-hdline">{scoreLabel}{compact ? ` — Score: ${workloadScore}` : ''}</div>
                <div className="pc-sub">
                  <svg width="13" height="13" viewBox="0 0 15 15" fill="none" style={{ display:'inline',verticalAlign:'middle',marginRight:3 }}>
                    <path d="M7.5 13.5C5.01 13.5 3 11.49 3 9C3 6.5 5.5 4.5 5.5 2.5C5.5 2.5 6.5 4 7.5 4C8.5 4 9.5 2 9.5 2C9.5 2 12 4.5 12 7.5C12 10.8 10.07 13.5 7.5 13.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                  {streakDays}-day streak · {totalToday} tasks today
                </div>
              </div>
            </div>
            {!compact && <div className="ts-chev" style={{ transform: perfExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }}>⌄</div>}
          </div>

          {!compact && perfExpanded && (
            <div className="pc-grid">
              <div className="pc-gstat"><div className="pc-gval">{workloadScore}</div><div className="pc-glbl">Score</div></div>
              <div className="pc-gsep" />
              <div className="pc-gstat"><div className="pc-gval">{totalToday}</div><div className="pc-glbl">Tasks</div></div>
              <div className="pc-gsep" />
              <div className="pc-gstat"><div className="pc-gval">{completedToday}</div><div className="pc-glbl">Done</div></div>
              <div className="pc-gsep" />
              <div className="pc-gstat">
                <div className="pc-gval" style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                    <path d="M7.5 13.5C5.01 13.5 3 11.49 3 9C3 6.5 5.5 4.5 5.5 2.5C5.5 2.5 6.5 4 7.5 4C8.5 4 9.5 2 9.5 2C9.5 2 12 4.5 12 7.5C12 10.8 10.07 13.5 7.5 13.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                  {streakDays}
                </div>
                <div className="pc-glbl">Streak</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderWeeklySchedule() {
    const compact = isCompact('weeklySchedule');
    return (
      <div className="widget" key="weeklySchedule">
        <Link href="/calendar" className="wk-widget" style={{ textDecoration:'none' }}>
          <div className="wk-w-hdr">
            <div>
              <div className="wk-w-ttl">Weekly Schedule</div>
              {!compact && <div className="wk-w-meta">{weekRange} · {weekItemCount} item{weekItemCount !== 1 ? 's' : ''}</div>}
            </div>
            <div className="wk-w-arr" style={{ color:'rgba(255,255,255,.3)', fontSize:18 }}>→</div>
          </div>
          <div className="wk-w-strip">
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              const hasItems = !!scheduleDayMap[d.toDateString()];
              const isHot = (scheduleDayMap[d.toDateString()]?.length ?? 0) >= 4;
              const dotColor = isHot ? ch.full : hasItems ? ch.c1 : undefined;
              return (
                <div key={i} className={`wk-wd ${isToday ? 'today' : isHot ? 'hot' : hasItems ? 'has' : ''}`}>
                  <div className="wk-wd-lbl">{DAY_LABELS[i]}</div>
                  <div className="wk-wd-num">{d.getDate()}</div>
                  <div className="wk-wd-dot" style={{ background: dotColor ?? 'transparent' }} />
                </div>
              );
            })}
          </div>
          {!compact && (
            <div className="wk-w-foot">
              <span className="wk-w-sum">
                {weekItemCount > 0 ? `${weekItemCount} item${weekItemCount !== 1 ? 's' : ''} this week` : 'Nothing scheduled'}
              </span>
              <span className="wk-w-act">Full view</span>
            </div>
          )}
        </Link>
      </div>
    );
  }

  function renderWorkloadBalance() {
    const compact = isCompact('workloadBalance');
    return (
      <div className="widget" key="workloadBalance">
        <div className="wl-card" onClick={() => setWorkloadOpen(true)} style={{ cursor:'pointer' }}>
          <div className="wl-title-row">
            <div>
              <div className="wl-title">Workload Balance</div>
              {!compact && <div className="wl-subtitle">Week of {weekRange}</div>}
            </div>
            <div className="wl-tap-pill">Full view →</div>
          </div>

          {!compact && (
            <div className="wl-legend-row">
              <div className="wl-leg-item"><div className="wl-leg-swatch" style={{ background: ch.ok }}/><span>Light (&lt;30%)</span></div>
              <div className="wl-leg-item"><div className="wl-leg-swatch" style={{ background: ch.mid }}/><span>OK (30–64%)</span></div>
              <div className="wl-leg-item"><div className="wl-leg-swatch" style={{ background: ch.warn }}/><span>Busy (65–89%)</span></div>
              <div className="wl-leg-item"><div className="wl-leg-swatch" style={{ background: ch.full }}/><span>Full (≥90%)</span></div>
            </div>
          )}

          <div className="wl-chart" style={compact ? { marginBottom: 0 } : {}}>
            {!compact && (
              <div className="wl-val-row">
                <div className="wl-y-spacer" />
                {weekDays.map((d, i) => {
                  const load = WEEK_WORKLOAD[i];
                  const barColor = load >= 90 ? ch.full : load >= 65 ? ch.warn : load >= 30 ? ch.mid : ch.ok;
                  return (
                    <div key={i} className="wl-val-cell">
                      <span className="wl-val-lbl" style={{ color: load >= 65 ? barColor : 'var(--mid)' }}>
                        {load > 0 ? `${load}%` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="wl-bar-area" style={compact ? { height: 70 } : {}}>
              {!compact && (
                <div className="wl-y-axis">
                  {[100, 75, 50, 25].map(pct => (
                    <div key={pct} className="wl-y-tick" style={{ bottom: `${pct}%` }}>
                      <span className="wl-y-lbl">{pct}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="wl-plot">
                {!compact && (
                  <div className="wl-gridlines" aria-hidden="true">
                    {[100, 75, 50, 25].map(pct => (
                      <div key={pct} className="wl-gridline" style={{ bottom: `${pct}%` }} />
                    ))}
                    <div className="wl-baseline" />
                  </div>
                )}

                {weekDays.map((d, i) => {
                  const load = WEEK_WORKLOAD[i];
                  const isToday = d.toDateString() === today.toDateString();
                  const barColor = load >= 90 ? ch.full : load >= 65 ? ch.warn : load >= 30 ? ch.mid : ch.ok;
                  return (
                    <div key={i} className="wl-bar-col">
                      <div
                        className={`wl-bar${isToday ? ' wl-bar-today' : ''}`}
                        style={{
                          height: `${Math.max(2, load)}%`,
                          background: isToday ? `linear-gradient(to top, ${barColor}, ${barColor}bb)` : barColor,
                          opacity: load < 5 ? 0.4 : 1,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="wl-day-row">
              {!compact && <div className="wl-y-spacer" />}
              {weekDays.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                const load = WEEK_WORKLOAD[i];
                return (
                  <div key={i} className="wl-day-cell">
                    <span className={`wl-day-lbl${isToday ? ' wl-day-today' : ''}${load >= 90 ? ' wl-day-warn' : ''}`}>
                      {DAY_LABELS[i].slice(0, 2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {!compact && (() => {
            const heaviestIdx = WEEK_WORKLOAD.indexOf(Math.max(...WEEK_WORKLOAD));
            const heaviestLoad = WEEK_WORKLOAD[heaviestIdx];
            const isOverloaded = heaviestLoad >= 90;
            const insightMsg = heaviestIdx !== todayDow
              ? `${DAY_LABELS[heaviestIdx]}'s schedule looks heaviest — consider spreading tasks`
              : 'Today is your heaviest day — pace yourself';
            return (
              <div className="wl-note">
                <div className="wl-note-pill" style={{ background: isOverloaded ? `${ch.full}18` : `${ch.warn}18`, borderColor: isOverloaded ? `${ch.full}55` : `${ch.warn}55` }}>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 4v3m0 2.5v.5" stroke={isOverloaded ? ch.full : ch.warn} strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                  <span style={{ color: isOverloaded ? ch.full : ch.warn }}>{insightMsg}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  function renderAiPriorities() {
    const compact = isCompact('aiPriorities');
    const summary = latestAnalysis?.summary;
    return (
      <div className="widget" key="aiPriorities">
        <Link href="/ai-analysis" className="ai-card" style={{ textDecoration: 'none' }}>
          <div className="ai-hdr">
            <div className="ai-icon-wrap">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L12 8H18L13.5 11.8L15.3 18L10 14.5L4.7 18L6.5 11.8L2 8H8L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="ai-title">AI Priorities</div>
            <div className="ai-arr">→</div>
          </div>
          {!compact ? (
            <div className="ai-body">
              {summary
                ? <p className="ai-text">{summary.slice(0, 100)}{summary.length > 100 ? '…' : ''}</p>
                : <p className="ai-text ai-empty">Tap to generate AI insights for your schedule</p>
              }
            </div>
          ) : (
            <div className="ai-compact-row">
              <span className="ai-compact-txt">{summary ? summary.slice(0, 55) + '…' : 'Tap to generate AI insights'}</span>
            </div>
          )}
        </Link>
      </div>
    );
  }

  function renderUpcomingTasks() {
    const compact = isCompact('upcomingTasks');
    const items = upcomingSchedules.slice(0, compact ? 2 : 4);
    return (
      <div className="widget" key="upcomingTasks">
        <div className="upc-card">
          <div className="upc-hdr">
            <div className="upc-title">Upcoming</div>
            <Link href="/calendar" className="upc-see-all">See all →</Link>
          </div>
          {items.length === 0 ? (
            <div className="upc-empty">Nothing upcoming — you&apos;re all clear!</div>
          ) : (
            <div className={`upc-list${compact ? ' upc-compact' : ''}`}>
              {items.map(s => (
                <div key={s.id} className="upc-item">
                  <div className="upc-dot" style={{ background: PRIORITY_COLORS[s.priority] }} />
                  <div className="upc-info">
                    <div className="upc-name">{s.title}</div>
                    {!compact && <div className="upc-time">{new Date(s.start_time).toLocaleDateString('en-US',{ month:'short', day:'numeric' })} · {formatTime(s.start_time)}</div>}
                  </div>
                  <div className="upc-pri" style={{
                    color: s.priority === 'critical' || s.priority === 'high' ? ch.full
                      : s.priority === 'medium' ? ch.warn : ch.ok,
                  }}>
                    {s.priority.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Card renderer map ─────────────────────────────────────────────────
  const cardRenderers: Record<DashboardCardKey, () => React.ReactNode> = {
    todayCard:        renderTodayCard,
    quickStats:       renderQuickStats,
    pinnedShortcuts:  renderPinnedShortcuts,
    performanceCard:  renderPerformanceCard,
    weeklySchedule:   renderWeeklySchedule,
    workloadBalance:  renderWorkloadBalance,
    aiPriorities:     renderAiPriorities,
    upcomingTasks:    renderUpcomingTasks,
  };

  return (
    <div className="page">
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={ch.c1}/>
            <stop offset="100%" stopColor={ch.c2}/>
          </linearGradient>
          <linearGradient id="gGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={ch.c1}/>
            <stop offset="100%" stopColor={ch.c2}/>
          </linearGradient>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ch.c1} stopOpacity="1"/>
            <stop offset="100%" stopColor={ch.c2} stopOpacity="0.7"/>
          </linearGradient>
        </defs>
      </svg>

      <div className="hdr">
        <div className="hdr-info">
          <h2>{GREETING()}, {firstName}</h2>
          {(profile?.designation || profile?.role_title) && (
            <p className="hdr-role">{profile?.designation || profile?.role_title}</p>
          )}
        </div>
        <Link href="/profile" className="av">
          <div className="av-inner">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="avatar" className="av-img" />
            ) : (
              profile?.full_name?.[0]?.toUpperCase() ?? '?'
            )}
          </div>
        </Link>
      </div>

      <div className="scrl">
        {cardOrder.map(key => {
          if (!isVisible(key)) return null;
          const renderer = cardRenderers[key];
          return renderer ? renderer() : null;
        })}
        <div style={{ height: 24 }} />
      </div>

      <WorkloadSheet
        open={workloadOpen}
        onClose={() => setWorkloadOpen(false)}
        weekDays={weekDays}
        scheduleDayMap={scheduleDayMap}
        weekWorkload={WEEK_WORKLOAD}
        weekRange={weekRange}
        weekItemCount={weekItemCount}
        latestAnalysisSummary={latestAnalysis?.summary}
      />

      <BottomNav />

      <style jsx>{`
        .page { height: 100dvh; background: var(--bg); display: flex; flex-direction: column; color: var(--dark); font-family: inherit; overflow: hidden; }

        .hdr { padding: 52px 22px 14px; display: flex; align-items: flex-start; justify-content: space-between; flex-shrink: 0; position: relative; z-index: 10; background: var(--glass-bg, var(--bg)); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--glass-border, var(--border)); }
        .hdr::after { content: ''; position: absolute; top: -40px; left: 50%; transform: translateX(-50%); width: 280px; height: 140px; background: radial-gradient(ellipse, var(--pur-lt) 0%, transparent 70%); pointer-events: none; z-index: 0; }
        .hdr-info { position: relative; z-index: 1; }
        .hdr-info h2 { font-size: 20px; font-weight: 700; color: var(--dark); letter-spacing: -.3px; }
        .hdr-role { font-size: 12px; color: var(--mid); margin-top: 3px; font-weight: 500; }
        .av { width: 44px; height: 44px; min-width: 44px; flex-shrink: 0; border-radius: 50%; background: var(--gradient); display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; z-index: 1; text-decoration: none; box-shadow: 0 0 12px rgba(139,124,246,0.35); transition: box-shadow .2s; }
        .av:active { box-shadow: 0 0 18px rgba(139,124,246,0.55); opacity: .9; }
        .av-inner { width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 50%; background: var(--gradient); display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; color: #fff; overflow: hidden; flex-shrink: 0; }
        .av-img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; border-radius: 50%; }

        .scrl { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 12px 18px 100px; -webkit-overflow-scrolling: touch; scrollbar-width: none; overscroll-behavior: contain; }
        .scrl::-webkit-scrollbar { display: none; }
        .widget { margin-bottom: 12px; }

        /* ── Quick Stats ── */
        .qs-card { background: var(--glass-bg, var(--surf)); border-radius: var(--rmd); padding: 14px 16px; box-shadow: var(--glass-sh2, var(--card-sh2)); border: 1px solid var(--glass-border, var(--border)); backdrop-filter: var(--glass-blur, blur(18px)); -webkit-backdrop-filter: var(--glass-blur, blur(18px)); display: flex; align-items: center; justify-content: space-around; }
        .qs-compact { padding: 10px 14px; }
        .qs-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .qs-icon { opacity: .85; }
        .qs-val { font-size: 22px; font-weight: 900; line-height: 1; letter-spacing: -.5px; }
        .qs-compact .qs-val { font-size: 18px; }
        .qs-lbl { font-size: 10px; color: var(--mid); font-weight: 600; letter-spacing: .3px; text-transform: uppercase; }
        .qs-sep { width: 1px; height: 36px; background: var(--border); flex-shrink: 0; margin: 0 4px; }
        .qs-compact .qs-sep { height: 28px; }

        /* ── Pinned Shortcuts ── */
        .ps-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(64px, 1fr)); gap: 8px; }
        .ps-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 8px; border-radius: var(--rmd); background: var(--glass-bg, var(--surf)); border: 1px solid var(--glass-border, var(--border)); box-shadow: var(--glass-sh2, var(--card-sh2)); backdrop-filter: var(--glass-blur, blur(18px)); -webkit-backdrop-filter: var(--glass-blur, blur(18px)); text-decoration: none; cursor: pointer; transition: transform .15s, background .15s; }
        .ps-btn:active { transform: scale(.94); background: var(--glass-bg2, var(--surf2)); }
        .ps-icon-wrap { width: 36px; height: 36px; border-radius: 10px; background: color-mix(in srgb, var(--sc-color) 16%, transparent); border: 1px solid color-mix(in srgb, var(--sc-color) 35%, transparent); display: flex; align-items: center; justify-content: center; color: var(--sc-color); }
        .ps-label { font-size: 10px; font-weight: 700; color: var(--mid); text-align: center; line-height: 1.2; }

        /* ── Today Card ── */
        .today-card { background: var(--glass-bg, var(--surf)); border-radius: var(--rmd); padding: 15px 16px 12px; box-shadow: var(--glass-sh2, var(--card-sh2)); cursor: pointer; border: 1px solid var(--glass-border, var(--border)); backdrop-filter: var(--glass-blur, blur(18px)); -webkit-backdrop-filter: var(--glass-blur, blur(18px)); transition: background .18s, border-color .18s; }
        .today-card:active { background: var(--glass-bg2, var(--surf2)); }
        .tc-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 11px; }
        .tc-date-lbl { font-size: 20px; font-weight: 900; color: var(--dark); letter-spacing: -.5px; line-height: 1; }
        .tc-day-lbl { font-size: 11px; color: var(--mid); font-weight: 500; margin-top: 3px; }
        .tc-status-badge { display: inline-flex; align-items: center; gap: 5px; border-radius: 100px; padding: 4px 10px; font-size: 10px; font-weight: 700; flex-shrink: 0; letter-spacing: .3px; }
        .tc-status-badge.attention { background: var(--coral-lt); color: var(--coral); border: 1px solid var(--coral); }
        .tc-status-badge.attention::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: var(--coral); display: inline-block; animation: pulseDot 1.4s ease-in-out infinite; }
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.5)} }
        .tc-status-badge.ok { background: var(--mint-lt); color: var(--mint); border: 1px solid var(--mint); }
        .tc-focus-bar { display: flex; align-items: center; gap: 10px; padding: 9px 11px; background: var(--bg); border-radius: var(--rsm); margin-bottom: 8px; cursor: default; border: 1px solid var(--border); }
        .tc-focus-icon { font-size: 14px; color: var(--purple); font-weight: 700; flex-shrink: 0; }
        .tc-focus-info { flex: 1; min-width: 0; }
        .tc-focus-name { font-size: 12px; font-weight: 700; color: var(--dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tc-prog-row { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
        .tc-prog-bar { flex: 1; height: 3px; background: var(--border2); border-radius: 2px; overflow: hidden; }
        .tc-prog-fill { height: 100%; background: var(--gradient); border-radius: 2px; transition: width .6s ease; }
        .tc-prog-txt { font-size: 10px; color: var(--mid); font-weight: 600; white-space: nowrap; }
        .tc-focus-time { font-size: 11px; color: var(--mid); font-weight: 600; flex-shrink: 0; }
        .no-task { opacity: .7; }
        .tc-insight-bar { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 10px; background: var(--amber-lt); border-left: 3px solid var(--amber); cursor: pointer; transition: opacity .15s; text-decoration: none; }
        .tc-insight-bar:active { opacity: .75; }
        .tc-ins-ico { font-size: 13px; flex-shrink: 0; color: var(--amber); }
        .tc-ins-text { flex: 1; font-size: 11px; font-weight: 600; color: var(--dark); line-height: 1.4; }
        .tc-ins-arrow { width: 22px; height: 22px; border-radius: 50%; background: var(--pur-lt); color: var(--purple); display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; flex-shrink: 0; line-height: 1; }
        .tc-compact-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
        .tc-compact-stat { font-size: 12px; color: var(--mid); font-weight: 600; white-space: nowrap; }
        .tc-compact-pct { font-size: 12px; font-weight: 700; color: var(--dark); white-space: nowrap; }

        .ts-exp { margin-top: 8px; display: flex; flex-direction: column; gap: 7px; }
        .ts-empty { padding: 12px; text-align: center; }
        .ts-add-cta { padding: 9px 20px; background: var(--gradient); border-radius: var(--rsm); color: #fff; font-size: 13px; font-weight: 700; text-decoration: none; }
        .tli { display: flex; align-items: center; gap: 12px; padding: 12px 14px 12px 0; background: var(--surf); border-radius: var(--rmd); cursor: pointer; transition: transform .15s, background .15s; border: 1px solid var(--border); position: relative; overflow: hidden; }
        .tli::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--gradient); border-radius: 3px 0 0 3px; }
        .tli:active { transform: scale(.98); background: var(--surf2); }
        .tli.done { opacity: .45; }
        .tli-time { width: 44px; font-size: 10px; font-weight: 600; color: var(--lite); text-align: center; flex-shrink: 0; line-height: 1.3; padding-left: 8px; }
        .tli-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .tli-info { flex: 1; }
        .tli-title { font-size: 13px; font-weight: 600; color: var(--dark); }
        .tli-sub { font-size: 11px; color: var(--mid); margin-top: 2px; font-weight: 400; }
        .tli-dur { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; margin-right: 8px; }

        /* ── Performance Card ── */
        .perf-card { background: var(--glass-bg, var(--surf)); border-radius: var(--rmd); padding: 14px 16px; box-shadow: var(--glass-sh2, var(--card-sh2)); border: 1px solid var(--glass-border, var(--border)); backdrop-filter: var(--glass-blur, blur(18px)); -webkit-backdrop-filter: var(--glass-blur, blur(18px)); cursor: pointer; transition: background .18s, border-color .18s; }
        .perf-card:active { background: var(--glass-bg2, var(--surf2)); }
        .pc-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .pc-left { display: flex; align-items: center; gap: 10px; flex: 1; }
        .pc-ring { width: 54px; height: 54px; border-radius: 50%; flex-shrink: 0; position: relative; display: flex; align-items: center; justify-content: center; }
        .pc-ring-svg { position: absolute; top: 0; left: 0; }
        .pc-score-num { position: relative; z-index: 1; font-size: 14px; font-weight: 700; color: var(--dark); }
        .pc-info { flex: 1; }
        .pc-hdline { font-size: 14px; font-weight: 700; color: var(--dark); }
        .pc-sub { font-size: 11px; color: var(--mid); font-weight: 500; margin-top: 2px; }
        .ts-chev { font-size: 18px; color: var(--mid); line-height: 1; }
        .pc-grid { display: flex; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }
        .pc-gstat { flex: 1; text-align: center; }
        .pc-gval { font-size: 18px; font-weight: 800; color: var(--dark); display: flex; align-items: center; justify-content: center; gap: 3px; }
        .pc-glbl { font-size: 10px; color: var(--mid); margin-top: 2px; font-weight: 600; }
        .pc-gsep { width: 1px; background: var(--border); margin: 4px 0; flex-shrink: 0; }

        /* ── Weekly Widget ── */
        .wk-widget { display: block; background: var(--glass-bg, var(--surf)); border-radius: var(--rmd); padding: 14px 16px; box-shadow: var(--glass-sh2, var(--card-sh2)); border: 1px solid var(--glass-border, var(--border)); backdrop-filter: var(--glass-blur, blur(18px)); -webkit-backdrop-filter: var(--glass-blur, blur(18px)); cursor: pointer; transition: background .18s, border-color .18s; }
        .wk-widget:active { background: var(--glass-bg2, var(--surf2)); }
        .wk-w-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
        .wk-w-ttl { font-size: 14px; font-weight: 800; color: var(--dark); }
        .wk-w-meta { font-size: 11px; color: var(--mid); font-weight: 500; margin-top: 2px; }
        .wk-w-arr { color: var(--mid); font-size: 18px; }
        .wk-w-strip { display: grid; grid-template-columns: repeat(7,1fr); gap: 4px; margin-bottom: 10px; }
        .wk-wd { display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .wk-wd-lbl { font-size: 9px; font-weight: 700; color: var(--lite); }
        .wk-wd-num { width: 28px; height: 28px; border-radius: 8px; font-size: 12px; font-weight: 700; color: var(--mid); display: flex; align-items: center; justify-content: center; border: 1px solid transparent; }
        .wk-wd.today .wk-wd-lbl { color: var(--purple); }
        .wk-wd.today .wk-wd-num { background: var(--purple); color: #fff; }
        .wk-wd.hot .wk-wd-num { border-color: var(--coral); color: var(--coral); }
        .wk-wd.has .wk-wd-num { color: var(--dark); }
        .wk-wd-dot { width: 4px; height: 4px; border-radius: 50%; }
        .wk-w-foot { display: flex; align-items: center; justify-content: space-between; }
        .wk-w-sum { font-size: 11px; color: var(--mid); font-weight: 500; }
        .wk-w-act { font-size: 11px; font-weight: 700; color: var(--purple); }

        /* ── Workload Graph ── */
        .wl-card { background: var(--glass-bg, var(--surf)); border-radius: var(--rmd); padding: 15px 16px 13px; box-shadow: var(--glass-sh2, var(--card-sh2)); border: 1px solid var(--glass-border, var(--border)); backdrop-filter: var(--glass-blur, blur(18px)); -webkit-backdrop-filter: var(--glass-blur, blur(18px)); transition: background .18s, border-color .18s; }
        .wl-card:active { background: var(--glass-bg2, var(--surf2)); border-color: var(--purple); }
        .wl-title-row { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
        .wl-title { font-size: 14px; font-weight: 800; color: var(--dark); }
        .wl-subtitle { font-size: 11px; color: var(--mid); font-weight: 500; margin-top: 3px; }
        .wl-tap-pill { font-size: 10px; font-weight: 700; color: var(--purple); background: var(--pur-lt); border-radius: 100px; padding: 4px 9px; white-space: nowrap; flex-shrink: 0; border: 1px solid var(--purple); opacity: .85; }
        .wl-legend-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
        .wl-leg-item { display: flex; align-items: center; gap: 5px; }
        .wl-leg-swatch { width: 8px; height: 8px; border-radius: 3px; flex-shrink: 0; }
        .wl-leg-item span { font-size: 10px; color: var(--mid); font-weight: 500; }
        .wl-chart { display: flex; flex-direction: column; gap: 0; margin-bottom: 12px; }
        .wl-y-spacer { width: 28px; flex-shrink: 0; }
        .wl-val-row { display: flex; align-items: flex-end; padding-bottom: 4px; }
        .wl-val-cell { flex: 1; display: flex; justify-content: center; align-items: center; }
        .wl-val-lbl { font-size: 9px; font-weight: 700; line-height: 1; white-space: nowrap; letter-spacing: -.2px; }
        .wl-bar-area { display: flex; height: 130px; position: relative; }
        .wl-y-axis { width: 28px; flex-shrink: 0; position: relative; }
        .wl-y-tick { position: absolute; right: 0; transform: translateY(50%); display: flex; align-items: center; justify-content: flex-end; padding-right: 5px; }
        .wl-y-lbl { font-size: 9px; font-weight: 600; color: var(--lite); line-height: 1; }
        .wl-plot { flex: 1; position: relative; border-left: 1px solid var(--border2); }
        .wl-gridlines { position: absolute; inset: 0; pointer-events: none; }
        .wl-gridline { position: absolute; left: 0; right: 0; height: 1px; background: var(--border); opacity: .5; transform: translateY(50%); }
        .wl-baseline { position: absolute; bottom: 0; left: 0; right: 0; height: 1.5px; background: var(--border2); opacity: .9; }
        .wl-plot { display: flex; align-items: flex-end; padding: 0 4px; gap: 5px; }
        .wl-bar-col { flex: 1; height: 100%; display: flex; align-items: flex-end; justify-content: center; }
        .wl-bar { width: 72%; border-radius: 4px 4px 2px 2px; min-height: 3px; transition: height .55s cubic-bezier(.4,0,.2,1); }
        .wl-bar-today { box-shadow: 0 0 10px rgba(139,124,246,.45); }
        .wl-day-row { display: flex; align-items: center; padding-top: 5px; border-top: 1px solid var(--border); margin-top: 0; }
        .wl-day-cell { flex: 1; display: flex; justify-content: center; }
        .wl-day-lbl { font-size: 9px; font-weight: 700; color: var(--lite); line-height: 1; }
        .wl-day-today { color: var(--purple); }
        .wl-day-warn  { color: var(--coral); }
        .wl-note { padding-top: 10px; border-top: 1px solid var(--border); }
        .wl-note-pill { display: inline-flex; align-items: flex-start; gap: 6px; padding: 7px 10px; border-radius: 10px; border: 1px solid transparent; font-size: 11px; font-weight: 600; line-height: 1.45; width: 100%; }

        /* ── AI Priorities Card ── */
        .ai-card { display: block; background: var(--glass-bg, var(--surf)); border-radius: var(--rmd); padding: 14px 16px; box-shadow: var(--glass-sh2, var(--card-sh2)); border: 1px solid var(--glass-border, var(--border)); backdrop-filter: var(--glass-blur, blur(18px)); -webkit-backdrop-filter: var(--glass-blur, blur(18px)); transition: background .18s, border-color .18s; }
        .ai-card:active { background: var(--glass-bg2, var(--surf2)); border-color: var(--amber); }
        .ai-hdr { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .ai-icon-wrap { width: 28px; height: 28px; border-radius: 8px; background: var(--amber-lt); border: 1px solid var(--amber); display: flex; align-items: center; justify-content: center; color: var(--amber); flex-shrink: 0; }
        .ai-title { flex: 1; font-size: 14px; font-weight: 800; color: var(--dark); }
        .ai-arr { font-size: 16px; color: var(--mid); }
        .ai-body { padding-top: 4px; }
        .ai-text { font-size: 12px; color: var(--mid); font-weight: 500; line-height: 1.5; margin: 0; }
        .ai-empty { opacity: .6; }
        .ai-compact-row { padding-top: 0; }
        .ai-compact-txt { font-size: 11px; color: var(--mid); font-weight: 500; line-height: 1.4; }

        /* ── Upcoming Tasks Card ── */
        .upc-card { background: var(--glass-bg, var(--surf)); border-radius: var(--rmd); padding: 14px 16px; box-shadow: var(--glass-sh2, var(--card-sh2)); border: 1px solid var(--glass-border, var(--border)); backdrop-filter: var(--glass-blur, blur(18px)); -webkit-backdrop-filter: var(--glass-blur, blur(18px)); }
        .upc-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .upc-title { font-size: 14px; font-weight: 800; color: var(--dark); }
        .upc-see-all { font-size: 11px; font-weight: 700; color: var(--purple); text-decoration: none; }
        .upc-empty { font-size: 12px; color: var(--mid); opacity: .7; text-align: center; padding: 8px 0; }
        .upc-list { display: flex; flex-direction: column; gap: 8px; }
        .upc-compact { gap: 6px; }
        .upc-item { display: flex; align-items: center; gap: 10px; }
        .upc-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .upc-info { flex: 1; min-width: 0; }
        .upc-name { font-size: 12px; font-weight: 600; color: var(--dark); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .upc-time { font-size: 10px; color: var(--mid); margin-top: 1px; }
        .upc-pri { font-size: 9px; font-weight: 700; flex-shrink: 0; letter-spacing: .3px; }
      `}</style>
    </div>
  );
}
