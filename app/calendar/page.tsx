import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CalendarClient from './CalendarClient';

export default async function CalendarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: schedules } = await supabase
    .from('schedules')
    .select('*')
    .eq('user_id', user.id)
    .gte('start_time', startOfMonth)
    .lte('start_time', endOfMonth)
    .order('start_time');

  return <CalendarClient initialSchedules={schedules ?? []} />;
}
