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
import DashboardCustomizeSheet from '@/components/DashboardCustomizeSheet';
import { useAppUpdate } from '@/lib/useAppUpdate';
import { computeAwards, countEarnedAwards, TOTAL_AWARDS } from '@/lib/awards';
import {
  isNotificationsEnabled,
  setNotificationsEnabled,
  requestPermission,
  getNotificationPermission,
  cancelAllNotifications,
} from '@/lib/notifications';

const THEMES = THEME_IDS.map(id => ({ id, ...THEME_META[id] }));

// Awards are computed from real user data via lib/awards.ts — no hardcoded values

const DESIGNATION_SUGGESTIONS = [
  'Finance Officer','AP Specialist','AR Specialist','CFO',
  'Project Planner','Operations Manager','Team Lead',
  'Software Engineer','Product Manager','Data Analyst',
  'HR Manager','Marketing Lead','Business Analyst',
];

interface ProfileClientProps {
  initialUser:    { id: string; email?: string; [key: string]: unknown };
  initialProfile: Record<string, unknown> | null;
  streakDays:     number;        // consecutive days with ≥1 completed task
  tasksDone:      number;        // total completed tasks ever
  avgScore:       number | null; // completion rate % over last 28 days (null = no data)
  focusWins:      number;        // days in last 28 with 100% task completion
}

