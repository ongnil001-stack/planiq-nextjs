'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Schedule } from '@/types/database';
import { formatTime, PRIORITY_COLORS, TYPE_ICONS } from '@/lib/utils';
import { getHolidays, buildHolidayMap, toDateStr, type Holiday } from '@/lib/holidays';
import { COUNTRIES } from '@/lib/countries';
import BottomNav from '@/components/layout/BottomNav';
import AddScheduleSheet from '@/components/AddScheduleSheet';
import { createClient } from '@/lib/supabase/client';

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── SVG country flag icons — clean, minimal, theme-neutral ──────────────────
function CountryFlag({ code }: { code: string }) {
  if (code === 'PH') return (
    <svg width="20" height="13" viewBox="0 0 20 13" xmlns="http://www.w3.org/2000/svg"
      style={{ display:'block', borderRadius:2, flexShrink:0, border:'1px solid rgba(255,255,255,.1)' }}>
      {/* Blue top half */}
      <rect width="20" height="6.5" fill="#0038A8"/>
      {/* Red bottom half */}
      <rect y="6.5" width="20" height="6.5" fill="#CE1126"/>
      {/* White triangle on left */}
      <polygon points="0,0 9,6.5 0,13" fill="#FFFFFF"/>
      {/* Golden sun */}
      <circle cx="4.2" cy="6.5" r="1.4" fill="#FCD116"/>
      {/* 8 sun rays */}
      {[0,45,90,135,180,225,270,315].map((deg,i) => {
        const a = deg * Math.PI / 180;
        return <line key={i}
          x1={4.2 + Math.cos(a)*1.7} y1={6.5 + Math.sin(a)*1.7}
          x2={4.2 + Math.cos(a)*2.6} y2={6.5 + Math.sin(a)*2.6}
          stroke="#FCD116" strokeWidth="0.55"/>;
      })}
      {/* 3 stars at triangle corners */}
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
      {/* Union Jack mini */}
      <path d="M0,0 L6,4 M6,0 L0,4" stroke="#FFF" strokeWidth="1.5"/>
      <path d="M0,0 L6,4 M6,0 L0,4" stroke="#C8102E" strokeWidth="0.9"/>
      <path d="M3,0 V4 M0,2 H6" stroke="#FFF" strokeWidth="1.8"/>
      <path d="M3,0 V4 M0,2 H6" stroke="#C8102E" strokeWidth="1.1"/>
      {/* Stars */}
      <circle cx="14" cy="4" r="0.8" fill="#FFF"/>
      <circle cx="17" cy="7" r="0.8" fill="#FFF"/>
      <circle cx="12" cy="8" r="0.8" fill="#FFF"/>
      <circle cx="15" cy="11" r="0.8" fill="#FFF"/>
    </svg>
  );

  // Generic fallback — themed pill with country code
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:20, height:13, borderRadius:2,
      background:'var(--pur-lt)', color:'var(--purple)',
      fontSize:7, fontWeight:800, letterSpacing:'.5px', flexShrink:0,
    }}>{code}</span>
  );
}

