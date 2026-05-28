'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Schedule, AiAnalysis } from '@/types/database';
import { formatTime, PRIORITY_COLORS, TYPE_ICONS } from '@/lib/utils';
import BottomNav from '@/components/layout/BottomNav';
import WorkloadSheet from '@/components/WorkloadSheet';
import AddScheduleSheet from '@/components/AddScheduleSheet';
import ProgressDetailsSheet from '@/components/ProgressDetailsSheet';
import ActiveSessionSheet from '@/components/ActiveSessionSheet';
import {
  loadFullPrefs,
  migrateFromV1,
  type DashboardFullPrefs,
  type DashboardCardKey,
  ALL_SHORTCUTS,
} from '@/lib/dashboardPrefs';
import { useChartColors } from '@/lib/useChartColors';
import { isNotificationsEnabled, scheduleAllTodayNotifications } from '@/lib/notifications';
import { countEarnedAwards, TOTAL_AWARDS } from '@/lib/awards';
import { recordCheckin } from '@/lib/checkin';
import { captureAppError } from '@/lib/sentry';
import {
  getTaskTimePct,
  getRemainingMinutes,
  isTaskEndReached,
  getSavedMinutes,
  formatSavedTime,
  timeStrToDate,
} from '@/lib/timeProgress';
import TaskCompletionPrompt from '@/components/TaskCompletionPrompt';

interface Props {
  profile:          Profile | null;
  todaySchedules:   Schedule[];
  weekSchedules:    Schedule[];
  upcomingSchedules: Schedule[];
  latestAnalysis:   AiAnalysis | null;
  streakDays:       number;  // consecutive days with ≥1 completed task
  focusWins:        number;  // days in last 28 with 100% task completion
  tasksDone:        number;  // total all-time completed tasks (for awards count)
}

const GREETING = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const DAY_LABELS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
// weekWorkload is computed per-render from real scheduleDayMap data (see below)

// ─── Shared style objects ──────────────────────────────────────────────────────
const S = {
  page: {
    /* min-height instead of height: page fills viewport but doesn't force
       scroll containers to stretch when content is shorter than screen */
    minHeight: '100dvh',
    height: '100dvh',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column' as const,
    color: 'var(--dark)',
    fontFamily: 'inherit',
    overflow: 'hidden',
  },
  hdr: {
    /* Status bar clearance + compact breathing room */
    paddingTop: 'max(env(safe-area-inset-top, 0px), 14px)',
    paddingBottom: '14px',
    paddingLeft: '22px',
    paddingRight: '22px',
    display: 'flex',
    alignItems: 'center',           /* avatar vertically centred with text block */
    justifyContent: 'space-between',
    flexShrink: 0,
    position: 'relative' as const,
    zIndex: 10,
    background: 'var(--glass-bg, var(--bg))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--glass-border, var(--border))',
    transition: 'background .25s ease, border-color .25s ease',
  },
  scrl: {
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    padding: '12px 18px 0',
    WebkitOverflowScrolling: 'touch' as const,
    scrollbarWidth: 'none' as const,
    overscrollBehavior: 'contain' as const,
  },
  widget: {
    marginBottom: 12,
  },
  card: {
    background: 'var(--glass-bg, var(--surf))',
    borderRadius: 'var(--rmd, 16px)',
    padding: '14px 16px',
    boxShadow: 'var(--glass-sh2, 0 4px 24px rgba(0,0,0,.18))',
    border: '1px solid var(--glass-border, rgba(255,255,255,.09))',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
  },
};

// ── Today workload: deterministic, today-only, unaffected by AI refresh ──────
// Each task contributes ~14% base load; critical priority adds weight; 7+ tasks = 100%
function computeTodayWorkload(schedules: { priority?: string | null }[]): number {
  if (schedules.length === 0) return 0;
  const priorityWeight = (p: string | null | undefined) => {
    if (p === 'critical') return 1.35;
    if (p === 'high')     return 1.15;
    if (p === 'low')      return 0.80;
    return 1.0;
  };
  const totalWeight = schedules.reduce((sum, s) => sum + priorityWeight(s.priority), 0);
  const avgWeight   = totalWeight / schedules.length;
  const base        = Math.min(schedules.length * 14, 100);
  return Math.min(Math.round(base * avgWeight), 100);
}

