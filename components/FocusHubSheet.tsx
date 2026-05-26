'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Schedule } from '@/types/database';
import { formatTime } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewMode = 'today' | 'week';

interface AiBriefItem {
  type: 'priority' | 'conflict' | 'suggestion' | 'win';
  title: string;
  body: string;
  accent: string;
}

interface AiBriefResult {
  headline: string;
  items: AiBriefItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PRIORITY_COLOR: Record<string, string> = {
  critical: '#FF3B30',
  high:     '#FF6B8A',
  medium:   '#FDCB6E',
  low:      '#55D6C2',
};
const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }
function startOfWeek(d: Date) {
  const c = new Date(d); c.setDate(c.getDate() - c.getDay()); c.setHours(0, 0, 0, 0); return c;
}
function endOfWeek(d: Date) {
  const c = startOfWeek(d); c.setDate(c.getDate() + 6); c.setHours(23, 59, 59, 999); return c;
}
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ─── Fallback AI generator (used when Edge Function is unavailable) ───────────
function generateLocalBrief(schedules: Schedule[], mode: ViewMode): AiBriefResult {
  const now = new Date(), today = toDateStr(now);
  const inRange = mode === 'today'
    ? schedules.filter(s => toDateStr(new Date(s.start_time)) === today)
    : schedules.filter(s => { const d = new Date(s.start_time); return d >= startOfWeek(now) && d <= endOfWeek(now); });
  const pending   = inRange.filter(s => !s.is_completed);
  const completed = inRange.filter(s => s.is_completed);
  const critical  = pending.filter(s => s.priority === 'critical');
  const high      = pending.filter(s => s.priority === 'high');
  const items: AiBriefItem[] = [];

  const topItems = [...pending].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]).slice(0, 3);

  if (topItems.length > 0) {
    items.push({
      type: 'priority', accent: '#7C6AF0',
      title: mode === 'today' ? `${pending.length} item${pending.length !== 1 ? 's' : ''} need attention today` : `${pending.length} pending this week`,
      body: topItems.map(s => s.title).join(', '),
    });
  } else {
    items.push({
      type: 'win', accent: '#00C896',
      title: mode === 'today' ? 'All clear today! 🎉' : 'Clean week ahead!',
      body: mode === 'today' ? 'No pending items. Great time to plan ahead or take a breather.' : "No pending items this week. You're on top of things.",
    });
  }
  if (critical.length > 0) items.push({
    type: 'conflict', accent: '#FF3B30',
    title: `${critical.length} critical item${critical.length !== 1 ? 's' : ''} need immediate attention`,
    body: critical.map(s => `${s.title}  ${formatTime(s.start_time)}`).join(' · '),
  });
  if (high.length > 2 && pending.length <= 8) items.push({
    type: 'suggestion', accent: '#00C6FF',
    title: `${high.length} high-priority items queued`,
    body: high.slice(0, 3).map(s => s.title).join(', ') + (high.length > 3 ? `, +${high.length - 3} more` : ''),
  });
  if (completed.length > 0) {
    const pct = Math.round(completed.length / (inRange.length || 1) * 100);
    items.push({
      type: 'win', accent: '#00C896',
      title: `${completed.length} item${completed.length !== 1 ? 's' : ''} completed — ${pct}% done`,
      body: mode === 'today' ? `Great progress! ${pending.length} still pending.` : `Strong week! ${completed.length} of ${inRange.length} items wrapped up.`,
    });
  }

  const headline = topItems.length > 0
    ? (mode === 'today' ? `${pending.length} task${pending.length !== 1 ? 's' : ''} ahead of you today` : `${pending.length} things on your plate this week`)
    : (mode === 'today' ? 'Clear day — time to get ahead!' : 'Great week so far!');

  return { headline, items };
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { open: boolean; onClose: () => void; }

