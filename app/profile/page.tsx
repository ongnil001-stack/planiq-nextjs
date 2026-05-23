'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/layout/BottomNav';

const THEMES = [
  { id: 'soft',     name: 'Soft Professional', desc: 'Calm & elegant',    tag: 'LIGHT',  bg: '#F5F7FF', pri: '#6C5CE7', acc: '#A78BFA' },
  { id: 'dark',     name: 'Dark & Serious',     desc: 'Deep & focused',   tag: 'DARK',   bg: '#060610', pri: '#7B6CF6', acc: '#5AABF0' },
  { id: 'colorful', name: 'Colorful Pro',        desc: 'Vibrant & energetic', tag: 'BRIGHT', bg: '#EEF0FF', pri: '#E8445A', acc: '#FF8C42' },
  { id: 'minimal',  name: 'Minimal Executive',   desc: 'Premium & refined',   tag: 'GOLD',   bg: '#F8F8FA', pri: '#1A1A2E', acc: '#C9A96E' },
  { id: 'pixel',    name: 'Playful Pixel',        desc: 'Fun & organized',     tag: 'PIXEL',  bg: '#1A2432', pri: '#56C26A', acc: '#F0C040' },
  { id: 'lady',     name: 'Lady Professional',    desc: 'Stylish & modern',    tag: 'ROSE',   bg: '#FDF5F8', pri: '#D4608A', acc: '#9B72CF' },
];

