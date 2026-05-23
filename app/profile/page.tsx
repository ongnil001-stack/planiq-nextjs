'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { uploadAvatar } from '@/lib/avatar';
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

const DESIGNATION_SUGGESTIONS = [
  'Finance Officer', 'AP Specialist', 'AR Specialist', 'CFO',
  'Project Planner', 'Operations Manager', 'Team Lead',
  'Software Engineer', 'Product Manager', 'Data Analyst',
  'HR Manager', 'Marketing Lead', 'Business Analyst',
];

export default function ProfilePage() {
  const router  = useRouter();
  const supabase = createClient();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [user,        setUser]        = useState<any>(null);
  const [profile,     setProfile]     = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [activeTheme, setActiveTheme] = useState<ThemeId>('focused');
  const [emailVisible, setEmailVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('planiq_email_visible') === 'true';
  });

  // ── Edit mode state ──────────────────────────────────────────────
  const [editing,     setEditing]     = useState(false);
  const [saving,      setSaving]      = useState(false);

  const [editName,    setEditName]    = useState('');
  const [editDesig,   setEditDesig]   = useState('');
  const [editAvatar,  setEditAvatar]  = useState<File | null>(null);
  const [previewUrl,  setPreviewUrl]  = useState<string | null>(null);
  const [showSugg,    setShowSugg]    = useState(false);

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

  // ── Open edit mode ───────────────────────────────────────────────
  function openEdit() {
    setEditName(profile?.full_name  ?? '');
    setEditDesig(profile?.designation ?? '');
    setPreviewUrl(null);
    setEditAvatar(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setShowSugg(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setEditAvatar(null);
  }

  // ── Avatar file pick ─────────────────────────────────────────────
  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Image must be under 5 MB.');    return; }
    setEditAvatar(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }

  // ── Save ─────────────────────────────────────────────────────────
  async function handleSave() {
    if (!user) return;
    if (!editName.trim()) { toast.error('Name cannot be empty.'); return; }

    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url ?? null;

      if (editAvatar) {
        avatarUrl = await uploadAvatar(user.id, editAvatar);
      }

      const updates: Record<string, any> = {
        full_name:   editName.trim(),
        designation: editDesig.trim() || null,
        avatar_url:  avatarUrl,
        updated_at:  new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Refresh local profile state
      setProfile((p: any) => ({ ...p, ...updates }));
      setEditing(false);
      setShowSugg(false);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setEditAvatar(null);
      toast.success('Profile updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Theme ────────────────────────────────────────────────────────
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

  // ── Email masking ────────────────────────────────────────────────
  function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const visible = local[0];
    const dots = '•'.repeat(Math.min(local.length - 1, 8));
    const domainParts = domain.split('.');
    const tld = domainParts.pop();
    const domainName = domainParts.join('.')[0] + '•••';
    return `${visible}${dots}@${domainName}.${tld}`;
  }

  function toggleEmail() {
    const next = !emailVisible;
    setEmailVisible(next);
    localStorage.setItem('planiq_email_visible', String(next));
  }

  // ── Derived display values ───────────────────────────────────────
  const avatarSrc = previewUrl || profile?.avatar_url || null;
  const initials  = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';
  const displayEmail = emailVisible ? (user?.email ?? '') : maskEmail(user?.email ?? '');

  if (loading) return <div style={{ minHeight:'100vh', background:'var(--bg,#0F0E17)' }} />;

  return (
    <div className="prof-wrap">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="prof-hdr">

        {/* Avatar */}
        <div className="prof-av-wrap">
          {avatarSrc ? (
            <div className="prof-av-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarSrc} alt="Avatar" className="av-img" />
            </div>
          ) : (
            <div className="prof-av">{initials}</div>
          )}

          {/* Camera overlay when editing */}
          {editing && (
            <button className="av-edit-btn" onClick={() => fileRef.current?.click()} title="Change photo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M23 19C23 20.1 22.1 21 21 21H3C1.9 21 1 20.1 1 19V8C1 6.9 1.9 6 3 6H7L9 3H15L17 6H21C22.1 6 23 6.9 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          )}
        </div>

        <input
          ref={fileRef} type="file" accept="image/*"
          style={{ display:'none' }}
          onChange={handleFilePick}
        />

        {/* Name + designation (view or edit) */}
        {editing ? (
          <div className="edit-fields">
            <input
              className="edit-input edit-name"
              placeholder="Full name"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              maxLength={60}
            />
            <div className="desig-wrap">
              <input
                className="edit-input edit-desig"
                placeholder="Designation / Job title"
                value={editDesig}
                onChange={e => { setEditDesig(e.target.value); setShowSugg(true); }}
                onFocus={() => setShowSugg(true)}
                onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                maxLength={60}
              />
              {showSugg && (
                <div className="desig-sugg">
                  {DESIGNATION_SUGGESTIONS
                    .filter(s => s.toLowerCase().includes(editDesig.toLowerCase()))
                    .slice(0, 5)
                    .map(s => (
                      <button
                        key={s} className="sugg-item"
                        onMouseDown={() => { setEditDesig(s); setShowSugg(false); }}
                      >{s}</button>
                    ))}
                </div>
              )}
            </div>

            {/* Save / Cancel */}
            <div className="edit-actions">
              <button className="btn-cancel" onClick={cancelEdit} disabled={saving}>Cancel</button>
              <button className="btn-save"   onClick={handleSave}  disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="prof-name">{profile?.full_name || 'User'}</div>
            {profile?.designation && (
              <div className="prof-desig">{profile.designation}</div>
            )}
            <div className="prof-email-row">
              <span className="prof-email">{displayEmail}</span>
              <button className="eye-btn" onClick={toggleEmail} title={emailVisible ? 'Hide email' : 'Show email'}>
                {emailVisible ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M17.94 17.94C16.23 19.24 14.17 20 12 20C5 20 1 12 1 12C2.24 9.82 3.96 7.95 6 6.54M9.9 4.24C10.59 4.08 11.29 4 12 4C19 4 23 12 23 12C22.45 12.94 21.8 13.82 21.07 14.61M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            </div>
            <button className="edit-profile-btn" onClick={openEdit}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4C3.5 4 3 4.5 3 5V20C3 20.5 3.5 21 4 21H19C19.5 21 20 20.5 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.5 2.5L21.5 5.5L12 15L9 15L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
              Edit Profile
            </button>
          </>
        )}

        {/* Stats row */}
        {!editing && (
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
        )}
      </div>

      {/* ── Scrollable body ──────────────────────────────────────── */}
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
            <div className="info-email-row">
              <span className="info-val">{displayEmail}</span>
              <button className="eye-btn-sm" onClick={toggleEmail} title={emailVisible ? 'Hide email' : 'Show email'}>
                {emailVisible ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M17.94 17.94C16.23 19.24 14.17 20 12 20C5 20 1 12 1 12C2.24 9.82 3.96 7.95 6 6.54M9.9 4.24C10.59 4.08 11.29 4 12 4C19 4 23 12 23 12C22.45 12.94 21.8 13.82 21.07 14.61M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          {profile?.designation && (
            <div className="info-row">
              <span className="info-key">Designation</span>
              <span className="info-val">{profile.designation}</span>
            </div>
          )}
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
        /* ── Wrapper ── */
        .prof-wrap {
          min-height: 100vh;
          background: var(--bg);
          display: flex; flex-direction: column;
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

        /* Avatar container */
        .prof-av-wrap {
          position: relative;
          width: 82px; height: 82px;
          margin: 0 auto 14px;
        }
        .prof-av {
          width: 82px; height: 82px;
          background: var(--gradient);
          border-radius: 24px;
          display: flex; align-items: center; justify-content: center;
          font-size: 32px; font-weight: 700; color: #fff;
          box-shadow: 0 8px 24px rgba(0,0,0,.25);
        }
        .prof-av-img {
          width: 82px; height: 82px;
          border-radius: 24px; overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,.25);
          border: 2px solid var(--border);
        }
        .av-img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
        }
        /* Camera button overlay */
        .av-edit-btn {
          position: absolute; bottom: -6px; right: -6px;
          width: 30px; height: 30px;
          background: var(--purple);
          border: 2px solid var(--surf);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #fff; cursor: pointer; padding: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,.3);
          transition: opacity .15s;
        }
        .av-edit-btn:active { opacity: .8; }

        /* View mode name/desig */
        .prof-name  { font-size: 20px; font-weight: 700; color: var(--dark); letter-spacing: -.3px; }
        .prof-desig { font-size: 12px; color: var(--purple); font-weight: 600; margin-top: 2px; letter-spacing: .2px; }
        .prof-email { font-size: 12px; color: var(--mid); }
        .prof-email-row {
          display: inline-flex; align-items: center; gap: 6px;
          margin-top: 3px;
        }
        .eye-btn {
          background: none; border: none; padding: 3px;
          color: var(--mid); cursor: pointer; display: flex;
          align-items: center; justify-content: center;
          border-radius: 6px; transition: color .15s, background .15s;
          line-height: 0;
        }
        .eye-btn:hover { color: var(--dark); background: var(--surf2); }
        .eye-btn:active { opacity: .7; }
        /* Info card eye button */
        .info-email-row {
          display: flex; align-items: center; gap: 8px;
          max-width: 60%;
        }
        .info-email-row .info-val { max-width: unset; }
        .eye-btn-sm {
          background: none; border: none; padding: 2px;
          color: var(--mid); cursor: pointer; display: flex;
          align-items: center; justify-content: center;
          border-radius: 4px; transition: color .15s;
          line-height: 0; flex-shrink: 0;
        }
        .eye-btn-sm:hover { color: var(--dark); }

        /* Edit profile button */
        .edit-profile-btn {
          display: inline-flex; align-items: center; gap: 6px;
          margin-top: 10px; padding: 7px 14px;
          background: var(--surf2);
          border: 1px solid var(--border2, var(--border));
          border-radius: 20px;
          color: var(--mid); font-size: 12px; font-weight: 600;
          font-family: inherit; cursor: pointer;
          transition: border-color .15s, color .15s;
        }
        .edit-profile-btn:hover { border-color: var(--purple); color: var(--purple); }
        .edit-profile-btn:active { opacity: .8; }

        /* ── Edit mode fields ── */
        .edit-fields {
          display: flex; flex-direction: column; align-items: stretch;
          gap: 10px; margin-top: 2px; text-align: left;
        }
        .edit-input {
          width: 100%; padding: 11px 14px;
          background: var(--surf2); border: 1.5px solid var(--border);
          border-radius: 12px; color: var(--dark);
          font-size: 15px; font-family: inherit;
          outline: none; transition: border-color .15s;
          box-sizing: border-box;
        }
        .edit-input::placeholder { color: var(--mid); }
        .edit-input:focus { border-color: var(--purple); }
        .edit-name  { font-size: 16px; font-weight: 700; }
        .edit-desig { font-size: 14px; }

        /* Designation suggestion dropdown */
        .desig-wrap { position: relative; }
        .desig-sugg {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 20;
          background: var(--surf); border: 1px solid var(--border);
          border-radius: 12px; overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,.2);
        }
        .sugg-item {
          display: block; width: 100%; padding: 11px 14px;
          text-align: left; background: transparent;
          border: none; border-bottom: 1px solid var(--border);
          color: var(--dark); font-size: 13px; font-family: inherit;
          cursor: pointer; transition: background .1s;
        }
        .sugg-item:last-child { border-bottom: none; }
        .sugg-item:hover { background: var(--surf2); }

        /* Save / Cancel row */
        .edit-actions {
          display: flex; gap: 10px; margin-top: 4px;
        }
        .btn-cancel {
          flex: 1; padding: 12px;
          background: var(--surf2); border: 1.5px solid var(--border);
          border-radius: 12px; color: var(--mid);
          font-size: 14px; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: opacity .15s;
        }
        .btn-cancel:disabled { opacity: .5; }
        .btn-save {
          flex: 2; padding: 12px;
          background: var(--purple); border: none;
          border-radius: 12px; color: #fff;
          font-size: 14px; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: opacity .15s;
        }
        .btn-save:disabled { opacity: .6; cursor: not-allowed; }
        .btn-save:not(:disabled):active { opacity: .85; }

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
          background: var(--surf); border: 1.5px solid var(--border);
          border-radius: var(--rmd); padding: 12px;
          cursor: pointer; text-align: left;
          display: flex; flex-direction: column; gap: 8px;
          transition: border-color .18s, box-shadow .18s, background .18s;
          font-family: inherit; color: var(--dark);
        }
        .th-card:hover  { border-color: var(--border2); background: var(--surf2); }
        .th-card.active { border-color: var(--purple); box-shadow: 0 0 0 1px var(--purple); }
        .th-card:active { opacity: .88; }
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
          padding: 11px 0; border-bottom: 1px solid var(--border);
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
