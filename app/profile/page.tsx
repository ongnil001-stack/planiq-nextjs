import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileClient from './ProfileClient';

// 30-second cache: profile edits are infrequent. Saves a Supabase round-trip
// on most Profile taps. router.refresh() is called after any profile mutation.
export const revalidate = 30;

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const today = new Date();
  const streakStart = new Date(today);
  streakStart.setDate(today.getDate() - 27);
  streakStart.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const [
    { data: profile },
    { count: tasksDone },
    { data: recentSchedules },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),

    // Total completed tasks ever
    supabase.from('schedules')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_completed', true),

    // Last 28 days — for streak + avg completion rate
    supabase.from('schedules')
      .select('start_time, is_completed')
      .eq('user_id', user.id)
      .gte('start_time', streakStart.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time', { ascending: false }),
  ]);

  // ── Streak: consecutive days with ≥1 completed task ──
  // Walk from YESTERDAY backward, then add today only if today already has completions.
  // Avoids zeroing a real streak just because it's morning and no tasks are done yet.
  const completedDays = new Set(
    (recentSchedules ?? [])
      .filter((s: { is_completed: boolean }) => s.is_completed)
      .map((s: { start_time: string }) => s.start_time.slice(0, 10))
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

  // ── Avg completion rate: done/planned over last 28 days ──
  const planned28 = (recentSchedules ?? []).length;
  const done28    = (recentSchedules ?? []).filter((s: { is_completed: boolean }) => s.is_completed).length;
  const avgScore  = planned28 > 0 ? Math.round((done28 / planned28) * 100) : null;

  // Focus wins: days in last 28 where EVERY planned task was completed
  const dayMap = new Map<string, { total: number; done: number }>();
  for (const s of recentSchedules ?? []) {
    const d = (s as { start_time: string; is_completed: boolean }).start_time.slice(0, 10);
    const e = dayMap.get(d) ?? { total: 0, done: 0 };
    e.total++;
    if ((s as { is_completed: boolean }).is_completed) e.done++;
    dayMap.set(d, e);
  }
  const focusWins = Array.from(dayMap.values()).filter(e => e.total > 0 && e.done === e.total).length;

  return (
    <ProfileClient
      initialUser={{ id: user.id, email: user.email, ...user }}
      initialProfile={profile}
      streakDays={streakDays}
      tasksDone={tasksDone ?? 0}
      avgScore={avgScore}
      focusWins={focusWins}
    />
  );
}
