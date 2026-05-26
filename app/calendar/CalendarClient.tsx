'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Schedule } from '@/types/database';
import { formatTime, PRIORITY_COLORS, TYPE_ICONS } from '@/lib/utils';
import { getHolidays, buildHolidayMap, toDateStr, type Holiday } from '@/lib/holidays';
import { COUNTRIES } from '@/lib/countries';
import BottomNav from '@/components/layout/BottomNav';
import AddScheduleSheet from '@/components/AddScheduleSheet';
import { createClient } from '@/lib/supabase/client';

const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAYS_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SH  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'yearly';

// ── SVG flag icons ─────────────────────────────────────────────────────────────
function CountryFlag({ code }: { code: string }) {
  if (code === 'PH') return (
    <svg width="20" height="13" viewBox="0 0 20 13" xmlns="http://www.w3.org/2000/svg"
      style={{ display:'block', borderRadius:2, flexShrink:0, border:'1px solid rgba(255,255,255,.1)' }}>
      <rect width="20" height="6.5" fill="#0038A8"/>
      <rect y="6.5" width="20" height="6.5" fill="#CE1126"/>
      <polygon points="0,0 9,6.5 0,13" fill="#FFFFFF"/>
      <circle cx="4.2" cy="6.5" r="1.4" fill="#FCD116"/>
      {[0,45,90,135,180,225,270,315].map((deg,i) => {
        const a = deg * Math.PI / 180;
        return <line key={i}
          x1={4.2 + Math.cos(a)*1.7} y1={6.5 + Math.sin(a)*1.7}
          x2={4.2 + Math.cos(a)*2.6} y2={6.5 + Math.sin(a)*2.6}
          stroke="#FCD116" strokeWidth="0.55"/>;
      })}
      <polygon points="1.6,1.5 1.85,2.2 2.55,2.2 2,2.6 2.2,3.3 1.6,2.9 1,3.3 1.2,2.6 0.65,2.2 1.35,2.2" fill="#FCD116"/>
      <polygon points="1.6,9.7 1.85,10.4 2.55,10.4 2,10.8 2.2,11.5 1.6,11.1 1,11.5 1.2,10.8 0.65,10.4 1.35,10.4" fill="#FCD116"/>
      <polygon points="6.2,5.8 6.45,6.5 7.15,6.5 6.6,6.9 6.8,7.6 6.2,7.2 5.6,7.6 5.8,6.9 5.25,6.5 5.95,6.5" fill="#FCD116"/>
    </svg>
  );
  if (code === 'US') return (
    <svg width="20" height="13" viewBox="0 0 20 13" xmlns="http://www.w3.org/2000/svg"
      style={{ display:'block', borderRadius:2, flexShrink:0, border:'1px solid rgba(255,255,255,.1)' }}>
      <rect width="20" height="13" fill="#B22234"/>
      {[1,3,5,7,9,11].map(y => <rect key={y} y={y} width="20" height="1" fill="#FFF"/>)}
      <rect width="9" height="7" fill="#3C3B6E"/>
      {[1,3,5].flatMap(row => [1,3,5,7].map(col =>
        <circle key={`${row}${col}`} cx={col} cy={row} r="0.6" fill="#FFF"/>
      ))}
    </svg>
  );
  if (code === 'GB') return (
    <svg width="20" height="13" viewBox="0 0 20 13" xmlns="http://www.w3.org/2000/svg"
      style={{ display:'block', borderRadius:2, flexShrink:0, border:'1px solid rgba(255,255,255,.1)' }}>
      <rect width="20" height="13" rx="2" fill="#012169"/>
      <path d="M0,0 L20,13 M20,0 L0,13" stroke="#FFF" strokeWidth="3"/>
      <path d="M0,0 L20,13 M20,0 L0,13" stroke="#C8102E" strokeWidth="1.8"/>
      <path d="M10,0 V13 M0,6.5 H20" stroke="#FFF" strokeWidth="3.5"/>
      <path d="M10,0 V13 M0,6.5 H20" stroke="#C8102E" strokeWidth="2.2"/>
    </svg>
  );
  if (code === 'AU') return (
    <svg width="20" height="13" viewBox="0 0 20 13" xmlns="http://www.w3.org/2000/svg"
      style={{ display:'block', borderRadius:2, flexShrink:0, border:'1px solid rgba(255,255,255,.1)' }}>
      <rect width="20" height="13" rx="2" fill="#00008B"/>
      <path d="M0,0 L6,4 M6,0 L0,4" stroke="#FFF" strokeWidth="1.5"/>
      <path d="M0,0 L6,4 M6,0 L0,4" stroke="#C8102E" strokeWidth="0.9"/>
      <path d="M3,0 V4 M0,2 H6" stroke="#FFF" strokeWidth="1.8"/>
      <path d="M3,0 V4 M0,2 H6" stroke="#C8102E" strokeWidth="1.1"/>
      <circle cx="14" cy="4" r="0.8" fill="#FFF"/>
      <circle cx="17" cy="7" r="0.8" fill="#FFF"/>
      <circle cx="12" cy="8" r="0.8" fill="#FFF"/>
      <circle cx="15" cy="11" r="0.8" fill="#FFF"/>
    </svg>
  );
  return (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:20, height:13, borderRadius:2, background:'var(--pur-lt)', color:'var(--purple)', fontSize:7, fontWeight:800, letterSpacing:'.5px', flexShrink:0 }}>{code}</span>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────
