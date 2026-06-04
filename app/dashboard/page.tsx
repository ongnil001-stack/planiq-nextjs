import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchExpandedSchedules } from '@/lib/scheduleExpand';
import DashboardClient from './DashboardClient';

// 15-second cache: fresh enough for a task planner, avoids a full Supabase
// round-trip on every Home tap. Adding/completing tasks invalidates via router.refresh().
// After 15 s Next.js revalidates in the background (stale-while-revalidate).
export const revalidate = 15;

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = new Date();

  const startOfDay  = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay    = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
  const streakStart = new Date(today);
  streakStart.setDate(today.getDate() - 27);
  streakStart.setHours(0, 0, 0, 0);

  const dow = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dow);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Wide window: 28 days back (for streak) through 60 days ahead (for upcoming).
  // Recurring schedules are expanded into occurrences and per-occurrence
  // completion is applied, so every derived list below is recurrence-aware.
  // 30-day lookahead is enough for the dashboard widgets (was 60).
  // The calendar page handles longer-horizon data independently.
  const rangeEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30, 23, 59, 59, 999);
  const nowMs = Date.now();

  const [
    { data: profile },
    { data: latestAnalysis },
    allExpanded,
    { count: doneNonRecurring },
    { count: doneOccurrences },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),

    supabase.from('ai_analyses').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),

    fetchExpandedSchedules(supabase, user.id, streakStart, rangeEnd),

    // Total completed ever (for awards): non-recurring completed rows…
    supabase.from('schedules')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .is('recurrence_rule', null),

    // …plus per-occurrence completions (null count if table not yet migrated)
    supabase.from('schedule_completions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  const startOfDayD = new Date(startOfDay);
  const endOfDayD   = new Date(endOfDay);
  const inWindow = (iso: string, a: Date, b: Date) => {
    const t = new Date(iso).getTime();
    return t >= a.getTime() && t <= b.getTime();
  };

  const todaySchedules    = allExpanded.filter(s => inWindow(s.start_time, startOfDayD, endOfDayD));
  const weekSchedules     = allExpanded.filter(s => inWindow(s.start_time, startOfWeek, endOfWeek));
  const upcomingSchedules = allExpanded
    .filter(s => !s.is_completed && new Date(s.start_time).getTime() >= nowMs)
    .slice(0, 20);
  const overdueSchedules  = allExpanded
    .filter(s => !s.is_completed && new Date(s.start_time).getTime() < nowMs)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
    .slice(0, 15);

  const tasksDone = (doneNonRecurring ?? 0) + (doneOccurrences ?? 0);

  // ── Streak + focus wins from the last 28 days of (expanded) occurrences ──
  // Rule: walk backward from YESTERDAY first, then add today if today already has completions.
  const histSchedules = allExpanded.filter(s => inWindow(s.start_time, streakStart, endOfDayD));
  const completedDays = new Set(
    histSchedules.filter(s => s.is_completed).map(s => s.start_time.slice(0, 10))
  );
  let streakDays = 0;
  for (let i = 1; i <= 28; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (completedDays.has(d.toISOString().slice(0, 10))) streakDays++;
    else break;
  }
  const todayStr = today.toISOString().slice(0, 10);
  if (completedDays.has(todayStr)) streakDays++;

  const fwMap = new Map<string, { total: number; done: number }>();
  for (const s of histSchedules) {
    const d = s.start_time.slice(0, 10);
    const e = fwMap.get(d) ?? { total: 0, done: 0 };
    e.total++;
    if (s.is_completed) e.done++;
    fwMap.set(d, e);
  }
  const focusWins = Array.from(fwMap.values()).filter(e => e.total > 0 && e.done === e.total).length;

  return (
    <DashboardClient
      profile={profile}
      todaySchedules={todaySchedules ?? []}
      weekSchedules={weekSchedules ?? []}
      upcomingSchedules={upcomingSchedules ?? []}
      latestAnalysis={latestAnalysis}
      streakDays={streakDays}
      focusWins={focusWins}
      tasksDone={tasksDone ?? 0}
      overdueSchedules={overdueSchedules ?? []}
    />
  );
}
