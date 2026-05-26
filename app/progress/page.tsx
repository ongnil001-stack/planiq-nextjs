'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import BottomNav from '@/components/layout/BottomNav';

// ── helpers ────────────────────────────────────────────────────────────────────
function startOfDay(d: Date) {
  const r = new Date(d); r.setHours(0,0,0,0); return r;
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

const DAY_LABELS = ['S','M','T','W','T','F','S'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface DayBucket { date: string; planned: number; done: number; }
interface WeekSummary { weekLabel: string; planned: number; done: number; rate: number; }

export default function ProgressPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [loading,      setLoading]      = useState(true);
  const [days,         setDays]         = useState<DayBucket[]>([]);
  const [weeks,        setWeeks]        = useState<WeekSummary[]>([]);
  const [streak,       setStreak]       = useState(0);
  const [totalDone,    setTotalDone]    = useState(0);
  const [totalPlanned, setTotalPlanned] = useState(0);
  const [tab,          setTab]          = useState<'week'|'month'>('week');

  const hdrRef = useRef<HTMLDivElement>(null);
  const [hdrH, setHdrH] = useState(80);

  useEffect(() => {
    if (!hdrRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setHdrH(Math.round(e.contentRect.height));
    });
    ro.observe(hdrRef.current);
    setHdrH(hdrRef.current.offsetHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const today = startOfDay(new Date());
      const from  = addDays(today, -27);

      const { data: schedules } = await supabase
        .from('schedules')
        .select('start_time, is_done')
        .eq('user_id', user.id)
        .gte('start_time', from.toISOString())
        .lte('start_time', addDays(today, 1).toISOString())
        .order('start_time', { ascending: true });

      // Build 28-day bucket map
      const bucketMap: Record<string, DayBucket> = {};
      for (let i = 0; i < 28; i++) {
        const d = isoDate(addDays(from, i));
        bucketMap[d] = { date: d, planned: 0, done: 0 };
      }
      (schedules ?? []).forEach(s => {
        const d = s.start_time.slice(0, 10);
        if (bucketMap[d]) {
          bucketMap[d].planned++;
          if (s.is_done) bucketMap[d].done++;
        }
      });
      const dayList = Object.values(bucketMap);
      setDays(dayList);

      // 4-week summaries
      const wks: WeekSummary[] = [];
      for (let w = 0; w < 4; w++) {
        const wStart = addDays(from, w * 7);
        const wEnd   = addDays(wStart, 6);
        const slice  = dayList.slice(w * 7, w * 7 + 7);
        const planned = slice.reduce((a, b) => a + b.planned, 0);
        const done    = slice.reduce((a, b) => a + b.done,    0);
        wks.push({
          weekLabel: `${MONTH_NAMES[wStart.getMonth()]} ${wStart.getDate()}–${wEnd.getDate()}`,
          planned, done,
          rate: planned > 0 ? Math.round((done / planned) * 100) : 0,
        });
      }
      setWeeks(wks);

      const tp = dayList.reduce((a, b) => a + b.planned, 0);
      const td = dayList.reduce((a, b) => a + b.done,    0);
      setTotalPlanned(tp);
      setTotalDone(td);

      // Streak — consecutive days (going backwards) with ≥1 done
      let s = 0;
      for (let i = dayList.length - 1; i >= 0; i--) {
        if (dayList[i].done > 0) s++; else break;
      }
      setStreak(s);
      setLoading(false);
    }
    load();
  }, []);

  const thisWeekDays    = days.slice(-7);
  const thisWeekPlanned = thisWeekDays.reduce((a, b) => a + b.planned, 0);
  const thisWeekDone    = thisWeekDays.reduce((a, b) => a + b.done,    0);
  const thisWeekRate    = thisWeekPlanned > 0 ? Math.round((thisWeekDone / thisWeekPlanned) * 100) : 0;
  const overallRate     = totalPlanned    > 0 ? Math.round((totalDone    / totalPlanned)    * 100) : 0;
  const maxBar          = Math.max(...days.map(d => d.planned), 1);

  function scoreLabel(rate: number) {
    if (rate >= 90) return { label:'Excellent',  color:'var(--mint,#2DD4BF)' };
    if (rate >= 70) return { label:'On Track',   color:'var(--cyan,#00C6FF)' };
    if (rate >= 50) return { label:'Average',    color:'var(--amber,#FDCB6E)' };
    return                 { label:'Needs Work', color:'var(--coral,#FF6B8A)' };
  }
  const weekScore = scoreLabel(thisWeekRate);
  const todayIso  = isoDate(new Date());

  if (loading) return (
    <div style={{ minHeight:'100dvh', background:'var(--bg,#080E1A)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid rgba(124,106,240,.2)', borderTopColor:'var(--purple,#7C6AF0)', animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ height:'100dvh', overflow:'hidden', background:'var(--bg)', display:'flex', flexDirection:'column', fontFamily:'inherit', color:'var(--dark)' }}>

      {/* Header */}
      <div ref={hdrRef} style={{
        flexShrink:0,
        padding:'max(env(safe-area-inset-top,0px),14px) 22px 16px',
        background:'var(--glass-bg,var(--surf))',
        backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)',
        borderBottom:'1px solid var(--glass-border,var(--border))',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, letterSpacing:'-.4px', color:'var(--dark)' }}>Progress</div>
          <div style={{ fontSize:12, color:'var(--mid)', marginTop:2 }}>Your last 28 days</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:12, background:'rgba(124,106,240,.12)', border:'1px solid rgba(124,106,240,.25)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C12 2 7 7 7 12a5 5 0 0010 0c0-3-2-6-2-6s-1 2-2 2c-1 0-1-1-1-2z" stroke="var(--purple)" strokeWidth="1.7" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize:13, fontWeight:800, color:'var(--purple)' }}>{streak}</span>
          <span style={{ fontSize:11, color:'var(--mid)', fontWeight:600 }}>day streak</span>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{
        flex:1, overflowY:'auto', overscrollBehavior:'contain', padding:'16px 18px 0',
        maxHeight:`calc(100dvh - ${hdrH}px - 64px - max(env(safe-area-inset-bottom,0px),20px))`,
      }}>
      <div style={{ paddingBottom:'16px' }}>

        {/* Stat pills */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
          {[
            { label:'This Week', value:`${thisWeekDone}/${thisWeekPlanned}`, sub:'tasks done',  color:'var(--purple)' },
            { label:'Rate',      value:`${thisWeekRate}%`,                   sub:weekScore.label, color:weekScore.color },
            { label:'28 Days',   value:`${totalDone}`,                       sub:'completed',   color:'var(--cyan,#00C6FF)' },
          ].map(stat => (
            <div key={stat.label} style={{ padding:'12px 10px', borderRadius:14, textAlign:'center', background:'var(--surf)', border:'1px solid var(--border)', boxShadow:'0 2px 8px rgba(0,0,0,.08)' }}>
              <div style={{ fontSize:10, color:'var(--mid)', fontWeight:600, marginBottom:4 }}>{stat.label}</div>
              <div style={{ fontSize:20, fontWeight:800, color:stat.color, letterSpacing:'-.5px' }}>{stat.value}</div>
              <div style={{ fontSize:10, color:'var(--mid)', marginTop:2 }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Tab toggle */}
        <div style={{ display:'flex', background:'var(--surf2,rgba(255,255,255,.04))', border:'1px solid var(--border)', borderRadius:12, padding:3, marginBottom:16 }}>
          {(['week','month'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex:1, padding:'8px 0', borderRadius:9, border:'none', cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:700,
              background: tab === t ? 'var(--purple,#7C6AF0)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--mid)', transition:'all .15s',
            }}>
              {t === 'week' ? 'This Week' : '4 Weeks'}
            </button>
          ))}
        </div>

        {/* ── THIS WEEK ── */}
        {tab === 'week' && (<>

          {/* Day bars */}
          <div style={{ background:'var(--surf)', border:'1px solid var(--border)', borderRadius:16, padding:'18px 16px 14px', boxShadow:'0 2px 12px rgba(0,0,0,.07)', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--dark)', marginBottom:14 }}>Daily Completion</div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:80 }}>
              {thisWeekDays.map((d) => {
                const dayDate = new Date(d.date + 'T12:00:00');
                const dayIdx  = dayDate.getDay();
                const barH    = d.planned > 0 ? Math.max(8, Math.round((d.planned / maxBar) * 72)) : 4;
                const pct     = d.planned > 0 ? Math.round((d.done / d.planned) * 100) : 0;
                const isToday = d.date === todayIso;
                return (
                  <div key={d.date} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <div style={{ width:'100%', position:'relative', height:barH, borderRadius:6, overflow:'hidden', background:'rgba(124,106,240,.10)' }}>
                      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:`${pct}%`, background: pct >= 100 ? 'var(--mint,#2DD4BF)' : 'var(--purple,#7C6AF0)', borderRadius:6, transition:'height .3s ease' }}/>
                    </div>
                    <span style={{ fontSize:9, fontWeight:700, color: isToday ? 'var(--purple)' : 'var(--mid)' }}>{DAY_LABELS[dayIdx]}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display:'flex', gap:14, marginTop:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:'var(--purple)' }}/>
                <span style={{ fontSize:10, color:'var(--mid)' }}>In progress</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:'var(--mint,#2DD4BF)' }}/>
                <span style={{ fontSize:10, color:'var(--mid)' }}>All done</span>
              </div>
            </div>
          </div>

          {/* Day breakdown list */}
          <div style={{ background:'var(--surf)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,.07)', marginBottom:14 }}>
            <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid var(--border)', fontSize:13, fontWeight:700, color:'var(--dark)' }}>Day Breakdown</div>
            {thisWeekDays.map((d, i) => {
              const dayDate = new Date(d.date + 'T12:00:00');
              const dayName = dayDate.toLocaleDateString('en-US', { weekday:'short' });
              const dateNum = dayDate.getDate();
              const rate    = d.planned > 0 ? Math.round((d.done / d.planned) * 100) : null;
              const isToday = d.date === todayIso;
              const sc      = rate !== null ? scoreLabel(rate) : null;
              return (
                <div key={d.date} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderBottom: i < thisWeekDays.length-1 ? '1px solid var(--border)' : 'none', background: isToday ? 'rgba(124,106,240,.05)' : 'transparent' }}>
                  <div style={{ width:38, textAlign:'center', flexShrink:0 }}>
                    <div style={{ fontSize:10, fontWeight:700, color: isToday ? 'var(--purple)' : 'var(--mid)', textTransform:'uppercase' }}>{dayName}</div>
                    <div style={{ fontSize:16, fontWeight:800, color: isToday ? 'var(--purple)' : 'var(--dark)' }}>{dateNum}</div>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    {d.planned > 0 ? (<>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:11, color:'var(--mid)' }}>{d.done} of {d.planned} tasks</span>
                        {sc && <span style={{ fontSize:11, fontWeight:700, color:sc.color }}>{rate}%</span>}
                      </div>
                      <div style={{ height:5, borderRadius:3, background:'rgba(124,106,240,.12)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:3, width:`${rate}%`, background: rate! >= 100 ? 'var(--mint,#2DD4BF)' : 'var(--purple,#7C6AF0)', transition:'width .4s ease' }}/>
                      </div>
                    </>) : (
                      <span style={{ fontSize:11, color:'var(--mid)', fontStyle:'italic' }}>No tasks scheduled</span>
                    )}
                  </div>
                  {d.done > 0 && d.done >= d.planned && d.planned > 0 && (
                    <div style={{ width:24, height:24, borderRadius:'50%', background:'rgba(45,212,191,.15)', border:'1px solid rgba(45,212,191,.35)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg width="11" height="9" viewBox="0 0 13 10" fill="none"><polyline points="1,5 5,9 12,1" stroke="var(--mint,#2DD4BF)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>)}

        {/* ── 4 WEEKS ── */}
        {tab === 'month' && (<>

          {/* 28-day sparkline */}
          <div style={{ background:'var(--surf)', border:'1px solid var(--border)', borderRadius:16, padding:'18px 16px 14px', boxShadow:'0 2px 12px rgba(0,0,0,.07)', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--dark)', marginBottom:4 }}>28-Day Trend</div>
            <div style={{ fontSize:11, color:'var(--mid)', marginBottom:14 }}>{totalDone} completed of {totalPlanned} planned</div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:60 }}>
              {days.map((d) => {
                const barH  = d.planned > 0 ? Math.max(4, Math.round((d.planned / maxBar) * 56)) : 2;
                const pct   = d.planned > 0 ? Math.round((d.done / d.planned) * 100) : 0;
                const isToday = d.date === todayIso;
                return (
                  <div key={d.date} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
                    <div style={{ width:'100%', position:'relative', height:barH, borderRadius:3, background:'rgba(124,106,240,.08)' }}>
                      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:`${pct}%`, background: isToday ? 'var(--cyan,#00C6FF)' : pct >= 100 ? 'var(--mint,#2DD4BF)' : 'var(--purple,#7C6AF0)', borderRadius:3 }}/>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
              {weeks.map(w => <span key={w.weekLabel} style={{ fontSize:9, color:'var(--mid)', fontWeight:600 }}>{w.weekLabel.split('–')[0].trim()}</span>)}
            </div>
          </div>

          {/* Week cards — most recent first */}
          {[...weeks].reverse().map((w, i) => {
            const sc = scoreLabel(w.rate);
            const isThisWeek = i === 0;
            return (
              <div key={w.weekLabel} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', marginBottom:10, background: isThisWeek ? 'rgba(124,106,240,.07)' : 'var(--surf)', border:`1.5px solid ${isThisWeek ? 'rgba(124,106,240,.25)' : 'var(--border)'}`, borderRadius:14, boxShadow:'0 2px 8px rgba(0,0,0,.06)' }}>
                <div style={{ position:'relative', width:44, height:44, flexShrink:0 }}>
                  <svg width="44" height="44" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(124,106,240,.12)" strokeWidth="4"/>
                    <circle cx="22" cy="22" r="18" fill="none" stroke={sc.color} strokeWidth="4"
                      strokeDasharray={`${Math.round(w.rate * 1.131)} 113.1`}
                      strokeLinecap="round" transform="rotate(-90 22 22)"/>
                  </svg>
                  <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:sc.color }}>{w.rate}%</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--dark)' }}>{w.weekLabel}</span>
                    {isThisWeek && <span style={{ fontSize:9, fontWeight:700, color:'var(--purple)', background:'rgba(124,106,240,.12)', border:'1px solid rgba(124,106,240,.25)', borderRadius:4, padding:'1px 6px' }}>NOW</span>}
                  </div>
                  <div style={{ fontSize:11, color:'var(--mid)', marginTop:2 }}>{w.done} of {w.planned} tasks · <span style={{ color:sc.color, fontWeight:700 }}>{sc.label}</span></div>
                  {w.planned > 0 && (
                    <div style={{ height:4, borderRadius:2, background:'rgba(124,106,240,.10)', overflow:'hidden', marginTop:6 }}>
                      <div style={{ height:'100%', borderRadius:2, width:`${w.rate}%`, background:sc.color, transition:'width .4s ease' }}/>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>)}

        {/* Insight footer */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'13px 14px', borderRadius:14, marginTop:4, background:'rgba(124,106,240,.07)', border:'1px solid rgba(124,106,240,.18)' }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ flexShrink:0, marginTop:1 }}>
            <path d="M10 3v2m0 10v2M3 10h2m10 0h2M5.6 5.6l1.2 1.2m6.4 6.4 1.2 1.2M5.6 14.4l1.2-1.2m6.4-6.4 1.2-1.2M10 7a3 3 0 100 6 3 3 0 000-6z" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div style={{ fontSize:12, color:'var(--mid)', lineHeight:1.6 }}>
            {totalPlanned === 0
              ? <><strong style={{ color:'var(--purple)' }}>No data yet.</strong> Add tasks to your Schedule and start tracking your progress here.</>
              : overallRate >= 80
              ? <><strong style={{ color:'var(--purple)' }}>Great momentum.</strong> You&apos;re completing over {overallRate}% of your planned tasks. Keep it up.</>
              : overallRate >= 50
              ? <><strong style={{ color:'var(--purple)' }}>Good progress.</strong> You&apos;re getting through {overallRate}% of your plan. A small daily push can lift that significantly.</>
              : <><strong style={{ color:'var(--purple)' }}>Room to grow.</strong> You&apos;re at {overallRate}% over 28 days. Try scheduling fewer tasks and completing them fully.</>
            }
          </div>
        </div>

      </div>{/* inner */}
      </div>{/* scroll body */}

      <BottomNav />
    </div>
  );
}