export default function FocusHubSheet({ open, onClose }: Props) {
  const router = useRouter();
  const [mode,      setMode]      = useState<ViewMode>('today');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [marking,   setMarking]   = useState<string | null>(null);
  const [aiBrief,   setAiBrief]   = useState<AiBriefResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState(false);

  // ── Scroll lock ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.position    = 'fixed';
      document.body.style.top         = `-${scrollY}px`;
      document.body.style.left        = '0';
      document.body.style.right       = '0';
      document.body.style.overflow    = 'hidden';
      document.body.style.touchAction = 'none';
      return () => {
        document.body.style.position    = '';
        document.body.style.top         = '';
        document.body.style.left        = '';
        document.body.style.right       = '';
        document.body.style.overflow    = '';
        document.body.style.touchAction = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);

  // ── Load schedules ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const now = new Date();
    const { data } = await supabase.from('schedules').select('*')
      .eq('user_id', user.id)
      .gte('start_time', startOfWeek(now).toISOString())
      .lte('start_time', endOfWeek(now).toISOString())
      .order('start_time', { ascending: true });
    setSchedules(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  // ── Call AI Edge Function ───────────────────────────────────────────────────
  const fetchAiBrief = useCallback(async (scheduleData: Schedule[], viewMode: ViewMode) => {
    setAiLoading(true);
    setAiError(false);
    setAiBrief(null);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // No session — fall back to local
      setAiBrief(generateLocalBrief(scheduleData, viewMode));
      setAiLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-schedule`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'daily_brief',
            mode: viewMode,
            schedules: scheduleData.map(s => ({
              id: s.id,
              title: s.title,
              type: s.type,
              priority: s.priority,
              start_time: s.start_time,
              end_time: s.end_time,
              all_day: s.all_day ?? false,
              is_completed: s.is_completed,
            })),
          }),
        }
      );

      if (!res.ok) throw new Error(`API ${res.status}`);

      const data = await res.json() as AiBriefResult;
      if (data.headline && Array.isArray(data.items)) {
        setAiBrief(data);
      } else {
        throw new Error('Invalid response shape');
      }
    } catch (err) {
      console.warn('FocusHub AI fallback:', err);
      setAiError(true);
      setAiBrief(generateLocalBrief(scheduleData, viewMode));
    } finally {
      setAiLoading(false);
    }
  }, []);

  // Trigger AI fetch after schedules load OR when mode changes
  useEffect(() => {
    if (!loading && open && schedules !== null) {
      fetchAiBrief(schedules, mode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, mode, open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  async function markDone(id: string) {
    setMarking(id);
    const supabase = createClient();
    await supabase.from('schedules').update({ is_completed: true }).eq('id', id);
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, is_completed: true } : s));
    setMarking(null);
  }

  const now          = new Date(), today = toDateStr(now);
  const todayItems   = schedules.filter(s => toDateStr(new Date(s.start_time)) === today)
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  const weekItems    = schedules.filter(s => !s.is_completed)
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  const displayItems = mode === 'today' ? todayItems : weekItems;
  const dayName      = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr      = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  // ── Styles ───────────────────────────────────────────────────────────────────
  const OVERLAY: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 300,
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    opacity: open ? 1 : 0,
    pointerEvents: open ? 'auto' : 'none',
    transition: 'opacity .22s ease',
    touchAction: 'none',
  };

  const SHEET: React.CSSProperties = {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    maxHeight: '92dvh', borderRadius: '24px 24px 0 0',
    background: 'var(--surf, #131424)',
    border: '1px solid var(--glass-border, rgba(255,255,255,0.09))',
    borderBottom: 'none',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    transform: open ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform .32s cubic-bezier(.32,1,.52,1)',
    touchAction: 'pan-y',
  };

  const HANDLE: React.CSSProperties = {
    width: '36px', height: '4px', borderRadius: '2px',
    background: 'var(--border2, rgba(255,255,255,0.18))',
    margin: '12px auto 0', flexShrink: 0,
  };

  const T_TITLE:  React.CSSProperties = { fontSize: '22px', fontWeight: 800, color: 'var(--dark)', lineHeight: 1.2, margin: 0 };
  const T_SUB:    React.CSSProperties = { fontSize: '13px', color: 'var(--mid)', marginTop: '3px' };
  const T_SEC:    React.CSSProperties = { fontSize: '11px', fontWeight: 700, letterSpacing: '.6px', textTransform: 'uppercase' as const, color: 'var(--lite)', marginBottom: '10px' };
  const T_BODY:   React.CSSProperties = { fontSize: '12px', lineHeight: 1.6, color: 'var(--mid)', whiteSpace: 'pre-line' };

  const BADGE: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '3px 10px', borderRadius: '20px',
    background: 'var(--pur-lt, rgba(124,106,240,0.15))',
    border: '1px solid rgba(124,106,240,0.25)',
    fontSize: '11px', fontWeight: 700, letterSpacing: '.4px',
    color: 'var(--purple)', marginBottom: '6px',
  };

  const TAB = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '9px 0', borderRadius: '12px',
    border: active ? '1px solid var(--border2, rgba(124,106,240,0.35))' : '1px solid var(--border, rgba(255,255,255,0.07))',
    background: active ? 'var(--pur-lt, rgba(124,106,240,0.18))' : 'var(--surf2, rgba(255,255,255,0.04))',
    color: active ? 'var(--purple)' : 'var(--lite)',
    fontSize: '13px', fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all .15s ease', WebkitTapHighlightColor: 'transparent',
  });

  const SCROLL: React.CSSProperties = {
    flex: 1, overflowY: 'auto',
    padding: '16px 20px',
    paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
    WebkitOverflowScrolling: 'touch' as const,
    scrollbarWidth: 'none' as const,
    overscrollBehavior: 'contain',
  };

  const AI_CARD = (accent: string): React.CSSProperties => ({
    background: `rgba(${hexToRgb(accent)},0.08)`,
    border: `1px solid rgba(${hexToRgb(accent)},0.22)`,
    borderRadius: '16px', padding: '14px 16px', marginBottom: '10px',
  });

  const AI_TITLE = (accent: string): React.CSSProperties => ({
    fontSize: '13px', fontWeight: 700, color: accent, marginBottom: '6px',
  });

  const S_ITEM: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 14px',
    background: 'var(--surf2, rgba(255,255,255,0.04))',
    border: '1px solid var(--border, rgba(255,255,255,0.07))',
    borderRadius: '14px', marginBottom: '8px',
  };

  const S_TITLE = (done: boolean): React.CSSProperties => ({
    fontSize: '13px', fontWeight: 600,
    color: done ? 'var(--lite)' : 'var(--dark)',
    textDecoration: done ? 'line-through' : 'none',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
  });

  const S_META: React.CSSProperties = { fontSize: '11px', color: 'var(--lite)', marginTop: '2px' };
  const DIVIDER: React.CSSProperties = { height: '1px', background: 'var(--border)', margin: '4px 20px 14px', flexShrink: 0 };

  const QA_ROW: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
    padding: '0 20px', paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))', flexShrink: 0,
  };

  const QA_BTN = (accent: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
    padding: '13px 0', borderRadius: '14px',
    background: `rgba(${hexToRgb(accent)},0.12)`,
    border: `1px solid rgba(${hexToRgb(accent)},0.24)`,
    color: accent, fontSize: '13px', fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
  });

  const isLoadingAny = loading || aiLoading;
  const aiFocusItems = aiBrief?.items ?? [];
  const aiHeadline   = aiBrief?.headline ?? '';

  return (
    <div style={OVERLAY} onClick={onClose}>
      <div style={SHEET} onClick={e => e.stopPropagation()}>

        <div style={HANDLE} />

        {/* Header */}
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <div style={BADGE}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L4.09 12.11C3.69 12.59 4.04 13.33 4.67 13.33H11L10.5 21.5C10.47 22 11.13 22.22 11.42 21.81L20.24 10.25C20.61 9.75 20.25 9.04 19.63 9.04H13.5L13 2Z" fill="currentColor"/>
            </svg>
            FOCUS HUB
          </div>
          <h2 style={T_TITLE}>{dayName}</h2>
          <p style={T_SUB}>{dateStr} · AI-powered daily brief</p>
        </div>

        {/* Toggle */}
        <div style={{ display: 'flex', gap: '8px', padding: '14px 20px 0', flexShrink: 0 }}>
          <button style={TAB(mode === 'today')} onClick={() => setMode('today')}>Today</button>
          <button style={TAB(mode === 'week')}  onClick={() => setMode('week')}>This Week</button>
        </div>

        {/* Content */}
        <div style={SCROLL}>
          {isLoadingAny ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--lite)', fontSize: '14px' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>⚡</div>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--mid)' }}>
                {loading ? 'Loading your schedule…' : 'Claude is thinking…'}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--lite)' }}>
                {loading ? '' : 'Generating personalised insights'}
              </p>
            </div>
          ) : (
            <>
              {/* AI Brief */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <p style={{ ...T_SEC, marginBottom: 0 }}>
                  {aiError ? '⚠ AI Brief (offline mode)' : '✦ AI Brief'}
                </p>
                <button
                  onClick={() => fetchAiBrief(schedules, mode)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--purple)', fontSize: '11px', fontWeight: 700,
                    padding: '2px 6px', borderRadius: '8px', fontFamily: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  ↻ Refresh
                </button>
              </div>

              {/* AI Headline */}
              {aiHeadline ? (
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--dark)', marginBottom: '12px', lineHeight: 1.4 }}>
                  {aiHeadline}
                </p>
              ) : null}

              {/* AI Insight Cards */}
              {aiFocusItems.map((item, i) => (
                <div key={i} style={AI_CARD(item.accent)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '16px', lineHeight: 1, marginTop: '1px' }}>
                      {item.type === 'priority' ? '🎯' : item.type === 'conflict' ? '⚠️' : item.type === 'suggestion' ? '💡' : '✅'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={AI_TITLE(item.accent)}>{item.title}</p>
                      <p style={T_BODY}>{item.body}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Schedule items */}
              {displayItems.length > 0 && (
                <>
                  <p style={{ ...T_SEC, marginTop: '8px' }}>
                    {mode === 'today' ? "Today's Items" : 'Pending This Week'}
                  </p>
                  {displayItems.slice(0, 8).map(s => (
                    <div key={s.id} style={S_ITEM}>
                      <div style={{
                        width: '3px', height: '36px', borderRadius: '2px', flexShrink: 0,
                        background: PRIORITY_COLOR[s.priority] ?? 'var(--purple)',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={S_TITLE(s.is_completed)}>{s.title}</p>
                        <p style={S_META}>{formatTime(s.start_time)}<span style={{ marginLeft: '6px', opacity: .7 }}>{s.type}</span></p>
                      </div>
                      {!s.is_completed ? (
                        <button onClick={() => markDone(s.id)} disabled={marking === s.id}
                          style={{
                            flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%',
                            border: '1.5px solid rgba(0,200,150,0.40)',
                            background: marking === s.id ? 'rgba(0,200,150,0.25)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', WebkitTapHighlightColor: 'transparent', fontFamily: 'inherit',
                          }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12L10 17L19 7" stroke="#00C896" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      ) : (
                        <div style={{
                          flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%',
                          background: 'rgba(0,200,150,0.20)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12L10 17L19 7" stroke="#00C896" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                  {displayItems.length > 8 && (
                    <p style={{ fontSize: '12px', color: 'var(--lite)', textAlign: 'center', marginTop: '4px' }}>
                      +{displayItems.length - 8} more — view in Schedule
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Quick actions */}
        <div style={DIVIDER} />
        <div style={QA_ROW}>
          <button style={QA_BTN('#7C6AF0')} onClick={() => { onClose(); router.push('/schedule/new'); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
            Add Schedule
          </button>
          <button style={QA_BTN('#00C6FF')} onClick={() => { onClose(); router.push('/calendar'); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="17" rx="3" stroke="currentColor" strokeWidth="2"/>
              <path d="M3 11H21M8 3V7M16 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            View Schedule
          </button>
          <button style={QA_BTN('#FF6B8A')} onClick={() => { onClose(); router.push('/ai-analysis'); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L14.5 9L21 9.75L16.4 14.1L17.8 20.5L12 17.3L6.2 20.5L7.6 14.1L3 9.75L9.5 9L12 3Z"
                stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            AI Priorities
          </button>
          <button style={QA_BTN('#FDCB6E')} onClick={() => { onClose(); router.push('/dashboard'); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M3 10.5L12 3L21 10.5V21C21 21.55 20.55 22 20 22H15V17H9V22H4C3.45 22 3 21.55 3 21V10.5Z"
                stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}
