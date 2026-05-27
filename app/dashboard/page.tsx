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

  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

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
  ]);

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
