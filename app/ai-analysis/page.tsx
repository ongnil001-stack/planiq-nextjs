'use client';
import React from 'react';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fetchExpandedSchedules } from '@/lib/scheduleExpand';
import BottomNav from '@/components/layout/BottomNav';
import SmartReschedulePanel from '@/components/SmartReschedulePanel';

// ─── Types ────────────────────────────────────────────────────────────────────
interface WeeklyResult {
  workload_score: number;
  summary: string;
  recommendations: { icon: string; title: string; detail: string }[];
  issues: { severity: string; title: string; detail: string }[];
}
interface BriefItem {
  type: 'priority' | 'conflict' | 'suggestion' | 'win';
  title: string;
  body: string;
  accent: string;
}
interface BriefResult {
  headline: string;
  items: BriefItem[];
}

// ─── Monthly summary (computed client-side) ──────────────────────────────────
// The edge function only produces today/week briefs, so we build the monthly
// focus summary deterministically from the (recurrence-expanded) occurrences:
// totals, busy days, overload risks, high-priority tasks, free days, focus area.
interface MonthInput { start_time: string; title: string; priority: string; is_completed: boolean; type: string }
function generateMonthSummary(scheds: MonthInput[], now: Date): BriefResult {
  const y = now.getFullYear(), m = now.getMonth();
  const monthStart = new Date(y, m, 1);
  const monthEnd   = new Date(y, m + 1, 0, 23, 59, 59, 999);
  const daysInMonth = monthEnd.getDate();
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const mon3 = monthName.slice(0, 3);

  const inMonth = scheds.filter(s => { const d = new Date(s.start_time); return d >= monthStart && d <= monthEnd; });
  const perDay: Record<number, number> = {};
  for (const s of inMonth) { const d = new Date(s.start_time).getDate(); perDay[d] = (perDay[d] ?? 0) + 1; }
  const busyDays     = Object.keys(perDay).map(Number).filter(d => perDay[d] >= 4).sort((a, b) => a - b);
  const overloadDays = Object.keys(perDay).map(Number).filter(d => perDay[d] >= 6).sort((a, b) => a - b);
  const activeDays   = Object.keys(perDay).length;
  const todayDate = now.getDate();
  let freeFuture = 0;
  for (let d = Math.max(1, todayDate); d <= daysInMonth; d++) if (!perDay[d]) freeFuture++;

  const total     = inMonth.length;
  const pending   = inMonth.filter(s => !s.is_completed);
  const completed = inMonth.filter(s => s.is_completed);
  const high      = pending.filter(s => s.priority === 'high');
  const typeCounts: Record<string, number> = {};
  for (const s of pending) typeCounts[s.type] = (typeCounts[s.type] ?? 0) + 1;
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  const fmtDays = (arr: number[]) =>
    arr.slice(0, 6).map(d => `${mon3} ${d}`).join(', ') + (arr.length > 6 ? ` +${arr.length - 6} more` : '');

  const items: BriefItem[] = [];
  items.push({
    type: 'priority', accent: '#7C6AF0',
    title: `${total} activit${total === 1 ? 'y' : 'ies'} this month`,
    body: `${pending.length} pending · ${completed.length} done across ${activeDays} active day${activeDays === 1 ? '' : 's'} in ${monthName}.`,
  });
  if (overloadDays.length) items.push({
    type: 'conflict', accent: '#FF6B8A',
    title: `${overloadDays.length} day${overloadDays.length === 1 ? '' : 's'} at overload risk`,
    body: `Heavy load on ${fmtDays(overloadDays)}. Consider spreading tasks to lighter days.`,
  });
  else if (busyDays.length) items.push({
    type: 'suggestion', accent: '#00C6FF',
    title: `${busyDays.length} busy day${busyDays.length === 1 ? '' : 's'} ahead`,
    body: `Fuller days: ${fmtDays(busyDays)}. Plan buffers around them.`,
  });
  if (high.length) items.push({
    type: 'priority', accent: '#FDCB6E',
    title: `${high.length} high-priority task${high.length === 1 ? '' : 's'}`,
    body: high.slice(0, 4).map(s => s.title).join(', ') + (high.length > 4 ? `, +${high.length - 4} more` : ''),
  });
  if (freeFuture > 0) items.push({
    type: 'win', accent: '#00C896',
    title: `${freeFuture} open day${freeFuture === 1 ? '' : 's'} remaining`,
    body: 'Free days left this month — good for deep work, catch-up, or rest.',
  });
  if (topType && pending.length > 1) items.push({
    type: 'suggestion', accent: '#7C6AF0',
    title: `Focus area: ${topType}`,
    body: `Most pending items are ${topType}s — batch them together for momentum.`,
  });
  if (!total) items.push({
    type: 'win', accent: '#00C896',
    title: `${monthName} is wide open`,
    body: 'Nothing scheduled yet — a clean slate to plan around your goals.',
  });

  const headline = total
    ? `${total} activit${total === 1 ? 'y' : 'ies'} in ${monthName}${busyDays.length ? ` · ${busyDays.length} busy day${busyDays.length === 1 ? '' : 's'}` : ''}`
    : `${monthName} is clear — plan ahead!`;
  return { headline, items };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SEV: Record<string, { color: string; bg: string; label: string }> = {
  high:   { color: '#FF3B30', bg: 'rgba(255,59,48,.10)',   label: 'High' },
  medium: { color: '#FF9F43', bg: 'rgba(255,159,67,.10)',  label: 'Medium' },
  low:    { color: '#FDCB6E', bg: 'rgba(253,203,110,.10)', label: 'Low' },
};
function hexRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}
function isOverdue(s: ExistingSchedule): boolean {
  if (s.is_completed) return false;
  const deadline = s.end_time ? new Date(s.end_time) : new Date(s.start_time);
  return deadline < new Date();
}
function daysOverdueCount(s: ExistingSchedule): number {
  const deadline = s.end_time ? new Date(s.end_time) : new Date(s.start_time);
  return Math.max(0, Math.floor((Date.now() - deadline.getTime()) / 86_400_000));
}
function scoreColor(s: number) {
  return s >= 80 ? '#FF6B8A' : s >= 60 ? '#FF9F43' : s >= 30 ? '#00C896' : '#00C6FF';
}
function scoreLabel(s: number) {
  return s >= 80 ? 'Overloaded' : s >= 60 ? 'Moderate' : s >= 30 ? 'On Track' : 'Light';
}
function TypeIconSVG({ type }: { type: string }) {
  if (type === 'priority') return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  );
  if (type === 'conflict') return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 4L3 19h18L12 4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M12 10v4M12 17v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
  if (type === 'suggestion') return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 3C9.24 3 7 5.24 7 8c0 1.85 1 3.47 2.5 4.37V15h5v-2.63C16 11.47 17 9.85 17 8c0-2.76-2.24-5-5-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M9.5 19h5M10.5 21h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
  // win / default — check circle
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
      <div style={{
        width:34, height:34, borderRadius:10, flexShrink:0,
        background:'var(--pur-lt, rgba(124,106,240,.15))',
        border:'1px solid rgba(124,106,240,.22)',
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'var(--purple)',
      }}>{icon}</div>
      <div>
        <p style={{ margin:0, fontSize:13, fontWeight:800, color:'var(--dark)', letterSpacing:'-.1px' }}>{title}</p>
        {sub && <p style={{ margin:0, fontSize:11, color:'var(--mid)', marginTop:1 }}>{sub}</p>}
      </div>
    </div>
  );
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      background: accent ? `rgba(${hexRgb(accent)},.07)` : 'var(--glass-bg, var(--surf))',
      border: `1px solid ${accent ? `rgba(${hexRgb(accent)},.22)` : 'var(--glass-border, rgba(255,255,255,.09))'}`,
      borderRadius:16, padding:'14px 16px', marginBottom:10,
      backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
    }}>
      {children}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background:'var(--glass-bg, var(--surf))',
      border:'1px solid var(--glass-border, rgba(255,255,255,.09))',
      borderRadius:16, padding:'14px 16px', marginBottom:10,
    }}>
      {[80, 60, 90].map((w, i) => (
        <div key={i} style={{
          height:12, borderRadius:6, marginBottom:8,
          background:'var(--border2, rgba(255,255,255,.08))',
          width:`${w}%`, animation:'pulse-soft 1.6s ease-in-out infinite',
          animationDelay:`${i * 0.15}s`,
        }} />
      ))}
    </div>
  );
}

