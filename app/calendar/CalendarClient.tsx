'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Schedule } from '@/types/database';
import { PRIORITY_COLORS } from '@/lib/utils';
import { getHolidays, buildHolidayMap, toDateStr, type Holiday } from '@/lib/holidays';
import { COUNTRIES } from '@/lib/countries';
import BottomNav from '@/components/layout/BottomNav';
import AddScheduleSheet from '@/components/AddScheduleSheet';
import SwipeDeleteRow from '@/components/SwipeDeleteRow';
import { createClient } from '@/lib/supabase/client';
import NotificationPrompt from '@/components/notifications/NotificationPrompt';
import { checkAndNotify } from '@/lib/notifications';
import { buildDisplaySchedules, type DisplaySchedule } from '@/lib/recurrence';

const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAYS_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SH  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'yearly';

// ── SVG TypeIcon — shared across all views ─────────────────────────────────────
function TypeIcon({ type }: { type: string }) {
  const col = type === 'task' ? 'var(--mint,#2DD4BF)' : type === 'reminder' ? 'var(--amber,#FDCB6E)' : type === 'block' ? 'var(--coral,#FF6B8A)' : 'var(--cyan,#00C6FF)';
  if (type === 'task') return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, display:'block' }}>
      <rect x="1" y="1" width="14" height="14" rx="3" stroke={col} strokeWidth="1.4"/>
      <polyline points="4,8 7,11 12,5" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  if (type === 'reminder') return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, display:'block' }}>
      <path d="M8 2a4 4 0 014 4v3l1 1v1H3v-1l1-1V6a4 4 0 014-4z" stroke={col} strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M6.5 13a1.5 1.5 0 003 0" stroke={col} strokeWidth="1.4"/>
    </svg>
  );
  if (type === 'block') return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, display:'block' }}>
      <circle cx="8" cy="8" r="6" stroke={col} strokeWidth="1.4"/>
      <path d="M4 4l8 8" stroke={col} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, display:'block' }}>
      <rect x="1" y="3" width="14" height="12" rx="2.5" stroke={col} strokeWidth="1.4"/>
      <path d="M1 7h14" stroke={col} strokeWidth="1.4"/>
      <path d="M5 1v3M11 1v3" stroke={col} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

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

