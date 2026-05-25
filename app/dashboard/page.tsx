import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const today = new Date();

  // ── Today's schedules — focus bar + progress ring ──
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

  const { data: todaySchedules } = await supabase
    .from('schedules')
    .select('*')
    .eq('user_id', user.id)
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay)
    .order('start_time');

  // ── Full current week (Sun → Sat) — Weekly Schedule widget ──
  const dow         = today.getDay(); // 0 = Sun
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dow);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const { data: weekSchedules } = await supabase
    .from('schedules')
    .select('*')
    .eq('user_id', user.id)
    .gte('start_time', startOfWeek.toISOString())
    .lte('start_time', endOfWeek.toISOString())
    .order('start_time');

  // ── Upcoming incomplete items — insight text + count badge ──
  const { data: upcomingSchedules } = await supabase
    .from('schedules')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_completed', false)
    .gte('start_time', new Date().toISOString())
    .order('start_time')
    .limit(20);

  const { data: latestAnalysis } = await supabase
    .from('ai_analyses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return (
    <DashboardClient
      profile={profile}
      todaySchedules={todaySchedules ?? []}
      weekSchedules={weekSchedules ?? []}
      upcomingSchedules={upcomingSchedules ?? []}
      latestAnalysis={latestAnalysis}
    />
  );
}
