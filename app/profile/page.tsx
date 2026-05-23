'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { uploadAvatar } from '@/lib/avatar';
import BottomNav from '@/components/layout/BottomNav';
import { THEME_META, THEME_IDS, ThemeId, getSavedTheme, saveTheme, applyThemeToBody } from '@/lib/theme';
import { COUNTRIES } from '@/lib/countries';
import s from './profile.module.css';

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

const DESIGNATION_SUGGESTIONS = [
  'Finance Officer','AP Specialist','AR Specialist','CFO',
  'Project Planner','Operations Manager','Team Lead',
  'Software Engineer','Product Manager','Data Analyst',
  'HR Manager','Marketing Lead','Business Analyst',
];

export default function ProfilePage() {
  const router   = useRouter();
  const supabase = createClient();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [user,        setUser]        = useState<any>(null);
  const [profile,     setProfile]     = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [activeTheme, setActiveTheme] = useState<ThemeId>('focused');
  const [editing,     setEditing]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [editName,    setEditName]    = useState('');
  const [editDesig,   setEditDesig]   = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editAvatar,  setEditAvatar]  = useState<File | null>(null);
  const [previewUrl,  setPreviewUrl]  = useState<string | null>(null);
  const [showSugg,    setShowSugg]    = useState(false);
  const [emailVisible,setEmailVisible]= useState(false);
  const [themeFlash,  setThemeFlash]  = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEmailVisible(localStorage.getItem('planiq_email_visible') === 'true');
    }
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

  function openEdit() {
    setEditName(profile?.full_name ?? '');
    setEditDesig(profile?.designation ?? '');
    setEditCountry(profile?.country_code ?? '');
    setPreviewUrl(null); setEditAvatar(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false); setShowSugg(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null); setEditAvatar(null);
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB.'); return; }
    setEditAvatar(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!user) return;
    if (!editName.trim()) { toast.error('Name cannot be empty.'); return; }
    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url ?? null;
      if (editAvatar) avatarUrl = await uploadAvatar(user.id, editAvatar);
      const updates: Record<string, any> = {
        full_name: editName.trim(), designation: editDesig.trim() || null,
        country_code: editCountry || null, avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      setProfile((p: any) => ({ ...p, ...updates }));
      setEditing(false); setShowSugg(false);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null); setEditAvatar(null);
      toast.success('Profile updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save.');
    } finally { setSaving(false); }
  }

  function handleApplyTheme(id: ThemeId) {
    setActiveTheme(id); saveTheme(id); applyThemeToBody(id);
    // Clear any existing flash timer before showing new one
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setThemeFlash(THEME_META[id].name);
    flashTimer.current = setTimeout(() => setThemeFlash(null), 1800);
  }

  async function handleSignOut() {
    await supabase.auth.signOut(); router.push('/'); toast.success('Signed out.');
  }

  function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const dots = '•'.repeat(Math.min(local.length - 1, 8));
    const parts = domain.split('.');
    const tld = parts.pop();
    return `${local[0]}${dots}@${parts.join('.')[0]}•••.${tld}`;
  }

  function toggleEmail() {
    const next = !emailVisible;
    setEmailVisible(next);
    localStorage.setItem('planiq_email_visible', String(next));
  }

  const avatarSrc    = previewUrl || profile?.avatar_url || null;
  const initials     = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';
  const displayEmail = emailVisible ? (user?.email ?? '') : maskEmail(user?.email ?? '');
  const countryInfo  = COUNTRIES.find(c => c.code === profile?.country_code);

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--bg,#0F0E17)' }} />;

  const EyeOpen = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
  const EyeOff = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M17.94 17.94C16.23 19.24 14.17 20 12 20C5 20 1 12 1 12C2.24 9.82 3.96 7.95 6 6.54M9.9 4.24C10.59 4.08 11.29 4 12 4C19 4 23 12 23 12C22.45 12.94 21.8 13.82 21.07 14.61M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  return (
    <div className={s.profWrap}>

      {/* Header */}
      <div className={s.profHdr}>
        <div className={s.profAvWrap}>
          {avatarSrc ? (
            <div className={s.profAvImg}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarSrc} alt="Avatar" className={s.avImg} />
            </div>
          ) : (
            <div className={s.profAv}>{initials}</div>
          )}
          {editing && (
            <button className={s.avEditBtn} onClick={() => fileRef.current?.click()} title="Change photo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M23 19C23 20.1 22.1 21 21 21H3C1.9 21 1 20.1 1 19V8C1 6.9 1.9 6 3 6H7L9 3H15L17 6H21C22.1 6 23 6.9 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFilePick} />

        {editing ? (
          <div className={s.editFields}>
            <input className={`${s.editInput} ${s.editName}`} placeholder="Full name"
              value={editName} onChange={e => setEditName(e.target.value)} maxLength={60} />

            <div className={s.desigWrap}>
              <input className={`${s.editInput} ${s.editDesig}`} placeholder="Designation / Job title"
                value={editDesig}
                onChange={e => { setEditDesig(e.target.value); setShowSugg(true); }}
                onFocus={() => setShowSugg(true)}
                onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                maxLength={60} />
              {showSugg && (
                <div className={s.desigSugg}>
                  {DESIGNATION_SUGGESTIONS
                    .filter(sg => sg.toLowerCase().includes(editDesig.toLowerCase()))
                    .slice(0, 5)
                    .map(sg => (
                      <div key={sg} role="button" tabIndex={0} className={s.suggItem}
                        onMouseDown={() => { setEditDesig(sg); setShowSugg(false); }}>{sg}</div>
                    ))}
                </div>
              )}
            </div>

            <div className={s.countryField}>
              <select className={`${s.editInput} ${s.editCountry}`} value={editCountry}
                onChange={e => setEditCountry(e.target.value)}>
                <option value="">🌍 Select your country (for holidays)</option>
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>

            <div className={s.editActions}>
              <button className={s.btnCancel} onClick={cancelEdit} disabled={saving}>Cancel</button>
              <button className={s.btnSave} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={s.profName}>{profile?.full_name || 'User'}</div>
            {profile?.designation && <div className={s.profDesig}>{profile.designation}</div>}
            <div className={s.profEmailRow}>
              <span className={s.profEmail}>{displayEmail}</span>
              <button className={s.eyeBtn} onClick={toggleEmail}>
                {emailVisible ? <EyeOpen /> : <EyeOff />}
              </button>
            </div>
            <button className={s.editProfileBtn} onClick={openEdit}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4C3.5 4 3 4.5 3 5V20C3 20.5 3.5 21 4 21H19C19.5 21 20 20.5 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5L21.5 5.5L12 15L9 15L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              Edit Profile
            </button>
          </>
        )}

        {!editing && (
          <div className={s.profStats}>
            <div className={s.ps}>
              <div className={s.psV}>
                <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                  <path d="M7.5 13.5C5.01 13.5 3 11.49 3 9C3 6.5 5.5 4.5 5.5 2.5C5.5 2.5 6.5 4 7.5 4C8.5 4 9.5 2 9.5 2C9.5 2 12 4.5 12 7.5C12 10.8 10.07 13.5 7.5 13.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                </svg>
                <span>8</span>
              </div>
              <div className={s.psL}>Streak</div>
            </div>
            <div className={s.ps}>
              <div className={s.psV}>142</div>
              <div className={s.psL}>Tasks Done</div>
            </div>
            <div className={s.ps}>
              <div className={s.psV}>78%</div>
              <div className={s.psL}>Avg Score</div>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className={s.profBody}>

        {/* Appearance */}
        <div className={s.sh}><div className={s.shT}>
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 2C4.46 2 2 4.46 2 7.5C2 10.54 4.46 13 7.5 13H8.5C9.05 13 9.5 12.55 9.5 12C9.5 11.72 9.4 11.47 9.22 11.28C9.04 11.09 8.94 10.84 8.94 10.57C8.94 10.01 9.39 9.57 9.94 9.57H11C12.1 9.57 13 8.67 13 7.57C13 4.51 10.54 2 7.5 2Z" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="5" cy="7.5" r="0.8" fill="currentColor"/>
            <circle cx="6.5" cy="5" r="0.8" fill="currentColor"/>
            <circle cx="9" cy="5" r="0.8" fill="currentColor"/>
            <circle cx="10.5" cy="7.5" r="0.8" fill="currentColor"/>
          </svg>
          Appearance
        </div></div>

        <div className={s.themeGrid}>
          {THEMES.map(t => (
            <div key={t.id} role="button" tabIndex={0}
              className={`${s.thCard}${activeTheme === t.id ? ` ${s.thCardActive}` : ''}`}
              onClick={() => handleApplyTheme(t.id as ThemeId)}
              onKeyDown={e => e.key==='Enter' && handleApplyTheme(t.id as ThemeId)}>
              <div className={s.thPreview}>
                <div className={s.thPBg}  style={{ background: t.bg  }} />
                <div className={s.thPPri} style={{ background: t.pri }} />
                <div className={s.thPAcc} style={{ background: t.acc }} />
              </div>
              <div className={s.thName}>{t.name}</div>
              <div className={s.thDesc}>{t.desc}</div>
              <div className={s.thCardFoot}>
                <span className={s.thTag}>{t.tag}</span>
                {activeTheme === t.id && (
                  <span className={s.thCheck}>
                    <svg width="12" height="10" viewBox="0 0 13 10" fill="none">
                      <polyline points="1,5 5,9 12,1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Achievements */}
        <div className={s.sh}><div className={s.shT}>Achievements</div></div>
        <div className={s.badgesGrid}>
          {ACHIEVEMENTS.map(a => (
            <div key={a.label} className={`${s.badgeItem}${a.earned ? ` ${s.badgeLit}` : ` ${s.badgeDim}`}`}>
              <div className={s.badgeIco}>{a.earned ? '🏅' : '🔒'}</div>
              <div className={s.badgeLbl}>{a.label}</div>
            </div>
          ))}
        </div>

        {/* Account */}
        <div className={s.sh} style={{ marginTop: 4 }}><div className={s.shT}>Account</div></div>
        <div className={s.infoCard}>
          <div className={s.infoRow}>
            <span className={s.infoKey}>Email</span>
            <div className={s.infoEmailRow}>
              <span className={s.infoVal}>{displayEmail}</span>
              <button className={s.eyeBtnSm} onClick={toggleEmail}>
                {emailVisible ? <EyeOpen /> : <EyeOff />}
              </button>
            </div>
          </div>
          {profile?.designation && (
            <div className={s.infoRow}>
              <span className={s.infoKey}>Designation</span>
              <span className={s.infoVal}>{profile.designation}</span>
            </div>
          )}
          {countryInfo && (
            <div className={s.infoRow}>
              <span className={s.infoKey}>Location</span>
              <span className={s.infoVal}>{countryInfo.flag} {countryInfo.name}</span>
            </div>
          )}
          <div className={s.infoRow}>
            <span className={s.infoKey}>Member since</span>
            <span className={s.infoVal}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US',{month:'long',year:'numeric'}) : '—'}
            </span>
          </div>
          <div className={s.infoRow}>
            <span className={s.infoKey}>Version</span>
            <span className={s.infoVal}>{process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0-early-access'}</span>
          </div>
        </div>

        <button className={s.signoutBtn} onClick={handleSignOut}>Sign Out</button>
        <div style={{ height: 32 }} />
      </div>

      {/* Subtle theme-applied chip — fades in/out, sits above nav */}
      {themeFlash && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(var(--nav, 64px) + 16px)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          pointerEvents: 'none',
          animation: 'themeChipFade 1.8s ease forwards',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '9px 18px',
            background: 'var(--surf2)',
            border: '1px solid var(--border2)',
            borderRadius: '999px',
            boxShadow: '0 4px 20px rgba(0,0,0,.25), 0 1px 4px rgba(0,0,0,.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: 'var(--dark)',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'inherit',
            letterSpacing: '0.1px',
            whiteSpace: 'nowrap',
          }}>
            <span style={{
              width: 8, height: 8,
              borderRadius: '50%',
              background: 'var(--gradient)',
              flexShrink: 0,
              boxShadow: '0 0 6px var(--purple)',
            }} />
            {themeFlash}
          </div>
        </div>
      )}

      <style>{`
        @keyframes themeChipFade {
          0%   { opacity: 0; transform: translateX(-50%) translateY(6px); }
          12%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          70%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
        }
      `}</style>

      <BottomNav />
    </div>
  );
}