function EventCard({ s, compact = false, onEdit }: { s: Schedule; compact?: boolean; onEdit?: (s: Schedule) => void }) {
  const pColor = PRIORITY_COLORS[s.priority] || 'var(--purple)';
  const loc    = (s as Schedule & { location?: string }).location;
  const startD = new Date(s.start_time);
  const endD   = s.end_time ? new Date(s.end_time) : null;
  const Tag    = onEdit ? 'button' : 'div';
  return (
    <Tag
      {...(onEdit ? { onClick: () => onEdit(s) } : {})}
      style={{
        display:'flex', flexDirection:'column', gap: compact ? 3 : 4,
        padding: compact ? '8px 10px 8px 12px' : '10px 12px 10px 14px',
        borderRadius: compact ? 10 : 12,
        background:'var(--surf)',
        border:'1px solid var(--glass-border,var(--border))',
        borderLeftWidth:3, borderLeftColor:pColor, borderLeftStyle:'solid',
        boxShadow:'0 1px 5px rgba(0,0,0,.07)',
        opacity: s.is_completed ? 0.5 : 1,
        width: onEdit ? '100%' : undefined,
        textAlign: onEdit ? 'left' : undefined,
        cursor: onEdit ? 'pointer' : 'default',
        fontFamily:'inherit',
        transition: onEdit ? 'background .1s' : undefined,
      } as React.CSSProperties}>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <TypeIcon type={s.type} />
        <span style={{
          fontSize: compact ? 13 : 14, fontWeight:700, color:'var(--dark)',
          flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          textDecoration: s.is_completed ? 'line-through' : 'none',
        }}>{s.title}</span>
        {s.is_completed
          ? <span style={{ fontSize:11, color:'var(--mint,#2DD4BF)', fontWeight:800, flexShrink:0 }}>✓</span>
          : onEdit && <span style={{ fontSize:9, color:'var(--mid)', flexShrink:0, opacity:.5 }}>›</span>
        }
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
        <span style={{ fontSize:10, color:'var(--mid)', fontWeight:600 }}>
          {s.all_day ? 'All day' : startD.toLocaleTimeString('en-US',{ hour:'numeric', minute:'2-digit', hour12:true })}
          {endD && !s.all_day ? ` — ${endD.toLocaleTimeString('en-US',{ hour:'numeric', minute:'2-digit', hour12:true })}` : ''}
        </span>
        {loc && <>
          <span style={{ fontSize:10, color:'var(--border)' }}>·</span>
          <span style={{ fontSize:10, color:'var(--mid)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:120 }}>{loc}</span>
        </>}
        <span style={{
          fontSize:9, fontWeight:800, color:pColor,
          background:`rgba(${pColor==='#FF3B30'?'255,59,48':pColor==='#FF6B8A'?'255,107,138':pColor==='#FDCB6E'?'253,203,110':'0,206,201'},.12)`,
          padding:'1px 6px', borderRadius:5, letterSpacing:'.4px', textTransform:'uppercase', flexShrink:0,
        }}>{s.priority}</span>
      </div>
    </Tag>
  );
}

// ── Activity detail card — for Activities panel and Monthly Log ────────────────
function ActivityDetailCard({ s, dayDate, onClick }: { s: Schedule; dayDate: Date; onClick: () => void }) {
  const pColor  = PRIORITY_COLORS[s.priority] || 'var(--purple)';
  const startD  = new Date(s.start_time);
  const endD    = s.end_time ? new Date(s.end_time) : null;
  const desc    = (s as Schedule & { description?: string; notes?: string }).description
               || (s as Schedule & { description?: string; notes?: string }).notes
               || '';
  const typeLabelMap: Record<string, string> = { task:'Task', reminder:'Reminder', block:'Block', event:'Event' };
  const typeLabel = typeLabelMap[s.type] ?? s.type;

  return (
    <button
      onClick={onClick}
      style={{
        width:'100%', textAlign:'left', background:'var(--surf)',
        border:'1px solid var(--glass-border,var(--border))',
        borderLeftWidth:3, borderLeftColor:pColor, borderLeftStyle:'solid',
        borderRadius:12, padding:'10px 12px 10px 14px',
        cursor:'pointer', fontFamily:'inherit',
        boxShadow:'0 1px 5px rgba(0,0,0,.07)',
        opacity: s.is_completed ? 0.55 : 1,
        display:'flex', flexDirection:'column', gap:5,
        transition:'background .1s',
      }}>
      {/* Title + status */}
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <TypeIcon type={s.type} />
        <span style={{
          fontSize:13, fontWeight:700, color:'var(--dark)', flex:1,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          textDecoration: s.is_completed ? 'line-through' : 'none',
        }}>{s.title}</span>
        {s.is_completed
          ? <span style={{ fontSize:10, color:'var(--mint,#2DD4BF)', fontWeight:800, flexShrink:0 }}>Done ✓</span>
          : <span style={{ fontSize:9, fontWeight:800, color:pColor, background:`rgba(${pColor==='#FF3B30'?'255,59,48':pColor==='#FF6B8A'?'255,107,138':pColor==='#FDCB6E'?'253,203,110':'0,206,201'},.12)`, padding:'1px 6px', borderRadius:5, letterSpacing:'.4px', textTransform:'uppercase', flexShrink:0 }}>{s.priority}</span>
        }
      </div>
      {/* Date + time */}
      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
        <span style={{ fontSize:10, color:'var(--mid)', fontWeight:600 }}>
          {dayDate.toLocaleDateString('en-US',{ weekday:'short', month:'short', day:'numeric' })}
        </span>
        <span style={{ fontSize:10, color:'var(--border)' }}>·</span>
        <span style={{ fontSize:10, color:'var(--mid)', fontWeight:600 }}>
          {s.all_day ? 'All day' : startD.toLocaleTimeString('en-US',{ hour:'numeric', minute:'2-digit', hour12:true })}
          {endD && !s.all_day ? ` – ${endD.toLocaleTimeString('en-US',{ hour:'numeric', minute:'2-digit', hour12:true })}` : ''}
        </span>
        <span style={{ fontSize:10, color:'var(--border)' }}>·</span>
        <span style={{ fontSize:10, color:'var(--mid)' }}>{typeLabel}</span>
      </div>
      {/* Description / notes */}
      {desc ? (
        <div style={{ fontSize:11, color:'var(--mid)', opacity:0.8, lineHeight:1.4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const }}>
          {desc}
        </div>
      ) : null}
    </button>
  );
}


// ── DOW header — aligned with CalendarTrack cells ─────────────────────────────
function CalDowHeader() {
  const ref   = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => setW(el.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const GAP = 3, PAD = 10;
  const cellSize = w > 0 ? Math.floor((w - PAD*2 - GAP*6) / 7) : 0;
  return (
    <div ref={ref} style={{ display:'flex', gap:GAP, padding:`6px ${PAD}px 2px`, background:'var(--glass-bg2,var(--surf))' }}>
      {DAYS_SHORT.map(d => (
        <div key={d} style={{
          width: cellSize, flexShrink:0,
          textAlign:'center', fontSize:10, fontWeight:700,
          color:'var(--dark)', opacity:.45, textTransform:'uppercase', letterSpacing:'.5px',
        }}>{d}</div>
      ))}
    </div>
  );
}

// ── Fluid swipe calendar track ────────────────────────────────────────────────
interface CalTrackProps {
  year: number; month: number;
  selectedDay: number;
  dayMapFn:    (y: number, mo: number) => Record<number, import('@/types/database').Schedule[]>;
  holidaysFn:  (y: number, mo: number) => Map<string, import('@/lib/holidays').Holiday>;
  isToday:     (d: number, y: number, mo: number) => boolean;
  onDayClick:  (d: number) => void;
  onMonthChange: (delta: -1 | 1) => void;
}
function CalendarTrack({
  year, month, selectedDay,
  dayMapFn, holidaysFn, isToday,
  onDayClick, onMonthChange,
}: CalTrackProps) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const startX   = useRef<number | null>(null);
  const startY   = useRef<number | null>(null);
  const busy     = useRef(false);
  const [containerW, setContainerW] = useState(0);
  const [offsetX,    setOffsetX]    = useState(0);
  const [dir,        setDir]        = useState<'l'|'r'|null>(null);
  const [axis,       setAxis]       = useState<'h'|'v'|null>(null);

  // Measure container width reliably
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setContainerW(el.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Clear animation flag after month change
  const prevKey = useRef(`${year}-${month}`);
  useEffect(() => {
    const key = `${year}-${month}`;
    if (key !== prevKey.current) {
      prevKey.current = key;
      const t = setTimeout(() => { setDir(null); busy.current = false; }, 320);
      return () => clearTimeout(t);
    }
  }, [year, month]);

  // Compute cell size from container width
  const GAP      = 3;
  const PAD      = 10; // each side
  const usable   = containerW - PAD * 2;
  const cellSize = containerW > 0 ? Math.floor((usable - GAP * 6) / 7) : 0;

  function renderGrid(y: number, mo: number) {
    const days  = new Date(y, mo + 1, 0).getDate();
    const first = new Date(y, mo, 1).getDay();
    const dMap  = dayMapFn(y, mo);
    const hMap  = holidaysFn(y, mo);

    const items: React.ReactNode[] = [];
    // Empty cells for offset
    for (let i = 0; i < first; i++) {
      items.push(<div key={`e${i}`} style={{ width: cellSize, height: cellSize }} />);
    }
    // Day cells
    for (let i = 0; i < days; i++) {
      const d       = i + 1;
      const dateStr = toDateStr(new Date(y, mo, d));
      const hol     = hMap.get(dateStr);
      const evts    = dMap[d] ?? [];
      const active  = y === year && mo === month && d === selectedDay;
      const todayD  = isToday(d, y, mo);

      // Build visual state styles inline — no CSS class size dependency
      const cellBg  = active  ? 'var(--purple)'
                    : todayD  ? 'rgba(124,106,240,.13)'
                    : hol     ? 'rgba(255,107,107,.07)'
                    : 'transparent';
      const cellBox = todayD && !active ? '0 0 0 2px var(--purple)' : 'none';
      const numCol  = active  ? '#fff'
                    : todayD  ? 'var(--purple)'
                    : hol     ? 'var(--coral,#FF6B8A)'
                    : 'var(--dark)';
      const numW    = active || todayD ? 800 : hol ? 700 : 500;

      items.push(
        <button
          key={d}
          onClick={() => { if (y === year && mo === month) onDayClick(d); }}
          title={hol?.localName}
          style={{
            width: cellSize, height: cellSize,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 2,
            borderRadius: Math.round(cellSize * 0.28),
            background: cellBg,
            boxShadow: cellBox,
            border: 'none', cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 0,
            flexShrink: 0,
            transition: 'background .12s',
            WebkitTapHighlightColor: 'transparent',
          }}>
          <span style={{
            fontSize: Math.max(11, Math.round(cellSize * 0.34)),
            fontWeight: numW,
            color: numCol,
            lineHeight: 1,
            letterSpacing: active ? '-.3px' : '0',
          }}>{d}</span>
          {/* Dot indicators */}
          {(hol || evts.length > 0) && (
            <div style={{ display: 'flex', gap: 2, alignItems: 'center', height: 5 }}>
              {hol && (
                <span style={{
                  width: active ? 4 : 5, height: active ? 4 : 5,
                  borderRadius: '50%',
                  background: active ? 'rgba(255,255,255,.85)' : 'var(--coral,#FF6B8A)',
                  flexShrink: 0,
                }} />
              )}
              {!hol && evts[0] && (
                <span style={{
                  width: 4, height: 4, borderRadius: '50%', flexShrink: 0,
                  background: active ? 'rgba(255,255,255,.75)' : PRIORITY_COLORS[evts[0].priority],
                }} />
              )}
              {!hol && evts[1] && (
                <span style={{
                  width: 4, height: 4, borderRadius: '50%', flexShrink: 0,
                  background: active ? 'rgba(255,255,255,.55)' : PRIORITY_COLORS[evts[1].priority],
                }} />
              )}
            </div>
          )}
        </button>
      );
    }
    return items;
  }

  const THRESH = (containerW || 390) * 0.28;

  function onTS(e: React.TouchEvent) {
    if (busy.current) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    setAxis(null); setOffsetX(0);
  }
  function onTM(e: React.TouchEvent) {
    if (startX.current === null || busy.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - (startY.current ?? 0);
    if (!axis) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5)
        setAxis(Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v');
      return;
    }
    if (axis === 'v') return;
    e.preventDefault();
    const cap = (containerW || 390) * 0.55, r = 0.32;
    setOffsetX(Math.abs(dx) > cap ? Math.sign(dx) * (cap + (Math.abs(dx) - cap) * r) : dx);
  }
  function onTE() {
    if (!startX.current) return;
    startX.current = null;
    if (axis !== 'h' || busy.current) { setOffsetX(0); setAxis(null); return; }
    const snap = offsetX > THRESH ? -1 : offsetX < -THRESH ? 1 : 0;
    if (snap !== 0) {
      busy.current = true;
      setDir(snap < 0 ? 'r' : 'l');
      setOffsetX(0); setAxis(null);
      onMonthChange(snap as -1 | 1);
    } else {
      setOffsetX(0); setAxis(null);
    }
  }

  const gridAnim: React.CSSProperties = offsetX !== 0
    ? { transform: `translateX(${offsetX}px)`, transition: 'none', willChange: 'transform' }
    : dir === 'l' ? { animation: 'calSlideL 280ms cubic-bezier(.25,.46,.45,.94) both' }
    : dir === 'r' ? { animation: 'calSlideR 280ms cubic-bezier(.25,.46,.45,.94) both' }
    : {};

  // Grid container — use flexbox wrap so no CSS grid 1fr confusion
  const gridStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: GAP,
    padding: `4px ${PAD}px 6px`,
    ...gridAnim,
  };

  return (
    <div
      ref={wrapRef}
      style={{ overflow: 'hidden', touchAction: 'pan-y' }}
      onTouchStart={onTS}
      onTouchMove={onTM}
      onTouchEnd={onTE}
    >
      {containerW > 0 && (
        <div key={`${year}-${month}`} style={gridStyle}>
          {renderGrid(year, month)}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CalendarClient({ initialSchedules }: { initialSchedules: Schedule[] }) {
  const today    = new Date();
  const supabase = createClient();

  const [viewMode,   setViewMode]   = useState<ViewMode>('monthly');
  const [viewDate,   setViewDate]   = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay,setSelectedDay]= useState<number>(today.getDate());
  const [holidays,   setHolidays]   = useState<Map<string, Holiday>>(new Map());
  const [countryCode,setCountryCode]= useState('');
  const [schedules,  setSchedules]  = useState<Schedule[]>(initialSchedules);
  const [sheetOpen,  setSheetOpen]  = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DisplaySchedule | null>(null);
  const [sheetTime,  setSheetTime]  = useState<string | undefined>(undefined);
  const [monthlyTab, setMonthlyTab] = useState<'overview'|'busy'|'activities'|'free'>('overview');
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [editOpen,   setEditOpen]   = useState(false);
  const [editSched,  setEditSched]  = useState<Schedule | undefined>(undefined);

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

  // Helper: fetch this month's schedules + any recurring masters that
  // started before this month but may have occurrences within it.
  const fetchMonthSchedules = useCallback(async (y: number, mo: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const monthStart = new Date(y, mo, 1).toISOString();
    const monthEnd   = new Date(y, mo + 1, 0, 23, 59, 59, 999).toISOString();

    const [{ data: regular }, { data: recurring }] = await Promise.all([
      // Regular (non-recurring) + same-month recurring base rows
      supabase.from('schedules').select('*')
        .eq('user_id', user.id)
        .gte('start_time', monthStart)
        .lte('start_time', monthEnd)
        .order('start_time'),

      // Recurring masters that STARTED before this month but may recur into it
      supabase.from('schedules').select('*')
        .eq('user_id', user.id)
        .not('recurrence_rule', 'is', null)
        .lt('start_time', monthStart)
        .or(`recurrence_end.is.null,recurrence_end.gte.${monthStart.slice(0,10)}`)
        .order('start_time'),
    ]);

    // Merge — avoid duplicates (base rows already in `regular`)
    const regularIds = new Set((regular ?? []).map(s => s.id));
    const merged = [
      ...(regular ?? []),
      ...(recurring ?? []).filter(s => !regularIds.has(s.id)),
    ] as Schedule[];
    setSchedules(merged);
  }, []);

  // Refresh schedules (called after save/edit)
  const refreshSchedules = useCallback(async (newId?: string) => {
    if (newId) {
      const { data: newRow } = await supabase.from('schedules').select('*').eq('id', newId).single();
      if (newRow) {
        setSchedules(prev => {
          const exists = prev.some(s => s.id === (newRow as Schedule).id);
          if (exists) return prev;
          return [...prev, newRow as Schedule].sort(
            (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          );
        });
      }
    }
    await fetchMonthSchedules(year, month);
  }, [year, month, fetchMonthSchedules]);

  // Soft-delete helper — shows scope dialog for recurring schedules
  const deleteSchedule = useCallback((id: string) => {
    // Find the display schedule being deleted
    const target = schedules.find(s => s.id === id) as DisplaySchedule | undefined;
    if (!target) return;
    if (target.recurrence_rule || target._is_virtual) {
      // Show scope dialog for recurring schedules / virtual occurrences
      setDeleteTarget(target);
    } else {
      // Non-recurring: delete immediately
      void (async () => {
        const supabase = createClient();
        await supabase.from('schedules').delete().eq('id', id);
        setSchedules(prev => prev.filter(s => s.id !== id));
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedules]);

  // Handle confirmed delete with scope
  const confirmDelete = useCallback(async (scope: 'this' | 'future' | 'all') => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    const supabase = createClient();
    const baseId = target._base_id ?? target.id;
    const occDate = target._occurrence_date ?? target.start_time.slice(0, 10);

    if (scope === 'all') {
      await supabase.from('schedules').delete().eq('id', baseId);
      setSchedules(prev => prev.filter(s => s.id !== baseId));

    } else if (scope === 'future') {
      // Set recurrence_end to the day before this occurrence
      const dayBefore = new Date(occDate + 'T00:00:00Z');
      dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
      const newEnd = dayBefore.toISOString().slice(0, 10);
      await supabase.from('schedules').update({ recurrence_end: newEnd }).eq('id', baseId);
      setSchedules(prev => prev.map(s => s.id === baseId ? { ...s, recurrence_end: newEnd } : s));

    } else {
      // 'this' — add this date to excluded_dates of the base schedule
      const { data: base } = await supabase.from('schedules').select('excluded_dates').eq('id', baseId).single();
      const existing: string[] = base?.excluded_dates ? JSON.parse(base.excluded_dates) : [];
      if (!existing.includes(occDate)) existing.push(occDate);
      await supabase.from('schedules').update({ excluded_dates: JSON.stringify(existing) }).eq('id', baseId);
      setSchedules(prev => prev.map(s => s.id === baseId ? { ...s, excluded_dates: JSON.stringify(existing) } : s));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteTarget]);

  // Reset monthly tab and fetch schedules when navigating months.
  // This is the fix for future-month activities disappearing: the initial
  // server load only covers the current month, so we must re-fetch from
  // Supabase whenever the user switches to a different month.
  useEffect(() => {
    setMonthlyTab('overview');
    // Auto-expand today's date if it falls in the current month
    const todayD = today.getDate();
    if (today.getMonth() === month && today.getFullYear() === year) {
      setExpandedDays(new Set([todayD]));
    } else {
      setExpandedDays(new Set());
    }
    // Fetch schedules for the newly-selected month (including recurring masters)
    fetchMonthSchedules(year, month);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  // Expand recurring schedules into virtual occurrences for this month
  const displaySchedules = useMemo(() => {
    const rangeStart = new Date(year, month, 1);
    const rangeEnd   = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return buildDisplaySchedules(schedules, rangeStart, rangeEnd);
  }, [schedules, year, month]);

  // Build day map from expanded display schedules
  const dayMap: Record<number, DisplaySchedule[]> = {};
  displaySchedules.forEach(s => {
    const d = new Date(s.start_time);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push(s);
    }
  });

  // Monthly stats — computed top-level for fixed pills
  const busyDayNums = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(d => (dayMap[d]?.length ?? 0) > 0);
  const freeDayNums = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(d => !(dayMap[d]?.length));
  const totalActs   = Object.values(dayMap).reduce((sum, arr) => sum + arr.length, 0);

  const selectedDate      = new Date(year, month, selectedDay);
  const selectedDateStr   = toDateStr(selectedDate);
  const selectedSchedules = dayMap[selectedDay] ?? [];
  const selectedHol       = holidays.get(selectedDateStr) ?? null;
  const countryInfo       = COUNTRIES.find(c => c.code === countryCode);
  const isToday           = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const timelineRef  = useRef<HTMLDivElement>(null);


  // Auto-scroll timeline to current hour when daily view activates
  useEffect(() => {
    if (viewMode !== 'daily' || !timelineRef.current) return;
    const hourHeight = 64;
    const targetHour = isToday(selectedDay) ? Math.max(0, today.getHours() - 1) : 8;
    timelineRef.current.scrollTo({ top: targetHour * hourHeight, behavior: 'smooth' });
  }, [viewMode, selectedDay]);

  // ── Foreground reminder polling ─────────────────────────────────────────────
  // Checks every 60 s whether any scheduled activity has a reminder due.
  // Uses the browser Notification API — works when the app is in the foreground.
  // Background notifications are handled by the service worker via Web Push.
  useEffect(() => {
    // Show the permission prompt once after component mounts (subtle, not on load)
    const t = setTimeout(() => setShowNotifPrompt(true), 3000);
    // Run immediately then every 60 seconds
    checkAndNotify(schedules);
    const interval = setInterval(() => checkAndNotify(schedules), 60_000);
    return () => { clearTimeout(t); clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-run check whenever schedules change (e.g. after month navigation)
  useEffect(() => { checkAndNotify(schedules); }, [schedules]);

  function handleDayClick(d: number) {
    if (d === selectedDay) { setSheetTime(undefined); setSheetOpen(true); }
    else setSelectedDay(d);
  }

  function openEditSheet(s: Schedule) {
    setEditSched(s);
    setEditOpen(true);
  }

  function openSheetAtHour(h: number) {
    const hh = String(h).padStart(2, '0');
    setSheetTime(`${hh}:00`);
    setSheetOpen(true);
  }

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

  // Weekly view data
  const weekDays = (() => {
    const dow   = selectedDate.getDay();
    const start = new Date(selectedDate); start.setDate(selectedDate.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  })();

  // Yearly view data
  const monthCounts = Array.from({ length: 12 }, (_, mo) =>
    schedules.filter(s => {
      const d = new Date(s.start_time);
      return d.getFullYear() === year && d.getMonth() === mo;
    }).length
  );

  // Helper: navigate to a specific day in Daily view
  function goToDay(d: number, m: number = month, y: number = year) {
    setViewDate(new Date(y, m, 1));
    setSelectedDay(d);
    setViewMode('daily');
  }

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

      {/* ── FIXED Monthly summary pills — outside scroll so they never move ── */}
      {viewMode === 'monthly' && (
        <div style={{
          flexShrink:0, display:'flex', gap:8, padding:'10px 14px',
          background:'var(--glass-bg2,var(--surf))',
          borderBottom:'1px solid var(--glass-border,var(--border))',
        }}>
          {/* Busy Days */}
          <button
            onClick={() => setMonthlyTab(monthlyTab === 'busy' ? 'overview' : 'busy')}
            style={{
              flex:1, padding:'10px 6px', borderRadius:14,
              background: monthlyTab === 'busy' ? 'rgba(255,107,138,.18)' : 'var(--glass-bg,rgba(255,255,255,.04))',
              border: monthlyTab === 'busy' ? '1.5px solid rgba(255,107,138,.4)' : '1.5px solid var(--glass-border,rgba(255,255,255,.08))',
              cursor:'pointer', fontFamily:'inherit', textAlign:'center', transition:'all .14s',
            }}>
            <div style={{ fontSize:20, fontWeight:900, color: monthlyTab === 'busy' ? 'var(--coral,#FF6B8A)' : 'var(--dark)', lineHeight:1 }}>{busyDayNums.length}</div>
            <div style={{ fontSize:9, fontWeight:700, color:'var(--coral,#FF6B8A)', marginTop:3, letterSpacing:'.4px', textTransform:'uppercase' }}>Busy Days</div>
          </button>

          {/* Activities */}
          <button
            onClick={() => setMonthlyTab(monthlyTab === 'activities' ? 'overview' : 'activities')}
            style={{
              flex:1, padding:'10px 6px', borderRadius:14,
              background: monthlyTab === 'activities' ? 'rgba(124,106,240,.18)' : 'var(--glass-bg,rgba(255,255,255,.04))',
              border: monthlyTab === 'activities' ? '1.5px solid rgba(124,106,240,.4)' : '1.5px solid var(--glass-border,rgba(255,255,255,.08))',
              cursor:'pointer', fontFamily:'inherit', textAlign:'center', transition:'all .14s',
            }}>
            <div style={{ fontSize:20, fontWeight:900, color: monthlyTab === 'activities' ? 'var(--purple)' : 'var(--dark)', lineHeight:1 }}>{totalActs}</div>
            <div style={{ fontSize:9, fontWeight:700, color:'var(--purple)', marginTop:3, letterSpacing:'.4px', textTransform:'uppercase' }}>Activities</div>
          </button>

          {/* Free Days */}
          <button
            onClick={() => setMonthlyTab(monthlyTab === 'free' ? 'overview' : 'free')}
            style={{
              flex:1, padding:'10px 6px', borderRadius:14,
              background: monthlyTab === 'free' ? 'rgba(45,212,191,.18)' : 'var(--glass-bg,rgba(255,255,255,.04))',
              border: monthlyTab === 'free' ? '1.5px solid rgba(45,212,191,.4)' : '1.5px solid var(--glass-border,rgba(255,255,255,.08))',
              cursor:'pointer', fontFamily:'inherit', textAlign:'center', transition:'all .14s',
            }}>
            <div style={{ fontSize:20, fontWeight:900, color: monthlyTab === 'free' ? 'var(--mint,#2DD4BF)' : 'var(--dark)', lineHeight:1 }}>{freeDayNums.length}</div>
            <div style={{ fontSize:9, fontWeight:700, color:'var(--mint,#2DD4BF)', marginTop:3, letterSpacing:'.4px', textTransform:'uppercase' }}>Free Days</div>
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          SCROLLABLE CONTENT AREA
      ════════════════════════════════════════════════════════════ */}
      <div className="scroll-body" style={(viewMode === 'daily' || viewMode === 'weekly') ? { overflowY:'hidden', display:'flex', flexDirection:'column' } : undefined}>

        {/* ── MONTHLY VIEW ── */}
        {viewMode === 'monthly' && (
          <>
            {/* ── Notification permission prompt ── */}
            {showNotifPrompt && (
              <div style={{ padding: '14px 14px 0' }}>
                <NotificationPrompt onDismiss={() => setShowNotifPrompt(false)} />
              </div>
            )}

            {/* ── Expandable: Busy Days ── */}
            {monthlyTab === 'busy' && (
              <div style={{
                margin:'10px 14px 0', borderRadius:14,
                background:'var(--glass-bg,rgba(255,255,255,.04))',
                border:'1px solid rgba(255,107,138,.2)',
                overflow:'hidden',
              }}>
                <div style={{ padding:'10px 14px 6px', borderBottom:'1px solid var(--glass-border,rgba(255,255,255,.06))' }}>
                  <span style={{ fontSize:11, fontWeight:800, color:'var(--coral,#FF6B8A)', textTransform:'uppercase', letterSpacing:'.8px' }}>
                    Occupied Dates — {MONTHS[month]} {year}
                  </span>
                </div>
                {busyDayNums.length === 0 ? (
                  <div style={{ padding:'16px 14px', fontSize:12, color:'var(--mid)', textAlign:'center' }}>No busy days this month</div>
                ) : (
                  <div style={{ maxHeight:240, overflowY:'auto', overscrollBehavior:'contain', padding:'8px 10px 10px' }}>
                    {busyDayNums.map(d => {
                      const dayDate = new Date(year, month, d);
                      const evts    = dayMap[d] ?? [];
                      const isT     = isToday(d);
                      const isSel   = d === selectedDay;
                      return (
                        <button
                          key={d}
                          onClick={() => { setSelectedDay(d); setMonthlyTab('overview'); }}
                          style={{
                            width:'100%', textAlign:'left', background: isSel ? 'rgba(124,106,240,.12)' : 'transparent',
                            border:'none', borderRadius:10, padding:'8px 10px', cursor:'pointer',
                            marginBottom:2, fontFamily:'inherit', transition:'background .12s',
                          }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{
                              width:32, height:32, borderRadius:10, flexShrink:0,
                              background: isT ? 'var(--purple)' : 'rgba(255,107,138,.15)',
                              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                            }}>
                              <span style={{ fontSize:8, fontWeight:700, color: isT ? '#fff' : 'var(--coral,#FF6B8A)', lineHeight:1 }}>{DAYS_SHORT[dayDate.getDay()].toUpperCase()}</span>
                              <span style={{ fontSize:14, fontWeight:800, color: isT ? '#fff' : 'var(--dark)', lineHeight:1.1 }}>{d}</span>
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                                {evts.slice(0,3).map(s => (
                                  <span key={s.id} style={{
                                    fontSize:10, fontWeight:600, color:'var(--dark)',
                                    background:'var(--surf2,rgba(255,255,255,.06))',
                                    border:'1px solid var(--glass-border,rgba(255,255,255,.08))',
                                    borderRadius:6, padding:'2px 7px',
                                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:110,
                                  }}>{s.title}</span>
                                ))}
                                {evts.length > 3 && (
                                  <span style={{ fontSize:10, color:'var(--mid)', padding:'2px 4px' }}>+{evts.length-3}</span>
                                )}
                              </div>
                            </div>
                            <span style={{ fontSize:10, fontWeight:700, color:'var(--coral,#FF6B8A)', flexShrink:0 }}>{evts.length}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Expandable: Activities detail ── */}
            {monthlyTab === 'activities' && (
              <div style={{
                margin:'10px 14px 0', borderRadius:14,
                background:'var(--glass-bg,rgba(255,255,255,.04))',
                border:'1px solid rgba(124,106,240,.2)',
                overflow:'hidden',
              }}>
                <div style={{ padding:'10px 14px 6px', borderBottom:'1px solid var(--glass-border,rgba(255,255,255,.06))', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:11, fontWeight:800, color:'var(--purple)', textTransform:'uppercase', letterSpacing:'.8px' }}>
                    All Activities — {MONTHS[month]} {year}
                  </span>
                  <span style={{ fontSize:10, color:'var(--mid)', fontWeight:600 }}>{totalActs} total</span>
                </div>
                {totalActs === 0 ? (
                  <div style={{ padding:'16px 14px', fontSize:12, color:'var(--mid)', textAlign:'center' }}>No activities this month</div>
                ) : (
                  <div style={{ maxHeight:320, overflowY:'auto', overscrollBehavior:'contain', padding:'8px 10px 10px', display:'flex', flexDirection:'column', gap:6 }}>
                    {busyDayNums.map(d => {
                      const dayDate = new Date(year, month, d);
                      const evts    = dayMap[d] ?? [];
                      return (
                        <div key={d}>
                          {/* Date separator */}
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, marginTop: d === busyDayNums[0] ? 0 : 6 }}>
                            <div style={{
                              display:'inline-flex', flexDirection:'column', alignItems:'center',
                              background: isToday(d) ? 'var(--purple)' : 'rgba(124,106,240,.12)',
                              borderRadius:8, padding:'3px 8px', flexShrink:0,
                            }}>
                              <span style={{ fontSize:7, fontWeight:800, color: isToday(d) ? '#fff' : 'var(--purple)', lineHeight:1, textTransform:'uppercase' }}>{DAYS_SHORT[dayDate.getDay()]}</span>
                              <span style={{ fontSize:13, fontWeight:900, color: isToday(d) ? '#fff' : 'var(--purple)', lineHeight:1.1 }}>{d}</span>
                            </div>
                            <span style={{ fontSize:10, color:'var(--mid)', fontWeight:600 }}>
                              {dayDate.toLocaleDateString('en-US',{ month:'long', year:'numeric' })}
                            </span>
                            <span style={{ fontSize:9, color:'var(--mid)', marginLeft:'auto' }}>{evts.length} item{evts.length !== 1 ? 's' : ''}</span>
                          </div>
                          {/* Activity cards */}
                          <div style={{ display:'flex', flexDirection:'column', gap:5, paddingLeft:4 }}>
                            {evts.map(s => (
                              <ActivityDetailCard
                                key={s.id}
                                s={s}
                                dayDate={dayDate}
                                onClick={() => openEditSheet(s)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Expandable: Free Days ── */}
            {monthlyTab === 'free' && (
              <div style={{
                margin:'10px 14px 0', borderRadius:14,
                background:'var(--glass-bg,rgba(255,255,255,.04))',
                border:'1px solid rgba(45,212,191,.2)',
                overflow:'hidden',
              }}>
                <div style={{ padding:'10px 14px 6px', borderBottom:'1px solid var(--glass-border,rgba(255,255,255,.06))' }}>
                  <span style={{ fontSize:11, fontWeight:800, color:'var(--mint,#2DD4BF)', textTransform:'uppercase', letterSpacing:'.8px' }}>
                    Free Dates — {MONTHS[month]} {year}
                  </span>
                </div>
                {freeDayNums.length === 0 ? (
                  <div style={{ padding:'16px 14px', fontSize:12, color:'var(--mid)', textAlign:'center' }}>No free days this month — you&apos;re fully booked!</div>
                ) : (
                  <div style={{ padding:'10px 12px 12px', display:'flex', flexWrap:'wrap', gap:6 }}>
                    {freeDayNums.map(d => {
                      const dayDate = new Date(year, month, d);
                      const isT     = isToday(d);
                      const isSel   = d === selectedDay;
                      return (
                        <button
                          key={d}
                          onClick={() => { setSelectedDay(d); setMonthlyTab('overview'); }}
                          style={{
                            width:42, height:42, borderRadius:10, border:'none', cursor:'pointer',
                            background: isT ? 'var(--purple)' : isSel ? 'rgba(45,212,191,.18)' : 'rgba(45,212,191,.08)',
                            fontFamily:'inherit', display:'flex', flexDirection:'column',
                            alignItems:'center', justifyContent:'center', gap:1, transition:'all .12s',
                          }}>
                          <span style={{ fontSize:7, fontWeight:700, color: isT ? '#fff' : 'var(--mint,#2DD4BF)', lineHeight:1 }}>{DAYS_SHORT[dayDate.getDay()].toUpperCase()}</span>
                          <span style={{ fontSize:14, fontWeight:800, color: isT ? '#fff' : 'var(--dark)', lineHeight:1 }}>{d}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Calendar grid ── */}
            <div style={{ flexShrink:0, paddingTop:10 }}>
              {/* Day-of-week header — uses CalDowHeader to stay aligned with CalendarTrack */}
              <CalDowHeader />
              {/* Swipe track */}
              <CalendarTrack
                year={year}
                month={month}
                selectedDay={selectedDay}
                dayMapFn={(y, mo) => {
                  const map: Record<number, Schedule[]> = {};
                  schedules
                    .filter(s => { const d = new Date(s.start_time); return d.getFullYear()===y && d.getMonth()===mo; })
                    .forEach(s => { const d = new Date(s.start_time).getDate(); (map[d] ??= []).push(s); });
                  return map;
                }}
                holidaysFn={(y, mo) => {
                  const out = new Map<string, import('@/lib/holidays').Holiday>();
                  holidays.forEach((v,k) => { const [hy,hm]=k.split('-').map(Number); if(hy===y && hm-1===mo) out.set(k,v); });
                  return out;
                }}
                isToday={(d, y, mo) => d===today.getDate() && y===today.getFullYear() && mo===today.getMonth()}
                onDayClick={d => { handleDayClick(d); setMonthlyTab('overview'); }}
                onMonthChange={delta => { if (delta===-1) navPrev(); else navNext(); }}
              />
            </div>

            {/* ── Selected day detail ── */}
            <div className="day-panel">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <div style={{ fontSize:11, fontWeight:800, color:'var(--purple)', textTransform:'uppercase', letterSpacing:'1px' }}>
                      {selectedDate.toLocaleDateString('en-US',{ weekday:'long' })}
                    </div>
                    {isToday(selectedDay) && (
                      <span style={{ fontSize:9, fontWeight:900, color:'#fff', background:'var(--purple)', borderRadius:6, padding:'2px 7px', letterSpacing:'.5px', textTransform:'uppercase', boxShadow:'0 1px 6px rgba(124,106,240,.45)' }}>TODAY</span>
                    )}
                  </div>
                  <div style={{ fontSize:16, fontWeight:800, color:'var(--dark)', marginTop:1 }}>
                    {selectedDate.toLocaleDateString('en-US',{ month:'long', day:'numeric', year:'numeric' })}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {selectedSchedules.length > 0 && (
                    <span style={{ fontSize:11, color:'var(--mid)', fontWeight:600 }}>
                      {selectedSchedules.length} item{selectedSchedules.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  <button
                    onClick={() => setSheetOpen(true)}
                    style={{ padding:'7px 14px', background:'var(--gradient)', border:'none', borderRadius:20, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 8px rgba(124,106,240,.3)' }}
                  >+ Add</button>
                </div>
              </div>
              {selectedHol && <HolidayBanner holiday={selectedHol} />}
              {selectedSchedules.length === 0 ? (
                <div style={{ textAlign:'center', padding:'20px 0', color:'var(--mid)' }}>
                  <p style={{ fontSize:12 }}>Nothing scheduled — free day ✦</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {selectedSchedules.map(s => (
                    <SwipeDeleteRow
                      key={s.id}
                      onDelete={async () => { deleteSchedule(s.id); }}
                      undoLabel={`"${s.title}" deleted`}
                      borderRadius={12}
                    >
                      <EventCard s={s} onEdit={openEditSheet} />
                    </SwipeDeleteRow>
                  ))}
                </div>
              )}
            </div>

            {/* ── Monthly Activity Log ── */}
            {totalActs > 0 && (
              <div style={{ padding:'0 16px 16px' }}>
                {/* Section header */}
                <div style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'14px 0 10px',
                  borderTop:'1px solid var(--glass-border,rgba(255,255,255,.08))',
                }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="3" width="14" height="12" rx="2.5" stroke="var(--purple)" strokeWidth="1.4"/>
                    <path d="M1 7h14" stroke="var(--purple)" strokeWidth="1.4"/>
                    <path d="M5 1v3M11 1v3" stroke="var(--purple)" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <span style={{ fontSize:11, fontWeight:800, color:'var(--purple)', textTransform:'uppercase', letterSpacing:'.8px', flex:1 }}>
                    Monthly Log — {MONTHS[month]} {year}
                  </span>
                  <span style={{ fontSize:10, color:'var(--mid)', fontWeight:600 }}>{totalActs} activities</span>
                </div>

                {/* Activities grouped by date — collapsed by default */}
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {busyDayNums.map(d => {
                    const dayDate  = new Date(year, month, d);
                    const evts     = dayMap[d] ?? [];
                    const isT      = isToday(d);
                    const expanded = expandedDays.has(d);
                    function toggleDay() {
                      setExpandedDays(prev => {
                        const next = new Set(prev);
                        if (next.has(d)) next.delete(d); else next.add(d);
                        return next;
                      });
                    }
                    return (
                      <div key={d} style={{
                        borderRadius:14,
                        background: isT
                          ? 'linear-gradient(135deg,rgba(124,106,240,.18) 0%,rgba(45,212,191,.10) 100%)'
                          : 'var(--glass-bg,rgba(255,255,255,.04))',
                        border: isT
                          ? '1.5px solid rgba(124,106,240,.45)'
                          : '1px solid var(--glass-border,rgba(255,255,255,.08))',
                        boxShadow: isT ? '0 0 0 1px rgba(124,106,240,.12), 0 3px 14px rgba(124,106,240,.15)' : 'none',
                        overflow:'hidden',
                        transition:'box-shadow .15s',
                      }}>
                        {/* Tap-to-expand date row */}
                        <button
                          onClick={toggleDay}
                          style={{
                            width:'100%', textAlign:'left', background:'transparent',
                            border:'none', padding:'11px 14px', cursor:'pointer',
                            fontFamily:'inherit', display:'flex', alignItems:'center', gap:10,
                          }}>
                          {/* Date chip */}
                          <div style={{
                            width:38, height:38, borderRadius:10, flexShrink:0,
                            background: isT ? 'var(--gradient)' : 'var(--pur-lt,rgba(124,106,240,.12))',
                            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                            boxShadow: isT ? '0 2px 8px rgba(124,106,240,.35)' : 'none',
                          }}>
                            <span style={{ fontSize:7, fontWeight:800, color: isT ? '#fff' : 'var(--purple)', lineHeight:1, textTransform:'uppercase', letterSpacing:'.3px' }}>{DAYS_SHORT[dayDate.getDay()]}</span>
                            <span style={{ fontSize:15, fontWeight:900, color: isT ? '#fff' : 'var(--purple)', lineHeight:1.1 }}>{d}</span>
                          </div>
                          {/* Date label */}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <span style={{ fontSize:13, fontWeight:700, color: isT ? 'var(--purple)' : 'var(--dark)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {dayDate.toLocaleDateString('en-US',{ weekday:'long', month:'short', day:'numeric' })}
                              </span>
                              {isT && (
                                <span style={{ fontSize:8, fontWeight:900, color:'#fff', background:'var(--purple)', borderRadius:5, padding:'2px 6px', letterSpacing:'.4px', textTransform:'uppercase', flexShrink:0, boxShadow:'0 1px 5px rgba(124,106,240,.4)' }}>TODAY</span>
                              )}
                            </div>
                            <div style={{ fontSize:10, color:'var(--mid)', marginTop:1 }}>
                              {evts.length} item{evts.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          {/* Chevron */}
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform .2s', opacity:.5 }}>
                            <path d="M4 6l4 4 4-4" stroke="var(--dark)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>

                        {/* Expanded event cards */}
                        {expanded && (
                          <div style={{ padding:'0 10px 10px', display:'flex', flexDirection:'column', gap:5 }}>
                            {evts.map(s => (
                              <ActivityDetailCard
                                key={s.id}
                                s={s}
                                dayDate={dayDate}
                                onClick={() => openEditSheet(s)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

          return (
            <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

              {/* Day header */}
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

              {/* 24-hour timeline */}
              <div ref={timelineRef} style={{
                flex:1, overflowY:'auto', overscrollBehavior:'contain',
                WebkitOverflowScrolling:'touch',
              }}>
                {HOURS.map(h => {
                  const events  = byHour[h] ?? [];
                  const isPast  = nowH >= 0 && h < nowH;
                  const isCurHr = nowH >= 0 && h === nowH;
                  const needlePct = isCurHr ? Math.round((nowM / 60) * 100) : 0;
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
                      <div style={{
                        width:62, flexShrink:0,
                        paddingTop:13, paddingRight:10, paddingLeft:14,
                        textAlign:'right', pointerEvents:'none',
                      }}>
                        <span style={{
                          fontSize:10, fontWeight:700, lineHeight:1,
                          color: isCurHr ? 'var(--purple)' : 'var(--mid)',
                          letterSpacing:'.3px', whiteSpace:'nowrap', display:'block',
                        }}>{fmtHour(h)}</span>
                      </div>

                      <div style={{
                        flex:1,
                        borderLeft:'1px solid var(--glass-border,rgba(255,255,255,.08))',
                        position:'relative',
                        padding: events.length ? '10px 14px 10px 12px' : '0 14px 0 12px',
                        display:'flex', flexDirection:'column', gap:6,
                      }}>
                        <div style={{
                          position:'absolute', top:0, left:0, right:0, height:1,
                          background: isCurHr ? 'rgba(124,106,240,.45)' : 'rgba(255,255,255,.06)',
                          pointerEvents:'none',
                        }}/>

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

                        {events.map(s => {
                          const startD = new Date(s.start_time);
                          const endD   = s.end_time ? new Date(s.end_time) : null;
                          const loc    = (s as Schedule & { location?: string }).location;
                          const pColor = PRIORITY_COLORS[s.priority] || 'var(--purple)';
                          return (
                            <SwipeDeleteRow
                              key={s.id}
                              onDelete={async () => { deleteSchedule(s.id); }}
                              undoLabel={`"${s.title}" deleted`}
                              borderRadius={10}
                            >
                              <button
                                onClick={e => { e.stopPropagation(); openEditSheet(s); }}
                                style={{
                                  display:'flex', flexDirection:'column', gap:4,
                                  padding:'8px 10px 8px 12px',
                                  borderRadius:10,
                                  background:'var(--surf)',
                                  border:`1px solid var(--glass-border,var(--border))`,
                                  borderLeftWidth:3, borderLeftColor:pColor, borderLeftStyle:'solid',
                                  boxShadow:'0 1px 6px rgba(0,0,0,.08)',
                                  opacity: s.is_completed ? 0.5 : 1,
                                  position:'relative', cursor:'pointer',
                                  textAlign:'left', width:'100%', fontFamily:'inherit',
                                }}
                              >
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
                                    letterSpacing:'.4px', textTransform:'uppercase', flexShrink:0,
                                  }}>{s.priority}</span>
                                </div>
                              </button>
                            </SwipeDeleteRow>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div style={{ height:32 }} />
              </div>
            </div>
          );
        })()}

        {/* ── WEEKLY VIEW ── */}
        {viewMode === 'weekly' && (
          <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
            <div className="week-strip">
              {weekDays.map((d, i) => {
                const isT   = d.toDateString() === today.toDateString();
                const isSel = d.toDateString() === selectedDate.toDateString();
                const ds    = toDateStr(d);
                const cnt   = schedules.filter(s => toDateStr(new Date(s.start_time)) === ds).length;
                return (
                  <button key={i}
                    className={`week-day-col${isSel ? ' sel' : ''}${isT ? ' today' : ''}`}
                    onClick={() => {
                      if (isSel) {
                        setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
                        setSelectedDay(d.getDate());
                        setViewMode('daily');
                      } else {
                        setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
                        setSelectedDay(d.getDate());
                      }
                    }}>
                    <div className="wdc-name">{DAYS_SHORT[d.getDay()].slice(0,2)}</div>
                    <div className="wdc-num">{d.getDate()}</div>
                    {cnt > 0 && <div className="wdc-cnt">{cnt}</div>}
                  </button>
                );
              })}
            </div>

            {/* Scrollable events — no ghost padding */}
            <div style={{ flex:1, overflowY:'auto', overscrollBehavior:'contain', WebkitOverflowScrolling:'touch', padding:'0 16px 16px' }}>
              {weekDays.map((d, i) => {
                const ds   = toDateStr(d);
                const hol  = holidays.get(ds);
                const evts = schedules.filter(s => toDateStr(new Date(s.start_time)) === ds);
                const isT  = d.toDateString() === today.toDateString();
                const isSel = d.toDateString() === selectedDate.toDateString();
                return (
                  <div key={i} style={{ marginTop: i === 0 ? 14 : 18 }}>
                    <div style={{
                      display:'flex', alignItems:'center', gap:8, marginBottom:8,
                      paddingBottom:6,
                      borderBottom:`1px solid ${isSel ? 'rgba(124,106,240,.3)' : 'var(--glass-border,rgba(255,255,255,.06))'}`,
                    }}>
                      <span style={{
                        fontSize:12, fontWeight:800,
                        color: isT ? 'var(--purple)' : isSel ? 'var(--purple)' : 'var(--dark)',
                        letterSpacing:'.2px',
                      }}>{DAYS_FULL[d.getDay()]}</span>
                      <span style={{ fontSize:11, color:'var(--mid)' }}>{MONTHS_SH[d.getMonth()]} {d.getDate()}</span>
                      {isT && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--purple)', boxShadow:'0 0 5px var(--purple)', flexShrink:0, display:'inline-block' }}/>}
                      <button
                        onClick={() => { setViewDate(new Date(d.getFullYear(), d.getMonth(), 1)); setSelectedDay(d.getDate()); setViewMode('daily'); }}
                        style={{ marginLeft:'auto', fontSize:9, fontWeight:700, color:'var(--purple)', background:'rgba(124,106,240,.1)', border:'none', borderRadius:8, padding:'3px 8px', cursor:'pointer', fontFamily:'inherit', opacity: evts.length ? 1 : 0.5 }}
                      >Daily →</button>
                    </div>

                    {hol && (
                      <div className="week-holiday-row" style={{ marginBottom:6 }}>
                        <span className="whr-dot" />
                        <span className="whr-name">{hol.localName}</span>
                        <span className="hol-tag" style={{ fontSize:9 }}>Holiday</span>
                      </div>
                    )}

                    {evts.length > 0 ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {evts.map(s => <EventCard key={s.id} s={s} compact onEdit={openEditSheet} />)}
                      </div>
                    ) : (
                      <div style={{
                        padding:'10px 14px', borderRadius:10,
                        border:'1px dashed var(--glass-border,rgba(255,255,255,.07))',
                        display:'flex', alignItems:'center', justifyContent:'space-between',
                      }}>
                        <span style={{ fontSize:11, color:'var(--mid)', opacity:0.5 }}>No events</span>
                        <button
                          onClick={() => { setSheetTime(undefined); setViewDate(new Date(d.getFullYear(), d.getMonth(), 1)); setSelectedDay(d.getDate()); setSheetOpen(true); }}
                          style={{ fontSize:10, fontWeight:700, color:'var(--purple)', background:'rgba(124,106,240,.1)', border:'none', borderRadius:8, padding:'3px 10px', cursor:'pointer', fontFamily:'inherit' }}
                        >+ Add</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── YEARLY VIEW ── */}
        {viewMode === 'yearly' && (
          <div style={{ padding: '14px 12px', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 80px)' }}>
            <div className="year-grid">
              {Array.from({ length: 12 }, (_, mo) => {
                const cnt       = monthCounts[mo];
                const isThisMon = mo === today.getMonth() && year === today.getFullYear();
                const isSel     = mo === month;
                const daysIn    = new Date(year, mo + 1, 0).getDate();
                const firstD    = new Date(year, mo, 1).getDay();

                // Build a Set of days that have scheduled items for quick lookup
                const activeDays = new Set<number>();
                schedules.forEach(s => {
                  const d = new Date(s.start_time);
                  if (d.getFullYear() === year && d.getMonth() === mo) activeDays.add(d.getDate());
                });

                // Always 42 cells (6 full rows × 7 cols) — guarantees equal card height
                const cells = Array.from({ length: 42 }, (_, i) => {
                  const dayNum = i - firstD + 1;
                  if (dayNum < 1 || dayNum > daysIn) return null;
                  return dayNum;
                });

                return (
                  <button key={mo}
                    className={`year-month-card${isThisMon ? ' current' : isSel ? ' sel' : ''}`}
                    onClick={() => {
                      setViewDate(new Date(year, mo, 1));
                      setSelectedDay(isThisMon ? today.getDate() : 1);
                      setViewMode('monthly');
                    }}>

                    {/* Month name + activity count */}
                    <div className="ymc-header">
                      <span className={`ymc-name${isThisMon ? ' cur' : ''}`}>
                        {MONTHS_SH[mo]}
                        {isThisMon && (
                          <span className="ymc-today-tag"> ·&nbsp;now</span>
                        )}
                      </span>
                      {cnt > 0 && <span className="ymc-count">{cnt}</span>}
                    </div>

                    {/* Day-of-week labels */}
                    <div className="ymc-dow">
                      {['S','M','T','W','T','F','S'].map((d, i) => (
                        <div key={i} className="ymc-dow-cell">{d}</div>
                      ))}
                    </div>

                    {/* 42-cell uniform grid */}
                    <div className="ymc-grid">
                      {cells.map((dayNum, i) => {
                        if (dayNum === null) return <div key={i} className="ymc-cell ymc-empty" />;
                        const isT    = dayNum === today.getDate() && isThisMon;
                        const hasAct = activeDays.has(dayNum);
                        return (
                          <div key={i} className={`ymc-cell${isT ? ' tod' : hasAct ? ' has' : ''}`}>
                            <span>{dayNum}</span>
                          </div>
                        );
                      })}
                    </div>

                  </button>
                );
              })}
            </div>

            {/* Footer hint */}
            <div style={{ textAlign:'center', marginTop:16, fontSize:11, color:'var(--mid)', fontWeight:500 }}>
              Tap any month to see the full schedule
            </div>
          </div>
        )}

      </div>{/* end scroll-body */}

      <AddScheduleSheet
        open={sheetOpen}
        selectedDate={selectedDate}
        countryCode={countryCode}
        initialTime={sheetTime}
        onClose={() => { setSheetOpen(false); setSheetTime(undefined); }}
        onSaved={refreshSchedules}
      />
      <AddScheduleSheet
        open={editOpen}
        selectedDate={editSched ? new Date(editSched.start_time) : selectedDate}
        countryCode={countryCode}
        editSchedule={editSched}
        onClose={() => { setEditOpen(false); setEditSched(undefined); }}
        onSaved={(id) => { setEditOpen(false); setEditSched(undefined); refreshSchedules(id); }}
      />

      {/* ── Recurring delete scope dialog ────────────────────────────── */}
      {deleteTarget && (
        <div
          onClick={() => setDeleteTarget(null)}
          style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.6)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', display:'flex', flexDirection:'column', justifyContent:'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background:'var(--surf,#131424)', borderRadius:'22px 22px 0 0', border:'1px solid rgba(255,255,255,.09)', borderBottom:'none', boxShadow:'0 -24px 60px rgba(0,0,0,.4)', padding:'0 0 max(20px,env(safe-area-inset-bottom,20px))' }}
          >
            <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,.14)', margin:'10px auto 18px' }} />
            <div style={{ padding:'0 20px 18px', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
              <div style={{ fontSize:15, fontWeight:800, color:'var(--dark)', marginBottom:4 }}>Delete recurring activity</div>
              <div style={{ fontSize:12, color:'var(--mid)' }}>
                &ldquo;{deleteTarget._is_virtual ? deleteTarget.title : deleteTarget.title}&rdquo;
              </div>
            </div>
            <div style={{ padding:'12px 20px', display:'flex', flexDirection:'column', gap:8 }}>
              {deleteTarget._is_virtual && (
                <button
                  type="button"
                  onClick={() => confirmDelete('this')}
                  style={{ padding:'14px 16px', borderRadius:14, border:'1px solid rgba(255,255,255,.10)', background:'rgba(255,255,255,.05)', color:'var(--dark)', fontSize:14, fontWeight:600, textAlign:'left', cursor:'pointer', fontFamily:'inherit' }}
                >
                  <div style={{ fontWeight:700 }}>This occurrence only</div>
                  <div style={{ fontSize:11, color:'var(--mid)', marginTop:2 }}>Remove only {deleteTarget._occurrence_date}</div>
                </button>
              )}
              <button
                type="button"
                onClick={() => confirmDelete('future')}
                style={{ padding:'14px 16px', borderRadius:14, border:'1px solid rgba(255,107,138,.22)', background:'rgba(255,107,138,.07)', color:'#FF6B8A', fontSize:14, fontWeight:600, textAlign:'left', cursor:'pointer', fontFamily:'inherit' }}
              >
                <div style={{ fontWeight:700 }}>This and future occurrences</div>
                <div style={{ fontSize:11, color:'rgba(255,107,138,.6)', marginTop:2 }}>Stop repeating from this date onwards</div>
              </button>
              <button
                type="button"
                onClick={() => confirmDelete('all')}
                style={{ padding:'14px 16px', borderRadius:14, border:'1px solid rgba(255,59,48,.25)', background:'rgba(255,59,48,.08)', color:'#FF3B30', fontSize:14, fontWeight:600, textAlign:'left', cursor:'pointer', fontFamily:'inherit' }}
              >
                <div style={{ fontWeight:700 }}>All occurrences</div>
                <div style={{ fontSize:11, color:'rgba(255,59,48,.6)', marginTop:2 }}>Delete the entire recurring series</div>
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={{ padding:'12px', borderRadius:14, border:'1px solid rgba(255,255,255,.08)', background:'transparent', color:'var(--mid)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginTop:2 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />

      <style jsx>{`
        /* ── Page shell ── */
        .page { height:100dvh; background:var(--bg); display:flex; flex-direction:column; font-family:inherit; color:var(--dark); overflow:hidden; }

        /* ── Header ── */
        .pg-header { padding:max(env(safe-area-inset-top,0px),14px) 20px 12px; display:flex; justify-content:space-between; align-items:flex-end; flex-shrink:0; background:var(--glass-bg,var(--surf)); backdrop-filter:var(--glass-blur,blur(18px)); -webkit-backdrop-filter:var(--glass-blur,blur(18px)); border-bottom:1px solid var(--glass-border,var(--border)); transition:background .25s ease,border-color .25s ease; }
        .pg-title { font-size:22px; font-weight:800; color:var(--dark); }
        .country-badge { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--purple); font-weight:600; margin-top:4px; }
        .today-btn { padding:6px 14px; background:var(--glass-bg2,rgba(255,255,255,.07)); border:1px solid var(--glass-border,rgba(255,255,255,.10)); border-radius:20px; color:var(--purple); font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; transition:background .14s; flex-shrink:0; }
        .today-btn:active { background:var(--pur-lt); }

        /* ── View switcher ── */
        .view-switcher { flex-shrink:0; display:flex; gap:6px; padding:10px 16px; background:var(--glass-bg,var(--surf)); border-bottom:1px solid var(--glass-border,var(--border));  transition:background .25s ease; }
        .view-pill { flex:1; padding:8px 4px; border-radius:10px; border:1.5px solid var(--glass-border,rgba(255,255,255,.08)); background:var(--glass-bg2,rgba(255,255,255,.04)); color:var(--mid); font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .14s; letter-spacing:.2px; }
        .view-pill.active { background:var(--purple); border-color:var(--purple); color:#fff; box-shadow:0 2px 12px rgba(124,106,240,.35); }
        .view-pill:not(.active):active { background:var(--pur-lt); color:var(--purple); }

        /* ── Month / period navigator ── */
        .month-nav { flex-shrink:0; display:flex; align-items:center; justify-content:space-between; padding:10px 16px; background:var(--glass-bg2,var(--surf)); border-bottom:1px solid var(--glass-border,var(--border));  transition:background .25s ease; }
        .month-label { font-size:15px; font-weight:700; color:var(--dark); }
        .nav-arrow { background:none; border:none; color:var(--mid); font-size:22px; cursor:pointer; padding:4px 10px; line-height:1; border-radius:8px; }
        .nav-arrow:active { background:var(--surf2); }

        /* ── Scrollable body ── */
        .scroll-body { flex:1; overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; position:relative; }

        /* ════ MONTHLY ════ */
        /* ── Calendar grid keyframes ── */
        @keyframes calSlideL { from{transform:translateX(105%);opacity:.25} to{transform:translateX(0);opacity:1} }
        @keyframes calSlideR { from{transform:translateX(-105%);opacity:.25} to{transform:translateX(0);opacity:1} }
        .cal-day { width:100%; aspect-ratio:1/1; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:10px; cursor:pointer; background:transparent; gap:2px; border:none; transition:background .12s; padding:0; min-height:0; }
        .cal-day:active { background:var(--pur-lt); }
        .cal-day.active { background:var(--purple) !important; }
        .cal-day.today:not(.active) { box-shadow:0 0 0 2px var(--purple); background:rgba(124,106,240,.10) !important; }
        .cal-day.today:not(.active) .day-num { color:var(--purple); font-weight:900; }
        .cal-day.holiday:not(.active) { background:rgba(255,107,107,.07); }
        .day-num { font-size:13px; font-weight:600; color:var(--dark); line-height:1; }
        .cal-day.active .day-num { color:#fff; }
        .cal-day.holiday:not(.active) .day-num { color:var(--coral,#FF6B8A); font-weight:700; }
        .day-indicators { display:flex; gap:2px; align-items:center; min-height:5px; }
        .h-dot { width:5px; height:5px; border-radius:50%; background:var(--coral,#FF6B8A); flex-shrink:0; }
        .cal-day.active .h-dot { background:rgba(255,255,255,.8); }
        .dot { width:4px; height:4px; border-radius:50%; flex-shrink:0; }
        .cal-day.active .dot { background:rgba(255,255,255,.7) !important; }

        /* ════ DAY PANEL ════ */
        .day-panel { padding:14px 16px 16px; }

        /* ════ WEEKLY ════ */
        .week-strip { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; padding:12px 12px 0; background:var(--glass-bg2,var(--surf)); border-bottom:1px solid var(--glass-border,var(--border)); }
        .week-day-col { display:flex; flex-direction:column; align-items:center; gap:3px; padding:8px 2px 10px; border-radius:12px; background:transparent; border:1.5px solid transparent; cursor:pointer; font-family:inherit; transition:all .14s; }
        .week-day-col.today .wdc-num { color:var(--purple); font-weight:900; }
        .week-day-col.today:not(.sel) { background:rgba(124,106,240,.08); box-shadow:0 0 0 1.5px var(--purple) inset; }
        .week-day-col.sel { background:var(--pur-lt,rgba(124,106,240,.15)); border-color:var(--purple); }
        .week-day-col.sel .wdc-num { color:var(--purple); font-weight:800; }
        .wdc-name { font-size:9px; font-weight:700; color:var(--mid); text-transform:uppercase; letter-spacing:.5px; }
        .wdc-num  { font-size:15px; font-weight:600; color:var(--dark); line-height:1; }
        .wdc-cnt  { font-size:9px; font-weight:700; color:#fff; background:var(--purple); border-radius:6px; padding:1px 5px; min-width:14px; text-align:center; }

        .week-holiday-row { display:flex; align-items:center; gap:8px; padding:7px 10px; background:rgba(255,107,107,.08); border:1px solid rgba(255,107,107,.18); border-radius:10px; margin-bottom:6px; }
        .whr-dot { width:6px; height:6px; border-radius:50%; background:var(--coral,#FF6B8A); flex-shrink:0; }
        .whr-name { font-size:12px; font-weight:600; color:var(--coral,#FF6B8A); flex:1; }

        /* ════ YEARLY ════ */
        /* ── YEARLY VIEW — uniform 3-column layout ── */
        .year-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 9px;
        }

        /* Card shell — all 12 cards are visually identical in structure */
        .year-month-card {
          display: flex; flex-direction: column; gap: 0;
          padding: 10px 7px 8px;
          background: var(--glass-bg2, rgba(255,255,255,.04));
          border: 1.5px solid var(--glass-border, rgba(255,255,255,.08));
          border-radius: 14px;
          cursor: pointer; font-family: inherit;
          transition: border-color .18s, background .18s, transform .12s;
          text-align: left; overflow: hidden;
          -webkit-tap-highlight-color: transparent;
        }
        .year-month-card.current {
          border-color: var(--purple);
          border-width: 2px;
          background: rgba(124,106,240,.07);
        }
        .year-month-card.sel:not(.current) {
          border-color: rgba(124,106,240,.5);
        }
        .year-month-card:active { transform: scale(.96); opacity: .82; }

        /* Card header: month name + activity badge */
        .ymc-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 4px;
        }
        .ymc-name {
          font-size: 12px; font-weight: 800;
          color: var(--dark); letter-spacing: -.3px; line-height: 1;
        }
        .ymc-name.cur { color: var(--purple); }
        .ymc-today-tag {
          font-size: 8px; font-weight: 600;
          color: var(--purple); opacity: .75;
          letter-spacing: 0;
        }
        .ymc-count {
          font-size: 8px; font-weight: 800;
          color: var(--purple);
          background: rgba(124,106,240,.15);
          border-radius: 5px; padding: 1px 4px; line-height: 1.6;
          flex-shrink: 0;
        }

        /* Day-of-week labels — 7 equal cols, minimal */
        .ymc-dow {
          display: grid; grid-template-columns: repeat(7, 1fr);
          gap: 0; margin-bottom: 3px;
        }
        .ymc-dow-cell {
          display: flex; align-items: center; justify-content: center;
          font-size: 6px; font-weight: 700;
          color: var(--mid); line-height: 1.4;
          text-transform: uppercase;
        }

        /* 42-cell uniform grid — always 6 rows, never varies */
        .ymc-grid {
          display: grid; grid-template-columns: repeat(7, 1fr);
          gap: 1px;
        }
        .ymc-cell {
          height: 14px;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          border-radius: 2px; position: relative;
        }
        .ymc-cell span {
          font-size: 7.5px; color: var(--dark);
          line-height: 1; font-weight: 500;
        }
        /* Empty cells (before/after month days) — invisible but keep layout */
        .ymc-cell.ymc-empty { pointer-events: none; }

        /* Today — filled purple circle */
        .ymc-cell.tod {
          background: var(--purple);
          border-radius: 50%;
        }
        .ymc-cell.tod span { color: #fff; font-weight: 800; font-size: 7px; }

        /* Activity days — subtle dot indicator below the date */
        .ymc-cell.has span { color: var(--purple); font-weight: 700; }
        .ymc-cell.has::after {
          content: '';
          position: absolute; bottom: 1px;
          width: 3px; height: 3px;
          border-radius: 50%;
          background: var(--purple); opacity: .65;
        }

        /* ════ SHARED ════ */
        .holiday-banner { display:flex; align-items:center; gap:10px; background:rgba(255,107,107,.10); border:1px solid rgba(255,107,107,.25); border-radius:12px; padding:10px 14px; margin-bottom:12px; }
        .hol-icon { display:flex; align-items:center; flex-shrink:0; }
        .hol-info { flex:1; }
        .hol-name { font-size:13px; font-weight:700; color:var(--coral,#FF6B8A); }
        .hol-en   { font-size:10px; color:var(--mid); margin-top:1px; }
        .hol-tag  { font-size:10px; font-weight:700; color:var(--coral,#FF6B8A); background:rgba(255,107,107,.15); padding:3px 8px; border-radius:20px; white-space:nowrap; }
      `}</style>
    </div>
  );
}