const ACHIEVEMENTS = [
  { label: '7-Day Streak',  earned: true  },
  { label: 'Speed Runner',  earned: true  },
  { label: '100 Tasks',     earned: true  },
  { label: 'AI Listener',   earned: true  },
  { label: '30-Day King',   earned: false },
  { label: 'Score 95+',     earned: false },
  { label: 'Balance Pro',   earned: false },
  { label: '500 Tasks',     earned: false },
];

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser]       = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTheme, setActiveTheme] = useState('dark');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
      setLoading(false);
    }
    load();
    const saved = localStorage.getItem('planiq_theme');
    if (saved) setActiveTheme(saved);
  }, []);

  function applyTheme(id: string) {
    setActiveTheme(id);
    localStorage.setItem('planiq_theme', id);
    toast.success(`Theme applied: ${THEMES.find(t => t.id === id)?.name}`);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
    toast.success('Signed out.');
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

  if (loading) return <div style={{ minHeight:'100vh', background:'#0B0D1A' }} />;

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="prof-hdr">
        <div className="prof-av">{initials}</div>
        <div className="prof-name">{profile?.full_name || 'User'}</div>
        <div className="prof-email">{user?.email}</div>

        {/* Stats row — V3 exact */}
        <div className="prof-stats">
          <div className="ps">
            <div className="ps-v">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 13.5C5.01 13.5 3 11.49 3 9C3 6.5 5.5 4.5 5.5 2.5C5.5 2.5 6.5 4 7.5 4C8.5 4 9.5 2 9.5 2C9.5 2 12 4.5 12 7.5C12 10.8 10.07 13.5 7.5 13.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M7.5 13.5C6.5 13.5 5.5 12.5 5.5 11C5.5 9.5 7.5 8.5 7.5 7C7.5 7 9.5 9 9.5 11C9.5 12.5 8.5 13.5 7.5 13.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
              <span>8</span>
            </div>
            <div className="ps-l">Streak</div>
          </div>
          <div className="ps">
            <div className="ps-v">142</div>
            <div className="ps-l">Tasks Done</div>
          </div>
          <div className="ps">
            <div className="ps-v">78%</div>
            <div className="ps-l">Avg Score</div>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="prof-body">

        {/* ── APPEARANCE ── */}
        <div className="sh">
          <div className="sh-t">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 2C4.46 2 2 4.46 2 7.5C2 10.54 4.46 13 7.5 13H8.5C9.05 13 9.5 12.55 9.5 12C9.5 11.72 9.4 11.47 9.22 11.28C9.04 11.09 8.94 10.84 8.94 10.57C8.94 10.01 9.39 9.57 9.94 9.57H11C12.1 9.57 13 8.67 13 7.57C13 4.51 10.54 2 7.5 2Z" stroke="currentColor" strokeWidth="1.4"/>
              <circle cx="5" cy="7.5" r="0.8" fill="currentColor"/>
              <circle cx="6.5" cy="5" r="0.8" fill="currentColor"/>
              <circle cx="9" cy="5" r="0.8" fill="currentColor"/>
              <circle cx="10.5" cy="7.5" r="0.8" fill="currentColor"/>
            </svg>
            Appearance
          </div>
        </div>
        <div className="theme-grid">
          {THEMES.map(t => (
            <button key={t.id} className={`th-card${activeTheme === t.id ? ' active' : ''}`} onClick={() => applyTheme(t.id)}>
              <div className="th-preview">
                <div className="th-p-bg"  style={{ background: t.bg }} />
                <div className="th-p-pri" style={{ background: t.pri }} />
                <div className="th-p-acc" style={{ background: t.acc }} />
              </div>
              <div className="th-name">{t.name}</div>
              <div className="th-desc">{t.desc}</div>
              <div className="th-card-foot">
                <span className="th-tag">{t.tag}</span>
                {activeTheme === t.id && (
                  <span className="th-check">
                    <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                      <polyline points="1,5 5,9 12,1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* ── ACHIEVEMENTS ── */}
        <div className="sh"><div className="sh-t">Achievements</div></div>
        <div className="badges-grid">
          {ACHIEVEMENTS.map(a => (
            <div key={a.label} className={`badge-item${a.earned ? ' lit' : ' dim'}`}>
              <div className="badge-ico">
                {a.earned ? '🏅' : '🔒'}
              </div>
              <div className="badge-lbl">{a.label}</div>
            </div>
          ))}
        </div>

        {/* ── ACCOUNT ── */}
        <div className="sh" style={{ marginTop: 4 }}><div className="sh-t">Account</div></div>
        <div className="info-card">
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
          <div className="info-row" style={{ border: 'none' }}>
            <span className="info-key">Version</span>
            <span className="info-val">{process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0-early-access'}</span>
          </div>
        </div>

        {/* ── Sign out ── */}
        <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>

        <div style={{ height: 32 }} />
      </div>

      <BottomNav />

      <style jsx>{`
        /* ── Page ── */
        .page { min-height:100vh; background:#0B0D1A; display:flex; flex-direction:column; font-family:'Sora',sans-serif; color:#fff; }

        /* ── Header ── */
        .prof-hdr {
          background:#161829; padding:52px 22px 18px;
          text-align:center; flex-shrink:0;
          border-bottom:1px solid rgba(255,255,255,0.07);
        }
        .prof-av {
          width:74px; height:74px;
          background:linear-gradient(135deg,#6C5CE7,#A78BFA);
          border-radius:22px;
          display:flex; align-items:center; justify-content:center;
          font-size:30px; font-weight:700; color:#fff;
          margin:0 auto 12px;
          box-shadow:0 8px 24px rgba(108,92,231,.45);
        }
        .prof-name  { font-size:20px; font-weight:700; color:#fff; letter-spacing:-.3px; }
        .prof-email { font-size:12px; color:rgba(255,255,255,.42); margin-top:3px; }

        /* Stats row — V3 exact */
        .prof-stats {
          display:flex; gap:0;
          background:rgba(255,255,255,0.05);
          border-radius:14px; overflow:hidden;
          margin-top:14px;
          border:1px solid rgba(255,255,255,0.08);
        }
        .ps { flex:1; padding:12px 6px; text-align:center; }
        .ps:not(:last-child) { border-right:1px solid rgba(255,255,255,0.08); }
        .ps-v {
          font-size:17px; font-weight:700; color:#fff;
          display:flex; align-items:center; justify-content:center; gap:4px;
        }
        .ps-l { font-size:10px; color:rgba(255,255,255,.42); margin-top:2px; font-weight:500; text-transform:uppercase; letter-spacing:.4px; }

        /* ── Body ── */
        .prof-body { flex:1; overflow-y:auto; padding:14px 18px 90px; }

        /* Section header */
        .sh { margin-bottom:10px; }
        .sh-t { font-size:12px; font-weight:700; color:rgba(255,255,255,.35); text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:6px; }

        /* ── Theme grid — V3 exact ── */
        .theme-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px; }
        .th-card {
          background:#1E2038;
          border:1.5px solid rgba(255,255,255,0.08);
          border-radius:14px; padding:12px;
          cursor:pointer; text-align:left;
          display:flex; flex-direction:column; gap:8px;
          transition:border-color .18s, box-shadow .18s;
          font-family:inherit;
        }
        .th-card.active { border-color:#7C6AF0; box-shadow:0 0 0 1px #7C6AF0; }
        .th-card:active { opacity:.85; }
        .th-preview { height:36px; border-radius:8px; overflow:hidden; display:grid; grid-template-columns:2fr 1fr 1fr; }
        .th-p-bg, .th-p-pri, .th-p-acc { height:100%; }
        .th-name { font-size:12px; font-weight:800; color:#fff; }
        .th-desc { font-size:10px; color:rgba(255,255,255,.42); margin-top:1px; }
        .th-card-foot { display:flex; align-items:center; justify-content:space-between; margin-top:2px; }
        .th-tag  { font-size:9px; color:rgba(255,255,255,.3); font-weight:600; letter-spacing:.5px; }
        .th-check { color:#7C6AF0; display:flex; align-items:center; }

        /* ── Achievement badges ── */
        .badges-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:20px; }
        .badge-item { text-align:center; padding:12px 4px; background:#1E2038; border-radius:12px; border:1px solid rgba(255,255,255,0.07); }
        .badge-ico  { font-size:20px; margin-bottom:5px; }
        .badge-lbl  { font-size:9px; color:rgba(255,255,255,.3); font-weight:600; letter-spacing:.3px; }
        .badge-item.lit { background:rgba(251,191,36,.1); border-color:rgba(251,191,36,.2); }
        .badge-item.lit .badge-lbl { color:rgba(251,191,36,.8); }
        .badge-item.dim { opacity:.35; }

        /* ── Account card ── */
        .info-card { background:#1E2038; border-radius:16px; padding:4px 16px; margin-bottom:16px; border:1px solid rgba(255,255,255,0.07); }
        .info-row { display:flex; justify-content:space-between; align-items:center; padding:11px 0; border-bottom:1px solid rgba(255,255,255,0.06); }
        .info-key { font-size:14px; color:rgba(255,255,255,.45); font-weight:500; }
        .info-val { font-size:13px; color:#fff; font-weight:600; text-align:right; max-width:55%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        /* ── Sign out ── */
        .signout-btn {
          width:100%; padding:15px;
          background:rgba(255,107,138,0.10);
          border:1.5px solid rgba(255,107,138,0.35);
          border-radius:14px; color:#FF6B8A;
          font-size:15px; font-weight:700;
          font-family:inherit; cursor:pointer;
          transition:background .18s;
        }
        .signout-btn:active { background:rgba(255,107,138,0.18); }
      `}</style>
    </div>
  );
}
