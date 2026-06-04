'use client';
import AILoadingIndicator from '@/components/AILoadingIndicator';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { fetchExpandedSchedules, setOccurrenceCompletion } from '@/lib/scheduleExpand';
import type { DisplaySchedule } from '@/lib/recurrence';
import type { Schedule } from '@/types/database';
import { formatTime } from '@/lib/utils';
import SwipeDeleteRow from '@/components/SwipeDeleteRow';
import AddScheduleSheet from '@/components/AddScheduleSheet';

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewMode = 'today' | 'week' | 'month';

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
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ─── Overdue detection ────────────────────────────────────────────────────────
function isOverdue(s: Schedule, now: Date = new Date()): boolean {
  if (s.is_completed) return false;
  // Use end_time as the deadline when available; otherwise start_time
  const deadline = s.end_time ? new Date(s.end_time) : new Date(s.start_time);
  return deadline < now;
}

function daysOverdue(s: Schedule, now: Date = new Date()): number {
  const deadline = s.end_time ? new Date(s.end_time) : new Date(s.start_time);
  return Math.max(0, Math.floor((now.getTime() - deadline.getTime()) / 86_400_000));
}

// ─── Fallback AI generator (used when Edge Function is unavailable) ───────────
function generateLocalBrief(schedules: Schedule[], mode: ViewMode): AiBriefResult {
  const now = new Date(), today = toDateStr(now);

  // Separate overdue items first — these need their own handling
  const overdue = schedules.filter(s => isOverdue(s, now));

  const inRange = mode === 'today'
    ? schedules.filter(s => !isOverdue(s, now) && toDateStr(new Date(s.start_time)) === today)
    : mode === 'week'
    ? schedules.filter(s => !isOverdue(s, now) && (() => { const d = new Date(s.start_time); return d >= startOfWeek(now) && d <= endOfWeek(now); })())
    : schedules.filter(s => !isOverdue(s, now) && (() => { const d = new Date(s.start_time); return d >= startOfMonth(now) && d <= endOfMonth(now); })());

  const pending   = inRange.filter(s => !s.is_completed);
  const completed = inRange.filter(s => s.is_completed);
  const high      = pending.filter(s => s.priority === 'high');
  const items: AiBriefItem[] = [];

  // ── Overdue card — always shown first if any exist ──
  if (overdue.length > 0) {
    const lines = overdue.slice(0, 4).map(s => {
      const d = daysOverdue(s, now);
      const due = new Date(s.end_time || s.start_time)
        .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const dLabel = d === 0 ? 'due today' : d + ' day' + (d === 1 ? '' : 's') + ' overdue';
      return '\u2022 ' + s.title + ' \u2014 ' + dLabel + ' (was due ' + due + '). \u2192 Reschedule or mark done.';
    }).join('\n') + (overdue.length > 4 ? '\n+' + (overdue.length - 4) + ' more overdue items.' : '');
    items.push({
      type: 'conflict', accent: '#FF6B8A',
      title: `${overdue.length} overdue activit${overdue.length === 1 ? 'y' : 'ies'} need your attention`,
      body: lines,
    });
  }

  const topItems = [...pending].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]).slice(0, 3);

  if (topItems.length > 0) {
    items.push({
      type: 'priority', accent: '#7C6AF0',
      title: mode === 'today'  ? `${pending.length} item${pending.length !== 1 ? 's' : ''} on your list today`
              : mode === 'week'   ? `${pending.length} pending this week`
              :                    `${pending.length} activit${pending.length !== 1 ? 'ies' : 'y'} this month`,
      body: topItems.map(s => s.title).join(', '),
    });
  } else if (overdue.length === 0) {
    items.push({
      type: 'win', accent: '#00C896',
      title: mode === 'today'  ? 'All clear today'
              : mode === 'week'   ? 'Clean week ahead'
              :                    'Month looking clear',
      body: mode === 'today'  ? 'No pending items. Great time to plan ahead or take a breather.'
           : mode === 'week'  ? "No pending items this week. You're on top of things."
           :                    "Nothing pending this month. Excellent planning — use this time to get ahead.",
    });
  }

  if (high.length > 2 && pending.length <= 8) items.push({
    type: 'suggestion', accent: '#00C6FF',
    title: `${high.length} high-priority items queued`,
    body: high.slice(0, 3).map(s => s.title).join(', ') + (high.length > 3 ? `, +${high.length - 3} more` : ''),
  });
  if (completed.length > 0) {
    const pct = Math.round(completed.length / ((inRange.length + completed.length) || 1) * 100);
    items.push({
      type: 'win', accent: '#00C896',
      title: `${completed.length} item${completed.length !== 1 ? 's' : ''} completed — ${pct}% done`,
      body: mode === 'today'
        ? `Great progress! ${pending.length} still pending.`
        : `Strong week! ${completed.length} of ${inRange.length + completed.length} items wrapped up.`,
    });
  }

  const headline = overdue.length > 0
    ? `${overdue.length} overdue item${overdue.length === 1 ? '' : 's'} — action needed`
    : topItems.length > 0
      ? mode === 'today'  ? `${pending.length} task${pending.length !== 1 ? 's' : ''} ahead of you today`
      : mode === 'week'   ? `${pending.length} things on your plate this week`
      :                     `${pending.length} activit${pending.length !== 1 ? 'ies' : 'y'} scheduled this month`
      : mode === 'today'  ? 'Clear day — time to get ahead!'
      : mode === 'week'   ? 'Great week so far!'
      :                     'Month looking clear — great planning!';

  return { headline, items };
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { open: boolean; onClose: () => void; }