export default function CalendarClient({ initialSchedules }: { initialSchedules: Schedule[] }) {
  const today    = new Date();
  const supabase = createClient();

  const [viewDate,    setViewDate]    = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());
  const [holidays,    setHolidays]    = useState<Map<string, Holiday>>(new Map());
  const [countryCode, setCountryCode] = useState('');
  const [schedules,   setSchedules]   = useState<Schedule[]>(initialSchedules);
  const [sheetOpen,   setSheetOpen]   = useState(false);

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

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); setSelectedDay(1); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); setSelectedDay(1); }

  // Refresh schedules after a new one is saved
  const refreshSchedules = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const startOfMonth = new Date(year, month, 1).toISOString();
    const endOfMonth   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    const { data } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', startOfMonth)
      .lte('start_time', endOfMonth)
      .order('start_time');
    if (data) setSchedules(data as Schedule[]);
  }, [year, month]);

  const dayMap: Record<number, Schedule[]> = {};
  schedules.forEach((s) => {
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
  const countryName       = COUNTRIES.find(c => c.code === countryCode);

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  // Tap a date → select it. Double-tap (or second tap on already-selected) → open sheet
  function handleDayClick(d: number) {
    if (d === selectedDay) {
      setSheetOpen(true);
    } else {
      setSelectedDay(d);
    }
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Schedule</h1>
          {countryCode && countryName && (
            <div className="country-badge">
              <CountryFlag code={countryCode} />
              <span>{countryName.name} holidays</span>
            </div>
          )}
        </div>
      </div>

      {/* Month navigator */}
      <div className="month-nav">
        <button className="nav-arrow" onClick={prevMonth}>‹</button>
        <span className="month-label">{MONTHS[month]} {year}</span>
        <button className="nav-arrow" onClick={nextMonth}>›</button>
      </div>

      {/* Day-of-week headers */}
      <div className="cal-grid header-row">
        {DAYS.map((d) => <div key={d} className="dow">{d}</div>)}
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
            <button
              key={d}
              className={`cal-day${active ? ' active' : ''}${todayDay ? ' today' : ''}${holiday ? ' holiday' : ''}`}
              onClick={() => handleDayClick(d)}
              title={holiday ? holiday.localName : undefined}
            >
              <span className="day-num">{d}</span>
              <div className="day-indicators">
                {holiday && <span className="h-dot" title={holiday.localName} />}
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
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="day-count">{selectedSchedules.length} item{selectedSchedules.length !== 1 ? 's' : ''}</span>
            <button className="day-add-inline" onClick={() => setSheetOpen(true)}>+ Add</button>
          </div>
        </div>

        {/* Holiday banner */}
        {selectedHol && (
          <div className="holiday-banner">
            <span className="hol-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="4" width="16" height="14" rx="3" stroke="var(--coral,#FF6B8A)" strokeWidth="1.5"/>
                <path d="M2 8h16" stroke="var(--coral,#FF6B8A)" strokeWidth="1.5"/>
                <path d="M6 2v3M14 2v3" stroke="var(--coral,#FF6B8A)" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="7" cy="12" r="1" fill="var(--coral,#FF6B8A)"/>
                <circle cx="10" cy="12" r="1" fill="var(--coral,#FF6B8A)"/>
                <circle cx="13" cy="12" r="1" fill="var(--coral,#FF6B8A)"/>
              </svg>
            </span>
            <div className="hol-info">
              <div className="hol-name">{selectedHol.localName}</div>
              {selectedHol.localName !== selectedHol.name && (
                <div className="hol-en">{selectedHol.name}</div>
              )}
            </div>
            <span className="hol-tag">Holiday</span>
          </div>
        )}

        {selectedSchedules.length === 0 ? (
          <div className="day-empty">
            <p>Nothing scheduled for this day</p>
            <button className="day-add-cta" onClick={() => setSheetOpen(true)}>+ Add Schedule</button>
          </div>
        ) : (
          <div className="event-list">
            {selectedSchedules.map((s) => (
              <div key={s.id} className={`event-item${s.is_completed ? ' done' : ''}`}>
                <div className="event-bar" style={{ background: PRIORITY_COLORS[s.priority] }} />
                <div className="event-body">
                  <p className="event-title">{s.title}</p>
                  <p className="event-meta">
                    {TYPE_ICONS[s.type]}{' '}
                    {s.all_day ? 'All day' : formatTime(s.start_time)}
                    {s.end_time ? ` — ${formatTime(s.end_time)}` : ''}
                    {(s as Schedule & { location?: string }).location ? ` · 📍 ${(s as Schedule & { location?: string }).location}` : ''}
                  </p>
                </div>
                {s.is_completed && <span className="done-badge">✓</span>}
              </div>
            ))}
          </div>
        )}

        {!countryCode && (
          <div className="no-country-hint">
            <a href="/profile">⚙️ Set your country in Profile to see local holidays</a>
          </div>
        )}
      </div>

      {/* Add Schedule bottom sheet */}
      <AddScheduleSheet
        open={sheetOpen}
        selectedDate={selectedDate}
        countryCode={countryCode}
        onClose={() => setSheetOpen(false)}
        onSaved={refreshSchedules}
      />

      <BottomNav />

      <style jsx>{`
        .page { min-height:100vh; background:var(--bg); display:flex; flex-direction:column; font-family:inherit; color:var(--dark); }

        /* Header */
        .pg-header { padding:52px 20px 12px; display:flex; justify-content:space-between; align-items:flex-start; background:var(--glass-bg, var(--surf)); backdrop-filter:var(--glass-blur, blur(18px)); -webkit-backdrop-filter:var(--glass-blur, blur(18px)); border-bottom:1px solid var(--glass-border, var(--border)); }
        .pg-title { font-size:22px; font-weight:800; color:var(--dark); }
        .country-badge { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--purple); font-weight:600; margin-top:4px; }

        /* Month nav */
        .month-nav { display:flex; align-items:center; justify-content:space-between; padding:14px 20px 8px; background:var(--glass-bg2, var(--surf)); border-bottom:1px solid var(--glass-border, var(--border)); }
        .month-label { font-size:17px; font-weight:700; color:var(--dark); }
        .nav-arrow { background:none; border:none; color:var(--mid); font-size:22px; cursor:pointer; padding:4px 10px; line-height:1; border-radius:8px; }
        .nav-arrow:active { background:var(--surf2); }

        /* Grid */
        .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; padding:0 8px 4px; background:var(--glass-bg2, var(--surf)); }
        .header-row { padding-top:8px; }
        .dow { text-align:center; font-size:10px; font-weight:700; color:var(--mid); text-transform:uppercase; letter-spacing:.5px; padding:4px 0; }

        /* Day cell */
        .cal-day { aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:10px; cursor:pointer; background:transparent; gap:2px; border:none; transition:background .12s; padding:0; }
        .cal-day:active { background:var(--pur-lt); }
        .cal-day.active { background:var(--purple) !important; }
        .cal-day.today:not(.active) .day-num { color:var(--purple); font-weight:800; }
        .cal-day.holiday:not(.active) { background:rgba(255,107,107,.07); }
        .day-num { font-size:13px; font-weight:600; color:var(--mid); line-height:1; }
        .cal-day.active .day-num  { color:#fff; }
        .cal-day.holiday:not(.active) .day-num { color:var(--coral,#FF6B8A); font-weight:700; }

        /* Dots */
        .day-indicators { display:flex; gap:2px; align-items:center; min-height:5px; }
        .h-dot { width:5px; height:5px; border-radius:50%; background:var(--coral,#FF6B8A); flex-shrink:0; }
        .cal-day.active .h-dot { background:rgba(255,255,255,.8); }
        .dot { width:4px; height:4px; border-radius:50%; flex-shrink:0; }
        .cal-day.active .dot { background:rgba(255,255,255,.7) !important; }

        /* Day panel */
        .day-panel { flex:1; overflow-y:auto; padding:14px 16px 100px; }
        .day-panel-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .day-panel-title  { font-size:15px; font-weight:700; color:var(--dark); }
        .day-count        { font-size:12px; color:var(--mid); }
        .day-add-inline   { padding:5px 12px; background:var(--gradient); border:none; border-radius:8px; color:#fff; font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; }

        /* Holiday banner */
        .holiday-banner { display:flex; align-items:center; gap:10px; background:rgba(255,107,107,.1); border:1px solid rgba(255,107,107,.25); border-radius:12px; padding:10px 14px; margin-bottom:12px; }
        .hol-icon { display:flex; align-items:center; flex-shrink:0; }
        .hol-info { flex:1; }
        .hol-name { font-size:14px; font-weight:700; color:var(--coral,#FF6B8A); }
        .hol-en   { font-size:11px; color:var(--mid); margin-top:1px; }
        .hol-tag  { font-size:10px; font-weight:700; color:var(--coral,#FF6B8A); background:rgba(255,107,107,.15); padding:3px 8px; border-radius:20px; }

        /* Events */
        .event-list { display:flex; flex-direction:column; gap:8px; }
        .event-item { background:var(--glass-bg, var(--surf)); backdrop-filter:var(--glass-blur, blur(18px)); -webkit-backdrop-filter:var(--glass-blur, blur(18px)); border-radius:var(--rmd); padding:14px 14px 14px 10px; display:flex; align-items:center; gap:10px; border:1px solid var(--glass-border, var(--border)); box-shadow:var(--glass-sh2, none); }
        .event-item.done { opacity:.45; }
        .event-bar  { width:3px; border-radius:2px; align-self:stretch; flex-shrink:0; }
        .event-body { flex:1; }
        .event-title { font-size:14px; font-weight:600; color:var(--dark); }
        .event-meta  { font-size:12px; color:var(--mid); margin-top:2px; }
        .done-badge  { font-size:14px; color:var(--mint,#2DD4BF); font-weight:700; }

        /* Empty */
        .day-empty { text-align:center; padding:24px 0; color:var(--mid); font-size:13px; }
        .day-add-cta { display:inline-block; margin-top:10px; padding:10px 22px; background:var(--gradient); border-radius:12px; color:#fff; font-size:13px; font-weight:700; border:none; cursor:pointer; font-family:inherit; box-shadow:0 4px 14px rgba(124,106,240,.3); }
        .no-country-hint { text-align:center; margin-top:16px; font-size:12px; color:var(--mid); }
        .no-country-hint a { color:var(--purple); text-decoration:none; font-weight:600; }
      `}</style>
    </div>
  );
}
