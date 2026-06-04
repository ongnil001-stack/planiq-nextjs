import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CalendarClient from './CalendarClient';

// 60s cache: only passes empty schedules to client — the auth check is
// the only server work here.
export const revalidate = 60;

export default async function CalendarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Pass empty initial schedules — CalendarClient does its own month fetch
  // plus a separate recurring-schedules fetch on every mount/navigation.
  return <CalendarClient initialSchedules={[]} />;
}
