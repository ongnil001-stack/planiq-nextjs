import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

// Cache this page for 30 s — subsequent visits within the window are instant.
// Next.js revalidates in the background so the data stays fresh.
export const revalidate = 30;

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

  // ── Run ALL queries in parallel — was sequential, saves ~300-500 ms ──
  const [
    { data: profile },
    { data: todaySchedules },
    { data: weekSchedules },
    { data: upcomingSchedules },
    { data: latestAnalysis },
    { data: streakSchedules },
    { count: tasksDone },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),

    supabase.from('schedules').select('*')
      .eq('user_id', user.id)
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)
      .order('start_time'),

    supabase.from('schedules').select('*')
      .eq('user_id', user.id)
      .gte('start_time', startOfWeek.toISOString())
      .lte('start_time', endOfWeek.toISOString())
      .order('start_time'),

    supabase.from('schedules').select('*')
      .eq('user_id', user.id)
      .eq('is_completed', false)
      .gte('start_time', new Date().toISOString())
      .order('start_time')
      .limit(20),

    supabase.from('ai_analyses').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),

    // 28-day history for streak computation — lightweight (only 2 columns)
    supabase.from('schedules')
      .select('start_time, is_completed')
      .eq('user_id', user.id)
      .gte('start_time', streakStart.toISOString())
      .lte('start_time', endOfDay)
      .order('start_time', { ascending: false }),

    // Total completed tasks ever — for awards count in quick stats
    supabase.from('schedules')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_completed', true),
  ]);

  // Compute streak server-side.
  // Rule: walk backward from YESTERDAY first, then add today if today already has completions.
  // This prevents today-in-progress (e.g. morning with no tasks done yet) from zeroing a real streak.
  const completedDays = new Set(
    (streakSchedules ?? [])
      .filter((s: { is_completed: boolean }) => s.is_completed)
      .map((s: { start_time: string }) => s.start_time.slice(0, 10))
  );
  let streakDays = 0;
  // Walk from yesterday backward
  for (let i = 1; i <= 28; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (completedDays.has(dateStr)) streakDays++;
    else break;
  }
  // Only count today if you've already completed at least one task today
  const todayStr = today.toISOString().slice(0, 10);
  if (completedDays.has(todayStr)) streakDays++;

  // Focus wins: days in last 28 where every planned task was completed
  const fwMap = new Map<string, { total: number; done: number }>();
  for (const s of streakSchedules ?? []) {
    const d = (s as { start_time: string; is_completed: boolean }).start_time.slice(0, 10);
    const e = fwMap.get(d) ?? { total: 0, done: 0 };
    e.total++;
    if ((s as { is_completed: boolean }).is_completed) e.done++;
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
    />
  );
}
