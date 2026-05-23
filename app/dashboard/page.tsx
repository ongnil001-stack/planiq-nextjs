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
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

  const { data: todaySchedules } = await supabase
    .from('schedules')
    .select('*')
    .eq('user_id', user.id)
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay)
    .order('start_time');

  const { data: upcomingSchedules } = await supabase
    .from('schedules')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_completed', false)
    .gte('start_time', new Date().toISOString())
    .order('start_time')
    .limit(5);

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
      upcomingSchedules={upcomingSchedules ?? []}
      latestAnalysis={latestAnalysis}
    />
  );
}