function HolidayBanner({ holiday }: { holiday: Holiday }) {
  return (
    <div className="holiday-banner">
      <span className="hol-icon">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="4" width="16" height="14" rx="3" stroke="var(--coral,#FF6B8A)" strokeWidth="1.5"/>
          <path d="M2 8h16" stroke="var(--coral,#FF6B8A)" strokeWidth="1.5"/>
          <path d="M6 2v3M14 2v3" stroke="var(--coral,#FF6B8A)" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="7" cy="12" r="1" fill="var(--coral,#FF6B8A)"/>
          <circle cx="10" cy="12" r="1" fill="var(--coral,#FF6B8A)"/>
          <circle cx="13" cy="12" r="1" fill="var(--coral,#FF6B8A)"/>
        </svg>
      </span>
      <div className="hol-info">
        <div className="hol-name">{holiday.localName}</div>
        {holiday.localName !== holiday.name && <div className="hol-en">{holiday.name}</div>}
      </div>
      <span className="hol-tag">Holiday</span>
    </div>
  );
}

function EventCard({ s, compact = false }: { s: Schedule; compact?: boolean }) {
  return (
    <div className={`event-item${s.is_completed ? ' done' : ''}${compact ? ' compact' : ''}`}>
      <div className="event-bar" style={{ background: PRIORITY_COLORS[s.priority] }} />
      <div className="event-body">
        <p className="event-title">{s.title}</p>
        <p className="event-meta">
          {TYPE_ICONS[s.type]}{' '}
          {s.all_day ? 'All day' : formatTime(s.start_time)}
          {s.end_time ? ` — ${formatTime(s.end_time)}` : ''}
          {(s as Schedule & { location?: string }).location ? ` · ${(s as Schedule & { location?: string }).location}` : ''}
        </p>
      </div>
      {s.is_completed && <span className="done-badge">✓</span>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CalendarClient({ initialSchedules }: { initialSchedules: Schedule[] }) {
  const today    = new Date();
  const supabase = createClient();

  const [viewMode,    setViewMode]    = useState<ViewMode>('monthly');
  const [viewDate,    setViewDate]    = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());
  const [holidays,    setHolidays]    = useState<Map<string, Holiday>>(new Map());
  const [countryCode, setCountryCode] = useState('');
  const [schedules,   setSchedules]   = useState<Schedule[]>(initialSchedules);
  const [sheetOpen,   setSheetOpen]   = useState(false);
  const [sheetTime,    setSheetTime]    = useState<string | undefined>(undefined);

  const year        = viewDate.getFullYear();
  const month       = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow    = new Date(year, month, 1).getDay();

  // Load country + holidays
  useEffect(() => {
    async function loadCountry() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('country_code').eq('id', user.id).single();
      const cc = data?.country_code || '';
      setCountryCode(cc);
      if (cc) {
        const h = await getHolidays(year, cc);
        setHolidays(buildHolidayMap(h));
        if (month === 11) {
          const h2 = await getHolidays(year + 1, cc);
          setHolidays(prev => new Map([...Array.from(prev.entries()), ...Array.from(buildHolidayMap(h2).entries())]));
        }
      }
    }
    loadCountry();
  }, [year, month]);

  // Refresh schedules — optionally fetch a just-inserted row by id first for instant display
  const refreshSchedules = useCallback(async (newId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // If we have the new record's id, fetch it immediately and inject into state
    // so it appears in the timeline before the full re-fetch completes
    if (newId) {
      const { data: newRow } = await supabase.from('schedules').select('*').eq('id', newId).single();
      if (newRow) {
        setSchedules(prev => {
          // Replace if already exists, otherwise append
          const exists = prev.some(s => s.id === (newRow as Schedule).id);
          if (exists) return prev;
          return [...prev, newRow as Schedule].sort(
            (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          );
        });
      }
    }

    // Full re-fetch for the selected day's month (covers cross-month navigation in Daily view)
    const sd = new Date(year, month, selectedDay);
    const startOfMonth = new Date(sd.getFullYear(), sd.getMonth(), 1).toISOString();
    const endOfMonth   = new Date(sd.getFullYear(), sd.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const { data } = await supabase.from('schedules').select('*')
      .eq('user_id', user.id)
      .gte('start_time', startOfMonth)
      .lte('start_time', endOfMonth)
      .order('start_time');
    if (data) setSchedules(data as Schedule[]);
  }, [year, month, selectedDay]);

  // Build day map
  const dayMap: Record<number, Schedule[]> = {};
  schedules.forEach(s => {
    const d = new Date(s.start_time);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push(s);
    }
  });

  const selectedDate      = new Date(year, month, selectedDay);
  const selectedDateStr   = toDateStr(selectedDate);
  const selectedSchedules = dayMap[selectedDay] ?? [];
  const selectedHol       = holidays.get(selectedDateStr) ?? null;
  const countryInfo       = COUNTRIES.find(c => c.code === countryCode);
  const isToday           = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const timelineRef = useRef<HTMLDivElement>(null);

  // Auto-scroll timeline to current hour (or 8 AM) when daily view activates
  useEffect(() => {
    if (viewMode !== 'daily' || !timelineRef.current) return;
    const hourHeight = 64; // px per hour row
    const targetHour = isToday(selectedDay) ? Math.max(0, today.getHours() - 1) : 8;
    const scrollTop  = targetHour * hourHeight;
    timelineRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
  }, [viewMode, selectedDay]);

  function handleDayClick(d: number) {
    if (d === selectedDay) { setSheetTime(undefined); setSheetOpen(true); }
    else setSelectedDay(d);
  }

  function openSheetAtHour(h: number) {
    const hh = String(h).padStart(2, '0');
    setSheetTime(`${hh}:00`);
    setSheetOpen(true);
  }

  // Navigation — direction depends on viewMode
  function navPrev() {
    if (viewMode === 'daily')   { const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(d); setSelectedDay(d.getDate()); }
    else if (viewMode === 'weekly') { const d = new Date(viewDate); d.setDate(d.getDate() - 7); setViewDate(new Date(d.getFullYear(), d.getMonth(), 1)); setSelectedDay(d.getDate()); }
    else if (viewMode === 'yearly') setViewDate(new Date(year - 1, 0, 1));
    else { setViewDate(new Date(year, month - 1, 1)); setSelectedDay(1); }
  }
  function navNext() {
    if (viewMode === 'daily')   { const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(d); setSelectedDay(d.getDate()); }
    else if (viewMode === 'weekly') { const d = new Date(viewDate); d.setDate(d.getDate() + 7); setViewDate(new Date(d.getFullYear(), d.getMonth(), 1)); setSelectedDay(d.getDate()); }
    else if (viewMode === 'yearly') setViewDate(new Date(year + 1, 0, 1));
    else { setViewDate(new Date(year, month + 1, 1)); setSelectedDay(1); }
  }
  function navToday() {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today.getDate());
  }

  // Nav label
  const navLabel = (() => {
    if (viewMode === 'daily')   return selectedDate.toLocaleDateString('en-US', { weekday:'short', month:'long', day:'numeric', year:'numeric' });
    if (viewMode === 'weekly') {
      const dow   = selectedDate.getDay();
      const wStart = new Date(selectedDate); wStart.setDate(selectedDate.getDate() - dow);
      const wEnd   = new Date(wStart);       wEnd.setDate(wStart.getDate() + 6);
      return `${wStart.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${wEnd.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
    }
    if (viewMode === 'yearly') return `${year}`;
    return `${MONTHS[month]} ${year}`;
  })();

  // ── Weekly view data ────────────────────────────────────────────────────────
  const weekDays = (() => {
    const dow   = selectedDate.getDay();
    const start = new Date(selectedDate); start.setDate(selectedDate.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  })();

  // ── Yearly view data ────────────────────────────────────────────────────────
  // Count schedules per month in a given year
  const monthCounts = Array.from({ length: 12 }, (_, mo) =>
    schedules.filter(s => {
      const d = new Date(s.start_time);
      return d.getFullYear() === year && d.getMonth() === mo;
    }).length
  );

  return (
    <div className="page">

      {/* ── Fixed Header ── */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Schedule</h1>
          {countryCode && countryInfo && (
            <div className="country-badge">
              <CountryFlag code={countryCode} />
              <span>{countryInfo.name} holidays</span>
            </div>
          )}
        </div>
        <button className="today-btn" onClick={navToday}>Today</button>
      </div>

      {/* ── View mode switcher ── */}
      <div className="view-switcher">
        {(['daily','weekly','monthly','yearly'] as ViewMode[]).map(v => (
          <button
            key={v}
            className={`view-pill${viewMode === v ? ' active' : ''}`}
            onClick={() => setViewMode(v)}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Month / Period navigator ── */}
      <div className="month-nav">
        <button className="nav-arrow" onClick={navPrev}>‹</button>
        <span className="month-label">{navLabel}</span>
        <button className="nav-arrow" onClick={navNext}>›</button>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SCROLLABLE CONTENT AREA
      ════════════════════════════════════════════════════════════ */}
      <div className="scroll-body" style={viewMode === 'daily' ? { overflowY:'hidden', display:'flex', flexDirection:'column' } : undefined}>

        {/* ── MONTHLY VIEW (default) ── */}
        {viewMode === 'monthly' && (
          <>
            {/* Day-of-week headers */}
            <div className="cal-grid header-row">
              {DAYS_SHORT.map(d => <div key={d} className="dow">{d}</div>)}
            </div>
            {/* Calendar grid */}
            <div className="cal-grid">
              {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d       = i + 1;
                const dateStr = toDateStr(new Date(year, month, d));
                const holiday = holidays.get(dateStr);
                const hasDots = dayMap[d]?.length > 0;
                const active  = d === selectedDay;
                const todayDay = isToday(d);
                return (
                  <button key={d}
                    className={`cal-day${active ? ' active' : ''}${todayDay ? ' today' : ''}${holiday ? ' holiday' : ''}`}
                    onClick={() => handleDayClick(d)}
                    title={holiday ? holiday.localName : undefined}>
                    <span className="day-num">{d}</span>
                    <div className="day-indicators">
                      {holiday && <span className="h-dot" />}
                      {hasDots && dayMap[d].slice(0, 2).map((s, idx) => (
                        <span key={idx} className="dot" style={{ background: PRIORITY_COLORS[s.priority] }} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            {/* Selected day panel */}
            <div className="day-panel">
              <div className="day-panel-header">
                <span className="day-panel-title">
                  {selectedDate.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
                </span>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span className="day-count">{selectedSchedules.length} item{selectedSchedules.length !== 1 ? 's' : ''}</span>
                  <button className="day-add-inline" onClick={() => setSheetOpen(true)}>+ Add</button>
                </div>
              </div>
              {selectedHol && <HolidayBanner holiday={selectedHol} />}
              {selectedSchedules.length === 0 ? (
                <div className="day-empty">
                  <p>Nothing scheduled for this day</p>
                  <button className="day-add-cta" onClick={() => setSheetOpen(true)}>+ Add Schedule</button>
                </div>
              ) : (
                <div className="event-list">
                  {selectedSchedules.map(s => <EventCard key={s.id} s={s} />)}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── DAILY VIEW — 24-hour timeline ── */}
        {viewMode === 'daily' && (() => {
          const HOURS = Array.from({ length: 24 }, (_, i) => i);
          const nowH  = isToday(selectedDay) ? today.getHours()   : -1;
          const nowM  = isToday(selectedDay) ? today.getMinutes() : 0;

          const byHour: Record<number, Schedule[]> = {};
          selectedSchedules.forEach(s => {
            const h = new Date(s.start_time).getHours();
            if (!byHour[h]) byHour[h] = [];
            byHour[h].push(s);
          });

          function fmtHour(h: number) {
            if (h === 0)  return '12 AM';
            if (h < 12)   return `${h} AM`;
            if (h === 12) return '12 PM';
            return `${h - 12} PM`;
          }

          // SVG type icon (inline, no emoji)
          function TypeIcon({ type }: { type: string }) {
            const col = type === 'task' ? 'var(--mint,#2DD4BF)' : type === 'reminder' ? 'var(--amber,#FDCB6E)' : type === 'block' ? 'var(--coral,#FF6B8A)' : 'var(--cyan,#00C6FF)';
            if (type === 'task') return (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
                <rect x="1" y="1" width="14" height="14" rx="3" stroke={col} strokeWidth="1.4"/>
                <polyline points="4,8 7,11 12,5" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            );
            if (type === 'reminder') return (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
                <path d="M8 2a4 4 0 014 4v3l1 1v1H3v-1l1-1V6a4 4 0 014-4z" stroke={col} strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M6.5 13a1.5 1.5 0 003 0" stroke={col} strokeWidth="1.4"/>
              </svg>
            );
            if (type === 'block') return (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
                <circle cx="8" cy="8" r="6" stroke={col} strokeWidth="1.4"/>
                <path d="M4 4l8 8" stroke={col} strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            );
            // event (default)
            return (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
                <rect x="1" y="3" width="14" height="12" rx="2.5" stroke={col} strokeWidth="1.4"/>
                <path d="M1 7h14" stroke={col} strokeWidth="1.4"/>
                <path d="M5 1v3M11 1v3" stroke={col} strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            );
          }

          return (
            <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

              {/* Day header — clean banner, no + Add button (tap a time slot instead) */}
              <div style={{
                flexShrink:0, padding:'14px 16px 12px',
                borderBottom:'1px solid var(--glass-border,var(--border))',
                background:'var(--glass-bg2,rgba(255,255,255,.03))',
              }}>
                <div style={{ fontSize:11, fontWeight:800, color:'var(--purple)', textTransform:'uppercase', letterSpacing:'1.2px' }}>
                  {DAYS_FULL[selectedDate.getDay()]}
                </div>
                <div style={{ fontSize:26, fontWeight:900, color:'var(--dark)', letterSpacing:'-.5px', marginTop:2, lineHeight:1 }}>
                  {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                  {isToday(selectedDay) && (
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:'var(--purple)', background:'rgba(124,106,240,.12)', border:'1px solid rgba(124,106,240,.22)', padding:'3px 10px', borderRadius:20 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--purple)', boxShadow:'0 0 5px var(--purple)', flexShrink:0, display:'inline-block' }}/>
                      Today
                    </span>
                  )}
                  <span style={{ fontSize:11, color:'var(--mid)', fontWeight:600 }}>
                    {selectedSchedules.length} event{selectedSchedules.length !== 1 ? 's' : ''}
                  </span>

                </div>
              </div>

              {/* Holiday */}
              {selectedHol && (
                <div style={{ padding:'8px 14px 0', flexShrink:0 }}>
                  <HolidayBanner holiday={selectedHol} />
                </div>
              )}

              {/* 24-hour timeline — scrollable, no ghost space at bottom */}
              <div ref={timelineRef} style={{
                flex:1, overflowY:'auto', overscrollBehavior:'contain',
                WebkitOverflowScrolling:'touch',
              }}>
                {HOURS.map(h => {
                  const events  = byHour[h] ?? [];
                  const isPast  = nowH >= 0 && h < nowH;
                  const isCurHr = nowH >= 0 && h === nowH;
                  const needlePct = isCurHr ? Math.round((nowM / 60) * 100) : 0;
                  // Minimum 68px per row; grows to fit events
                  const rowH = Math.max(68, events.length * 80 + 20);

                  return (
                    <div
                      key={h}
                      onClick={() => openSheetAtHour(h)}
                      style={{
                        display:'flex', alignItems:'stretch',
                        minHeight: rowH,
                        opacity: isPast ? 0.55 : 1,
                        background: isCurHr ? 'rgba(124,106,240,.045)' : 'transparent',
                        cursor:'pointer',
                        WebkitTapHighlightColor:'rgba(124,106,240,.08)',
                        transition:'background .12s',
                      }}
                    >
                      {/* Time label column */}
                      <div style={{
                        width:62, flexShrink:0,
                        paddingTop:13, paddingRight:10, paddingLeft:14,
                        textAlign:'right', pointerEvents:'none',
                      }}>
                        <span style={{
                          fontSize:10, fontWeight:700, lineHeight:1,
                          color: isCurHr ? 'var(--purple)' : 'var(--mid)',
                          letterSpacing:'.3px', whiteSpace:'nowrap',
                          display:'block',
                        }}>{fmtHour(h)}</span>
                      </div>

                      {/* Lane */}
                      <div style={{
                        flex:1,
                        borderLeft:'1px solid var(--glass-border,rgba(255,255,255,.08))',
                        position:'relative',
                        padding: events.length ? '10px 14px 10px 12px' : '0 14px 0 12px',
                        display:'flex', flexDirection:'column', gap:6,
                      }}>
                        {/* Hour rule line */}
                        <div style={{
                          position:'absolute', top:0, left:0, right:0, height:1,
                          background: isCurHr ? 'rgba(124,106,240,.45)' : 'rgba(255,255,255,.06)',
                          pointerEvents:'none',
                        }}/>



                        {/* Current-time needle */}
                        {isCurHr && (
                          <div style={{
                            position:'absolute', top:`${needlePct}%`,
                            left:-1, right:0,
                            display:'flex', alignItems:'center',
                            zIndex:3, pointerEvents:'none',
                            transform:'translateY(-50%)',
                          }}>
                            <div style={{ width:9, height:9, borderRadius:'50%', background:'var(--purple)', flexShrink:0, marginLeft:-4.5, boxShadow:'0 0 8px var(--purple)' }}/>
                            <div style={{ flex:1, height:1.5, background:'var(--purple)', opacity:.85 }}/>
                          </div>
                        )}

                        {/* Event blocks — stop clicks propagating so they don't re-open sheet with wrong time */}
                        {events.map(s => {
                          const startD = new Date(s.start_time);
                          const endD   = s.end_time ? new Date(s.end_time) : null;
                          const loc    = (s as Schedule & { location?: string }).location;
                          const pColor = PRIORITY_COLORS[s.priority] || 'var(--purple)';
                          return (
                            <div
                              key={s.id}
                              onClick={e => e.stopPropagation()}
                              style={{
                                display:'flex', flexDirection:'column', gap:4,
                                padding:'8px 10px 8px 12px',
                                borderRadius:10,
                                background:'var(--surf)',
                                border:`1px solid var(--glass-border,var(--border))`,
                                borderLeftWidth:3,
                                borderLeftColor:pColor,
                                borderLeftStyle:'solid',
                                boxShadow:'0 1px 6px rgba(0,0,0,.08)',
                                opacity: s.is_completed ? 0.5 : 1,
                                position:'relative',
                                cursor:'default',
                              }}
                            >
                              {/* Title row */}
                              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <TypeIcon type={s.type} />
                                <span style={{
                                  fontSize:13, fontWeight:700, color:'var(--dark)',
                                  flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                                  textDecoration: s.is_completed ? 'line-through' : 'none',
                                }}>{s.title}</span>
                                {s.is_completed && (
                                  <span style={{ fontSize:11, color:'var(--mint,#2DD4BF)', fontWeight:800, flexShrink:0 }}>✓</span>
                                )}
                              </div>
                              {/* Meta row */}
                              <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                                <span style={{ fontSize:10, color:'var(--mid)', fontWeight:600 }}>
                                  {s.all_day ? 'All day' : startD.toLocaleTimeString('en-US',{ hour:'numeric', minute:'2-digit', hour12:true })}
                                  {endD ? ` — ${endD.toLocaleTimeString('en-US',{ hour:'numeric', minute:'2-digit', hour12:true })}` : ''}
                                </span>
                                {loc && (
                                  <>
                                    <span style={{ fontSize:10, color:'var(--border)' }}>·</span>
                                    <span style={{ fontSize:10, color:'var(--mid)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{loc}</span>
                                  </>
                                )}
                                <span style={{
                                  fontSize:9, fontWeight:800, color:pColor,
                                  background:`rgba(${pColor === '#FF3B30' ? '255,59,48' : pColor === '#FF6B8A' ? '255,107,138' : pColor === '#FDCB6E' ? '253,203,110' : '0,206,201'},.12)`,
                                  padding:'1px 6px', borderRadius:5,
                                  letterSpacing:'.4px', textTransform:'uppercase',
                                  flexShrink:0,
                                }}>{s.priority}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Bottom padding — exactly one extra row height so 11 PM row has breathing room, no ghost space */}
                <div style={{ height:32 }} />
              </div>
            </div>
          );
        })()}

        {/* ── WEEKLY VIEW ── */}
        {viewMode === 'weekly' && (
          <div style={{ padding: '0 0 100px' }}>
            {/* 7-column day strip */}
            <div className="week-strip">
              {weekDays.map((d, i) => {
                const isT  = d.toDateString() === today.toDateString();
                const isSel = d.toDateString() === selectedDate.toDateString();
                const ds   = toDateStr(d);
                const cnt  = schedules.filter(s => toDateStr(new Date(s.start_time)) === ds).length;
                return (
                  <button key={i} className={`week-day-col${isSel ? ' sel' : ''}${isT ? ' today' : ''}`}
                    onClick={() => { setViewDate(new Date(d.getFullYear(), d.getMonth(), 1)); setSelectedDay(d.getDate()); }}>
                    <div className="wdc-name">{DAYS_SHORT[i].slice(0,2)}</div>
                    <div className="wdc-num">{d.getDate()}</div>
                    {cnt > 0 && <div className="wdc-cnt">{cnt}</div>}
                  </button>
                );
              })}
            </div>

            {/* Events grouped by day */}
            <div style={{ padding: '0 16px' }}>
              {weekDays.map((d, i) => {
                const ds   = toDateStr(d);
                const hol  = holidays.get(ds);
                const evts = schedules.filter(s => toDateStr(new Date(s.start_time)) === ds);
                const isT  = d.toDateString() === today.toDateString();
                if (evts.length === 0 && !hol) return null;
                return (
                  <div key={i} className="week-day-group">
                    <div className={`week-day-label${isT ? ' today' : ''}`}>
                      <span className="wdl-name">{DAYS_FULL[d.getDay()]}</span>
                      <span className="wdl-date">{MONTHS_SH[d.getMonth()]} {d.getDate()}</span>
                      {isT && <span className="today-pip" />}
                    </div>
                    {hol && (
                      <div className="week-holiday-row">
                        <span className="whr-dot" />
                        <span className="whr-name">{hol.localName}</span>
                        <span className="hol-tag" style={{ fontSize:9 }}>Holiday</span>
                      </div>
                    )}
                    {evts.map(s => <EventCard key={s.id} s={s} compact />)}
                  </div>
                );
              })}
              {/* If the whole week is empty */}
              {weekDays.every(d => {
                const ds = toDateStr(d);
                return schedules.filter(s => toDateStr(new Date(s.start_time)) === ds).length === 0 && !holidays.get(ds);
              }) && (
                <div className="day-empty" style={{ paddingTop: 32 }}>
                  <p>No events this week</p>
                  <button className="day-add-cta" onClick={() => setSheetOpen(true)}>+ Add Schedule</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── YEARLY VIEW ── */}
        {viewMode === 'yearly' && (
          <div style={{ padding: '16px 14px 100px' }}>
            <div className="year-grid">
              {Array.from({ length: 12 }, (_, mo) => {
                const cnt    = monthCounts[mo];
                const isThisMon  = mo === today.getMonth() && year === today.getFullYear();
                const isSel  = mo === month;
                const daysIn = new Date(year, mo + 1, 0).getDate();
                const firstD = new Date(year, mo, 1).getDay();
                // Mini calendar dots
                const miniDayMap: Record<number, number> = {};
                schedules.filter(s => {
                  const d = new Date(s.start_time);
                  return d.getFullYear() === year && d.getMonth() === mo;
                }).forEach(s => {
                  const d = new Date(s.start_time).getDate();
                  miniDayMap[d] = (miniDayMap[d] || 0) + 1;
                });

                return (
                  <button key={mo}
                    className={`year-month-card${isSel ? ' sel' : ''}${isThisMon ? ' current' : ''}`}
                    onClick={() => { setViewDate(new Date(year, mo, 1)); setSelectedDay(mo === today.getMonth() && year === today.getFullYear() ? today.getDate() : 1); setViewMode('monthly'); }}>
                    <div className="ymc-header">
                      <span className="ymc-name">{MONTHS_SH[mo]}</span>
                      {cnt > 0 && <span className="ymc-count">{cnt}</span>}
                    </div>
                    {/* Mini 7-col grid */}
                    <div className="ymc-grid">
                      {Array.from({ length: firstD }).map((_, i) => <div key={`e${i}`} className="ymc-cell" />)}
                      {Array.from({ length: daysIn }, (_, i) => {
                        const d = i + 1;
                        const isT = d === today.getDate() && isThisMon;
                        const hasDot = !!miniDayMap[d];
                        return (
                          <div key={d} className={`ymc-cell${isT ? ' tod' : ''}${hasDot ? ' has' : ''}`}>
                            <span>{d}</span>
                          </div>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>{/* end scroll-body */}

      {/* Add Schedule sheet */}
      <AddScheduleSheet
        open={sheetOpen}
        selectedDate={selectedDate}
        countryCode={countryCode}
        initialTime={sheetTime}
        onClose={() => { setSheetOpen(false); setSheetTime(undefined); }}
        onSaved={refreshSchedules}
      />

      <BottomNav />

      <style jsx>{`
        /* ── Page shell ── */
        .page { height:100dvh; background:var(--bg); display:flex; flex-direction:column; font-family:inherit; color:var(--dark); overflow:hidden; }

        /* ── Header ── */
        .pg-header { padding:max(env(safe-area-inset-top,0px),14px) 20px 12px; display:flex; justify-content:space-between; align-items:flex-end; flex-shrink:0; background:var(--glass-bg,var(--surf)); backdrop-filter:var(--glass-blur,blur(18px)); -webkit-backdrop-filter:var(--glass-blur,blur(18px)); border-bottom:1px solid var(--glass-border,var(--border)); }
        .pg-title { font-size:22px; font-weight:800; color:var(--dark); }
        .country-badge { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--purple); font-weight:600; margin-top:4px; }
        .today-btn { padding:6px 14px; background:var(--glass-bg2,rgba(255,255,255,.07)); border:1px solid var(--glass-border,rgba(255,255,255,.10)); border-radius:20px; color:var(--purple); font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; transition:background .14s; flex-shrink:0; }
        .today-btn:active { background:var(--pur-lt); }

        /* ── View switcher ── */
        .view-switcher { flex-shrink:0; display:flex; gap:6px; padding:10px 16px; background:var(--glass-bg,var(--surf)); border-bottom:1px solid var(--glass-border,var(--border)); }
        .view-pill { flex:1; padding:8px 4px; border-radius:10px; border:1.5px solid var(--glass-border,rgba(255,255,255,.08)); background:var(--glass-bg2,rgba(255,255,255,.04)); color:var(--mid); font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .14s; letter-spacing:.2px; }
        .view-pill.active { background:var(--purple); border-color:var(--purple); color:#fff; box-shadow:0 2px 12px rgba(124,106,240,.35); }
        .view-pill:not(.active):active { background:var(--pur-lt); color:var(--purple); }

        /* ── Month / period navigator ── */
        .month-nav { flex-shrink:0; display:flex; align-items:center; justify-content:space-between; padding:10px 16px; background:var(--glass-bg2,var(--surf)); border-bottom:1px solid var(--glass-border,var(--border)); }
        .month-label { font-size:15px; font-weight:700; color:var(--dark); }
        .nav-arrow { background:none; border:none; color:var(--mid); font-size:22px; cursor:pointer; padding:4px 10px; line-height:1; border-radius:8px; }
        .nav-arrow:active { background:var(--surf2); }

        /* ── Scrollable body ── */
        .scroll-body { flex:1; overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; position:relative; }

        /* ════ MONTHLY ════ */
        .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; padding:0 8px 4px; background:var(--glass-bg2,var(--surf)); }
        .header-row { padding-top:8px; }
        .dow { text-align:center; font-size:10px; font-weight:700; color:var(--mid); text-transform:uppercase; letter-spacing:.5px; padding:4px 0; }
        .cal-day { aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:10px; cursor:pointer; background:transparent; gap:2px; border:none; transition:background .12s; padding:0; }
        .cal-day:active { background:var(--pur-lt); }
        .cal-day.active { background:var(--purple) !important; }
        .cal-day.today:not(.active) .day-num { color:var(--purple); font-weight:800; }
        .cal-day.holiday:not(.active) { background:rgba(255,107,107,.07); }
        .day-num { font-size:13px; font-weight:600; color:var(--mid); line-height:1; }
        .cal-day.active .day-num { color:#fff; }
        .cal-day.holiday:not(.active) .day-num { color:var(--coral,#FF6B8A); font-weight:700; }
        .day-indicators { display:flex; gap:2px; align-items:center; min-height:5px; }
        .h-dot { width:5px; height:5px; border-radius:50%; background:var(--coral,#FF6B8A); flex-shrink:0; }
        .cal-day.active .h-dot { background:rgba(255,255,255,.8); }
        .dot { width:4px; height:4px; border-radius:50%; flex-shrink:0; }
        .cal-day.active .dot { background:rgba(255,255,255,.7) !important; }

        /* ════ DAY PANEL (shared: monthly + daily) ════ */
        .day-panel { padding:14px 16px 100px; }
        .day-panel-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .day-panel-title { font-size:15px; font-weight:700; color:var(--dark); }
        .day-count { font-size:12px; color:var(--mid); }
        .day-add-inline { padding:6px 14px; background:var(--gradient); border:none; border-radius:20px; color:#fff; font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; }

        /* Daily heading */
        .daily-hdr { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
        .daily-dow { font-size:12px; font-weight:700; color:var(--mid); text-transform:uppercase; letter-spacing:.8px; }
        .daily-date { font-size:20px; font-weight:800; color:var(--dark); letter-spacing:-.3px; margin-top:2px; }
        .today-indicator { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:var(--purple); margin-bottom:12px; }
        .today-dot { width:7px; height:7px; border-radius:50%; background:var(--purple); flex-shrink:0; box-shadow:0 0 6px var(--purple); }

        /* ════ WEEKLY ════ */
        .week-strip { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; padding:12px 12px 0; background:var(--glass-bg2,var(--surf)); border-bottom:1px solid var(--glass-border,var(--border)); }
        .week-day-col { display:flex; flex-direction:column; align-items:center; gap:3px; padding:8px 2px 10px; border-radius:12px; background:transparent; border:1.5px solid transparent; cursor:pointer; font-family:inherit; transition:all .14s; }
        .week-day-col.today .wdc-num { color:var(--purple); font-weight:800; }
        .week-day-col.sel { background:var(--pur-lt,rgba(124,106,240,.15)); border-color:var(--purple); }
        .week-day-col.sel .wdc-num { color:var(--purple); font-weight:800; }
        .wdc-name { font-size:9px; font-weight:700; color:var(--mid); text-transform:uppercase; letter-spacing:.5px; }
        .wdc-num  { font-size:15px; font-weight:600; color:var(--dark); line-height:1; }
        .wdc-cnt  { font-size:9px; font-weight:700; color:#fff; background:var(--purple); border-radius:6px; padding:1px 5px; min-width:14px; text-align:center; }

        .week-day-group { margin-top:18px; }
        .week-day-label { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
        .wdl-name { font-size:12px; font-weight:700; color:var(--dark); }
        .wdl-date { font-size:11px; color:var(--mid); }
        .week-day-label.today .wdl-name { color:var(--purple); }
        .today-pip { width:6px; height:6px; border-radius:50%; background:var(--purple); flex-shrink:0; }
        .week-holiday-row { display:flex; align-items:center; gap:8px; padding:7px 10px; background:rgba(255,107,107,.08); border:1px solid rgba(255,107,107,.18); border-radius:10px; margin-bottom:6px; }
        .whr-dot { width:6px; height:6px; border-radius:50%; background:var(--coral,#FF6B8A); flex-shrink:0; }
        .whr-name { font-size:12px; font-weight:600; color:var(--coral,#FF6B8A); flex:1; }

        /* ════ YEARLY ════ */
        .year-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        .year-month-card { display:flex; flex-direction:column; gap:6px; padding:10px 8px; background:var(--glass-bg2,rgba(255,255,255,.04)); border:1.5px solid var(--glass-border,rgba(255,255,255,.08)); border-radius:14px; cursor:pointer; font-family:inherit; transition:all .14s; text-align:left; }
        .year-month-card.sel { background:var(--pur-lt,rgba(124,106,240,.14)); border-color:var(--purple); }
        .year-month-card.current { border-color:var(--purple); }
        .year-month-card:active { opacity:.8; }
        .ymc-header { display:flex; align-items:center; justify-content:space-between; }
        .ymc-name { font-size:12px; font-weight:800; color:var(--dark); }
        .ymc-count { font-size:9px; font-weight:700; color:var(--purple); background:var(--pur-lt,rgba(124,106,240,.15)); border-radius:8px; padding:1px 6px; }
        .ymc-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:1px; }
        .ymc-cell { aspect-ratio:1; display:flex; align-items:center; justify-content:center; border-radius:3px; }
        .ymc-cell span { font-size:5.5px; color:var(--mid); line-height:1; }
        .ymc-cell.tod { background:var(--purple); border-radius:3px; }
        .ymc-cell.tod span { color:#fff; font-weight:700; }
        .ymc-cell.has { background:rgba(124,106,240,.18); border-radius:3px; }
        .ymc-cell.has span { color:var(--purple); font-weight:700; }

        /* ════ SHARED ════ */
        .holiday-banner { display:flex; align-items:center; gap:10px; background:rgba(255,107,107,.10); border:1px solid rgba(255,107,107,.25); border-radius:12px; padding:10px 14px; margin-bottom:12px; }
        .hol-icon { display:flex; align-items:center; flex-shrink:0; }
        .hol-info { flex:1; }
        .hol-name { font-size:13px; font-weight:700; color:var(--coral,#FF6B8A); }
        .hol-en   { font-size:10px; color:var(--mid); margin-top:1px; }
        .hol-tag  { font-size:10px; font-weight:700; color:var(--coral,#FF6B8A); background:rgba(255,107,107,.15); padding:3px 8px; border-radius:20px; white-space:nowrap; }

        .event-list { display:flex; flex-direction:column; gap:8px; }
        .event-item { background:var(--glass-bg,var(--surf)); backdrop-filter:var(--glass-blur,blur(18px)); -webkit-backdrop-filter:var(--glass-blur,blur(18px)); border-radius:14px; padding:14px 14px 14px 10px; display:flex; align-items:center; gap:10px; border:1px solid var(--glass-border,var(--border)); }
        .event-item.compact { padding:10px 12px 10px 10px; border-radius:12px; }
        .event-item.done { opacity:.45; }
        .event-bar  { width:3px; border-radius:2px; align-self:stretch; flex-shrink:0; min-height:28px; }
        .event-body { flex:1; min-width:0; }
        .event-title { font-size:14px; font-weight:600; color:var(--dark); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .event-item.compact .event-title { font-size:13px; }
        .event-meta  { font-size:11px; color:var(--mid); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .done-badge  { font-size:14px; color:var(--mint,#2DD4BF); font-weight:700; flex-shrink:0; }

        .day-empty { text-align:center; padding:32px 0; color:var(--mid); font-size:13px; }
        .empty-icon { margin:0 auto 12px; opacity:.35; display:flex; justify-content:center; }
        .day-add-cta { display:inline-block; margin-top:12px; padding:10px 24px; background:var(--gradient); border-radius:12px; color:#fff; font-size:13px; font-weight:700; border:none; cursor:pointer; font-family:inherit; box-shadow:0 4px 14px rgba(124,106,240,.3); }
        .no-country-hint { text-align:center; margin-top:16px; font-size:12px; color:var(--mid); }
        .no-country-hint a { color:var(--purple); text-decoration:none; font-weight:600; }

        /* ════ DAILY TIMELINE ════ */
        .tl-day-hdr { display:flex; align-items:flex-start; justify-content:space-between; padding:16px 16px 12px; border-bottom:1px solid var(--glass-border,var(--border)); background:var(--glass-bg2,rgba(255,255,255,.03)); }
        .tl-day-left { display:flex; flex-direction:column; }
        .tl-dow  { font-size:11px; font-weight:800; color:var(--purple); text-transform:uppercase; letter-spacing:1px; }
        .tl-date { font-size:22px; font-weight:900; color:var(--dark); letter-spacing:-.4px; margin-top:2px; }
        .tl-today-badge { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:var(--purple); background:rgba(124,106,240,.12); border:1px solid rgba(124,106,240,.22); padding:2px 9px; border-radius:20px; }
        .tl-today-dot { width:6px; height:6px; border-radius:50%; background:var(--purple); box-shadow:0 0 5px var(--purple); flex-shrink:0; }
        .tl-count { font-size:11px; color:var(--mid); font-weight:600; }

        /* Timeline scroll area */
        .tl-wrap { display:flex; flex-direction:column; padding:0 0 8px; }

        /* Each hour row */
        .tl-row { display:flex; align-items:flex-start; min-height:52px; position:relative; }
        .tl-row-past .tl-time-lbl { opacity:.35; }
        .tl-row-past .tl-line { opacity:.25; }

        /* Time label column */
        .tl-time { width:58px; flex-shrink:0; padding:0 10px 0 14px; padding-top:10px; text-align:right; }
        .tl-time-lbl { font-size:10px; font-weight:700; color:var(--mid); letter-spacing:.2px; white-space:nowrap; display:block; line-height:1; }
        .tl-time-now { color:var(--purple) !important; font-weight:800; }

        /* Lane column */
        .tl-lane { flex:1; position:relative; border-left:1px solid var(--glass-border,rgba(255,255,255,.07)); min-height:52px; padding:8px 12px 8px 14px; }
        .tl-line { position:absolute; top:0; left:0; right:0; height:1px; background:var(--glass-border,rgba(255,255,255,.07)); }
        .tl-line-now { background:var(--purple) !important; opacity:.5; }
        .tl-row-now .tl-lane { background:rgba(124,106,240,.03); }

        /* Current time needle */
        .tl-needle { position:absolute; left:-1px; right:0; display:flex; align-items:center; z-index:2; pointer-events:none; }
        .tl-needle-dot { width:8px; height:8px; border-radius:50%; background:var(--purple); flex-shrink:0; margin-left:-4px; box-shadow:0 0 6px var(--purple); }
        .tl-needle-line { flex:1; height:1.5px; background:var(--purple); opacity:.7; }

        /* Event blocks inside a lane */
        .tl-events { display:flex; flex-direction:column; gap:5px; }
        .tl-event { position:relative; padding:8px 10px 8px 12px; border-radius:10px; border-left:3px solid var(--purple); background:var(--surf); border-top:1px solid var(--glass-border,var(--border)); border-right:1px solid var(--glass-border,var(--border)); border-bottom:1px solid var(--glass-border,var(--border)); display:flex; flex-direction:column; gap:3px; box-shadow:0 1px 6px rgba(0,0,0,.08); }
        .tl-event.tl-done { opacity:.45; }
        .tl-event-title { font-size:13px; font-weight:700; color:var(--dark); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .tl-event-meta  { display:flex; align-items:center; gap:5px; flex-wrap:wrap; font-size:10px; color:var(--mid); line-height:1.4; }
        .tl-check { position:absolute; top:8px; right:10px; font-size:12px; color:var(--mint,#2DD4BF); font-weight:800; }
      `}</style>
    </div>
  );
}