export default function DashboardClient({ profile, todaySchedules, weekSchedules, upcomingSchedules, latestAnalysis, streakDays, focusWins, tasksDone }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const ch = useChartColors();
  const [, setCompletingId] = useState<string | null>(null);
  const [todayExpanded, setTodayExpanded] = useState(false);
  const [perfExpanded, setPerfExpanded] = useState(false);
  const [workloadOpen, setWorkloadOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [sessionOpen,   setSessionOpen]   = useState(false);
  const [promptOpen,    setPromptOpen]    = useState(false);
  const [promptDismissedId, setPromptDismissedId] = useState<string | null>(null);
  const [savedMinsToday, setSavedMinsToday] = useState(0);
  const [tick, setTick] = useState(0); // real-time ticker every 10s
  const isFirstRender = useRef(true);

  // Derived early so useEffects below can reference it
  const inProgressEarly = todaySchedules.find(s => !s.is_completed);
  const [prefs, setPrefs] = useState<DashboardFullPrefs | null>(null);
  const [liveScore, setLiveScore] = useState<number | null>(null);
  const [liveSummary, setLiveSummary] = useState<string | null>(null);
  const [refreshingAI, setRefreshingAI] = useState(false);
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null);
  const [rescheduleMinTime, setRescheduleMinTime] = useState<string | undefined>(undefined);
  const hdrRef  = useRef<HTMLDivElement>(null);
  const [hdrH, setHdrH] = useState(80);   // measured header height in px
  const [visitStreak,    setVisitStreak]    = useState(0);
  const [maxVisitStreak, setMaxVisitStreak] = useState(0);

  // ── Measure real header height so scroll container never exceeds available space ──
  useEffect(() => {
    if (!hdrRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setHdrH(Math.round(e.contentRect.height));
    });
    ro.observe(hdrRef.current);
    setHdrH(hdrRef.current.offsetHeight);
    return () => ro.disconnect();
  }, []);

  // ── Daily check-in — record visit, show streak toast on first open today ──
  useEffect(() => {
    const ci = recordCheckin();
    setVisitStreak(ci.streak);
    setMaxVisitStreak(ci.maxStreak);
    if (ci.isNew) {
      const msg =
        ci.streak === 1 ? '👋 Welcome back!' :
        ci.streak === 7 ? '🗓 7-day visit streak! Regular badge unlocked.' :
        ci.streak === 14 ? '🔥 14 days straight! Habit Builder unlocked.' :
        ci.streak === 30 ? '⚡ 30-day streak! Power User unlocked.' :
        `✓ Day ${ci.streak} — keep it up!`;
      toast.success(msg, { duration: 3500 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const completedToday = todaySchedules.filter(s => s.is_completed).length;
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

  // ── Real-time ticker (every 10s) — drives focus bar + end-of-task prompt ────
  // 10s tick + 10s CSS linear transition = bar moves at exactly the right speed
  useEffect(() => {
    // After mount, mark first-render complete so the transition can engage
    const raf = requestAnimationFrame(() => { isFirstRender.current = false; });
    const id  = setInterval(() => setTick(t => t + 1), 10_000);
    return () => { clearInterval(id); cancelAnimationFrame(raf); };
  }, []);

  // ── Auto-show TaskCompletionPrompt when active task's time is up ──────────
  useEffect(() => {
    if (!inProgressEarly || inProgressEarly.is_completed) return;
    if (promptDismissedId === inProgressEarly.id) return;
    if (isTaskEndReached(inProgressEarly.start_time, inProgressEarly.end_time ?? null)) {
      setPromptOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, inProgressEarly?.id]);

  // Called by ActiveSessionSheet → marks task done, closes sheet, refreshes
  // Auto-schedule notifications for today's pending activities
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isNotificationsEnabled()) return;
    scheduleAllTodayNotifications(
      todaySchedules.filter(s => !s.is_completed)
    );
  // Re-run whenever todaySchedules changes (task completed / added)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todaySchedules]);

  async function handleSessionMarkComplete(id: string) {
    setCompletingId(id);
    // Track saved time before marking complete
    const sched = todaySchedules.find(s => s.id === id);
    if (sched?.end_time) {
      const saved = getSavedMinutes(sched.end_time, new Date());
      if (saved > 0) {
        setSavedMinsToday(prev => prev + saved);
        toast.success(`⚡ ${formatSavedTime(saved)} saved!`, { duration: 3000 });
      }
    }
    await supabase.from('schedules').update({ is_completed: true }).eq('id', id);
    setCompletingId(null);
    setSessionOpen(false);
    setPromptOpen(false);
    router.refresh();
  }

  // TaskCompletionPrompt "Not Yet" → open edit sheet with current time as minimum
  function handleRescheduleFromPrompt(schedule: Schedule) {
    setPromptOpen(false);
    setPromptDismissedId(schedule.id);
    // Enforce no-past-time: earliest selectable = right now
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setRescheduleMinTime(`${hh}:${mm}`);
    setEditSchedule(schedule);
  }

  // TaskCompletionPrompt "Missed / Skip" → dismiss prompt, keep task as-is
  function handleMissedSkip(id: string) {
    setPromptOpen(false);
    setPromptDismissedId(id);
  }

  // ActiveSessionSheet countdown → 0: close session, open completion prompt
  function handleSessionTimeUp(_schedule: Schedule, _savedMins: number) {
    setSessionOpen(false);
    setPromptOpen(true);
  }

  async function refreshAI() {
    setRefreshingAI(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setRefreshingAI(false); return; }
    try {
      const now = new Date();
      const wStart = new Date(now); wStart.setDate(now.getDate() - now.getDay()); wStart.setHours(0,0,0,0);
      const wEnd   = new Date(wStart); wEnd.setDate(wStart.getDate() + 6); wEnd.setHours(23,59,59,999);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-schedule`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            action: 'weekly_analysis',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            dateRange: { from: wStart.toDateString(), to: wEnd.toDateString() },
            schedules: weekSchedules.map(s => {
              const startD = new Date(s.start_time);
              const endD   = s.end_time ? new Date(s.end_time) : null;
              const timeFmt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
              const dateFmt: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
              return {
                id: s.id, title: s.title, type: s.type, priority: s.priority,
                start_time: s.start_time, end_time: s.end_time,
                all_day: s.all_day ?? false, is_completed: s.is_completed,
                start_display: s.all_day ? 'All day' : startD.toLocaleTimeString('en-US', timeFmt),
                end_display:   endD && !s.all_day ? endD.toLocaleTimeString('en-US', timeFmt) : undefined,
                date_display:  startD.toLocaleDateString('en-US', dateFmt),
              };
            }),
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (typeof data.workload_score === 'number') setLiveScore(data.workload_score);
        if (typeof data.summary === 'string') setLiveSummary(data.summary);
        toast.success('AI insights updated!');
      } else {
        toast.error('Could not reach AI. Try again later.');
      }
    } catch (e: unknown) {
      captureAppError(e, 'ai_brief');
      toast.error('AI refresh failed.');
    } finally {
      setRefreshingAI(false);
    }
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  // Compute fallback score from real data — 0 for new users with no schedules
  // Workload is derived purely from today's schedules — not weekly, not AI score
  const workloadScore = computeTodayWorkload(todaySchedules);

  const workloadStatus =
    workloadScore >= 85 ? { badgeClass: 'attention', color: ch.full }
    : workloadScore >= 65 ? { badgeClass: 'attention', color: ch.warn }
    : workloadScore >= 30 ? { badgeClass: 'ok', color: ch.ok }
    : { badgeClass: 'ok', color: ch.mid };

  const scoreLabel =
    workloadScore === 0 ? 'No tasks today'
    : workloadScore >= 85 ? 'Overloaded'
    : workloadScore >= 65 ? 'Moderate'
    : workloadScore >= 30 ? 'On Track' : 'Light';

  const inProgress = todaySchedules.find(s => !s.is_completed);

  // ── Real-time task progress (re-derived on every tick + every render) ───────
  // taskTimePctRaw is a float (e.g. 47.3) — used for bar WIDTH (sub-percent smooth)
  // taskTimePctInt is Math.round for human-readable labels
  const taskTimePctRaw   = inProgress
    ? getTaskTimePct(inProgress.start_time, inProgress.end_time ?? null)
    : null;
  const taskTimePct      = taskTimePctRaw !== null ? Math.round(taskTimePctRaw) : null;
  const taskRemainMins   = inProgress
    ? getRemainingMinutes(inProgress.start_time, inProgress.end_time ?? null)
    : null;
  const taskIsOverdue    = taskTimePctRaw !== null && taskTimePctRaw >= 100;
  // Bar width: raw float for pixel-accurate positioning; capped at 100
  const focusBarPct      = taskTimePctRaw !== null
    ? Math.min(taskTimePctRaw, 100)
    : progressPct;
  const focusBarLabel    = taskTimePctRaw !== null
    ? (taskIsOverdue
        ? '⚠ Time up'
        : taskRemainMins !== null && taskRemainMins <= 5
          ? `${taskRemainMins}m left`
          : `${taskTimePct}% elapsed`)
    : `${progressPct}% of today done`;
  const savedTimeLabel   = savedMinsToday > 0 ? formatSavedTime(savedMinsToday) : null;
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
  weekSchedules.forEach(s => {
    const key = new Date(s.start_time).toDateString();
    if (!scheduleDayMap[key]) scheduleDayMap[key] = [];
    scheduleDayMap[key].push(s);
  });
  // Real workload per day: each task ≈ 14% load; 7+ tasks = 100%
  const weekWorkload = weekDays.map(d =>
    Math.min((scheduleDayMap[d.toDateString()]?.length ?? 0) * 14, 100)
  );

  const weekItemCount = weekSchedules.length;

  const todayLabel = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const todayDayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const weekRange = `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const rawInsight   = liveSummary ?? latestAnalysis?.summary ?? null;
  const insightText  = rawInsight
    ? rawInsight.slice(0, 60) + (rawInsight.length > 60 ? '…' : '')
    : upcomingSchedules.length > 0
    ? `${upcomingSchedules.length} upcoming items — tap to review your week`
    : 'Add schedules to get AI workload insights';

  const circumference = 2 * Math.PI * 22.5;
  const strokeOffset = circumference * (1 - workloadScore / 100);

  // ── Prefs helpers ──────────────────────────────────────────────────────
  const cardOrder: DashboardCardKey[] = prefs?.order ?? [
    'todayCard','quickStats','pinnedShortcuts',
    'performanceCard','weeklySchedule','workloadBalance',
    'aiPriorities','upcomingTasks',
  ];
  const isVisible = (key: DashboardCardKey) => prefs?.visible[key] ?? true;
  const isCompact = (key: DashboardCardKey) => (prefs?.size[key] ?? 'full') === 'compact';

  const pinnedShortcutDefs = (prefs?.pinnedShortcuts ?? ['addTask','viewCalendar','viewPriorities'])
    .map(k => ALL_SHORTCUTS.find(s => s.key === k))
    .filter(Boolean) as typeof ALL_SHORTCUTS;

  // ── Render: Today Card ────────────────────────────────────────────────
  function renderTodayCard() {
    const compact = isCompact('todayCard');
    const isAttn = workloadStatus.badgeClass === 'attention';
    return (
      <div key="todayCard" style={S.widget}>
        <div
          onClick={() => setTodayExpanded(v => !v)}
          style={{ ...S.card, cursor: 'pointer', padding: '15px 16px 12px' }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 11 }}>
            <div>
              <div style={{ fontSize: compact ? 16 : 20, fontWeight: 900, color: 'var(--dark)', letterSpacing: '-.5px', lineHeight: 1 }}>{todayLabel}</div>
              <div style={{ fontSize: 11, color: 'var(--mid)', fontWeight: 500, marginTop: 3 }}>{todayDayName} · {totalToday} activities</div>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              borderRadius: 100, padding: '4px 10px',
              fontSize: 10, fontWeight: 700, letterSpacing: '.3px', flexShrink: 0,
              background: isAttn ? 'var(--coral-lt, rgba(255,107,138,.12))' : 'var(--mint-lt, rgba(45,212,191,.12))',
              color: isAttn ? 'var(--coral, #FF6B8A)' : 'var(--mint, #2DD4BF)',
              border: `1px solid ${isAttn ? 'var(--coral, #FF6B8A)' : 'var(--mint, #2DD4BF)'}`,
            }}>
              {isAttn && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--coral, #FF6B8A)', display: 'inline-block', animation: 'pulseDot 1.4s ease-in-out infinite' }} />}
              {isAttn ? 'Attention' : 'On Track'}
            </div>
          </div>

          {!compact && (
            <>
              {/* Focus bar — tappable → opens ProgressDetailsSheet */}
              <div
                onClick={e => { e.stopPropagation(); inProgress ? setSessionOpen(true) : setProgressOpen(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 11px', background: 'var(--bg)', borderRadius: 10,
                  marginBottom: 8, border: '1px solid var(--border, rgba(255,255,255,.08))',
                  opacity: inProgress ? 1 : 0.7,
                  cursor: 'pointer', WebkitTapHighlightColor: 'rgba(124,106,240,.08)',
                }}
              >
                <div style={{ fontSize: 14, color: 'var(--purple)', fontWeight: 700, flexShrink: 0 }}>
                  {inProgress ? '▶' : '◎'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: inProgress ? 'var(--dark)' : 'var(--mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {inProgress ? inProgress.title : 'No active task'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <div style={{ flex: 1, height: 4, background: 'var(--border2, rgba(255,255,255,.07))', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        // Use raw float width for pixel-accurate sub-percent positioning
                        width: `${focusBarPct.toFixed(3)}%`,
                        background: taskIsOverdue
                          ? 'linear-gradient(90deg,#FF6B8A,#FF3B30)'
                          : taskTimePctRaw !== null && taskTimePctRaw > 0
                            ? 'linear-gradient(90deg,#7C6AF0,#00C6FF)'
                            : 'var(--gradient)',
                        // On first render: no transition so bar jumps instantly to correct position.
                        // After mount: 10s linear transition = bar animates at exactly real-time speed
                        // between each 10s tick, making it look perfectly continuous.
                        transition: isFirstRender.current
                          ? 'none'
                          : 'width 10s linear, background .4s ease',
                        boxShadow: taskTimePctRaw !== null && !taskIsOverdue && taskTimePctRaw > 0
                          ? '0 0 8px rgba(0,198,255,.35)' : 'none',
                      }} />
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
                      color: taskIsOverdue ? '#FF6B8A'
                        : taskRemainMins !== null && taskRemainMins <= 5 ? '#FDCB6E'
                        : 'var(--mid)',
                    }}>
                      {focusBarLabel}
                    </span>
                  </div>
                  {savedTimeLabel && (
                    <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:3, fontSize:10, fontWeight:700, color:'#00C896' }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M6 2v3l2 1.5" stroke="#00C896" strokeWidth="1.4" strokeLinecap="round"/>
                        <circle cx="6" cy="6" r="5" stroke="#00C896" strokeWidth="1.2"/>
                      </svg>
                      {savedTimeLabel} saved today
                    </div>
                  )}
                </div>
                {inProgress && (
                  <div style={{ fontSize: 11, color: 'var(--mid)', fontWeight: 600, flexShrink: 0 }}>{formatTime(inProgress.start_time)}</div>
                )}
              </div>

              {/* Insight bar + AI refresh */}
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
                <Link
                  href="/progress"
                  onClick={e => e.stopPropagation()}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 9,
                    padding: '8px 10px', borderRadius: 10,
                    background: 'var(--amber-lt, rgba(253,203,110,.10))',
                    borderLeft: '3px solid var(--amber, #FDCB6E)',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ color: 'var(--amber)', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M8 2L3.5 8H7L6 12.5L10.5 6.5H7.2L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'var(--dark)', lineHeight: 1.4 }}>{insightText}</div>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--pur-lt)', color: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0, lineHeight: 1 }}>›</div>
                </Link>
                {/* AI Refresh — minimal circular icon button */}
                <button
                  onClick={e => { e.stopPropagation(); refreshAI(); }}
                  disabled={refreshingAI}
                  title="Refresh AI insights"
                  style={{
                    flexShrink: 0,
                    width: 34, height: 34,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(124,106,240,.12)',
                    color: refreshingAI ? 'var(--purple)' : 'rgba(124,106,240,.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: refreshingAI ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'background .15s, color .15s',
                  }}
                >
                  <svg
                    width="15" height="15" viewBox="0 0 24 24" fill="none"
                    style={refreshingAI ? { animation: 'spin 0.9s linear infinite' } : undefined}
                  >
                    <path d="M4.5 12A7.5 7.5 0 0117 6.7M19.5 12A7.5 7.5 0 017 17.3"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M17 4v3h3M7 17v3H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </>
          )}

          {compact && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 600, whiteSpace: 'nowrap' }}><strong>{completedToday}/{totalToday}</strong> done</span>
              <div style={{ flex: 1, height: 3, background: 'var(--border2, rgba(255,255,255,.07))', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--gradient)', borderRadius: 2, width: `${progressPct}%` }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)', whiteSpace: 'nowrap' }}>{progressPct}%</span>
            </div>
          )}
        </div>

        {/* Expandable task list */}
        {todayExpanded && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {todaySchedules.length === 0 ? (
              <div style={{ padding: 12, textAlign: 'center' }}>
                <Link href="/schedule/new" style={{ padding: '9px 20px', background: 'var(--gradient)', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  + Add your first task
                </Link>
              </div>
            ) : todaySchedules.map(s => (
              <div
                key={s.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 0,
                  background: 'var(--surf)', borderRadius: 14,
                  border: '1px solid var(--border)', position: 'relative', overflow: 'hidden',
                  opacity: s.is_completed ? 0.45 : 1,
                }}
              >
                {/* Left accent bar */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--gradient)', borderRadius: '3px 0 0 3px' }} />

                {/* Checkmark button — ONLY this marks done */}
                <button
                  onClick={e => { e.stopPropagation(); toggleComplete(s); }}
                  title={s.is_completed ? 'Mark undone' : 'Mark done'}
                  style={{
                    flexShrink: 0, width: 48, alignSelf: 'stretch',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    paddingLeft: 10, WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: s.is_completed ? 'none' : '1.5px solid rgba(0,200,150,0.45)',
                    background: s.is_completed ? 'rgba(0,200,150,0.25)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background .15s',
                  }}>
                    {s.is_completed && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12L10 17L19 7" stroke="#00C896" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </button>

                {/* Body — tapping opens edit sheet */}
                <button
                  onClick={() => setEditSchedule(s)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px 12px 4px', background: 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: PRIORITY_COLORS[s.priority] }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--dark)',
                      textDecoration: s.is_completed ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>
                      {TYPE_ICONS[s.type]} {s.end_time ? `${formatTime(s.start_time)} – ${formatTime(s.end_time)}` : formatTime(s.start_time)}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, flexShrink: 0,
                    background: (s.priority === 'critical' || s.priority === 'high') ? ch.full + '28' : s.priority === 'medium' ? ch.warn + '28' : ch.ok + '28',
                    color: (s.priority === 'critical' || s.priority === 'high') ? ch.full : s.priority === 'medium' ? ch.warn : ch.ok,
                  }}>
                    {s.priority.toUpperCase()}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: .35 }}>
                    <path d="M9 18L15 12L9 6" stroke="var(--dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Render: Quick Stats ───────────────────────────────────────────────
  function renderQuickStats() {
    const compact = isCompact('quickStats');
    return (
      <div key="quickStats" style={S.widget}>
        <div style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: compact ? '10px 14px' : '14px 16px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ opacity: .9 }}>
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="var(--amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={{ fontSize: compact ? 18 : 22, fontWeight: 900, lineHeight: 1, letterSpacing: '-.5px', color: 'var(--amber)' }}>{streakDays}</div>
            <div style={{ fontSize: 10, color: 'var(--mid)', fontWeight: 600, letterSpacing: '.3px', textTransform: 'uppercase' }}>Streak</div>
            {(() => {
              const n = countEarnedAwards({ streakDays, tasksDone, avgScore: null, focusWins, visitStreak, maxVisitStreak });
              return n > 0 ? (
                <div style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 700, letterSpacing: '.3px', marginTop: -1 }}>
                  {n}/{TOTAL_AWARDS} awards
                </div>
              ) : null;
            })()}
          </div>
          <div style={{ width: 1, height: compact ? 28 : 36, background: 'var(--border)', flexShrink: 0, margin: '0 4px' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ color: 'var(--mint)', opacity: .85 }}>
              <path d="M4 10L8 14L16 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={{ fontSize: compact ? 18 : 22, fontWeight: 900, lineHeight: 1, letterSpacing: '-.5px', color: 'var(--mint)' }}>{completedToday}</div>
            <div style={{ fontSize: 10, color: 'var(--mid)', fontWeight: 600, letterSpacing: '.3px', textTransform: 'uppercase' }}>Today</div>
          </div>
          <div style={{ width: 1, height: compact ? 28 : 36, background: 'var(--border)', flexShrink: 0, margin: '0 4px' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ color: 'var(--purple)', opacity: .85 }}>
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div style={{ fontSize: compact ? 18 : 22, fontWeight: 900, lineHeight: 1, letterSpacing: '-.5px', color: 'var(--purple)' }}>{workloadScore === 0 ? '—' : workloadScore}</div>
            <div style={{ fontSize: 10, color: 'var(--mid)', fontWeight: 600, letterSpacing: '.3px', textTransform: 'uppercase' }}>Workload</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Pinned Shortcuts ──────────────────────────────────────────
  function renderPinnedShortcuts() {
    if (pinnedShortcutDefs.length === 0) return null;
    return (
      <div key="pinnedShortcuts" style={S.widget}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${pinnedShortcutDefs.length}, 1fr)`, gap: 8 }}>
          {pinnedShortcutDefs.map(sc => (
            <Link
              key={sc.key}
              href={sc.href}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '12px 8px',
                borderRadius: 'var(--rmd, 16px)',
                background: 'var(--glass-bg, var(--surf))',
                border: '1px solid var(--glass-border, rgba(255,255,255,.09))',
                boxShadow: 'var(--glass-sh2, 0 4px 24px rgba(0,0,0,.18))',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                textDecoration: 'none',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `color-mix(in srgb, ${sc.color} 16%, transparent)`,
                border: `1px solid color-mix(in srgb, ${sc.color} 35%, transparent)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: sc.color,
              }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d={sc.iconPath} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  {sc.iconPath2 && <path d={sc.iconPath2} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>}
                </svg>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--mid)', textAlign: 'center', lineHeight: 1.2 }}>{sc.label}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // ── Render: Performance Card ──────────────────────────────────────────
  function renderPerformanceCard() {
    const compact = isCompact('performanceCard');
    return (
      <div key="performanceCard" style={S.widget}>
        <div style={{ ...S.card, cursor: 'pointer' }} onClick={() => !compact && setPerfExpanded(v => !v)}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              {!compact && (
                <div style={{ width: 54, height: 54, borderRadius: '50%', flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg style={{ position: 'absolute', top: 0, left: 0 }} viewBox="0 0 54 54" width="54" height="54">
                    <circle cx="27" cy="27" r="22.5" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="4"/>
                    <circle
                      cx="27" cy="27" r="22.5" fill="none"
                      stroke="url(#scoreGrad)" strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={circumference} strokeDashoffset={strokeOffset}
                      transform="rotate(-90 27 27)"
                      style={{ transition: 'stroke-dashoffset .6s ease' }}
                    />
                  </svg>
                  <div style={{ position: 'relative', zIndex: 1, fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>{workloadScore === 0 ? '—' : workloadScore}</div>
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>{scoreLabel}{compact && workloadScore > 0 ? ` — ${workloadScore}` : ''}</div>
                <div style={{ fontSize: 11, color: 'var(--mid)', fontWeight: 500, marginTop: 2 }}>
                  <svg width="13" height="13" viewBox="0 0 15 15" fill="none" style={{ display:'inline', verticalAlign:'middle', marginRight: 3 }}>
                    <path d="M7.5 13.5C5.01 13.5 3 11.49 3 9C3 6.5 5.5 4.5 5.5 2.5C5.5 2.5 6.5 4 7.5 4C8.5 4 9.5 2 9.5 2C9.5 2 12 4.5 12 7.5C12 10.8 10.07 13.5 7.5 13.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                  {streakDays}-day streak · {totalToday} tasks today
                </div>
              </div>
            </div>
            {!compact && <div style={{ fontSize: 18, color: 'var(--mid)', lineHeight: 1, transform: perfExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }}>⌄</div>}
          </div>

          {!compact && perfExpanded && (
            <div style={{ display: 'flex', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              {[['Workload', workloadScore === 0 ? '—' : workloadScore], ['Tasks', totalToday], ['Today', completedToday], ['Streak', streakDays]].map(([lbl, val], i) => (
                <div key={String(lbl)} style={{ display: 'flex', alignItems: 'stretch' }}>
                  {i > 0 && <div style={{ width: 1, background: 'var(--border)', margin: '4px 0', flexShrink: 0 }} />}
                  <div style={{ flex: 1, textAlign: 'center', padding: '0 8px' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark)' }}>{val}</div>
                    <div style={{ fontSize: 10, color: 'var(--mid)', marginTop: 2, fontWeight: 600 }}>{lbl}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render: Weekly Schedule ───────────────────────────────────────────
  function renderWeeklySchedule() {
    const compact = isCompact('weeklySchedule');
    return (
      <div key="weeklySchedule" style={S.widget}>
        <Link href="/calendar" style={{ ...S.card, display: 'block', textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>Weekly Schedule</div>
              {!compact && <div style={{ fontSize: 11, color: 'var(--mid)', fontWeight: 500, marginTop: 2 }}>{weekRange} · {weekItemCount} item{weekItemCount !== 1 ? 's' : ''}</div>}
            </div>
            <div style={{ color: 'var(--mid)', fontSize: 18 }}>→</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: compact ? 0 : 10 }}>
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              const isHot = (scheduleDayMap[d.toDateString()]?.length ?? 0) >= 4;
              const hasItems = !!scheduleDayMap[d.toDateString()];
              const dotColor = isHot ? ch.full : hasItems ? ch.c1 : 'transparent';
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: isToday ? 'var(--purple)' : 'var(--lite)' }}>{DAY_LABELS[i]}</div>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isToday ? 'var(--purple)' : 'transparent',
                    color: isToday ? '#fff' : isHot ? 'var(--coral)' : hasItems ? 'var(--dark)' : 'var(--mid)',
                    border: isHot && !isToday ? '1px solid var(--coral)' : '1px solid transparent',
                  }}>{d.getDate()}</div>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: dotColor }} />
                </div>
              );
            })}
          </div>
          {!compact && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--mid)', fontWeight: 500 }}>
                {weekItemCount > 0 ? `${weekItemCount} item${weekItemCount !== 1 ? 's' : ''} this week` : 'Nothing scheduled'}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple)' }}>Full view</span>
            </div>
          )}
        </Link>
      </div>
    );
  }

  // ── Render: Workload Balance ──────────────────────────────────────────
  function renderWorkloadBalance() {
    const compact = isCompact('workloadBalance');
    const heaviestIdx = weekWorkload.indexOf(Math.max(...weekWorkload));
    const heaviestLoad = weekWorkload[heaviestIdx];
    const isOverloaded = heaviestLoad >= 90;
    const insightMsg = heaviestIdx !== todayDow
      ? `${DAY_LABELS[heaviestIdx]}'s schedule looks heaviest — consider spreading tasks`
      : 'Today is your heaviest day — pace yourself';

    return (
      <div key="workloadBalance" style={S.widget}>
        <div style={{ ...S.card, cursor: 'pointer', padding: '15px 16px 13px' }} onClick={() => setWorkloadOpen(true)}>
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>Workload Balance</div>
              {!compact && <div style={{ fontSize: 11, color: 'var(--mid)', fontWeight: 500, marginTop: 3 }}>Week of {weekRange}</div>}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--purple)', background: 'var(--pur-lt)', borderRadius: 100, padding: '4px 9px', whiteSpace: 'nowrap', flexShrink: 0, border: '1px solid var(--purple)', opacity: .85 }}>
              Full view →
            </div>
          </div>

          {/* Legend — full mode only */}
          {!compact && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
              {[['Light (<30%)', ch.ok], ['OK (30–64%)', ch.mid], ['Busy (65–89%)', ch.warn], ['Full (≥90%)', ch.full]].map(([lbl, col]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 3, flexShrink: 0, background: col }} />
                  <span style={{ fontSize: 10, color: 'var(--mid)', fontWeight: 500 }}>{lbl}</span>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: compact ? 0 : 12 }}>
            {/* Value labels row — full only */}
            {!compact && (
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                <div style={{ width: 28, flexShrink: 0 }} />
                {weekDays.map((_, i) => {
                  const load = weekWorkload[i];
                  const barColor = load >= 90 ? ch.full : load >= 65 ? ch.warn : load >= 30 ? ch.mid : ch.ok;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap', color: load >= 65 ? barColor : 'var(--mid)' }}>
                        {load > 0 ? `${load}%` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bar area */}
            <div style={{ display: 'flex', height: compact ? 70 : 130, position: 'relative' }}>
              {!compact && (
                <div style={{ width: 28, flexShrink: 0, position: 'relative' }}>
                  {[100,75,50,25].map(pct => (
                    <div key={pct} style={{ position: 'absolute', right: 0, bottom: `${pct}%`, transform: 'translateY(50%)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 5 }}>
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--lite)', lineHeight: 1 }}>{pct}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ flex: 1, position: 'relative', borderLeft: compact ? 'none' : '1px solid var(--border2)', display: 'flex', alignItems: 'flex-end', padding: '0 4px', gap: 5 }}>
                {!compact && (
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {[100,75,50,25].map(pct => (
                      <div key={pct} style={{ position: 'absolute', left: 0, right: 0, bottom: `${pct}%`, height: 1, background: 'var(--border)', opacity: .5, transform: 'translateY(50%)' }} />
                    ))}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1.5, background: 'var(--border2)', opacity: .9 }} />
                  </div>
                )}
                {weekDays.map((d, i) => {
                  const load = weekWorkload[i];
                  const isToday = d.toDateString() === today.toDateString();
                  const barColor = load >= 90 ? ch.full : load >= 65 ? ch.warn : load >= 30 ? ch.mid : ch.ok;
                  return (
                    <div key={i} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{
                        width: '72%', borderRadius: '4px 4px 2px 2px', minHeight: 3,
                        height: `${Math.max(2, load)}%`,
                        background: isToday ? `linear-gradient(to top, ${barColor}, ${barColor}bb)` : barColor,
                        opacity: load < 5 ? 0.4 : 1,
                        boxShadow: isToday ? '0 0 10px rgba(139,124,246,.45)' : 'none',
                        transition: 'height .55s cubic-bezier(.4,0,.2,1)',
                      }} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day labels */}
            <div style={{ display: 'flex', alignItems: 'center', paddingTop: 5, borderTop: '1px solid var(--border)', marginTop: 0 }}>
              {!compact && <div style={{ width: 28, flexShrink: 0 }} />}
              {weekDays.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                const load = weekWorkload[i];
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1, color: isToday ? 'var(--purple)' : load >= 90 ? 'var(--coral)' : 'var(--lite)' }}>
                      {DAY_LABELS[i].slice(0, 2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insight pill — full mode only */}
          {!compact && (
            <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'flex-start', gap: 6,
                padding: '7px 10px', borderRadius: 10, width: '100%',
                background: isOverloaded ? `${ch.full}18` : `${ch.warn}18`,
                border: `1px solid ${isOverloaded ? `${ch.full}55` : `${ch.warn}55`}`,
                fontSize: 11, fontWeight: 600, lineHeight: 1.45,
              }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 4v3m0 2.5v.5" stroke={isOverloaded ? ch.full : ch.warn} strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                <span style={{ color: isOverloaded ? ch.full : ch.warn }}>{insightMsg}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render: Weekly Progress ───────────────────────────────────────────
  function renderAiPriorities() {
    const compact = isCompact('aiPriorities');
    // Week completion rate from weekSchedules
    const weekDone    = weekSchedules.filter((s: any) => s.is_completed).length;
    const weekTotal   = weekSchedules.length;
    const weekRate    = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;
    const rateColor   = weekRate >= 80 ? 'var(--mint,#2DD4BF)' : weekRate >= 50 ? 'var(--cyan,#00C6FF)' : 'var(--amber,#FDCB6E)';
    const rateLabel   = weekRate >= 80 ? 'On fire 🔥' : weekRate >= 50 ? 'Good pace' : weekTotal === 0 ? 'No data yet' : 'Keep going';
    return (
      <div key="aiPriorities" style={S.widget}>
        <Link href="/progress" style={{ ...S.card, display: 'block', textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: compact ? 0 : 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(45,212,191,.12)', border: '1px solid rgba(45,212,191,.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mint,#2DD4BF)', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <path d="M3 14l3.5-4 3.5 2.5 3.5-6 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 17h14M3 4v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>Weekly Progress</div>
            <div style={{ fontSize: 12, color: 'var(--mid)' }}>→</div>
          </div>
          {!compact && (
            <div>
              {/* Rate + streak row */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: 'rgba(45,212,191,.07)', border: '1px solid rgba(45,212,191,.15)', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: rateColor, letterSpacing: '-.4px' }}>{weekRate}%</div>
                  <div style={{ fontSize: 9, color: 'var(--mid)', fontWeight: 600, marginTop: 2 }}>THIS WEEK</div>
                </div>
                <div style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: 'rgba(124,106,240,.07)', border: '1px solid rgba(124,106,240,.15)', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--purple)', letterSpacing: '-.4px' }}>{streakDays}</div>
                  <div style={{ fontSize: 9, color: 'var(--mid)', fontWeight: 600, marginTop: 2 }}>DAY STREAK</div>
                </div>
                <div style={{ flex: 1, padding: '8px 10px', borderRadius: 10, background: 'rgba(0,198,255,.07)', border: '1px solid rgba(0,198,255,.15)', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--cyan,#00C6FF)', letterSpacing: '-.4px' }}>{weekDone}</div>
                  <div style={{ fontSize: 9, color: 'var(--mid)', fontWeight: 600, marginTop: 2 }}>DONE</div>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(45,212,191,.10)', overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${weekRate}%`, background: rateColor, transition: 'width .4s ease' }}/>
              </div>
              <div style={{ fontSize: 11, color: 'var(--mid)', fontWeight: 600 }}>{rateLabel} · {weekDone} of {weekTotal} tasks done</div>
            </div>
          )}
          {compact && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: rateColor }}>{weekRate}%</div>
              <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(45,212,191,.10)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${weekRate}%`, background: rateColor }}/>
              </div>
              <div style={{ fontSize: 11, color: 'var(--mid)', fontWeight: 600 }}>{streakDays}🔥</div>
            </div>
          )}
        </Link>
      </div>
    );
  }

  // ── Render: Upcoming Tasks ────────────────────────────────────────────
  function renderUpcomingTasks() {
    const compact = isCompact('upcomingTasks');
    const items = upcomingSchedules.slice(0, compact ? 2 : 4);
    return (
      <div key="upcomingTasks" style={S.widget}>
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark)' }}>Upcoming</div>
            <Link href="/calendar" style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple)', textDecoration: 'none' }}>See all →</Link>
          </div>
          {items.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--mid)', opacity: .7, textAlign: 'center', padding: '8px 0' }}>Nothing upcoming — you&apos;re all clear!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 8 }}>
              {items.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: PRIORITY_COLORS[s.priority] }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                    {!compact && <div style={{ fontSize: 10, color: 'var(--mid)', marginTop: 1 }}>{new Date(s.start_time).toLocaleDateString('en-US',{ month:'short', day:'numeric' })} · {formatTime(s.start_time)}</div>}
                  </div>
                  <div style={{
                    fontSize: 9, fontWeight: 700, flexShrink: 0, letterSpacing: '.3px',
                    color: s.priority === 'critical' || s.priority === 'high' ? ch.full : s.priority === 'medium' ? ch.warn : ch.ok,
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
    todayCard:       renderTodayCard,
    quickStats:      renderQuickStats,
    pinnedShortcuts: renderPinnedShortcuts,
    performanceCard: renderPerformanceCard,
    weeklySchedule:  renderWeeklySchedule,
    workloadBalance: renderWorkloadBalance,
    aiPriorities:    renderAiPriorities,
    upcomingTasks:   renderUpcomingTasks,
  };

  return (
    <div style={S.page}>
      {/* SVG gradient defs */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={ch.c1}/>
            <stop offset="100%" stopColor={ch.c2}/>
          </linearGradient>
        </defs>
      </svg>

      {/* Pulse dot keyframe */}
      <style>{`@keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.5)}}`}</style>

      {/* Header */}
      <div ref={hdrRef} style={S.hdr}>
        {/* Greeting text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: 'var(--dark)', letterSpacing: '-.3px', margin: 0, lineHeight: 1.2 }}>{GREETING()}, {firstName}</h2>
          {(profile?.designation || profile?.role_title) && (
            <p style={{ fontSize: 12, color: 'var(--purple)', marginTop: 2, fontWeight: 500, margin: '2px 0 0', lineHeight: 1 }}>{profile?.designation || profile?.role_title}</p>
          )}
        </div>
        {/* Avatar — 42px, centred next to text */}
        <Link href="/profile" style={{ width: 42, height: 42, minWidth: 42, flexShrink: 0, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', boxShadow: '0 2px 10px rgba(139,124,246,0.35)', marginLeft: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : (profile?.full_name?.[0]?.toUpperCase() ?? '?')
            }
          </div>
        </Link>
      </div>

      {/* Scroll body — maxHeight dynamically = viewport - measured header - nav bar */}
      <div style={{
        ...S.scrl,
        maxHeight: `calc(100dvh - ${hdrH}px - 64px - max(env(safe-area-inset-bottom, 0px), 20px))`,
      }}>
        {/* Inner content — collapses to card heights only.
            paddingBottom = small breathe gap above nav bar. */}
        <div style={{ paddingBottom: '16px' }}>
          {cardOrder.map(key => {
            if (!isVisible(key)) return null;
            const renderer = cardRenderers[key];
            return renderer ? renderer() : null;
          })}
        </div>
      </div>

      <AddScheduleSheet
        open={editSchedule !== null}
        onClose={() => { setEditSchedule(null); setRescheduleMinTime(undefined); }}
        selectedDate={editSchedule ? new Date(editSchedule.start_time) : new Date()}
        editSchedule={editSchedule ?? undefined}
        countryCode={profile?.country_code ?? 'US'}
        minTime={rescheduleMinTime}
        onSaved={() => { setEditSchedule(null); setRescheduleMinTime(undefined); router.refresh(); }}
      />

      <WorkloadSheet
        open={workloadOpen}
        onClose={() => setWorkloadOpen(false)}
        weekDays={weekDays}
        scheduleDayMap={scheduleDayMap}
        weekWorkload={weekWorkload}
        weekRange={weekRange}
        weekItemCount={weekItemCount}
        latestAnalysisSummary={latestAnalysis?.summary}
      />

      {inProgress && (
        <ActiveSessionSheet
          open={sessionOpen}
          onClose={() => setSessionOpen(false)}
          activeSchedule={inProgress}
          todaySchedules={todaySchedules}
          onMarkComplete={handleSessionMarkComplete}
          onTimeUp={handleSessionTimeUp}
          onReschedule={handleRescheduleFromPrompt}
        />
      )}

      {inProgress && (
        <TaskCompletionPrompt
          open={promptOpen && !inProgress.is_completed}
          schedule={inProgress}
          onMarkComplete={handleSessionMarkComplete}
          onReschedule={handleRescheduleFromPrompt}
          onMissedSkip={handleMissedSkip}
          onDismiss={() => {
            setPromptOpen(false);
            setPromptDismissedId(inProgress.id);
          }}
        />
      )}

      <ProgressDetailsSheet
        open={progressOpen}
        onClose={() => setProgressOpen(false)}
        todaySchedules={todaySchedules}
        weekSchedules={weekSchedules}
        streakDays={streakDays}
        workloadScore={workloadScore}
      />

      <BottomNav />
    </div>
  );
}