interface ExistingSchedule {
  id: string; title: string; type: string; priority: string;
  start_time: string; end_time: string | null;
  all_day: boolean; is_completed: boolean; timezone: string | null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AIAnalysisPage() {
  const router = useRouter();
  const supabase = createClient();

  const [weeklyResult, setWeeklyResult]   = useState<WeeklyResult | null>(null);
  const [todayBrief,   setTodayBrief]     = useState<BriefResult | null>(null);
  const [weekBrief,    setWeekBrief]      = useState<BriefResult | null>(null);
  const [monthBrief,   setMonthBrief]     = useState<BriefResult | null>(null);
  const [analyzing,    setAnalyzing]      = useState(false);
  const [lastRun,      setLastRun]        = useState<string | null>(null);
  const [schedCount,   setSchedCount]     = useState(0);
  const [initLoading,  setInitLoading]    = useState(true);
  const [weekSchedules, setWeekSchedules] = useState<ExistingSchedule[]>([]);

  // ── Load last saved analysis on mount ──────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Last saved weekly analysis
      const { data: analysis } = await supabase
        .from('ai_analyses').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).single();

      if (analysis) {
        setWeeklyResult({
          workload_score: analysis.workload_score ?? 0,
          summary:        analysis.summary ?? '',
          recommendations: (analysis.recommendations as WeeklyResult['recommendations']) ?? [],
          issues:          (analysis.issues as WeeklyResult['issues']) ?? [],
        });
        setLastRun(new Date(analysis.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }));
      }

      // Count this week's schedules
      const now = new Date();
      const wStart = new Date(now); wStart.setDate(now.getDate() - now.getDay()); wStart.setHours(0,0,0,0);
      const wEnd   = new Date(wStart); wEnd.setDate(wStart.getDate() + 6); wEnd.setHours(23,59,59,999);
      const { count } = await supabase.from('schedules').select('*', { count:'exact', head:true })
        .eq('user_id', user.id)
        .gte('start_time', wStart.toISOString())
        .lte('start_time', wEnd.toISOString());
      setSchedCount(count ?? 0);

      // Store week schedules for SmartReschedulePanel
      const { data: scheds2 } = await supabase.from('schedules').select('*')
        .eq('user_id', user!.id)
        .gte('start_time', wStart.toISOString())
        .lte('start_time', wEnd.toISOString());
      setWeekSchedules((scheds2 ?? []).map(s => ({
        id: s.id, title: s.title, type: s.type, priority: s.priority,
        start_time: s.start_time, end_time: s.end_time,
        all_day: s.all_day ?? false, is_completed: s.is_completed,
        timezone: s.timezone ?? null,
      })));
      setInitLoading(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Run full analysis ──────────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    };

    // Load schedules: overdue (30 days back) + this week + rest of month
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date();
    const wStart   = new Date(now); wStart.setDate(now.getDate() - now.getDay()); wStart.setHours(0,0,0,0);
    const wEnd     = new Date(wStart); wEnd.setDate(wStart.getDate() + 6); wEnd.setHours(23,59,59,999);
    const mEnd     = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const lookback = new Date(now.getTime() - 30 * 86_400_000); // 30 days back for overdue

    // Base rows (for the reschedule panel, which acts on real DB rows) +
    // recurrence-expanded occurrences (so the AI briefs reflect recurring activities).
    const { data: scheds } = await supabase.from('schedules').select('*')
      .eq('user_id', user!.id)
      .gte('start_time', lookback.toISOString())
      .lte('start_time', mEnd.toISOString())
      .order('start_time', { ascending: true });
    const expandedScheds = await fetchExpandedSchedules(supabase, user!.id, lookback, mEnd);

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timeFmt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    const dateFmt: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };

    const rawSchedules: ExistingSchedule[] = (scheds ?? []).map(s => ({
      id: s.id, title: s.title, type: s.type, priority: s.priority,
      start_time: s.start_time, end_time: s.end_time,
      all_day: s.all_day ?? false, is_completed: s.is_completed,
      timezone: s.timezone ?? null,
    }));
    setWeekSchedules(rawSchedules.filter(s => {
      const d = new Date(s.start_time);
      return d >= wStart && d <= wEnd;
    }));

    // Build enriched schedule list with overdue flags for the AI — uses the
    // recurrence-expanded occurrences so weekly/monthly briefs count recurring items.
    const schedules = expandedScheds.map(s => {
      const sd = new Date(s.start_time);
      const ed = s.end_time ? new Date(s.end_time) : null;
      const over = isOverdue(s);
      return {
        id: s.id, title: s.title, type: s.type, priority: s.priority,
        start_time: s.start_time, end_time: s.end_time,
        all_day: s.all_day ?? false, is_completed: s.is_completed,
        is_overdue: over,
        days_overdue: over ? daysOverdueCount(s) : 0,
        start_display: s.all_day ? 'All day' : sd.toLocaleTimeString('en-US', timeFmt),
        end_display:   ed && !s.all_day ? ed.toLocaleTimeString('en-US', timeFmt) : undefined,
        date_display:  sd.toLocaleDateString('en-US', dateFmt),
      };
    });

    const overdueCount = schedules.filter(s => s.is_overdue).length;

    // Fire all 4 in parallel
    try {
      const [wRes, todayRes, weekRes] = await Promise.allSettled([
        fetch(`${BASE}/functions/v1/analyze-schedule`, {
          method:'POST', headers,
          body: JSON.stringify({
            action: 'weekly_analysis', timezone: tz,
            schedules: schedules.filter(s => { const d=new Date(s.start_time); return d>=wStart&&d<=wEnd; }),
            overdue_count: overdueCount,
            dateRange: { from: wStart.toDateString(), to: wEnd.toDateString() },
          }),
        }),
        fetch(`${BASE}/functions/v1/analyze-schedule`, {
          method:'POST', headers,
          body: JSON.stringify({ action:'daily_brief', mode:'today', overdue_count: overdueCount, schedules, timezone: tz }),
        }),
        fetch(`${BASE}/functions/v1/analyze-schedule`, {
          method:'POST', headers,
          body: JSON.stringify({ action:'daily_brief', mode:'week', overdue_count: overdueCount, schedules, timezone: tz }),
        }),
      ]);

      // Monthly brief is computed client-side (the edge function only does today/week).
      setMonthBrief(generateMonthSummary(expandedScheds, now));

      if (wRes.status === 'fulfilled' && wRes.value.ok) {
        const d = await wRes.value.json();
        setWeeklyResult(d);
      }
      if (todayRes.status === 'fulfilled' && todayRes.value.ok) {
        const d = await todayRes.value.json();
        setTodayBrief(d);
      }
      if (weekRes.status === 'fulfilled' && weekRes.value.ok) {
        const d = await weekRes.value.json();
        setWeekBrief(d);
      }
      setLastRun(new Date().toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }));
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  }, [supabase, router]);

  const sc   = weeklyResult?.workload_score ?? 0;
  const circ = 2 * Math.PI * 30;

  // ── Page styles ─────────────────────────────────────────────────────────────
  const PAGE: React.CSSProperties = {
    minHeight: '100dvh',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'inherit',
    color: 'var(--dark)',
  };
  const HDR: React.CSSProperties = {
    paddingTop: 'max(env(safe-area-inset-top, 0px), 52px)',
    paddingBottom: 14,
    paddingLeft: 20,
    paddingRight: 20,
    background: 'var(--glass-bg, var(--surf))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--glass-border, var(--border))',
    flexShrink: 0,
  };
  const SCROLL: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 18px 100px',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
  };
  const SECTION: React.CSSProperties = { marginBottom: 24 };
  const SEC_LABEL: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '.6px',
    textTransform: 'uppercase', color: 'var(--lite)', marginBottom: 10,
  };

  return (
    <div style={PAGE}>

      {/* ── Header ── */}
      <div style={HDR}>
        {/* Breadcrumb */}
        <button onClick={() => router.back()} style={{
          display:'flex', alignItems:'center', gap:5, marginBottom:8,
          background:'none', border:'none', cursor:'pointer', padding:0,
          color:'var(--purple)', fontSize:12, fontWeight:700, fontFamily:'inherit',
          WebkitTapHighlightColor:'transparent',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Focus Hub
        </button>

        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
          <div>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:5,
              padding:'2px 10px', borderRadius:20,
              background:'var(--pur-lt, rgba(124,106,240,.15))',
              border:'1px solid rgba(124,106,240,.25)',
              fontSize:10, fontWeight:700, color:'var(--purple)', letterSpacing:'.5px',
              marginBottom:6,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L4.09 12.11C3.69 12.59 4.04 13.33 4.67 13.33H11L10.5 21.5C10.47 22 11.13 22.22 11.42 21.81L20.24 10.25C20.61 9.75 20.25 9.04 19.63 9.04H13.5L13 2Z" fill="currentColor"/>
              </svg>
              FOCUS HUB
            </div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'var(--dark)', lineHeight:1.2 }}>AI Analysis</h1>
            <p style={{ margin:'3px 0 0', fontSize:12, color:'var(--mid)' }}>
              {schedCount} item{schedCount !== 1 ? 's' : ''} this week
              {lastRun ? ` · Last run ${lastRun}` : ''}
            </p>
          </div>

          {/* Analyze button */}
          <button onClick={runAnalysis} disabled={analyzing || initLoading}
            style={{
              display:'flex', alignItems:'center', gap:7,
              padding:'10px 16px', borderRadius:14,
              background: analyzing ? 'rgba(124,106,240,.20)' : 'var(--gradient)',
              border:'none', color:'#fff',
              fontSize:13, fontWeight:700, fontFamily:'inherit',
              cursor: analyzing ? 'default' : 'pointer',
              opacity: initLoading ? .5 : 1,
              boxShadow: analyzing ? 'none' : '0 4px 16px rgba(124,106,240,.35)',
              transition:'all .18s', flexShrink:0,
              WebkitTapHighlightColor:'transparent',
            }}>
            {analyzing ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                style={{ animation:'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"
                  strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 3L14.5 9L21 9.75L16.4 14.1L17.8 20.5L12 17.3L6.2 20.5L7.6 14.1L3 9.75L9.5 9L12 3Z"
                  stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
            )}
            {analyzing ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div style={SCROLL}>

        {/* Loading skeleton */}
        {analyzing && (
          <div style={{ paddingTop:8 }}>
            <AILoadingIndicator sub="Generating personalised insights" />
            {[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {!analyzing && (
          <>
            {/* ── 0. SMART RESCHEDULE ── */}
            <div style={SECTION}>
              <p style={SEC_LABEL}>0 · Smart Reschedule</p>
              <SmartReschedulePanel
                schedules={weekSchedules}
                onApplied={() => {
                  // Refresh week schedules after a move is applied
                  supabase.auth.getUser().then(({ data: { user } }) => {
                    if (!user) return;
                    const n = new Date();
                    const ws = new Date(n); ws.setDate(n.getDate()-n.getDay()); ws.setHours(0,0,0,0);
                    const we = new Date(ws); we.setDate(ws.getDate()+6); we.setHours(23,59,59,999);
                    supabase.from('schedules').select('*')
                      .eq('user_id', user.id)
                      .gte('start_time', ws.toISOString())
                      .lte('start_time', we.toISOString())
                      .then(({ data }) => setWeekSchedules((data ?? []).map(s => ({
                        id: s.id, title: s.title, type: s.type, priority: s.priority,
                        start_time: s.start_time, end_time: s.end_time,
                        all_day: s.all_day ?? false, is_completed: s.is_completed,
                        timezone: s.timezone ?? null,
                      }))));
                  });
                }}
              />
            </div>

            {/* ── 1. TODAY'S INSIGHT ── */}
            <div style={SECTION}>
              <p style={SEC_LABEL}>1 · Today&apos;s Insight</p>
              <SectionHeader icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="13" r="5" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M12 3v3M4.22 6.22l2.12 2.12M20 6.22l-2.12 2.12M2 13h3M19 13h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>} title="Today's Insight"
                sub={new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })} />

              {todayBrief ? (
                <>
                  <p style={{ fontSize:15, fontWeight:700, color:'var(--dark)', marginBottom:12, lineHeight:1.4 }}>
                    {todayBrief.headline}
                  </p>
                  {todayBrief.items.map((item, i) => (
                    <Card key={i} accent={item.accent}>
                      <div style={{ display:'flex', gap:10 }}>
                        <span style={{ display:"flex", alignItems:"center", justifyContent:"center", color: item.accent ?? "var(--purple)", flexShrink:0, marginTop:1 }}><TypeIconSVG type={item.type} /></span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ margin:0, fontSize:13, fontWeight:700, color:item.accent, marginBottom:4 }}>{item.title}</p>
                          <p style={{ margin:0, fontSize:12, color:'var(--mid)', lineHeight:1.6 }}>{item.body}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </>
              ) : (
                <Card>
                  <p style={{ margin:0, fontSize:13, color:'var(--mid)', textAlign:'center', padding:'8px 0' }}>
                    Tap <strong style={{ color:'var(--purple)' }}>Analyze</strong> above to generate today&apos;s insight
                  </p>
                </Card>
              )}
            </div>

            {/* ── 2. SCHEDULE RISKS ── */}
            <div style={SECTION}>
              <p style={SEC_LABEL}>2 · Schedule Risks</p>
              <SectionHeader icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4L3 19h18L12 4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  <path d="M12 10v4M12 16.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>} title="Schedule Risks"
                sub={weeklyResult?.issues?.length ? `${weeklyResult.issues.length} issue${weeklyResult.issues.length !== 1 ? 's' : ''} detected` : 'No issues detected'} />

              {weeklyResult?.issues?.length ? (
                weeklyResult.issues.map((issue, i) => {
                  const s = SEV[issue.severity] ?? SEV.low;
                  return (
                    <div key={i} style={{
                      display:'flex', alignItems:'flex-start', gap:12,
                      padding:'12px 14px', borderRadius:14, marginBottom:8,
                      background: s.bg,
                      border:`1px solid rgba(${hexRgb(s.color)},.25)`,
                    }}>
                      <div style={{
                        flexShrink:0, marginTop:2,
                        padding:'2px 7px', borderRadius:20,
                        background:`rgba(${hexRgb(s.color)},.18)`,
                        fontSize:10, fontWeight:700, color:s.color, letterSpacing:'.3px',
                      }}>{s.label}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:0, fontSize:13, fontWeight:700, color:'var(--dark)', marginBottom:3 }}>{issue.title}</p>
                        <p style={{ margin:0, fontSize:12, color:'var(--mid)', lineHeight:1.5 }}>{issue.detail}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <Card>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--mint,#2DD4BF)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
                        <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <p style={{ margin:0, fontSize:13, color:'var(--mid)' }}>
                      {weeklyResult ? 'No schedule risks detected — great planning!' : 'Run an analysis to check for schedule conflicts and overload'}
                    </p>
                  </div>
                </Card>
              )}
            </div>

            {/* ── 3. RECOMMENDED ACTIONS ── */}
            <div style={SECTION}>
              <p style={SEC_LABEL}>3 · Recommended Actions</p>
              <SectionHeader icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M16.24 7.76l-3.18 6.36-6.36 3.18 3.18-6.36 6.36-3.18z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="1" fill="currentColor"/>
                </svg>} title="Recommended Actions"
                sub={weeklyResult?.recommendations?.length ? `${weeklyResult.recommendations.length} suggestions` : 'Powered by PlanIQ AI'} />

              {weeklyResult?.recommendations?.length ? (
                weeklyResult.recommendations.map((rec, i) => (
                  <Card key={i}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                      <div style={{
                        width:32, height:32, borderRadius:10, flexShrink:0,
                        background:'var(--pur-lt, rgba(124,106,240,.15))',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:16,
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:0, fontSize:13, fontWeight:700, color:'var(--dark)', marginBottom:4 }}>{rec.title}</p>
                        <p style={{ margin:0, fontSize:12, color:'var(--mid)', lineHeight:1.6 }}>{rec.detail}</p>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <Card>
                  <p style={{ margin:0, fontSize:13, color:'var(--mid)', textAlign:'center', padding:'8px 0' }}>
                    {weeklyResult ? 'No recommendations at this time' : 'Run an analysis to get personalised action steps'}
                  </p>
                </Card>
              )}
            </div>

            {/* ── 4. THIS WEEK'S FOCUS ── */}
            <div style={SECTION}>
              <p style={SEC_LABEL}>4 · This Week&apos;s Focus</p>
              <SectionHeader icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <circle cx="8" cy="15" r="1" fill="currentColor"/>
                  <circle cx="12" cy="15" r="1" fill="currentColor"/>
                  <circle cx="16" cy="15" r="1" fill="currentColor"/>
                </svg>} title="This Week's Focus"
                sub={(() => { const n=new Date(); const s=new Date(n); s.setDate(n.getDate()-n.getDay()); const e=new Date(s); e.setDate(s.getDate()+6); return `${s.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${e.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`; })()} />

              {weekBrief ? (
                <>
                  <p style={{ fontSize:15, fontWeight:700, color:'var(--dark)', marginBottom:12, lineHeight:1.4 }}>
                    {weekBrief.headline}
                  </p>
                  {weekBrief.items.map((item, i) => (
                    <Card key={i} accent={item.accent}>
                      <div style={{ display:'flex', gap:10 }}>
                        <span style={{ display:"flex", alignItems:"center", justifyContent:"center", color: item.accent ?? "var(--purple)", flexShrink:0, marginTop:1 }}><TypeIconSVG type={item.type} /></span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ margin:0, fontSize:13, fontWeight:700, color:item.accent, marginBottom:4 }}>{item.title}</p>
                          <p style={{ margin:0, fontSize:12, color:'var(--mid)', lineHeight:1.6 }}>{item.body}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </>
              ) : (
                <Card>
                  <p style={{ margin:0, fontSize:13, color:'var(--mid)', textAlign:'center', padding:'8px 0' }}>
                    Tap <strong style={{ color:'var(--purple)' }}>Analyze</strong> to get your weekly focus summary
                  </p>
                </Card>
              )}
            </div>

            {/* ── 5. THIS MONTH'S FOCUS ── */}
            <div style={SECTION}>
              <p style={SEC_LABEL}>5 · This Month&apos;s Focus</p>
              <SectionHeader icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M7 14h4M7 17h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>} title="This Month's Focus"
                sub={new Date().toLocaleDateString('en-US', { month:'long', year:'numeric' })} />

              {monthBrief ? (
                <>
                  <p style={{ fontSize:15, fontWeight:700, color:'var(--dark)', marginBottom:12, lineHeight:1.4 }}>
                    {monthBrief.headline}
                  </p>
                  {monthBrief.items.map((item, i) => (
                    <Card key={i} accent={item.accent}>
                      <div style={{ display:'flex', gap:10 }}>
                        <span style={{ display:'flex', alignItems:'center', justifyContent:'center', color: item.accent ?? 'var(--purple)', flexShrink:0, marginTop:1 }}><TypeIconSVG type={item.type} /></span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ margin:0, fontSize:13, fontWeight:700, color:item.accent, marginBottom:4 }}>{item.title}</p>
                          <p style={{ margin:0, fontSize:12, color:'var(--mid)', lineHeight:1.6 }}>{item.body}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </>
              ) : (
                <Card>
                  <p style={{ margin:0, fontSize:13, color:'var(--mid)', textAlign:'center', padding:'8px 0' }}>
                    Tap <strong style={{ color:'var(--purple)' }}>Analyze</strong> to get your monthly focus summary
                  </p>
                </Card>
              )}
            </div>

            {/* ── 6. PRODUCTIVITY NOTES ── */}
            <div style={SECTION}>
              <p style={SEC_LABEL}>6 · Productivity Notes</p>
              <SectionHeader icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 18L9 11l4 4 3-4 4 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 21h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>} title="Productivity Notes"
                sub="Workload score + AI summary" />

              {weeklyResult ? (
                <>
                  {/* Score ring */}
                  <Card>
                    <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                      <div style={{ position:'relative', flexShrink:0 }}>
                        <svg width="68" height="68" viewBox="0 0 68 68">
                          <circle cx="34" cy="34" r="30" fill="none"
                            stroke="var(--border2, rgba(255,255,255,.08))" strokeWidth="5"/>
                          <circle cx="34" cy="34" r="30" fill="none"
                            stroke={scoreColor(sc)} strokeWidth="5"
                            strokeDasharray={circ}
                            strokeDashoffset={circ * (1 - sc / 100)}
                            strokeLinecap="round"
                            transform="rotate(-90 34 34)"
                            style={{ transition:'stroke-dashoffset .6s ease' }}/>
                        </svg>
                        <div style={{
                          position:'absolute', inset:0,
                          display:'flex', flexDirection:'column',
                          alignItems:'center', justifyContent:'center',
                        }}>
                          <span style={{ fontSize:16, fontWeight:900, color:scoreColor(sc), lineHeight:1 }}>{sc}</span>
                          <span style={{ fontSize:8, color:'var(--lite)', fontWeight:700, letterSpacing:'.3px' }}>/100</span>
                        </div>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ margin:0, fontSize:14, fontWeight:800, color:scoreColor(sc), marginBottom:3 }}>
                          {scoreLabel(sc)}
                        </p>
                        <p style={{ margin:0, fontSize:11, color:'var(--mid)', lineHeight:1.5 }}>
                          Workload score for this week
                        </p>
                        <div style={{
                          marginTop:8, height:4, borderRadius:2, overflow:'hidden',
                          background:'var(--border2, rgba(255,255,255,.08))',
                        }}>
                          <div style={{
                            height:'100%', borderRadius:2,
                            background:`linear-gradient(90deg, ${scoreColor(sc)}, ${scoreColor(sc)}aa)`,
                            width:`${sc}%`, transition:'width .6s ease',
                          }} />
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* AI Summary */}
                  {weeklyResult.summary && (
                    <Card>
                      <div style={{ display:'flex', gap:10 }}>
                        <div style={{
                          flexShrink:0, width:28, height:28, borderRadius:8,
                          background:'var(--pur-lt, rgba(124,106,240,.15))',
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M12 3L14.5 9L21 9.75L16.4 14.1L17.8 20.5L12 17.3L6.2 20.5L7.6 14.1L3 9.75L9.5 9L12 3Z"
                              stroke="var(--purple)" strokeWidth="2" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <p style={{ margin:0, fontSize:13, color:'var(--mid)', lineHeight:1.7, flex:1 }}>
                          {weeklyResult.summary}
                        </p>
                      </div>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <div style={{ textAlign:'center', padding:'12px 0' }}>
                    <div style={{ fontSize:28, marginBottom:8 }}>📊</div>
                    <p style={{ margin:0, fontSize:13, fontWeight:700, color:'var(--dark)', marginBottom:4 }}>
                      No analysis yet
                    </p>
                    <p style={{ margin:0, fontSize:12, color:'var(--mid)' }}>
                      Tap Analyze above to generate your workload score and productivity insights.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
