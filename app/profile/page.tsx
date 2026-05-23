'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/layout/BottomNav';
import { THEME_META, THEME_IDS, ThemeId, getSavedTheme, saveTheme, applyThemeToBody } from '@/lib/theme';

const THEMES = THEME_IDS.map(id => ({ id, ...THEME_META[id] }));

const ACHIEVEMENTS = [
  { label: '7-Day Streak', earned: true  },
  { label: 'Speed Runner', earned: true  },
  { label: '100 Tasks',    earned: true  },
  { label: 'AI Listener',  earned: true  },
  { label: '30-Day King',  earned: false },
  { label: 'Score 95+',    earned: false },
  { label: 'Balance Pro',  earned: false },
  { label: '500 Tasks',    earned: false },
];

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser]         = useState<any>(null);
  const [profile, setProfile]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [activeTheme, setActiveTheme] = useState<ThemeId>('focused');

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
    setActiveTheme(getSavedTheme());
  }, []);

  function handleApplyTheme(id: ThemeId) {
    setActiveTheme(id);
    saveTheme(id);
    applyThemeToBody(id);
    toast.success(`Theme: ${THEME_META[id].name}`);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
    toast.success('Signed out.');
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

  if (loading) return <div style={{ minHeight:'100vh', background:'var(--bg,#0F0E17)' }} />;

  return (
    <div className="prof-wrap">

      {/* ── Header ── */}
      <div className="prof-hdr">
        <div className="prof-av">{initials}</div>
        <div className="prof-name">{profile?.full_name || 'User'}</div>
        <div className="prof-email">{user?.email}</div>

        {/* Stats row */}
        <div className="prof-stats">
          <div className="ps">
            <div className="ps-v">
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
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

        {/* APPEARANCE */}
        <div className="sh"><div className="sh-t">
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 2C4.46 2 2 4.46 2 7.5C2 10.54 4.46 13 7.5 13H8.5C9.05 13 9.5 12.55 9.5 12C9.5 11.72 9.4 11.47 9.22 11.28C9.04 11.09 8.94 10.84 8.94 10.57C8.94 10.01 9.39 9.57 9.94 9.57H11C12.1 9.57 13 8.67 13 7.57C13 4.51 10.54 2 7.5 2Z" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="5" cy="7.5" r="0.8" fill="currentColor"/>
            <circle cx="6.5" cy="5" r="0.8" fill="currentColor"/>
            <circle cx="9" cy="5" r="0.8" fill="currentColor"/>
            <circle cx="10.5" cy="7.5" r="0.8" fill="currentColor"/>
          </svg>
          Appearance
        </div></div>

        <div className="theme-grid">
          {THEMES.map(t => (
            <button
              key={t.id}
              className={`th-card${activeTheme === t.id ? ' active' : ''}`}
              onClick={() => handleApplyTheme(t.id as ThemeId)}
            >
              <div className="th-preview">
                <div className="th-p-bg"  style={{ background: t.bg  }} />
                <div className="th-p-pri" style={{ background: t.pri }} />
                <div className="th-p-acc" style={{ background: t.acc }} />
              </div>
              <div className="th-name">{t.name}</div>
              <div className="th-desc">{t.desc}</div>
              <div className="th-card-foot">
                <span className="th-tag">{t.tag}</span>
                {activeTheme === t.id && (
                  <span className="th-check">
                    <svg width="12" height="10" viewBox="0 0 13 10" fill="none">
                      <polyline points="1,5 5,9 12,1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* ACHIEVEMENTS */}
        <div className="sh"><div className="sh-t">Achievements</div></div>
        <div className="badges-grid">
          {ACHIEVEMENTS.map(a => (
            <div key={a.label} className={`badge-item${a.earned ? ' lit' : ' dim'}`}>
              <div className="badge-ico">{a.earned ? '🏅' : '🔒'}</div>
              <div className="badge-lbl">{a.label}</div>
            </div>
          ))}
        </div>

        {/* ACCOUNT */}
        <div className="sh" style={{ marginTop: 4 }}><div className="sh-t">Account</div></div>
        <div className="info-card">
          <div className="info-row">
            <span className="info-key">Email</span>
            <span className="info-val">{user?.email}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Member since</span>
            <span className="info-val">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : '—'}
            </span>
          </div>
          <div className="info-row" style={{ borderBottom: 'none' }}>
            <span className="info-key">Version</span>
            <span className="info-val">{process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0-early-access'}</span>
          </div>
        </div>

        <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>
        <div style={{ height: 32 }} />
      </div>

      <BottomNav />

      <style jsx>{`
        /* ── Wrapper — uses CSS vars so all themes apply ── */
        .prof-wrap {
          min-height: 100vh;
          background: var(--bg);
          display: flex;
          flex-direction: column;
          font-family: inherit;
          color: var(--dark);
        }

        /* ── Header ── */
        .prof-hdr {
          background: var(--surf);
          padding: 52px 22px 18px;
          text-align: center;
          flex-shrink: 0;
          border-bottom: 1px solid var(--border);
        }
        .prof-av {
          width: 74px; height: 74px;
          background: var(--gradient);
          border-radius: 22px;
          display: flex; align-items: center; justify-content: center;
          font-size: 30px; font-weight: 700; color: #fff;
          margin: 0 auto 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,.25);
        }
        .prof-name  { font-size: 20px; font-weight: 700; color: var(--dark); letter-spacing: -.3px; }
        .prof-email { font-size: 12px; color: var(--mid); margin-top: 3px; }

        /* Stats */
        .prof-stats {
          display: flex;
          background: var(--surf2);
          border-radius: 14px; overflow: hidden;
          margin-top: 14px;
          border: 1px solid var(--border);
        }
        .ps { flex: 1; padding: 12px 6px; text-align: center; }
        .ps:not(:last-child) { border-right: 1px solid var(--border); }
        .ps-v {
          font-size: 17px; font-weight: 700; color: var(--dark);
          display: flex; align-items: center; justify-content: center; gap: 4px;
        }
        .ps-l {
          font-size: 10px; color: var(--mid); margin-top: 2px;
          font-weight: 500; text-transform: uppercase; letter-spacing: .4px;
        }

        /* Body */
        .prof-body { flex: 1; overflow-y: auto; padding: 14px 18px 90px; }

        /* Section header */
        .sh { margin-bottom: 10px; margin-top: 16px; }
        .sh-t {
          font-size: 12px; font-weight: 700; color: var(--mid);
          text-transform: uppercase; letter-spacing: 1px;
          display: flex; align-items: center; gap: 6px;
        }

        /* Theme grid */
        .theme-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .th-card {
          background: var(--surf);
          border: 1.5px solid var(--border);
          border-radius: var(--rmd);
          padding: 12px;
          cursor: pointer; text-align: left;
          display: flex; flex-direction: column; gap: 8px;
          transition: border-color .18s, box-shadow .18s, background .18s;
          font-family: inherit;
          color: var(--dark);
        }
        .th-card:hover    { border-color: var(--border2); background: var(--surf2); }
        .th-card.active   { border-color: var(--purple); box-shadow: 0 0 0 1px var(--purple); }
        .th-card:active   { opacity: .88; }
        .th-preview {
          height: 36px; border-radius: 8px; overflow: hidden;
          display: grid; grid-template-columns: 2fr 1fr 1fr;
        }
        .th-p-bg, .th-p-pri, .th-p-acc { height: 100%; }
        .th-name  { font-size: 12px; font-weight: 800; color: var(--dark); }
        .th-desc  { font-size: 10px; color: var(--mid); margin-top: 1px; }
        .th-card-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 2px; }
        .th-tag   { font-size: 9px; color: var(--lite); font-weight: 600; letter-spacing: .5px; }
        .th-check { color: var(--purple); display: flex; align-items: center; }

        /* Achievements */
        .badges-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 20px; }
        .badge-item {
          text-align: center; padding: 12px 4px;
          background: var(--surf); border-radius: var(--rsm);
          border: 1px solid var(--border);
          transition: background .2s, border-color .2s;
        }
        .badge-ico  { font-size: 20px; margin-bottom: 5px; }
        .badge-lbl  { font-size: 9px; color: var(--mid); font-weight: 600; letter-spacing: .3px; }
        .badge-item.lit {
          background: var(--amber-lt, rgba(251,191,36,.1));
          border-color: var(--amber, rgba(251,191,36,.2));
        }
        .badge-item.lit .badge-lbl { color: var(--amber, rgba(251,191,36,.8)); }
        .badge-item.dim { opacity: .35; }

        /* Account */
        .info-card {
          background: var(--surf); border-radius: 16px;
          padding: 4px 16px; margin-bottom: 16px;
          border: 1px solid var(--border);
        }
        .info-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 11px 0;
          border-bottom: 1px solid var(--border);
        }
        .info-key { font-size: 14px; color: var(--mid); font-weight: 500; }
        .info-val {
          font-size: 13px; color: var(--dark); font-weight: 600;
          text-align: right; max-width: 55%;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        /* Sign out */
        .signout-btn {
          width: 100%; padding: 15px;
          background: var(--coral-lt, rgba(255,107,138,.10));
          border: 1.5px solid var(--coral, rgba(255,107,138,.35));
          border-radius: 14px; color: var(--coral, #FF6B8A);
          font-size: 15px; font-weight: 700;
          font-family: inherit; cursor: pointer;
          transition: background .18s;
        }
        .signout-btn:active { opacity: .85; }
      `}</style>
    </div>
  );
}
