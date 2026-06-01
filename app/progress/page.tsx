'use client';
import SwipeDeleteRow from '@/components/SwipeDeleteRow';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { lateNote } from '@/lib/timeProgress';
import { createClient } from '@/lib/supabase/client';
import { fetchExpandedSchedules, setOccurrenceCompletion } from '@/lib/scheduleExpand';
import type { DisplaySchedule } from '@/lib/recurrence';
import BottomNav from '@/components/layout/BottomNav';

// ── helpers ───────────────────────────────────────────────────────────────────
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfDay(d: Date)         { const r = new Date(d); r.setHours(0,0,0,0); return r; }
function isoDate(d: Date)            { return d.toISOString().slice(0,10); }
const MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY3  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

interface Schedule {
  id: string; title: string; start_time: string; end_time: string;
  priority: string; is_completed: boolean; days_late?: number | null; completed_at?: string | null;
}
interface DayBucket { date: string; planned: number; done: number; }
interface WeekSummary { label: string; planned: number; done: number; rate: number; }

export default function ProgressPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [loading,       setLoading]       = useState(true);
  const [days,          setDays]          = useState<DayBucket[]>([]);
  const [weeks,         setWeeks]         = useState<WeekSummary[]>([]);
  const [streak,        setStreak]        = useState(0);
  const [totalDone,     setTotalDone]     = useState(0);
  const [totalPlanned,  setTotalPlanned]  = useState(0);
  const [completedList, setCompletedList] = useState<DisplaySchedule[]>([]);
  const [overdueList,   setOverdueList]   = useState<DisplaySchedule[]>([]);
  const [pendingList,   setPendingList]   = useState<DisplaySchedule[]>([]);
  const [userId,        setUserId]        = useState('');
  const [tab,           setTab]           = useState<'week'|'month'|'activity'>('week');
  const [modal,         setModal]         = useState<'done'|'pending'|'overdue'|'summary'|null>(null);

  const hdrRef = useRef<HTMLDivElement>(null);
  const [hdrH, setHdrH] = useState(84);

  useEffect(() => {
    if (!hdrRef.current) return;
    const ro = new ResizeObserver(e => { for (const x of e) setHdrH(Math.round(x.contentRect.height)); });
    ro.observe(hdrRef.current);
    setHdrH(hdrRef.current.offsetHeight);
    return () => ro.disconnect();
  }, []);

  // Lock body scroll when modal is open (iOS PWA fix)
  useEffect(() => {
    if (modal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [modal]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      setUserId(user.id);
      const now   = new Date();
      const today = startOfDay(now);
      const from  = addDays(today, -27);
      // Window: 28 days back through 60 days ahead, recurring expanded with
      // per-occurrence completion so Progress reflects recurring activities too.
      const rangeEnd = addDays(today, 60); rangeEnd.setHours(23, 59, 59, 999);

      const schedules = await fetchExpandedSchedules(supabase, user.id, from, rangeEnd);

      // ── Day buckets (28 days) ──
      const map: Record<string, DayBucket> = {};
      for (let i = 0; i < 28; i++) {
        const d = isoDate(addDays(from, i));
        map[d] = { date: d, planned: 0, done: 0 };
      }
      schedules.forEach(s => {
        const d = s.start_time.slice(0,10);
        if (map[d]) { map[d].planned++; if (s.is_completed) map[d].done++; }
      });
      const dayList = Object.values(map);
      setDays(dayList);

      // ── 4-week summaries ──
      const wks: WeekSummary[] = [];
      for (let w = 0; w < 4; w++) {
        const wStart = addDays(from, w * 7);
        const wEnd   = addDays(wStart, 6);
        const sl     = dayList.slice(w * 7, w * 7 + 7);
        const p = sl.reduce((a,b) => a + b.planned, 0);
        const d = sl.reduce((a,b) => a + b.done,    0);
        wks.push({ label: `${MONTH[wStart.getMonth()]} ${wStart.getDate()}–${wEnd.getDate()}`, planned: p, done: d, rate: p > 0 ? Math.round((d/p)*100) : 0 });
      }
      setWeeks(wks);

      const tp = dayList.reduce((a,b) => a + b.planned, 0);
      const td = dayList.reduce((a,b) => a + b.done,    0);
      setTotalPlanned(tp); setTotalDone(td);

      // ── Streak: walk from yesterday backward, add today only if today already has completions ──
      // dayList is in ascending order (index 0 = oldest, last = today).
      // We skip index [last] (today) in the main loop to avoid zeroing a real streak at day-start.
      let s = 0;
      const lastIdx = dayList.length - 1;
      for (let i = lastIdx - 1; i >= 0; i--) {
        if (dayList[i].done > 0) s++; else break;
      }
      // Add today only if today has at least one completion
      if (dayList[lastIdx]?.done > 0) s++;
      setStreak(s);

      // ── Activity lists ──
      const todayIso = isoDate(today);
      setCompletedList(schedules.filter(s => s.is_completed).slice(-20).reverse());
      setOverdueList(schedules.filter(s =>
        !s.is_completed && s.end_time && new Date(s.end_time) < now
      ).reverse());
      setPendingList(schedules.filter(s =>
        !s.is_completed && (!s.end_time || new Date(s.end_time) >= now)
      ).slice(0, 10));

      setLoading(false);
    }
    load();
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const thisWeekDays    = days.slice(-7);
  const thisWeekPlanned = thisWeekDays.reduce((a,b) => a + b.planned, 0);
  const thisWeekDone    = thisWeekDays.reduce((a,b) => a + b.done,    0);
  const thisWeekRate    = thisWeekPlanned > 0 ? Math.round((thisWeekDone/thisWeekPlanned)*100) : 0;
  const overallRate     = totalPlanned    > 0 ? Math.round((totalDone/totalPlanned)*100)       : 0;
  const maxBar          = Math.max(...days.map(d => d.planned), 1);
  const todayIso        = isoDate(new Date());

  // Productivity score: blend of this-week rate (60%) + streak factor (40%)
  const streakFactor  = Math.min(streak * 5, 40);
  const prodScore     = Math.round(thisWeekRate * 0.6 + streakFactor);

  function scoreColor(r: number) {
    if (r >= 80) return 'var(--mint,#2DD4BF)';
    if (r >= 60) return 'var(--cyan,#00C6FF)';
    if (r >= 40) return 'var(--amber,#FDCB6E)';
    return 'var(--coral,#FF6B8A)';
  }
  function scoreLabel(r: number) {
    if (r >= 80) return 'Excellent';
    if (r >= 60) return 'On Track';
    if (r >= 40) return 'Average';
    return 'Needs Work';
  }
  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-US',{ hour:'numeric', minute:'2-digit', hour12:true });
  }
  function formatDate(iso: string) {
    const d = new Date(iso);
    return `${MONTH[d.getMonth()]} ${d.getDate()}`;
  }
  const PCOL: Record<string,string> = { critical:'#FF6B8A', high:'#FDCB6E', medium:'var(--cyan,#00C6FF)', low:'var(--mid)', normal:'var(--mid)' };

  if (loading) return (
    <div style={{ minHeight:'100dvh', background:'var(--bg,#080E1A)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid rgba(124,106,240,.2)', borderTopColor:'var(--purple,#7C6AF0)', animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Shared sub-styles ─────────────────────────────────────────────────────
  const card: React.CSSProperties = { background:'var(--surf)', border:'1px solid var(--border)', borderRadius:16, boxShadow:'0 2px 12px rgba(0,0,0,.07)', marginBottom:12 };
  const cardHdr: React.CSSProperties = { padding:'13px 16px 10px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:7 };
  const sectionTitle: React.CSSProperties = { fontSize:13, fontWeight:800, color:'var(--dark)' };

  async function deleteCompleted(s: DisplaySchedule) {
    const db = createClient();
    if (s.recurrence_rule || s._is_virtual) {
      // Recurring occurrence — just un-mark this occurrence (don't delete the series)
      await setOccurrenceCompletion(db, s, userId, false);
    } else {
      await db.from('schedules').delete().eq('id', s.id);
    }
    setCompletedList(prev => prev.filter(x => x.id !== s.id));
  }

  return (
    <div style={{ height:'100dvh', overflow:'hidden', background:'var(--bg)', display:'flex', flexDirection:'column', fontFamily:'inherit', color:'var(--dark)' }}>

      {/* ── Header ── */}
      <div ref={hdrRef} style={{ flexShrink:0, padding:'max(env(safe-area-inset-top,0px),14px) 20px 14px', background:'var(--glass-bg,var(--surf))', backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)', borderBottom:'1px solid var(--glass-border,var(--border))', transition:'background .25s ease,border-color .25s ease', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, letterSpacing:'-.4px', color:'var(--dark)' }}>Progress</div>
          <div style={{ fontSize:12, color:'var(--mid)', marginTop:1 }}>Last 28 days · {totalDone} tasks completed</div>
        </div>
        {/* Streak + score pills */}
        <div style={{ display:'flex', flexDirection:'column', gap:5, alignItems:'flex-end' }}>
          <button type="button" onClick={() => setModal('summary')} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:10, background:'var(--pur-lt,rgba(124,106,240,.12))', border:'1px solid var(--border2,rgba(124,106,240,.22))', cursor:'pointer', fontFamily:'inherit', WebkitTapHighlightColor:'transparent', touchAction:'manipulation' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2C12 2 7 7 7 12a5 5 0 0010 0c0-3-2-6-2-6s-1 2-2 2c-1 0-1-1-1-2z" stroke="var(--purple)" strokeWidth="1.8" strokeLinejoin="round"/></svg>
            <span style={{ fontSize:12, fontWeight:800, color:'var(--purple)' }}>{streak}</span>
            <span style={{ fontSize:10, color:'var(--mid)', fontWeight:600 }}>streak</span>
          </button>
          <button type="button" onClick={() => setModal('summary')} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:10, cursor:'pointer', fontFamily:'inherit', WebkitTapHighlightColor:'transparent', touchAction:'manipulation', background:`rgba(${prodScore>=80?'45,212,191':prodScore>=60?'0,198,255':prodScore>=40?'253,203,110':'255,107,138'},.12)`, border:`1px solid rgba(${prodScore>=80?'45,212,191':prodScore>=60?'0,198,255':prodScore>=40?'253,203,110':'255,107,138'},.25)` }}>
            <span style={{ fontSize:12, fontWeight:800, color:scoreColor(prodScore) }}>{prodScore}</span>
            <span style={{ fontSize:10, color:'var(--mid)', fontWeight:600 }}>score</span>
          </button>
        </div>
      </div>

      {/* ── Stat pills — OUTSIDE scroll container so iOS touch events are reliable ── */}
      <div style={{ flexShrink:0, padding:'12px 16px 0', background:'var(--bg)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {/* Done — clickable */}
          <button
            type="button"
            onClick={() => setModal('done')}
            style={{ padding:'12px 6px', borderRadius:12, textAlign:'center', background:'var(--surf)', border:'1px solid var(--border)', boxShadow:'0 1px 6px rgba(0,0,0,.06)', cursor:'pointer', fontFamily:'inherit', WebkitTapHighlightColor:'transparent', touchAction:'manipulation', display:'block', width:'100%' }}>
            <div style={{ fontSize:18, fontWeight:900, color:'var(--mint,#2DD4BF)', letterSpacing:'-.4px' }}>{totalDone}</div>
            <div style={{ fontSize:9, color:'var(--mid)', fontWeight:700, marginTop:3, textTransform:'uppercase', letterSpacing:'.3px' }}>Done</div>
          </button>
          {/* Pending — clickable */}
          <button
            type="button"
            onClick={() => setModal('pending')}
            style={{ padding:'12px 6px', borderRadius:12, textAlign:'center', background:'var(--surf)', border:'1px solid var(--border)', boxShadow:'0 1px 6px rgba(0,0,0,.06)', cursor:'pointer', fontFamily:'inherit', WebkitTapHighlightColor:'transparent', touchAction:'manipulation', display:'block', width:'100%' }}>
            <div style={{ fontSize:18, fontWeight:900, color:'var(--cyan,#00C6FF)', letterSpacing:'-.4px' }}>{pendingList.length}</div>
            <div style={{ fontSize:9, color:'var(--mid)', fontWeight:700, marginTop:3, textTransform:'uppercase', letterSpacing:'.3px' }}>Pending</div>
          </button>
          {/* Overdue — clickable */}
          <button
            type="button"
            onClick={() => setModal('overdue')}
            style={{ padding:'12px 6px', borderRadius:12, textAlign:'center', background:'var(--surf)', border: overdueList.length > 0 ? '1px solid rgba(255,107,138,.35)' : '1px solid var(--border)', boxShadow:'0 1px 6px rgba(0,0,0,.06)', cursor:'pointer', fontFamily:'inherit', WebkitTapHighlightColor:'transparent', touchAction:'manipulation', display:'block', width:'100%' }}>
            <div style={{ fontSize:18, fontWeight:900, color:overdueList.length > 0 ? 'var(--coral,#FF6B8A)' : 'var(--mid)', letterSpacing:'-.4px' }}>{overdueList.length}</div>
            <div style={{ fontSize:9, color:'var(--mid)', fontWeight:700, marginTop:3, textTransform:'uppercase', letterSpacing:'.3px' }}>Overdue</div>
          </button>
          {/* Rate — clickable → productivity summary */}
          <button
            type="button"
            onClick={() => setModal('summary')}
            style={{ padding:'12px 6px', borderRadius:12, textAlign:'center', background:'var(--surf)', border:'1px solid var(--border)', boxShadow:'0 1px 6px rgba(0,0,0,.06)', cursor:'pointer', fontFamily:'inherit', WebkitTapHighlightColor:'transparent', touchAction:'manipulation', display:'block', width:'100%' }}>
            <div style={{ fontSize:18, fontWeight:900, color:scoreColor(overallRate), letterSpacing:'-.4px' }}>{overallRate}%</div>
            <div style={{ fontSize:9, color:'var(--mid)', fontWeight:700, marginTop:3, textTransform:'uppercase', letterSpacing:'.3px' }}>Rate</div>
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex:1, overflowY:'auto', overscrollBehavior:'contain', padding:'12px 16px 0', maxHeight:`calc(100dvh - ${hdrH}px - 64px - max(env(safe-area-inset-bottom,0px),20px))` }}>
      <div style={{ paddingBottom:'16px' }}>

        {/* ── Productivity score bar — tap for details ── */}
        <div onClick={() => setModal('summary')} style={{ ...card, padding:'14px 16px', cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--dark)' }}>Productivity Score</div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:18, fontWeight:900, color:scoreColor(prodScore) }}>{prodScore}</span>
              <span style={{ fontSize:11, fontWeight:700, color:scoreColor(prodScore), background:`rgba(${prodScore>=80?'45,212,191':prodScore>=60?'0,198,255':prodScore>=40?'253,203,110':'255,107,138'},.12)`, padding:'2px 8px', borderRadius:6 }}>{scoreLabel(prodScore)}</span>
            </div>
          </div>
          <div style={{ height:8, borderRadius:4, background:'rgba(124,106,240,.10)', overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:4, width:`${prodScore}%`, background:`linear-gradient(90deg,var(--purple,#7C6AF0),${scoreColor(prodScore)})`, transition:'width .5s ease' }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
            <span style={{ fontSize:10, color:'var(--mid)' }}>This week: {thisWeekRate}% completion</span>
            <span style={{ fontSize:10, color:'var(--mid)' }}>Streak: {streak} days</span>
          </div>
        </div>

        {/* ── Tab toggle ── */}
        <div style={{ display:'flex', background:'var(--surf2,rgba(255,255,255,.04))', border:'1px solid var(--border)', borderRadius:12, padding:3, marginBottom:12 }}>
          {(['week','month','activity'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex:1, padding:'8px 4px', borderRadius:9, border:'none', cursor:'pointer',
              fontFamily:'inherit', fontSize:11, fontWeight:700,
              background: tab === t ? 'var(--purple,#7C6AF0)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--mid)', transition:'all .15s',
            }}>
              {t === 'week' ? 'This Week' : t === 'month' ? '4 Weeks' : 'Activity'}
            </button>
          ))}
        </div>

        {/* ══ THIS WEEK tab ══ */}
        {tab === 'week' && (<>
          {/* Bar chart */}
          <div style={{ ...card, padding:'16px 14px 12px' }}>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--dark)', marginBottom:14 }}>Daily Completion</div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:5, height:72 }}>
              {thisWeekDays.map((d) => {
                const dayDate = new Date(d.date + 'T12:00:00');
                const barH    = d.planned > 0 ? Math.max(8, Math.round((d.planned / maxBar) * 64)) : 3;
                const pct     = d.planned > 0 ? Math.round((d.done/d.planned)*100) : 0;
                const isToday = d.date === todayIso;
                return (
                  <div key={d.date} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                    <div style={{ width:'100%', position:'relative', height:barH, borderRadius:6, overflow:'hidden', background:'rgba(124,106,240,.10)' }}>
                      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:`${pct}%`, background: pct>=100?'var(--mint,#2DD4BF)':'var(--purple,#7C6AF0)', borderRadius:6, transition:'height .3s ease' }}/>
                    </div>
                    <span style={{ fontSize:9, fontWeight:700, color:isToday?'var(--purple)':'var(--mid)' }}>{DAY3[dayDate.getDay()].slice(0,1)}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display:'flex', gap:12, marginTop:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:8, height:8, borderRadius:2, background:'var(--purple)' }}/><span style={{ fontSize:10, color:'var(--mid)' }}>Partial</span></div>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:8, height:8, borderRadius:2, background:'var(--mint,#2DD4BF)' }}/><span style={{ fontSize:10, color:'var(--mid)' }}>Complete</span></div>
            </div>
          </div>

          {/* Day breakdown */}
          <div style={{ ...card }}>
            <div style={cardHdr}>
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="16" height="15" rx="3" stroke="var(--purple)" strokeWidth="1.5"/><path d="M2 8h16" stroke="var(--purple)" strokeWidth="1.5"/><path d="M6 5V2m8 3V2" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <span style={sectionTitle}>Day Breakdown</span>
            </div>
            {thisWeekDays.map((d, i) => {
              const dd      = new Date(d.date + 'T12:00:00');
              const rate    = d.planned > 0 ? Math.round((d.done/d.planned)*100) : null;
              const isToday = d.date === todayIso;
              const sc      = rate !== null ? scoreColor(rate) : 'var(--mid)';
              return (
                <div key={d.date} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderBottom: i < 6 ? '1px solid var(--border)' : 'none', background: isToday ? 'rgba(124,106,240,.04)' : 'transparent' }}>
                  <div style={{ width:40, flexShrink:0, textAlign:'center' }}>
                    <div style={{ fontSize:9, fontWeight:800, color:isToday?'var(--purple)':'var(--mid)', textTransform:'uppercase', letterSpacing:'.4px' }}>{DAY3[dd.getDay()]}</div>
                    <div style={{ fontSize:17, fontWeight:900, color:isToday?'var(--purple)':'var(--dark)' }}>{dd.getDate()}</div>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    {d.planned > 0 ? (<>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:11, color:'var(--mid)' }}>{d.done}/{d.planned} tasks</span>
                        <span style={{ fontSize:11, fontWeight:800, color:sc }}>{rate}%</span>
                      </div>
                      <div style={{ height:5, borderRadius:3, background:'rgba(124,106,240,.10)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:3, width:`${rate}%`, background: rate!>=100?'var(--mint,#2DD4BF)':'var(--purple,#7C6AF0)', transition:'width .4s ease' }}/>
                      </div>
                    </>) : <span style={{ fontSize:11, color:'var(--mid)', opacity:.6, fontStyle:'italic' }}>No tasks scheduled</span>}
                  </div>
                  {d.done > 0 && d.done >= d.planned && d.planned > 0 && (
                    <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(45,212,191,.15)', border:'1px solid rgba(45,212,191,.35)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg width="10" height="8" viewBox="0 0 13 10" fill="none"><polyline points="1,5 5,9 12,1" stroke="var(--mint,#2DD4BF)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>)}

        {/* ══ 4 WEEKS tab ══ */}
        {tab === 'month' && (<>
          {/* Sparkline */}
          <div style={{ ...card, padding:'16px 14px 12px' }}>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--dark)', marginBottom:4 }}>28-Day Trend</div>
            <div style={{ fontSize:11, color:'var(--mid)', marginBottom:12 }}>{totalDone} of {totalPlanned} tasks completed</div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:56 }}>
              {days.map((d) => {
                const barH  = d.planned > 0 ? Math.max(4, Math.round((d.planned/maxBar)*52)) : 2;
                const pct   = d.planned > 0 ? Math.round((d.done/d.planned)*100) : 0;
                const isToday = d.date === todayIso;
                return (
                  <div key={d.date} style={{ flex:1 }}>
                    <div style={{ width:'100%', position:'relative', height:barH, borderRadius:3, background:'rgba(124,106,240,.08)' }}>
                      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:`${pct}%`, background:isToday?'var(--cyan,#00C6FF)':pct>=100?'var(--mint,#2DD4BF)':'var(--purple,#7C6AF0)', borderRadius:3 }}/>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:7 }}>
              {weeks.map(w => <span key={w.label} style={{ fontSize:9, color:'var(--mid)', fontWeight:600 }}>{w.label.split('–')[0].trim()}</span>)}
            </div>
          </div>

          {/* Week cards */}
          {[...weeks].reverse().map((w, i) => {
            const sc = scoreColor(w.rate);
            const isNow = i === 0;
            return (
              <div key={w.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 14px', marginBottom:8, background:isNow?'rgba(124,106,240,.07)':'var(--surf)', border:`1.5px solid ${isNow?'rgba(124,106,240,.25)':'var(--border)'}`, borderRadius:14, boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}>
                {/* Ring */}
                <div style={{ position:'relative', width:44, height:44, flexShrink:0 }}>
                  <svg width="44" height="44" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(124,106,240,.12)" strokeWidth="4"/>
                    <circle cx="22" cy="22" r="18" fill="none" stroke={sc} strokeWidth="4"
                      strokeDasharray={`${Math.round(w.rate*1.131)} 113.1`} strokeLinecap="round" transform="rotate(-90 22 22)"/>
                  </svg>
                  <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:sc }}>{w.rate}%</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--dark)' }}>{w.label}</span>
                    {isNow && <span style={{ fontSize:9, fontWeight:800, color:'var(--purple)', background:'rgba(124,106,240,.12)', border:'1px solid rgba(124,106,240,.25)', borderRadius:4, padding:'1px 6px' }}>NOW</span>}
                  </div>
                  <div style={{ fontSize:11, color:'var(--mid)', marginTop:2 }}>{w.done} done · {w.planned} planned · <span style={{ color:sc, fontWeight:700 }}>{scoreLabel(w.rate)}</span></div>
                  {w.planned > 0 && <div style={{ height:4, borderRadius:2, background:'rgba(124,106,240,.10)', overflow:'hidden', marginTop:6 }}><div style={{ height:'100%', borderRadius:2, width:`${w.rate}%`, background:sc, transition:'width .4s ease' }}/></div>}
                </div>
              </div>
            );
          })}
        </>)}

        {/* ══ ACTIVITY tab ══ */}
        {tab === 'activity' && (<>

          {/* Overdue */}
          {overdueList.length > 0 && (
            <div style={{ ...card }}>
              <div style={cardHdr}>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="var(--coral,#FF6B8A)" strokeWidth="1.5"/><path d="M10 6v4.5l2.5 2" stroke="var(--coral,#FF6B8A)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <span style={{ ...sectionTitle, color:'var(--coral,#FF6B8A)' }}>Overdue</span>
                <span style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color:'var(--coral,#FF6B8A)', background:'rgba(255,107,138,.12)', padding:'2px 8px', borderRadius:6 }}>{overdueList.length}</span>
              </div>
              {overdueList.slice(0,5).map((s, i) => (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderBottom: i < Math.min(overdueList.length,5)-1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background:'var(--coral,#FF6B8A)' }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--dark)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.title}</div>
                    <div style={{ fontSize:10, color:'var(--mid)', marginTop:1 }}>{formatDate(s.start_time)} · {formatTime(s.start_time)}</div>
                  </div>
                  <span style={{ fontSize:9, fontWeight:800, color:PCOL[s.priority]||'var(--mid)', flexShrink:0, textTransform:'uppercase', letterSpacing:'.3px' }}>{s.priority}</span>
                </div>
              ))}
            </div>
          )}

          {/* Pending */}
          <div style={{ ...card }}>
            <div style={cardHdr}>
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="var(--cyan,#00C6FF)" strokeWidth="1.5"/><path d="M10 6v4h4" stroke="var(--cyan,#00C6FF)" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <span style={sectionTitle}>Pending</span>
              <span style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color:'var(--cyan,#00C6FF)', background:'rgba(0,198,255,.12)', padding:'2px 8px', borderRadius:6 }}>{pendingList.length}</span>
            </div>
            {pendingList.length === 0
              ? <div style={{ padding:'16px', fontSize:12, color:'var(--mid)', textAlign:'center', opacity:.6 }}>No pending tasks — you&apos;re all clear!</div>
              : pendingList.slice(0,6).map((s, i) => (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderBottom: i < Math.min(pendingList.length,6)-1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background:PCOL[s.priority]||'var(--mid)' }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--dark)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.title}</div>
                    <div style={{ fontSize:10, color:'var(--mid)', marginTop:1 }}>{formatDate(s.start_time)} · {formatTime(s.start_time)}</div>
                  </div>
                  <span style={{ fontSize:9, fontWeight:800, color:PCOL[s.priority]||'var(--mid)', flexShrink:0, textTransform:'uppercase', letterSpacing:'.3px' }}>{s.priority}</span>
                </div>
              ))
            }
          </div>

          {/* Completed */}
          <div style={{ ...card }}>
            <div style={cardHdr}>
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="var(--mint,#2DD4BF)" strokeWidth="1.5"/><polyline points="6.5,10 9,12.5 13.5,7.5" stroke="var(--mint,#2DD4BF)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={sectionTitle}>Completed</span>
              <span style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color:'var(--mint,#2DD4BF)', background:'rgba(45,212,191,.12)', padding:'2px 8px', borderRadius:6 }}>{completedList.length}</span>
            </div>
            {completedList.length === 0
              ? <div style={{ padding:'16px', fontSize:12, color:'var(--mid)', textAlign:'center', opacity:.6 }}>No completed tasks yet in the last 28 days.</div>
              : completedList.slice(0,8).map((s, i) => (
                <SwipeDeleteRow
                  key={s.id}
                  onDelete={() => deleteCompleted(s)}
                  undoLabel={`"${s.title}" deleted`}
                  borderRadius={0}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderBottom: i < Math.min(completedList.length,8)-1 ? '1px solid var(--border)' : 'none', opacity:.85, background:'var(--surf)' }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', background:'rgba(45,212,191,.12)', border:'1px solid rgba(45,212,191,.30)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg width="9" height="7" viewBox="0 0 13 10" fill="none"><polyline points="1,5 5,9 12,1" stroke="var(--mint,#2DD4BF)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--dark)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textDecoration:'line-through', opacity:.7 }}>{s.title}</div>
                      <div style={{ fontSize:10, color:'var(--mid)', marginTop:1 }}>{formatDate(s.start_time)} · {formatTime(s.start_time)}</div>
                      {lateNote(s.days_late) && (
                        <div style={{ fontSize:10, color:'#FF6B8A', fontWeight:700, marginTop:1 }}>{lateNote(s.days_late)}</div>
                      )}
                    </div>
                    <span style={{ fontSize:9, fontWeight:800, color:PCOL[s.priority]||'var(--mid)', flexShrink:0, textTransform:'uppercase', letterSpacing:'.3px' }}>{s.priority}</span>
                  </div>
                </SwipeDeleteRow>
              ))
            }
          </div>
        </>)}

        {/* ── Insight footer ── */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', borderRadius:14, marginTop:2, background:'rgba(124,106,240,.07)', border:'1px solid rgba(124,106,240,.18)' }}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" style={{ flexShrink:0, marginTop:1 }}>
            <path d="M10 3v2m0 10v2M3 10h2m10 0h2M5.6 5.6l1.2 1.2m6.4 6.4 1.2 1.2M5.6 14.4l1.2-1.2m6.4-6.4 1.2-1.2M10 7a3 3 0 100 6 3 3 0 000-6z" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div style={{ fontSize:12, color:'var(--mid)', lineHeight:1.6 }}>
            {totalPlanned === 0
              ? <><strong style={{ color:'var(--purple)' }}>No data yet.</strong> Add tasks to your Schedule — they&apos;ll show up here once you start completing them.</>
              : overdueList.length > 0
              ? <><strong style={{ color:'var(--purple)' }}>Heads up.</strong> You have {overdueList.length} overdue {overdueList.length === 1 ? 'item' : 'items'}. Switch to the Activity tab to review and reschedule them.</>
              : overallRate >= 80
              ? <><strong style={{ color:'var(--purple)' }}>Great momentum.</strong> {overallRate}% completion over 28 days. You&apos;re building a strong habit.</>
              : <><strong style={{ color:'var(--purple)' }}>Keep going.</strong> You&apos;re at {overallRate}% over 28 days. Completing even one more task a day will push you into the top tier.</>
            }
          </div>
        </div>

      </div>{/* inner */}
      </div>{/* scroll */}

      {/* ══ Activity Detail Modal ══════════════════════════════════════════ */}
      {modal && (
        <div
          onClick={() => setModal(null)}
          style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.6)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', display:'flex', flexDirection:'column', justifyContent:'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background:'var(--surf,#131424)', borderRadius:'22px 22px 0 0', border:'1px solid rgba(255,255,255,.09)', borderBottom:'none', maxHeight:'80dvh', display:'flex', flexDirection:'column', boxShadow:'0 -24px 60px rgba(0,0,0,.4)' }}
          >
            {/* Handle */}
            <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,.14)', margin:'10px auto 0', flexShrink:0 }} />

            {/* Modal header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px 12px', borderBottom:'1px solid rgba(255,255,255,.07)', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                {modal === 'done'    && <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="var(--mint,#2DD4BF)" strokeWidth="1.5"/><polyline points="6.5,10 9,12.5 13.5,7.5" stroke="var(--mint,#2DD4BF)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                {modal === 'pending' && <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="var(--cyan,#00C6FF)" strokeWidth="1.5"/><path d="M10 7v3.5l2 2" stroke="var(--cyan,#00C6FF)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                {modal === 'overdue' && <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 3L2 17h16L10 3z" stroke="#FF6B8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 8.5v4m0 2v.5" stroke="#FF6B8A" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                {modal === 'summary' && <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M3 17V9m5 8V4m4 13v-6m4 6V7" stroke="var(--purple)" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                <span style={{ fontSize:15, fontWeight:800, color:'var(--dark)', letterSpacing:'-.2px' }}>
                  {modal === 'done' ? `Completed (${completedList.length})` : modal === 'pending' ? `Pending (${pendingList.length})` : modal === 'overdue' ? `Overdue (${overdueList.length})` : 'Productivity Summary'}
                </span>
              </div>
              <button onClick={() => setModal(null)} style={{ width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.10)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding:0 }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            {/* Modal body — scrollable */}
            <div style={{ overflowY:'auto', overscrollBehavior:'contain', flex:1, padding:'8px 0 max(20px,env(safe-area-inset-bottom,20px))' }}>

              {/* ── DONE list ── */}
              {modal === 'done' && (
                completedList.length === 0
                  ? <div style={{ padding:'32px 20px', textAlign:'center', fontSize:13, color:'var(--mid)', opacity:.6 }}>No completed activities in the last 28 days.</div>
                  : completedList.map((s, i) => {
                    const onTime = !s.days_late || s.days_late === 0;
                    const completedDate = s.completed_at
                      ? new Date(s.completed_at).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' })
                      : formatDate(s.start_time);
                    return (
                      <div key={s.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'13px 20px', borderBottom: i < completedList.length-1 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                        <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(45,212,191,.12)', border:'1px solid rgba(45,212,191,.30)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                          <svg width="9" height="7" viewBox="0 0 13 10" fill="none"><polyline points="1,5 5,9 12,1" stroke="var(--mint,#2DD4BF)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'var(--dark)', textDecoration:'line-through', opacity:.7, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.title}</div>
                          <div style={{ fontSize:11, color:'var(--mid)', marginTop:3 }}>Completed {completedDate}</div>
                          {onTime
                            ? <div style={{ fontSize:10, color:'var(--mint,#2DD4BF)', fontWeight:700, marginTop:2 }}>✓ On time</div>
                            : <div style={{ fontSize:10, color:'#FF6B8A', fontWeight:700, marginTop:2 }}>Completed {s.days_late} {s.days_late === 1 ? 'day' : 'days'} late</div>
                          }
                        </div>
                        <span style={{ fontSize:9, fontWeight:800, color:PCOL[s.priority]||'var(--mid)', flexShrink:0, textTransform:'uppercase', letterSpacing:'.4px', marginTop:3 }}>{s.priority}</span>
                      </div>
                    );
                  })
              )}

              {/* ── PENDING list ── */}
              {modal === 'pending' && (
                pendingList.length === 0
                  ? <div style={{ padding:'32px 20px', textAlign:'center', fontSize:13, color:'var(--mid)', opacity:.6 }}>No pending activities.</div>
                  : pendingList.map((s, i) => {
                    const startMs   = new Date(s.start_time).getTime();
                    const diffMs    = startMs - Date.now();
                    const diffMins  = Math.round(diffMs / 60_000);
                    let timeLabel = '';
                    if      (diffMins < 0)     timeLabel = 'Starts soon';
                    else if (diffMins < 60)    timeLabel = `In ${diffMins} min`;
                    else if (diffMins < 1440)  timeLabel = `In ${Math.round(diffMins/60)} hr`;
                    else                       timeLabel = `In ${Math.round(diffMins/1440)} days`;
                    return (
                      <div key={s.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'13px 20px', borderBottom: i < pendingList.length-1 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                        <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(0,198,255,.08)', border:'1.5px solid rgba(0,198,255,.3)', flexShrink:0, marginTop:1 }} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'var(--dark)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.title}</div>
                          <div style={{ fontSize:11, color:'var(--mid)', marginTop:3 }}>
                            {new Date(s.start_time).toLocaleDateString('en-US',{ weekday:'short', month:'short', day:'numeric' })}
                            {' · '}{formatTime(s.start_time)}
                          </div>
                          <div style={{ fontSize:10, color:'var(--cyan,#00C6FF)', fontWeight:700, marginTop:2 }}>{timeLabel}</div>
                        </div>
                        <span style={{ fontSize:9, fontWeight:800, color:PCOL[s.priority]||'var(--mid)', flexShrink:0, textTransform:'uppercase', letterSpacing:'.4px', marginTop:3 }}>{s.priority}</span>
                      </div>
                    );
                  })
              )}

              {/* ── OVERDUE list ── */}
              {modal === 'overdue' && (
                overdueList.length === 0
                  ? <div style={{ padding:'32px 20px', textAlign:'center', fontSize:13, color:'var(--mid)', opacity:.6 }}>No overdue activities. Great work!</div>
                  : overdueList.map((s, i) => {
                    const daysOver = Math.floor((Date.now() - new Date(s.end_time || s.start_time).getTime()) / 86_400_000);
                    return (
                      <div key={s.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'13px 20px', borderBottom: i < overdueList.length-1 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                        <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(255,107,138,.10)', border:'1.5px solid rgba(255,107,138,.35)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1, fontSize:11, color:'#FF6B8A', fontWeight:800 }}>!</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'var(--dark)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.title}</div>
                          <div style={{ fontSize:11, color:'var(--mid)', marginTop:3 }}>
                            Due {new Date(s.end_time || s.start_time).toLocaleDateString('en-US',{ weekday:'short', month:'short', day:'numeric' })}
                          </div>
                          <div style={{ fontSize:10, color:'#FF6B8A', fontWeight:700, marginTop:2 }}>
                            {daysOver <= 0 ? 'Due today' : daysOver === 1 ? '1 day overdue' : `${daysOver} days overdue`}
                          </div>
                        </div>
                        <span style={{ fontSize:9, fontWeight:800, color:PCOL[s.priority]||'var(--mid)', flexShrink:0, textTransform:'uppercase', letterSpacing:'.4px', marginTop:3 }}>{s.priority}</span>
                      </div>
                    );
                  })
              )}

              {/* ── SUMMARY ── */}
              {modal === 'summary' && (
                <div style={{ padding:'16px 20px max(20px,env(safe-area-inset-bottom,20px))' }}>
                  {/* Score ring + label */}
                  <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:18 }}>
                    <div style={{ position:'relative', width:64, height:64, flexShrink:0 }}>
                      <svg width="64" height="64" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="27" fill="none" stroke="var(--border2)" strokeWidth="5"/>
                        <circle cx="32" cy="32" r="27" fill="none" stroke={scoreColor(prodScore)} strokeWidth="5"
                          strokeDasharray={`${Math.round(prodScore * 1.696)} 169.6`} strokeLinecap="round" transform="rotate(-90 32 32)"/>
                      </svg>
                      <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:scoreColor(prodScore) }}>{prodScore}</span>
                    </div>
                    <div>
                      <div style={{ fontSize:15, fontWeight:800, color:scoreColor(prodScore) }}>{scoreLabel(prodScore)}</div>
                      <div style={{ fontSize:12, color:'var(--mid)', marginTop:2, lineHeight:1.5 }}>Productivity score blends your weekly completion rate (60%) with your streak (40%).</div>
                    </div>
                  </div>
                  {/* Metric rows */}
                  {[
                    ['This week completion', `${thisWeekRate}%`, `${thisWeekDone}/${thisWeekPlanned} tasks done`],
                    ['28-day completion', `${overallRate}%`, `${totalDone}/${totalPlanned} tasks done`],
                    ['Current streak', `${streak} ${streak === 1 ? 'day' : 'days'}`, 'Consecutive days with a completed task'],
                  ].map(([label, value, sub]) => (
                    <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'var(--dark)' }}>{label}</div>
                        <div style={{ fontSize:11, color:'var(--mid)', marginTop:2 }}>{sub}</div>
                      </div>
                      <div style={{ fontSize:18, fontWeight:900, color:'var(--purple)', flexShrink:0 }}>{value}</div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
