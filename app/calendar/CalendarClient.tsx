'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Schedule } from '@/types/database';
import { formatTime, PRIORITY_COLORS, TYPE_ICONS } from '@/lib/utils';
import { getHolidays, buildHolidayMap, toDateStr, type Holiday } from '@/lib/holidays';
import { COUNTRIES } from '@/lib/countries';
import BottomNav from '@/components/layout/BottomNav';
import { createClient } from '@/lib/supabase/client';

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarClient({ initialSchedules }: { initialSchedules: Schedule[] }) {
  const today    = new Date();
  const supabase = createClient();

  const [viewDate,    setViewDate]    = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());
  const [holidays,    setHolidays]    = useState<Map<string, Holiday>>(new Map());
  const [countryCode, setCountryCode] = useState('');
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow    = new Date(year, month, 1).getDay();

  // Load user's country and fetch holidays
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
        // also fetch next year if December
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

  const dayMap: Record<number, Schedule[]> = {};
  initialSchedules.forEach((s) => {
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

  const countryName = COUNTRIES.find(c => c.code === countryCode);

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="page">
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Schedule</h1>
          {countryCode && countryName && (
            <div className="country-badge">{countryName.flag} {countryName.name} holidays</div>
          )}
        </div>
        <Link href="/schedule/new" className="add-btn">+ Add</Link>
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
              onClick={() => setSelectedDay(d)}
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
          <span className="day-count">{selectedSchedules.length} item{selectedSchedules.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Holiday banner */}
        {selectedHol && (
          <div className="holiday-banner">
            <span className="hol-icon">🎌</span>
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
            <p>Nothing scheduled</p>
            <Link href="/schedule/new" className="day-add-cta">+ Add item</Link>
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
                  </p>
                </div>
                {s.is_completed && <span className="done-badge">✓</span>}
              </div>
            ))}
          </div>
        )}

        {!countryCode && (
          <div className="no-country-hint">
            <Link href="/profile">⚙️ Set your country in Profile to see local holidays</Link>
          </div>
        )}
      </div>

      <BottomNav />

      <style jsx>{`
        .page { min-height:100vh; background:var(--bg); display:flex; flex-direction:column; font-family:inherit; color:var(--dark); }

        /* Header */
        .pg-header { padding:52px 20px 12px; display:flex; justify-content:space-between; align-items:flex-start; background:var(--surf); border-bottom:1px solid var(--border); }
        .pg-title { font-size:22px; font-weight:800; color:var(--dark); }
        .country-badge { font-size:11px; color:var(--purple); font-weight:600; margin-top:2px; }
        .add-btn { padding:8px 16px; background:var(--gradient); border-radius:10px; color:#fff; font-size:13px; font-weight:700; text-decoration:none; white-space:nowrap; margin-top:4px; }

        /* Month nav */
        .month-nav { display:flex; align-items:center; justify-content:space-between; padding:14px 20px 8px; background:var(--surf); }
        .month-label { font-size:17px; font-weight:700; color:var(--dark); }
        .nav-arrow { background:none; border:none; color:var(--mid); font-size:22px; cursor:pointer; padding:4px 10px; line-height:1; border-radius:8px; }
        .nav-arrow:active { background:var(--surf2); }

        /* Grid */
        .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; padding:0 8px 4px; background:var(--surf); }
        .header-row { padding-top:8px; }
        .dow { text-align:center; font-size:10px; font-weight:700; color:var(--mid); text-transform:uppercase; letter-spacing:.5px; padding:4px 0; }

        /* Day cell */
        .cal-day {
          aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
          border-radius:10px; cursor:pointer; background:transparent; gap:2px;
          border:none; transition:background .12s; padding:0;
        }
        .cal-day:active { background:var(--pur-lt); }
        .cal-day.active { background:var(--purple) !important; }
        .cal-day.today:not(.active) .day-num { color:var(--purple); font-weight:800; }
        .cal-day.holiday:not(.active) { background:rgba(255,107,107,.07); }
        .day-num { font-size:13px; font-weight:600; color:var(--mid); line-height:1; }
        .cal-day.active .day-num  { color:#fff; }
        .cal-day.holiday:not(.active) .day-num { color:var(--coral,#FF6B8A); font-weight:700; }

        /* Indicator dots row */
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

        /* Holiday banner */
        .holiday-banner {
          display:flex; align-items:center; gap:10px;
          background:rgba(255,107,107,.1); border:1px solid rgba(255,107,107,.25);
          border-radius:12px; padding:10px 14px; margin-bottom:12px;
        }
        .hol-icon { font-size:20px; }
        .hol-info { flex:1; }
        .hol-name { font-size:14px; font-weight:700; color:var(--coral,#FF6B8A); }
        .hol-en   { font-size:11px; color:var(--mid); margin-top:1px; }
        .hol-tag  { font-size:10px; font-weight:700; color:var(--coral,#FF6B8A); background:rgba(255,107,107,.15); padding:3px 8px; border-radius:20px; }

        /* Events */
        .event-list { display:flex; flex-direction:column; gap:8px; }
        .event-item { background:var(--surf); border-radius:var(--rmd); padding:14px 14px 14px 10px; display:flex; align-items:center; gap:10px; border:1px solid var(--border); }
        .event-item.done { opacity:.45; }
        .event-bar  { width:3px; border-radius:2px; align-self:stretch; flex-shrink:0; }
        .event-body { flex:1; }
        .event-title { font-size:14px; font-weight:600; color:var(--dark); }
        .event-meta  { font-size:12px; color:var(--mid); margin-top:2px; }
        .done-badge  { font-size:14px; color:var(--mint,#2DD4BF); font-weight:700; }

        /* Empty / hint */
        .day-empty { text-align:center; padding:24px 0; color:var(--mid); font-size:13px; }
        .day-add-cta { display:inline-block; margin-top:10px; padding:8px 18px; background:var(--gradient); border-radius:10px; color:#fff; font-size:13px; font-weight:700; text-decoration:none; }
        .no-country-hint { text-align:center; margin-top:16px; font-size:12px; color:var(--mid); }
        .no-country-hint a { color:var(--purple); text-decoration:none; font-weight:600; }
      `}</style>
    </div>
  );
}
