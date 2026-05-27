import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileClient from './ProfileClient';

// Cache profile for 60 s — profile data changes rarely
export const revalidate = 60;

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Pass pre-fetched data as props → ProfileClient initialises state
  // immediately without any useEffect round-trips
  return (
    <ProfileClient
      initialUser={{ id: user.id, email: user.email, ...user }}
      initialProfile={profile}
    />
  );
}