export default function ProfileClient({ initialUser, initialProfile, streakDays, tasksDone, avgScore, focusWins }: ProfileClientProps) {
  const router   = useRouter();
  const supabase = createClient();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [user,         setUser]         = useState<any>(null);
  const [profile,      setProfile]      = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [activeTheme,  setActiveTheme]  = useState<ThemeId>('focused');
  const [editing,      setEditing]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [editName,     setEditName]     = useState('');
  const [editDesig,    setEditDesig]    = useState('');
  const [editCountry,  setEditCountry]  = useState('');
  const [editAvatar,   setEditAvatar]   = useState<File | null>(null);
  const [previewUrl,   setPreviewUrl]   = useState<string | null>(null);
  const [showSugg,     setShowSugg]     = useState(false);
  const [emailVisible, setEmailVisible] = useState(false);
  const [themeFlash,   setThemeFlash]   = useState<string | null>(null);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [settingsTab,   setSettingsTab]   = useState<'account' | 'update' | null>(null);
  const appUpdate = useAppUpdate();
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifPerm,    setNotifPerm]    = useState<string>('default');
  const hdrRef = useRef<HTMLDivElement>(null);
  const [hdrH, setHdrH] = useState(90);

  // ── Lock body scroll when any modal/sheet is open ──
  useEffect(() => {
    const isOpen = editing || showCustomize;
    if (isOpen) {
      // Save current scroll position and freeze the page
      const scrollY = window.scrollY;
      document.body.style.position   = 'fixed';
      document.body.style.top        = `-${scrollY}px`;
      document.body.style.left       = '0';
      document.body.style.right      = '0';
      document.body.style.overflow   = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      // Restore scroll position when all modals are closed
      const scrollY = document.body.style.top;
      document.body.style.position   = '';
      document.body.style.top        = '';
      document.body.style.left       = '';
      document.body.style.right      = '';
      document.body.style.overflow   = '';
      document.body.style.touchAction = '';
      if (scrollY) window.scrollTo(0, -parseInt(scrollY || '0', 10));
    }
    return () => {
      document.body.style.position   = '';
      document.body.style.top        = '';
      document.body.style.left       = '';
      document.body.style.right      = '';
      document.body.style.overflow   = '';
      document.body.style.touchAction = '';
    };
  }, [editing, showCustomize]);

  // Data is pre-fetched by the server page — initialize state from props immediately.
  // This eliminates the blank-screen useEffect round-trip.
  useEffect(() => {
    setUser(initialUser);
    setProfile(initialProfile);
    setLoading(false);
    if (typeof window !== 'undefined') {
      setEmailVisible(localStorage.getItem('planiq_email_visible') === 'true');
    }
    setActiveTheme(getSavedTheme());
    setNotifEnabled(isNotificationsEnabled());
    setNotifPerm(getNotificationPermission());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Measure header height for ghost-scroll prevention
  useEffect(() => {
    if (!hdrRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setHdrH(Math.round(e.contentRect.height));
    });
    ro.observe(hdrRef.current);
    setHdrH(hdrRef.current.offsetHeight);
    return () => ro.disconnect();
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
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setThemeFlash(THEME_META[id].name);
    flashTimer.current = setTimeout(() => setThemeFlash(null), 2200);
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

  async function handleNotifToggle() {
    if (notifEnabled) {
      // Turn off — cancel queued notifications, save preference
      setNotifEnabled(false);
      setNotificationsEnabled(false);
      await cancelAllNotifications();
      toast('Notifications disabled');
    } else {
      const perm = getNotificationPermission();
      if (perm === 'denied') {
        toast.error('Notifications are blocked. Please enable them in your browser settings.');
        return;
      }
      const granted = await requestPermission();
      setNotifPerm(getNotificationPermission());
      if (granted) {
        setNotifEnabled(true);
        setNotificationsEnabled(true);
        toast.success('Notifications enabled ✓');
      } else {
        toast.error('Permission not granted');
      }
    }
  }

  function toggleEmail() {
    const next = !emailVisible;
    setEmailVisible(next);
    localStorage.setItem('planiq_email_visible', String(next));
  }

  const avatarSrc   = previewUrl || profile?.avatar_url || null;
  const initials    = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';
  const displayEmail = emailVisible ? (user?.email ?? '') : maskEmail(user?.email ?? '');
  const countryInfo  = COUNTRIES.find(c => c.code === profile?.country_code);

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--bg,#080E1A)' }} />;

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

      {/* ── Static Header — always clean, never collapses ── */}
      <div ref={hdrRef} className={s.profHdr}>
        {/* Avatar */}
        <div className={s.profAvWrap}>
          {avatarSrc ? (
            <div className={s.profAvImg}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarSrc} alt="Avatar" className={s.avImg} />
            </div>
          ) : (
            <div className={s.profAv}>{initials}</div>
          )}
        </div>

        {/* Identity */}
        <div className={s.profName}>{profile?.full_name || 'User'}</div>
        {profile?.designation && <div className={s.profDesig}>{profile.designation}</div>}

        {/* Email row */}
        <div className={s.profEmailRow}>
          <span className={s.profEmail}>{displayEmail}</span>
          <button className={s.eyeBtn} onClick={toggleEmail} aria-label="Toggle email visibility">
            {emailVisible ? <EyeOpen /> : <EyeOff />}
          </button>
        </div>

        {/* Edit button */}
        <button className={s.editProfileBtn} onClick={openEdit}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4C3.5 4 3 4.5 3 5V20C3 20.5 3.5 21 4 21H19C19.5 21 20 20.5 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.5 2.5L21.5 5.5L12 15L9 15L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
          Edit Profile
        </button>

        {/* Stats row — sourced from real DB data */}
        <div className={s.profStats}>
          <div className={s.ps}>
            <div className={s.psV}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="var(--amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ color: 'var(--amber)' }}>{streakDays}</span>
            </div>
            <div className={s.psL}>Streak</div>
          </div>
          <div className={s.ps}>
            <div className={s.psV} style={{ color: 'var(--mint)' }}>{tasksDone}</div>
            <div className={s.psL}>Completed</div>
          </div>
          <div className={s.ps}>
            <div className={s.psV} style={{ color: 'var(--purple)' }}>{avgScore !== null ? `${avgScore}%` : '—'}</div>
            <div className={s.psL}>28-Day Rate</div>
          </div>
          <div className={s.ps}>
            <div className={s.psV} style={{ color: 'var(--coral)' }}>
              {countEarnedAwards({ streakDays, tasksDone, avgScore, focusWins })}
              <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--mid)', marginLeft: 1 }}>/{TOTAL_AWARDS}</span>
            </div>
            <div className={s.psL}>Awards</div>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div
        className={s.profBody}
        style={{
          maxHeight: `calc(100dvh - ${hdrH}px - 64px - max(env(safe-area-inset-bottom, 0px), 20px))`,
        }}
      >
      <div style={{ paddingBottom: '16px' }}>

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
              onKeyDown={e => e.key === 'Enter' && handleApplyTheme(t.id as ThemeId)}>
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

        {/* Awards & Momentum — computed from real user data */}
        {(() => {
          const awards = computeAwards({ streakDays, tasksDone, avgScore, focusWins });
          const earned = awards.filter(a => a.earned);
          const locked = awards.filter(a => !a.earned);
          return (
            <>
              <div className={s.sh}>
                <div className={s.shT} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2l2.09 6.26L20 9.27l-5 4.87 1.18 6.88L12 17.77l-5.18 3.25L8 14.14 3 9.27l5.91-.01L12 2z"
                      stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                  </svg>
                  Awards & Momentum
                  {earned.length > 0 && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '.4px',
                      background: 'rgba(124,106,240,.15)', color: 'var(--purple)',
                      border: '1px solid rgba(124,106,240,.25)',
                      borderRadius: 8, padding: '1px 7px', lineHeight: 1.6,
                    }}>{earned.length} earned</span>
                  )}
                </div>
              </div>

              {/* Momentum stats strip */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                gap: 8, margin: '0 0 12px',
              }}>
                {[
                  { label: 'Momentum Streak', value: streakDays === 0 ? '—' : `${streakDays}d`, sub: streakDays === 0 ? 'No streak yet' : streakDays === 1 ? 'Started today!' : 'days in a row', color: 'var(--amber)', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
                  { label: 'Focus Wins', value: focusWins === 0 ? '—' : `${focusWins}`, sub: focusWins === 0 ? 'No perfect days yet' : focusWins === 1 ? 'perfect day' : 'perfect days', color: 'var(--mint)', icon: 'M9 11l3 3L22 4M21 12a9 9 0 11-9-9' },
                  { label: 'Tasks Done', value: tasksDone === 0 ? '0' : tasksDone >= 1000 ? `${(tasksDone/1000).toFixed(1)}k` : String(tasksDone), sub: tasksDone === 1 ? 'task completed' : 'tasks completed', color: 'var(--purple)', icon: 'M5 13l4 4L19 7' },
                ].map(stat => (
                  <div key={stat.label} style={{
                    background: 'var(--glass-bg2, rgba(255,255,255,.04))',
                    border: '1.5px solid var(--glass-border, rgba(255,255,255,.08))',
                    borderRadius: 14, padding: '12px 10px', textAlign: 'center',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 6px', display: 'block' }}>
                      <path d={stat.icon} stroke={stat.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div style={{ fontSize: 20, fontWeight: 900, color: stat.color, lineHeight: 1, letterSpacing: '-.5px' }}>{stat.value}</div>
                    <div style={{ fontSize: 9, color: 'var(--mid)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '.4px', lineHeight: 1.3 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Earned awards */}
              {earned.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8, paddingLeft: 2 }}>Unlocked</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {earned.map(a => (
                      <div key={a.id} style={{
                        background: `${a.color}12`,
                        border: `1.5px solid ${a.color}28`,
                        borderRadius: 14, padding: '12px 12px 10px',
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                      }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                          background: `${a.color}20`, border: `1px solid ${a.color}35`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d={a.icon} stroke={a.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)', lineHeight: 1.2 }}>{a.label}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke={a.color} strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--mid)', lineHeight: 1.4 }}>{a.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state for new users */}
              {earned.length === 0 && (
                <div style={{
                  textAlign: 'center', padding: '24px 16px',
                  background: 'var(--glass-bg2, rgba(255,255,255,.03))',
                  border: '1.5px dashed var(--border)',
                  borderRadius: 16, marginBottom: 12,
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🌱</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>Your journey starts here</div>
                  <div style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.5, maxWidth: 220, margin: '0 auto' }}>
                    Complete your first task to unlock your first award.
                  </div>
                </div>
              )}

              {/* Locked awards — next to unlock */}
              {locked.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8, paddingLeft: 2 }}>Up Next</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {locked.slice(0, 3).map(a => (
                      <div key={a.id} style={{
                        background: 'var(--glass-bg2, rgba(255,255,255,.03))',
                        border: '1.5px solid var(--border)',
                        borderRadius: 12, padding: '10px 12px',
                        display: 'flex', alignItems: 'center', gap: 10, opacity: 0.7,
                      }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                          background: 'var(--surf2)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--mid)" strokeWidth="1.8"/>
                            <path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--mid)" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mid)', marginBottom: 2 }}>{a.label}</div>
                          <div style={{ fontSize: 10, color: 'var(--lite)', lineHeight: 1.3 }}>{a.hint}</div>
                        </div>
                        {/* Progress bar */}
                        <div style={{ width: 44, flexShrink: 0 }}>
                          <div style={{ height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 2,
                              background: a.color,
                              width: `${Math.min(100, Math.round((a.progress.current / a.progress.target) * 100))}%`,
                              transition: 'width .4s ease',
                            }}/>
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--lite)', textAlign: 'right', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                            {a.progress.current}/{a.progress.target}
                          </div>
                        </div>
                      </div>
                    ))}
                    {locked.length > 3 && (
                      <div style={{ fontSize: 11, color: 'var(--mid)', textAlign: 'center', paddingTop: 2, fontWeight: 600 }}>
                        +{locked.length - 3} more awards to discover
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* ══════════════════════════════════════════
             SYSTEM SETTINGS
        ══════════════════════════════════════════ */}
        <div className={s.sh} style={{ marginTop: 8 }}>
          <div className={s.shT} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" style={{ display:'inline', verticalAlign:'middle' }}>
              <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"
                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            System Settings
            {appUpdate.hasUpdate && (
              <span style={{
                display: 'inline-flex', width: 7, height: 7, borderRadius: '50%',
                background: '#FF6B6B',
                boxShadow: '0 0 0 2px rgba(255,107,107,.25)',
                animation: 'pulse 2s ease-in-out infinite',
                flexShrink: 0,
              }} />
            )}
          </div>
        </div>

        {/* Settings card — 4 grouped rows */}
        <div style={{
          background: 'var(--glass-bg2, rgba(255,255,255,.04))',
          border: '1.5px solid var(--glass-border, rgba(255,255,255,.08))',
          borderRadius: 18, overflow: 'hidden', marginBottom: 16,
        }}>

          {/* ── ROW 1: Account ── */}
          <button
            onClick={() => setSettingsTab(v => v === 'account' ? null : 'account')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 16px', background: 'transparent', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              borderBottom: '1px solid var(--border)',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(124,106,240,.12)', border: '1px solid rgba(124,106,240,.2)',
            }}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="7" r="3.5" stroke="var(--purple)" strokeWidth="1.5"/>
                <path d="M3 17c0-3.31 3.13-6 7-6s7 2.69 7 6" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>Account</div>
              <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 1 }}>Profile details, email, membership</div>
            </div>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--mid)', flexShrink: 0, transition: 'transform .2s', transform: settingsTab === 'account' ? 'rotate(90deg)' : 'none' }}>
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Account expanded content */}
          {settingsTab === 'account' && (
            <div style={{ padding: '4px 16px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surf2, rgba(255,255,255,.02))' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Email row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 600 }}>Email</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--dark)', fontWeight: 600 }}>{displayEmail}</span>
                    <button className={s.eyeBtnSm} onClick={toggleEmail} style={{ flexShrink: 0 }}>
                      {emailVisible ? <EyeOpen /> : <EyeOff />}
                    </button>
                  </div>
                </div>
                {/* Designation row */}
                {profile?.designation && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 600 }}>Designation</span>
                    <span style={{ fontSize: 12, color: 'var(--dark)', fontWeight: 600 }}>{profile.designation}</span>
                  </div>
                )}
                {/* Location row */}
                {countryInfo && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 600 }}>Location</span>
                    <span style={{ fontSize: 12, color: 'var(--dark)', fontWeight: 600 }}>{countryInfo.flag} {countryInfo.name}</span>
                  </div>
                )}
                {/* Member since row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 600 }}>Member since</span>
                  <span style={{ fontSize: 12, color: 'var(--dark)', fontWeight: 600 }}>
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
                  </span>
                </div>
                {/* Version row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                  <span style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 600 }}>App Version</span>
                  <span style={{ fontSize: 12, color: 'var(--dark)', fontWeight: 600 }}>{process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0'}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── ROW 2: Activity Notifications ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '13px 16px',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: notifEnabled ? 'rgba(124,106,240,.12)' : 'var(--surf2, rgba(255,255,255,.04))',
              border: `1px solid ${notifEnabled ? 'rgba(124,106,240,.2)' : 'var(--border)'}`,
              transition: 'background .2s, border-color .2s',
            }}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <path d="M10 2a6 6 0 0 0-6 6c0 3.5-2 5-2 5h16s-2-1.5-2-5a6 6 0 0 0-6-6z"
                  stroke={notifEnabled ? 'var(--purple)' : 'var(--mid)'} strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M11.73 17a2 2 0 0 1-3.46 0"
                  stroke={notifEnabled ? 'var(--purple)' : 'var(--mid)'} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>Activity Notifications</div>
              <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 1 }}>
                {notifPerm === 'denied'
                  ? 'Blocked in browser — enable in browser settings'
                  : notifEnabled ? 'Notified when activities start' : 'Get notified when activities start'}
              </div>
            </div>
            <button
              onClick={handleNotifToggle}
              aria-label={notifEnabled ? 'Disable notifications' : 'Enable notifications'}
              style={{
                flexShrink: 0, width: 44, height: 25, borderRadius: 13,
                background: notifEnabled ? 'var(--purple)' : 'var(--border2)',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background .2s', WebkitTapHighlightColor: 'transparent',
              }}>
              <span style={{
                position: 'absolute', top: 2.5,
                left: notifEnabled ? 21 : 2.5,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,.25)',
                transition: 'left .18s cubic-bezier(.4,0,.2,1)', display: 'block',
              }} />
            </button>
          </div>

          {/* ── ROW 3: Customize Dashboard ── */}
          <button
            onClick={() => setShowCustomize(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 16px', background: 'transparent', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              borderBottom: '1px solid var(--border)',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,198,255,.10)', border: '1px solid rgba(0,198,255,.20)',
            }}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="2" width="7" height="7" rx="2" stroke="var(--cyan,#00C6FF)" strokeWidth="1.5"/>
                <rect x="11" y="2" width="7" height="7" rx="2" stroke="var(--cyan,#00C6FF)" strokeWidth="1.5"/>
                <rect x="2" y="11" width="7" height="7" rx="2" stroke="var(--cyan,#00C6FF)" strokeWidth="1.5"/>
                <path d="M14.5 11v6M11.5 14h6" stroke="var(--cyan,#00C6FF)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>Customize Dashboard</div>
              <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 1 }}>Cards, shortcuts, layout presets</div>
            </div>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--mid)', flexShrink: 0 }}>
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* ── ROW 4: Software Update ── */}
          <button
            onClick={() => setSettingsTab(v => v === 'update' ? null : 'update')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 16px', background: 'transparent', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: appUpdate.hasUpdate ? 'rgba(255,107,107,.12)' : 'rgba(0,200,150,.10)',
              border: `1px solid ${appUpdate.hasUpdate ? 'rgba(255,107,107,.22)' : 'rgba(0,200,150,.20)'}`,
              transition: 'background .3s, border-color .3s',
            }}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                {appUpdate.hasUpdate ? (
                  <path d="M10 3v7m0 0l-3-3m3 3l3-3M4 14h12" stroke="#FF6B6B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                ) : (
                  <path d="M5 10l4 4 6-7" stroke="#00C896" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                )}
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>Software Update</span>
                {appUpdate.hasUpdate && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '.4px',
                    background: '#FF6B6B', color: '#fff',
                    borderRadius: 8, padding: '1px 6px', lineHeight: 1.6,
                  }}>NEW</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 1 }}>
                {appUpdate.hasUpdate
                  ? `v${appUpdate.latestVersion ?? '…'} available — tap to update`
                  : appUpdate.checking
                    ? 'Checking for updates…'
                    : `v${appUpdate.currentVersionClean} — up to date`}
              </div>
            </div>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--mid)', flexShrink: 0, transition: 'transform .2s', transform: settingsTab === 'update' ? 'rotate(90deg)' : 'none' }}>
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Software Update expanded content */}
          {settingsTab === 'update' && (
            <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surf2, rgba(255,255,255,.02))' }}>

              {/* Version numbers */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1, padding: '10px 16px', borderRight: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Installed</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--dark)', fontVariantNumeric: 'tabular-nums' }}>v{appUpdate.currentVersionClean}</div>
                </div>
                <div style={{ flex: 1, padding: '10px 16px' }}>
                  <div style={{ fontSize: 10, color: 'var(--mid)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Latest</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: appUpdate.hasUpdate ? '#FF6B6B' : 'var(--dark)', fontVariantNumeric: 'tabular-nums' }}>
                    {appUpdate.latestVersion ? `v${appUpdate.latestVersion}` : '—'}
                  </div>
                </div>
              </div>

              {/* What's new — always shown once manifest is loaded */}
              {appUpdate.summary && (
                <div style={{
                  padding: '10px 16px', borderBottom: '1px solid var(--border)',
                  background: appUpdate.hasUpdate ? 'rgba(255,107,107,.04)' : 'var(--surf2, rgba(255,255,255,.02))',
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '.5px', marginBottom: 3,
                    color: appUpdate.hasUpdate ? 'rgba(255,107,107,.8)' : 'var(--mid)',
                  }}>
                    {appUpdate.hasUpdate ? "What\'s New" : 'Last Update'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--dark)', lineHeight: 1.5 }}>{appUpdate.summary}</div>
                  {appUpdate.releaseDate && (
                    <div style={{ fontSize: 10, color: 'var(--mid)', marginTop: 3 }}>
                      Released {new Date(appUpdate.releaseDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, padding: '12px 16px' }}>
                {appUpdate.hasUpdate ? (
                  <button
                    onClick={() => appUpdate.refreshToUpdate()}
                    disabled={appUpdate.updating}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                      background: appUpdate.updating ? 'rgba(255,107,107,.6)' : '#FF6B6B',
                      color: '#fff',
                      fontSize: 13, fontWeight: 700,
                      cursor: appUpdate.updating ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      boxShadow: appUpdate.updating ? 'none' : '0 3px 12px rgba(255,107,107,.35)',
                      WebkitTapHighlightColor: 'transparent',
                      transition: 'background .2s, box-shadow .2s',
                    }}>
                    {appUpdate.updating && (
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="none"
                        style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                        <path d="M4 10a6 6 0 1 1 1.2 3.6M4 14V10h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {appUpdate.updating ? 'Applying Update…' : 'Update Now'}
                  </button>
                ) : (
                  <button
                    onClick={appUpdate.recheck}
                    disabled={appUpdate.checking}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 10,
                      border: '1.5px solid var(--border)',
                      background: 'var(--surf2, rgba(255,255,255,.04))',
                      color: appUpdate.checking ? 'var(--mid)' : 'var(--dark)',
                      fontSize: 13, fontWeight: 600, cursor: appUpdate.checking ? 'default' : 'pointer',
                      fontFamily: 'inherit', opacity: appUpdate.checking ? .6 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      WebkitTapHighlightColor: 'transparent',
                    }}>
                    {appUpdate.checking && (
                      <svg width="13" height="13" viewBox="0 0 20 20" fill="none"
                        style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                        <path d="M4 10a6 6 0 1 1 1.2 3.6M4 14V10h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {appUpdate.checking ? 'Checking…' : 'Check for Updates'}
                  </button>
                )}
                <button
                  onClick={() => setChangelogOpen(v => !v)}
                  style={{
                    padding: '10px 14px', borderRadius: 10,
                    border: '1.5px solid var(--border)',
                    background: 'var(--surf2, rgba(255,255,255,.04))',
                    color: 'var(--mid)', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 5,
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                  History
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none"
                    style={{ transform: changelogOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* Changelog */}
              {changelogOpen && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {appUpdate.changelog.map((entry, i) => (
                    <div key={entry.version}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 8,
                            background: i === 0 ? 'rgba(124,106,240,.15)' : 'var(--surf2)',
                            color: i === 0 ? 'var(--purple)' : 'var(--mid)',
                            border: i === 0 ? '1px solid rgba(124,106,240,.25)' : '1px solid var(--border)',
                          }}>v{entry.version}</span>
                          {i === 0 && <span style={{ fontSize: 9, fontWeight: 800, color: '#00C896', letterSpacing: '.5px' }}>LATEST</span>}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--mid)', fontWeight: 600 }}>
                          {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {entry.notes.map((note, j) => (
                          <li key={j} style={{ fontSize: 12, color: 'var(--dark)', lineHeight: 1.5 }}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>{/* end settings card */}
        <button className={s.signoutBtn} onClick={handleSignOut}>Sign Out</button>
      </div>{/* inner */}
      </div>

      {/* ── Edit Profile Bottom Sheet ── */}
      {editing && (
        <>
          {/* Backdrop */}
          <div className={s.sheetBackdrop} onClick={cancelEdit} />

          {/* Sheet */}
          <div className={s.editSheet}>
            {/* Drag handle */}
            <div className={s.sheetHandle} />

            {/* Sheet header */}
            <div className={s.sheetHdr}>
              <span className={s.sheetTitle}>Edit Profile</span>
              <button className={s.sheetClose} onClick={cancelEdit} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Scrollable form body */}
            <div className={s.sheetBody}>

              {/* Avatar section */}
              <div className={s.fieldGroup}>
                <div className={s.fieldLabel}>Profile Photo</div>
                <div className={s.avatarRow}>
                  <div className={s.sheetAvWrap}>
                    {avatarSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarSrc} alt="Avatar" className={s.sheetAvImg} />
                    ) : (
                      <div className={s.sheetAvInitials}>{initials}</div>
                    )}
                  </div>
                  <div className={s.avatarMeta}>
                    <button className={s.changePhotoBtn} onClick={() => fileRef.current?.click()}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M23 19C23 20.1 22.1 21 21 21H3C1.9 21 1 20.1 1 19V8C1 6.9 1.9 6 3 6H7L9 3H15L17 6H21C22.1 6 23 6.9 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                        <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Change Photo
                    </button>
                    <span className={s.avatarHint}>JPG or PNG · Max 5 MB</span>
                  </div>
                </div>
              </div>

              <div className={s.sheetDivider} />

              {/* Name field */}
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel} htmlFor="edit-name">Full Name</label>
                <input
                  id="edit-name"
                  className={s.sheetInput}
                  placeholder="Your full name"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  maxLength={60}
                  autoComplete="off"
                />
              </div>

              {/* Email — read-only display */}
              <div className={s.fieldGroup}>
                <div className={s.fieldLabel}>Email Address</div>
                <div className={s.emailDisplayBox}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                    <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  <span className={s.emailDisplayText}>{displayEmail}</span>
                  <button className={s.eyeBtnSheet} onClick={toggleEmail} aria-label="Toggle email visibility">
                    {emailVisible ? <EyeOpen /> : <EyeOff />}
                  </button>
                </div>
                <span className={s.fieldHint}>Email cannot be changed here. Contact support to update it.</span>
              </div>

              {/* Designation */}
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel} htmlFor="edit-desig">Designation / Job Title</label>
                <div className={s.desigWrap}>
                  <input
                    id="edit-desig"
                    className={s.sheetInput}
                    placeholder="e.g. Finance Officer, Team Lead"
                    value={editDesig}
                    onChange={e => { setEditDesig(e.target.value); setShowSugg(true); }}
                    onFocus={() => setShowSugg(true)}
                    onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                    maxLength={60}
                    autoComplete="off"
                  />
                  {showSugg && DESIGNATION_SUGGESTIONS.filter(sg =>
                    sg.toLowerCase().includes(editDesig.toLowerCase())
                  ).length > 0 && (
                    <div className={s.desigSugg}>
                      {DESIGNATION_SUGGESTIONS
                        .filter(sg => sg.toLowerCase().includes(editDesig.toLowerCase()))
                        .slice(0, 5)
                        .map(sg => (
                          <div key={sg} role="button" tabIndex={0} className={s.suggItem}
                            onMouseDown={() => { setEditDesig(sg); setShowSugg(false); }}>
                            {sg}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Country */}
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel} htmlFor="edit-country">Country / Region</label>
                <div className={s.selectWrap}>
                  <select
                    id="edit-country"
                    className={s.sheetSelect}
                    value={editCountry}
                    onChange={e => setEditCountry(e.target.value)}
                  >
                    <option value="">🌍 Select your country</option>
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                    ))}
                  </select>
                  <svg className={s.selectArrow} width="12" height="8" viewBox="0 0 12 8" fill="none">
                    <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className={s.fieldHint}>Used to show local public holidays in your calendar.</span>
              </div>

              {/* Actions */}
              <div className={s.sheetActions}>
                <button className={s.btnCancel} onClick={cancelEdit} disabled={saving}>Cancel</button>
                <button className={s.btnSave} onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <span className={s.savingDot} />
                      Saving…
                    </>
                  ) : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFilePick} />

      {/* Glass theme confirmation — top popup */}
      {themeFlash && (
        <div style={{
          position: 'fixed',
          top: '52px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          pointerEvents: 'none',
          animation: 'glassPopup 2.2s ease forwards',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '11px 20px 11px 14px',
            background: 'var(--glass-bg, rgba(30,28,48,0.72))',
            border: '1px solid var(--glass-border2, rgba(255,255,255,0.14))',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,.32), 0 1px 0 rgba(255,255,255,.08) inset',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            color: 'var(--dark)',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'inherit',
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap' as const,
          }}>
            {/* Accent dot */}
            <span style={{
              width: 8, height: 8,
              borderRadius: '50%',
              background: 'var(--purple)',
              flexShrink: 0,
              boxShadow: '0 0 8px var(--purple)',
            }} />
            {/* Label */}
            <span style={{ color: 'var(--mid)', fontWeight: 500, fontSize: '12px' }}>Theme applied</span>
            <span style={{
              width: '1px', height: '14px',
              background: 'var(--border2)',
              flexShrink: 0,
            }} />
            <span style={{ color: 'var(--dark)', fontWeight: 700 }}>{themeFlash}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes glassPopup {
          0%   { opacity: 0; transform: translateX(-50%) translateY(-10px); filter: blur(6px); }
          12%  { opacity: 1; transform: translateX(-50%) translateY(0px);  filter: blur(0); }
          72%  { opacity: 1; transform: translateX(-50%) translateY(0px);  filter: blur(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-6px); filter: blur(4px); }
        }
      `}</style>

      <DashboardCustomizeSheet
        open={showCustomize}
        onClose={() => setShowCustomize(false)}
        onSaved={() => setShowCustomize(false)}
      />

      <BottomNav />
    </div>
  );
}
