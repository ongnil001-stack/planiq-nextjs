'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/layout/BottomNav';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
    toast.success('Signed out.');
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() ?? '?';

  return (
    <div className="page">
      <div className="pg-header">
        <h1 className="pg-title">Profile</h1>
      </div>

      {!loading && (
        <div className="content">
          {/* Avatar */}
          <div className="avatar-wrap">
            <div className="avatar">{initials}</div>
            <p className="display-name">{profile?.full_name || 'User'}</p>
            <p className="display-email">{user?.email}</p>
          </div>

          {/* Info cards */}
          <div className="info-card">
            <p className="info-label">Account</p>
            <div className="info-row">
              <span className="info-key">Email</span>
              <span className="info-val">{user?.email}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Member since</span>
              <span className="info-val">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Version</span>
              <span className="info-val">{process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0-early-access'}</span>
            </div>
          </div>

          {/* Sign out */}
          <button className="signout-btn" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      )}

      <BottomNav />

      <style jsx>{`
        .page { min-height: 100vh; background: var(--bg); display: flex; flex-direction: column; }
        .pg-header { padding: 52px 20px 16px; background: var(--surf); border-bottom: 1px solid var(--border); }
        .pg-title { font-size: 22px; font-weight: 800; color: var(--dark); }
        .content { flex: 1; padding: 24px 18px 100px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .avatar-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 20px 0; }
        .avatar { width: 80px; height: 80px; border-radius: 50%; background: var(--gradient); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #fff; box-shadow: 0 8px 24px rgba(108,92,231,.35); }
        .display-name { font-size: 20px; font-weight: 800; color: var(--dark); }
        .display-email { font-size: 13px; color: var(--mid); }
        .info-card { width: 100%; background: var(--surf); border-radius: 20px; padding: 20px; box-shadow: var(--card-sh2); }
        .info-label { font-size: 11px; font-weight: 700; color: var(--lite); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }
        .info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .info-row:last-child { border-bottom: none; }
        .info-key { font-size: 14px; color: var(--mid); font-weight: 500; }
        .info-val { font-size: 14px; color: var(--dark); font-weight: 600; }
        .signout-btn { width: 100%; padding: 15px; background: var(--coral-lt); border: 1.5px solid var(--coral); border-radius: 14px; color: var(--coral); font-size: 15px; font-weight: 700; font-family: inherit; cursor: pointer; transition: background .18s; }
        .signout-btn:active { background: rgba(255,107,138,.2); }
      `}</style>
    </div>
  );
}
