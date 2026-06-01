import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CalendarClient from './CalendarClient';

export default async function CalendarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Pass empty initial schedules — the CalendarClient fetches the correct
  // month's data client-side on every mount and month navigation.
  // Previously this pre-loaded only the current month, causing future-month
  // activities to disappear when the user navigated away and returned.
  return <CalendarClient initialSchedules={[]} />;
}
