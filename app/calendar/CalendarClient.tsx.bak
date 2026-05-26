'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Schedule } from '@/types/database';
import { formatTime, PRIORITY_COLORS, TYPE_ICONS } from '@/lib/utils';
import BottomNav from '@/components/layout/BottomNav';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarClient({ initialSchedules }: { initialSchedules: Schedule[] }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();

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

  const selectedDate = new Date(year, month, selectedDay);
  const selectedSchedules = dayMap[selectedDay] ?? [];

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="page">
      <div className="pg-header">
        <h1 className="pg-title">Schedule</h1>
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
          const d = i + 1;
          const hasDots = dayMap[d]?.length > 0;
          const active = d === selectedDay;
          const todayDay = isToday(d);
          return (
            <button
              key={d}
              className={`cal-day ${active ? 'active' : ''} ${todayDay ? 'today' : ''}`}
              onClick={() => setSelectedDay(d)}
            >
              <span className="day-num">{d}</span>
              {hasDots && (
                <div className="dots">
                  {dayMap[d].slice(0, 3).map((s, idx) => (
                    <span key={idx} className="dot" style={{ background: PRIORITY_COLORS[s.priority] }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day events */}
      <div className="day-panel">
        <div className="day-panel-header">
          <span className="day-panel-title">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
          <span className="day-count">{selectedSchedules.length} item{selectedSchedules.length !== 1 ? 's' : ''}</span>
        </div>

        {selectedSchedules.length === 0 ? (
          <div className="day-empty">
            <p>Nothing scheduled</p>
            <Link href="/schedule/new" className="day-add-cta">+ Add item</Link>
          </div>
        ) : (
          <div className="event-list">
            {selectedSchedules.map((s) => (
              <div key={s.id} className={`event-item ${s.is_completed ? 'done' : ''}`}>
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
      </div>

      <BottomNav />

      <style jsx>{`
        .page { min-height: 100vh; background: #0B0D1A; display: flex; flex-direction: column; font-family: 'Sora', sans-serif; color: #fff; }
        .pg-header { padding: 52px 20px 12px; display: flex; justify-content: space-between; align-items: center; background: #161829; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .pg-title { font-size: 22px; font-weight: 800; color: #fff; }
        .add-btn { padding: 8px 16px; background: linear-gradient(135deg,#6C5CE7,#A78BFA); border-radius: 10px; color: #fff; font-size: 13px; font-weight: 700; text-decoration: none; }
        .month-nav { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 8px; background: #161829; }
        .month-label { font-size: 17px; font-weight: 700; color: #fff; }
        .nav-arrow { background: rgba(255,255,255,0.07); border: none; font-size: 22px; color: rgba(255,255,255,0.5); cursor: pointer; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-family: inherit; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; padding: 0 10px; background: #161829; }
        .header-row { padding-bottom: 4px; }
        .dow { text-align: center; font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.25); padding: 6px 0; }
        .cal-day {
          aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
          border-radius: 10px; background: transparent; border: none; cursor: pointer; gap: 2px; padding: 2px;
          transition: background .15s; font-family: inherit;
        }
        .cal-day:active { background: rgba(124,106,240,0.15); }
        .cal-day.active { background: #7C6AF0 !important; }
        .cal-day.today:not(.active) .day-num { color: #A78BFA; font-weight: 800; }
        .day-num { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.8); }
        .cal-day.active .day-num { color: #fff; }
        .dots { display: flex; gap: 2px; }
        .dot { width: 5px; height: 5px; border-radius: 50%; }
        .cal-day.active .dot { opacity: .7; }
        .day-panel { flex: 1; padding: 16px; overflow-y: auto; padding-bottom: 90px; }
        .day-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .day-panel-title { font-size: 15px; font-weight: 700; color: #fff; }
        .day-count { font-size: 12px; color: rgba(255,255,255,0.4); font-weight: 600; }
        .day-empty { text-align: center; padding: 24px; color: rgba(255,255,255,0.3); font-size: 14px; }
        .day-add-cta { display: inline-block; margin-top: 10px; padding: 8px 18px; background: linear-gradient(135deg,#6C5CE7,#A78BFA); border-radius: 10px; color: #fff; font-size: 13px; font-weight: 700; text-decoration: none; }
        .event-list { display: flex; flex-direction: column; gap: 8px; }
        .event-item { background: #161829; border-radius: 14px; padding: 14px 14px 14px 10px; display: flex; align-items: center; gap: 10px; border: 1px solid rgba(255,255,255,0.07); transition: opacity .2s; }
        .event-item.done { opacity: .45; }
        .event-bar { width: 4px; border-radius: 4px; align-self: stretch; flex-shrink: 0; min-height: 36px; }
        .event-body { flex: 1; min-width: 0; }
        .event-title { font-size: 14px; font-weight: 600; color: #fff; }
        .event-meta { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 2px; }
        .done-badge { font-size: 14px; color: #00D67E; font-weight: 700; }
      `}</style>
    </div>
  );
}