export default function FocusHubSheet({ open, onClose }: Props) {
  const router = useRouter();
  const [mode,      setMode]      = useState<ViewMode>('today');
  const [schedules, setSchedules] = useState<DisplaySchedule[]>([]);
  const [userId,    setUserId]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [marking,   setMarking]   = useState<string | null>(null);
  const [aiBrief,   setAiBrief]   = useState<AiBriefResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState(false);
  const [rescheduleItem, setRescheduleItem] = useState<Schedule | null>(null);

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
    setUserId(user.id);
    const now = new Date();
    // Load: overdue history (30 days back) + full current month ahead, with
    // recurring schedules expanded into occurrences and per-occurrence completion.
    // Covers Today, This Week, AND This Month views in one fetch.
    const lookbackDate = new Date(now.getTime() - 30 * 86_400_000);
    const monthEnd     = endOfMonth(now);
    const data = await fetchExpandedSchedules(supabase, user.id, lookbackDate, monthEnd);
    setSchedules(data);
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
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            mode: viewMode,
            // Pass completed_count separately so the AI can generate win cards
            // but ONLY send pending, NON-OVERDUE schedules for conflict/priority analysis.
            // Overdue items are handled separately in the Overdue section — the AI must
            // never suggest a future slot for a task whose time has already passed.
            completed_count: scheduleData.filter(s => s.is_completed).length,
            schedules: scheduleData
              .filter(s => !s.is_completed && !isOverdue(s))   // exclude done AND overdue
              .map(s => {
                const startD = new Date(s.start_time);
                const endD   = s.end_time ? new Date(s.end_time) : null;
                const timeFmt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
                const dateFmt: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
                return {
                  id: s.id,
                  title: s.title,
                  type: s.type,
                  priority: s.priority,
                  start_time: s.start_time,
                  end_time: s.end_time,
                  all_day: s.all_day ?? false,
                  is_completed: false,
                  start_display: s.all_day ? 'All day' : startD.toLocaleTimeString('en-US', timeFmt),
                  end_display:   endD && !s.all_day ? endD.toLocaleTimeString('en-US', timeFmt) : undefined,
                  date_display:  startD.toLocaleDateString('en-US', dateFmt),
                };
              }),
          }),
        }
      );

      if (!res.ok) throw new Error(`API ${res.status}`);

      const data = await res.json() as AiBriefResult;
      if (data.headline && Array.isArray(data.items)) {
        // Surface overdue separately at the top of the brief (the AI only saw
        // active items, so it can't mention them itself).
        const overdueCount = scheduleData.filter(s => isOverdue(s)).length;
        if (overdueCount > 0) {
          data.items = [
            {
              type: 'conflict', accent: '#FF6B8A',
              title: `${overdueCount} overdue item${overdueCount === 1 ? '' : 's'} need a decision`,
              body: 'These are past their time — reschedule, mark completed, mark missed, or clear them in the Overdue section below.',
            },
            ...data.items,
          ];
        }
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

  async function markDone(sched: DisplaySchedule) {
    setMarking(sched.id);
    const db = createClient();
    // Per-occurrence completion (recurring) or row completion (non-recurring)
    await setOccurrenceCompletion(db, sched, userId, true);
    const updated = schedules.map(s => s.id === sched.id ? { ...s, is_completed: true } : s);
    setSchedules(updated);
    setMarking(null);
    // Refresh brief — completed items are filtered out so AI won't re-flag them
    fetchAiBrief(updated, mode);
  }

  async function deleteSchedule(sched: DisplaySchedule) {
    const db = createClient();
    if (sched.recurrence_rule || sched._is_virtual) {
      // Recurring occurrence — skip just this date (don't delete the whole series)
      const baseId  = sched._base_id ?? sched.id;
      const occDate = sched._occurrence_date ?? sched.start_time.slice(0, 10);
      const { data: base } = await db.from('schedules').select('excluded_dates').eq('id', baseId).single();
      const existing: string[] = base?.excluded_dates ? JSON.parse(base.excluded_dates) : [];
      if (!existing.includes(occDate)) existing.push(occDate);
      await db.from('schedules').update({ excluded_dates: JSON.stringify(existing) }).eq('id', baseId);
    } else {
      await db.from('schedules').delete().eq('id', sched.id);
    }
    const updated = schedules.filter(s => s.id !== sched.id);
    setSchedules(updated);
    fetchAiBrief(updated, mode);
  }

  // Mark an overdue item as missed — acknowledges it won't happen and removes it
  // from the overdue list (same removal as Clear; distinct intent/feedback).
  async function markMissed(sched: DisplaySchedule) {
    await deleteSchedule(sched);
    toast('Marked as missed', { icon: '🚫' });
  }

  // Reschedule an overdue item: open the editor anchored to TODAY with the start
  // floored to now, so the user moves it to a live future slot. For a recurring
  // occurrence, edit the real base row (the series), not the synthetic occurrence id.
  async function openReschedule(sched: DisplaySchedule) {
    const baseId = sched._base_id ?? sched.id;
    if (baseId !== sched.id) {
      const { data } = await createClient().from('schedules').select('*').eq('id', baseId).single();
      setRescheduleItem((data as Schedule) ?? sched);
    } else {
      setRescheduleItem(sched);
    }
  }

  const now          = new Date(), today = toDateStr(now);
  // Overdue: past their deadline, not completed — always shown separately at top
  const overdueItems = schedules
    .filter(s => isOverdue(s, now))
    .sort((a, b) => new Date(a.end_time || a.start_time).getTime() - new Date(b.end_time || b.start_time).getTime());
  // Today: scheduled for today, not overdue, not completed
  const todayItems   = schedules
    .filter(s => !isOverdue(s, now) && !s.is_completed && toDateStr(new Date(s.start_time)) === today)
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  // Week: upcoming this week, not overdue, not completed
  const weekItems    = schedules
    .filter(s => !isOverdue(s, now) && !s.is_completed && (() => { const d = new Date(s.start_time); return d > now && d <= endOfWeek(now); })())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  // Month: everything in the current month, not overdue, not completed
  const monthItems   = schedules
    .filter(s => !isOverdue(s, now) && !s.is_completed && (() => { const d = new Date(s.start_time); return d >= startOfMonth(now) && d <= endOfMonth(now); })())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const displayItems = mode === 'today' ? todayItems : mode === 'week' ? weekItems : monthItems;
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
          <p style={T_SUB}>
            {mode === 'today' ? `${dateStr} · AI-powered daily brief`
             : mode === 'week' ? `Week of ${now.toLocaleDateString('en-US',{month:'long',day:'numeric'})} · AI analysis`
             : `${now.toLocaleDateString('en-US',{month:'long',year:'numeric'})} · Monthly AI analysis`}
          </p>
        </div>

        {/* Toggle */}
        <div style={{ display: 'flex', gap: '6px', padding: '14px 20px 0', flexShrink: 0 }}>
          <button style={TAB(mode === 'today')} onClick={() => setMode('today')}>Today</button>
          <button style={TAB(mode === 'week')}  onClick={() => setMode('week')}>This Week</button>
          <button style={TAB(mode === 'month')} onClick={() => setMode('month')}>This Month</button>
        </div>

        {/* Content */}
        <div style={SCROLL}>
          {isLoadingAny ? (
            <AILoadingIndicator
              sub={loading ? undefined : 'Generating personalised insights'}
              size="lg"
            />
          ) : (
            <>
              {/* AI Brief */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <p style={{ ...T_SEC, marginBottom: 0 }}>
                  {aiError ? (
                  <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L12 6M12 18L12 22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12L6 12M18 12L22 12M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="rgba(255,200,0,.8)" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                    AI Brief · Offline
                  </span>
                ) : (
                  <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3C12 3 9 7 9 10a3 3 0 006 0c0-3-3-7-3-7z" stroke="var(--purple)" strokeWidth="1.7" strokeLinejoin="round"/>
                      <path d="M12 13v4M9 20h6" stroke="var(--purple)" strokeWidth="1.7" strokeLinecap="round"/>
                    </svg>
                    AI Brief
                  </span>
                )}
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
                      {item.type === 'priority' ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
                        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/>
                        <circle cx="12" cy="12" r="1" fill="currentColor"/>
                      </svg>
                    ) : item.type === 'conflict' ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M12 4L3 19h18L12 4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                        <path d="M12 10v4M12 16.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    ) : item.type === 'suggestion' ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M12 3C9.24 3 7 5.24 7 8c0 1.85 1 3.47 2.5 4.37V15h5v-2.63C16 11.47 17 9.85 17 8c0-2.76-2.24-5-5-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                        <path d="M9.5 19h5M10.5 21h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={AI_TITLE(item.accent)}>{item.title}</p>
                      <p style={T_BODY}>{item.body}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* ── OVERDUE ITEMS (always shown, all modes) ── */}
              {overdueItems.length > 0 && (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, marginBottom:10 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M12 4L3 19h18L12 4z" stroke="#FF6B8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 9v5m0 2.5v.5" stroke="#FF6B8A" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <p style={{ ...T_SEC, marginBottom:0, color:'#FF6B8A' }}>Overdue · {overdueItems.length}</p>
                  </div>
                  {overdueItems.map(s => {
                    const d = daysOverdue(s, now);
                    const dueDate = new Date(s.end_time || s.start_time)
                      .toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
                    return (
                      <SwipeDeleteRow key={s.id} onDelete={() => deleteSchedule(s)} undoLabel={`"${s.title}" deleted`} borderRadius={10}>
                        <div style={{ ...S_ITEM, background:'rgba(255,107,138,.07)', border:'1px solid rgba(255,107,138,.22)', flexDirection:'column', alignItems:'stretch', gap:8 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:'3px', height:'36px', borderRadius:'2px', flexShrink:0, background:'#FF6B8A' }} />
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ ...S_TITLE(false), color:'var(--dark)' }}>{s.title}</p>
                              <p style={{ ...S_META, color:'#FF6B8A', fontWeight:700 }}>
                                {d === 0 ? 'Due today' : `${d} day${d===1?'':'s'} overdue`} · was due {dueDate}
                              </p>
                            </div>
                            <span style={{ fontSize:9, fontWeight:800, color:'#FF6B8A', background:'rgba(255,107,138,.15)', padding:'3px 8px', borderRadius:8, flexShrink:0, textTransform:'uppercase', letterSpacing:'.4px' }}>
                              {s.priority}
                            </span>
                          </div>
                          {/* Action row — overdue items get practical next steps */}
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                            <button onClick={() => openReschedule(s)}
                              style={{ padding:'7px 0', borderRadius:10, border:'1px solid rgba(124,106,240,.35)', background:'rgba(124,106,240,.08)', color:'var(--purple,#7C6AF0)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 108-8M4 4v4h4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              Reschedule
                            </button>
                            <button onClick={() => markDone(s)} disabled={marking === s.id}
                              style={{ padding:'7px 0', borderRadius:10, border:'1px solid rgba(0,200,150,.35)', background:'rgba(0,200,150,.08)', color:'#00C896', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              {marking === s.id ? 'Saving…' : 'Completed'}
                            </button>
                            <button onClick={() => markMissed(s)}
                              style={{ padding:'7px 0', borderRadius:10, border:'1px solid rgba(160,160,180,.30)', background:'rgba(160,160,180,.08)', color:'var(--mid,#8A8AA0)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M5.5 5.5l13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                              Missed
                            </button>
                            <button onClick={() => deleteSchedule(s)}
                              style={{ padding:'7px 0', borderRadius:10, border:'1px solid rgba(255,107,138,.25)', background:'rgba(255,107,138,.07)', color:'#FF6B8A', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
                              Clear
                            </button>
                          </div>
                        </div>
                      </SwipeDeleteRow>
                    );
                  })}
                </>
              )}

              {/* ── TODAY'S ITEMS / UPCOMING THIS WEEK ── */}
              {displayItems.length > 0 && (
                <>
                  <p style={{ ...T_SEC, marginTop: overdueItems.length > 0 ? '16px' : '8px' }}>
                    {mode === 'today' ? "Today's Schedule" : mode === 'week' ? 'Upcoming This Week' : 'This Month'}
                  </p>
                  {displayItems.slice(0, 8).map(s => (
                    <SwipeDeleteRow key={s.id} onDelete={() => deleteSchedule(s)} undoLabel={`"${s.title}" deleted`} borderRadius={10}>
                      <div style={S_ITEM}>
                        <div style={{ width:'3px', height:'36px', borderRadius:'2px', flexShrink:0, background: PRIORITY_COLOR[s.priority] ?? 'var(--purple)' }} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={S_TITLE(s.is_completed)}>{s.title}</p>
                          <p style={S_META}>
                            {(mode === 'week' || mode === 'month') && (
                              <span style={{ marginRight:6 }}>
                                {new Date(s.start_time).toLocaleDateString('en-US',{ weekday:'short', month:'short', day:'numeric' })} ·{' '}
                              </span>
                            )}
                            {formatTime(s.start_time)}
                            <span style={{ marginLeft:'6px', opacity:.7 }}>{s.type}</span>
                          </p>
                        </div>
                        <button onClick={() => markDone(s)} disabled={marking === s.id}
                          style={{ flexShrink:0, width:'28px', height:'28px', borderRadius:'50%', border:'1.5px solid rgba(0,200,150,0.40)', background: marking===s.id ? 'rgba(0,200,150,0.25)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', WebkitTapHighlightColor:'transparent', fontFamily:'inherit' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 7" stroke="#00C896" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      </div>
                    </SwipeDeleteRow>
                  ))}
                  {displayItems.length > 8 && (
                    <p style={{ fontSize:'12px', color:'var(--lite)', textAlign:'center', marginTop:'4px' }}>
                      +{displayItems.length - 8} more — view in Schedule
                    </p>
                  )}
                </>
              )}

              {overdueItems.length === 0 && displayItems.length === 0 && (
                <p style={{ textAlign:'center', color:'var(--lite)', fontSize:13, marginTop:24, opacity:.6 }}>
                  {mode === 'today' ? 'Nothing on your schedule today.'
                   : mode === 'week' ? 'Nothing pending this week.'
                   : 'Nothing scheduled for the rest of this month.'}
                </p>
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

      {/* Reschedule an overdue item → edit anchored to today, floored to now */}
      {rescheduleItem && (
        <AddScheduleSheet
          open={!!rescheduleItem}
          selectedDate={new Date()}
          countryCode=""
          editSchedule={rescheduleItem}
          minTime={`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`}
          onClose={() => setRescheduleItem(null)}
          onSaved={() => { setRescheduleItem(null); toast.success('Rescheduled'); load(); }}
        />
      )}
    </div>
  );
}
