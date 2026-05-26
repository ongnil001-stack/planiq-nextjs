'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
function scoreColor(s: number) {
  return s >= 80 ? '#FF6B8A' : s >= 60 ? '#FF9F43' : s >= 30 ? '#00C896' : '#00C6FF';
}
function scoreLabel(s: number) {
  return s >= 80 ? 'Overloaded' : s >= 60 ? 'Moderate' : s >= 30 ? 'On Track' : 'Light';
}
function typeIcon(type: string) {
  return type === 'priority' ? '🎯' : type === 'conflict' ? '⚠️' : type === 'suggestion' ? '💡' : '✅';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
      <div style={{
        width:34, height:34, borderRadius:10, flexShrink:0,
        background:'var(--pur-lt, rgba(124,106,240,.15))',
        border:'1px solid rgba(124,106,240,.22)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:16,
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
  all_day: boolean; is_completed: boolean;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AIAnalysisPage() {
  const router = useRouter();
  const supabase = createClient();

  const [weeklyResult, setWeeklyResult]   = useState<WeeklyResult | null>(null);
  const [todayBrief,   setTodayBrief]     = useState<BriefResult | null>(null);
  const [weekBrief,    setWeekBrief]      = useState<BriefResult | null>(null);
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

    // Load schedules for this week
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date();
    const wStart = new Date(now); wStart.setDate(now.getDate() - now.getDay()); wStart.setHours(0,0,0,0);
    const wEnd   = new Date(wStart); wEnd.setDate(wStart.getDate() + 6); wEnd.setHours(23,59,59,999);
    const { data: scheds } = await supabase.from('schedules').select('*')
      .eq('user_id', user!.id)
      .gte('start_time', wStart.toISOString())
      .lte('start_time', wEnd.toISOString());

    const schedules = (scheds ?? []).map(s => ({
      id: s.id, title: s.title, type: s.type, priority: s.priority,
      start_time: s.start_time, end_time: s.end_time,
      all_day: s.all_day ?? false, is_completed: s.is_completed,
    }));
    setWeekSchedules(schedules);

    // Fire all 3 in parallel
    try {
      const [wRes, todayRes, weekRes] = await Promise.allSettled([
        fetch(`${BASE}/functions/v1/analyze-schedule`, {
          method:'POST', headers,
          body: JSON.stringify({
            action: 'weekly_analysis',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            schedules,
            dateRange: { from: wStart.toDateString(), to: wEnd.toDateString() },
          }),
        }),
        fetch(`${BASE}/functions/v1/analyze-schedule`, {
          method:'POST', headers,
          body: JSON.stringify({ action: 'daily_brief', mode: 'today', schedules, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        }),
        fetch(`${BASE}/functions/v1/analyze-schedule`, {
          method:'POST', headers,
          body: JSON.stringify({ action: 'daily_brief', mode: 'week', schedules, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        }),
      ]);

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
            <p style={{ ...SEC_LABEL, marginBottom:12 }}>Claude is thinking…</p>
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
                      }))));
                  });
                }}
              />
            </div>

            {/* ── 1. TODAY'S INSIGHT ── */}
            <div style={SECTION}>
              <p style={SEC_LABEL}>1 · Today&apos;s Insight</p>
              <SectionHeader icon="🌅" title="Today's Insight"
                sub={new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })} />

              {todayBrief ? (
                <>
                  <p style={{ fontSize:15, fontWeight:700, color:'var(--dark)', marginBottom:12, lineHeight:1.4 }}>
                    {todayBrief.headline}
                  </p>
                  {todayBrief.items.map((item, i) => (
                    <Card key={i} accent={item.accent}>
                      <div style={{ display:'flex', gap:10 }}>
                        <span style={{ fontSize:16, lineHeight:1, marginTop:1 }}>{typeIcon(item.type)}</span>
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
              <SectionHeader icon="⚠️" title="Schedule Risks"
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
                    <span style={{ fontSize:20 }}>✅</span>
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
              <SectionHeader icon="💡" title="Recommended Actions"
                sub={weeklyResult?.recommendations?.length ? `${weeklyResult.recommendations.length} suggestions` : 'Powered by Claude AI'} />

              {weeklyResult?.recommendations?.length ? (
                weeklyResult.recommendations.map((rec, i) => (
                  <Card key={i}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                      <div style={{
                        width:32, height:32, borderRadius:10, flexShrink:0,
                        background:'var(--pur-lt, rgba(124,106,240,.15))',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:16,
                      }}>{rec.icon}</div>
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
              <SectionHeader icon="📅" title="This Week's Focus"
                sub={(() => { const n=new Date(); const s=new Date(n); s.setDate(n.getDate()-n.getDay()); const e=new Date(s); e.setDate(s.getDate()+6); return `${s.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${e.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`; })()} />

              {weekBrief ? (
                <>
                  <p style={{ fontSize:15, fontWeight:700, color:'var(--dark)', marginBottom:12, lineHeight:1.4 }}>
                    {weekBrief.headline}
                  </p>
                  {weekBrief.items.map((item, i) => (
                    <Card key={i} accent={item.accent}>
                      <div style={{ display:'flex', gap:10 }}>
                        <span style={{ fontSize:16, lineHeight:1, marginTop:1 }}>{typeIcon(item.type)}</span>
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

            {/* ── 5. PRODUCTIVITY NOTES ── */}
            <div style={SECTION}>
              <p style={SEC_LABEL}>5 · Productivity Notes</p>
              <SectionHeader icon="📊" title="Productivity Notes"
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
