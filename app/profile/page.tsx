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
      {/* Header */}
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
            <div className="ea-badge">✦ Early Access</div>
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
        .page { min-height: 100vh; background: #0B0D1A; display: flex; flex-direction: column; font-family: 'Sora', sans-serif; color: #fff; }
        .pg-header { padding: 52px 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .pg-title { font-size: 22px; font-weight: 800; color: #fff; }
        .content { flex: 1; padding: 24px 18px 100px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .avatar-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 20px 0; }
        .avatar { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg,#6C5CE7,#A78BFA); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #fff; box-shadow: 0 8px 24px rgba(108,92,231,.4); }
        .display-name { font-size: 20px; font-weight: 800; color: #fff; }
        .display-email { font-size: 13px; color: rgba(255,255,255,0.45); }
        .ea-badge { margin-top: 4px; padding: 4px 14px; background: rgba(124,106,240,0.18); border: 1px solid rgba(124,106,240,0.35); border-radius: 100px; font-size: 11px; font-weight: 700; color: #A78BFA; }
        .info-card { width: 100%; background: #161829; border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.07); }
        .info-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }
        .info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .info-row:last-child { border-bottom: none; }
        .info-key { font-size: 14px; color: rgba(255,255,255,0.45); font-weight: 500; }
        .info-val { font-size: 14px; color: #fff; font-weight: 600; }
        .signout-btn { width: 100%; padding: 15px; background: rgba(255,107,138,0.12); border: 1.5px solid rgba(255,107,138,0.4); border-radius: 14px; color: #FF6B8A; font-size: 15px; font-weight: 700; font-family: inherit; cursor: pointer; transition: background .18s; }
        .signout-btn:active { background: rgba(255,107,138,0.2); }
      `}</style>
    </div>
  );
}
