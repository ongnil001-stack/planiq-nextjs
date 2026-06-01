import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CalendarClient from './CalendarClient';

export default async function CalendarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Pass empty initial schedules — CalendarClient does its own month fetch
  // plus a separate recurring-schedules fetch on every mount/navigation.
  return <CalendarClient initialSchedules={[]} />;
}
