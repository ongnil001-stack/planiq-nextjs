'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getHolidays, findHoliday, type Holiday } from '@/lib/holidays';
import type { ScheduleType, Priority } from '@/types/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPES: { value: ScheduleType; icon: string; label: string; color: string }[] = [
  { value: 'task',     icon: '✅', label: 'Task',        color: '#7C6AF0' },
  { value: 'event',    icon: '📅', label: 'Event',       color: '#00C6FF' },
  { value: 'reminder', icon: '🔔', label: 'Reminder',    color: '#FDCB6E' },
  { value: 'block',    icon: '🎯', label: 'Focus Block', color: '#2DD4BF' },
];

const PRIORITIES: { value: Priority; label: string; color: string; bg: string }[] = [
  { value: 'low',      label: 'Low',      color: '#2DD4BF', bg: 'rgba(45,212,191,.15)'  },
  { value: 'medium',   label: 'Medium',   color: '#FDCB6E', bg: 'rgba(253,203,110,.15)' },
  { value: 'high',     label: 'High',     color: '#FF6B8A', bg: 'rgba(255,107,138,.15)' },
  { value: 'critical', label: 'Critical', color: '#FF3B30', bg: 'rgba(255,59,48,.15)'   },
];

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_FULL    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  selectedDate: Date;
  countryCode: string;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddScheduleSheet({ open, selectedDate, countryCode, onClose, onSaved }: Props) {
  const router   = useRouter();
  const supabase = createClient();
  const bodyRef  = useRef<HTMLDivElement>(null);

  // form state
  const [title,    setTitle]    = useState('');
  const [type,     setType]     = useState<ScheduleType>('task');
  const [priority, setPriority] = useState<Priority>('medium');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime,   setEndTime]   = useState('10:00');
  const [allDay,    setAllDay]    = useState(false);
  const [location,  setLocation]  = useState('');
  const [notes,     setNotes]     = useState('');
  const [saving,    setSaving]    = useState(false);

  // holiday check
  const [holiday, setHoliday] = useState<Holiday | null>(null);

  // Reset form every time the sheet opens
  useEffect(() => {
    if (open) {
      setTitle(''); setType('task'); setPriority('medium');
      setStartTime('09:00'); setEndTime('10:00'); setAllDay(false);
      setLocation(''); setNotes(''); setSaving(false);
    }
  }, [open]);

  // Holiday check
  useEffect(() => {
    if (!open || !countryCode) { setHoliday(null); return; }
    const dateStr = toDateStr(selectedDate);
    const year    = selectedDate.getFullYear();
    getHolidays(year, countryCode).then((hols) => {
      setHoliday(findHoliday(dateStr, hols));
    });
  }, [open, selectedDate, countryCode]);

  function toDateStr(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  const dateLabel = `${DAYS_FULL[selectedDate.getDay()]}, ${MONTHS_SHORT[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;
  const dateStr   = toDateStr(selectedDate);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const startISO = allDay
      ? new Date(`${dateStr}T00:00:00`).toISOString()
      : new Date(`${dateStr}T${startTime}:00`).toISOString();

    const endISO = (!allDay && endTime)
      ? new Date(`${dateStr}T${endTime}:00`).toISOString()
      : null;

    const { error } = await supabase.from('schedules').insert({
      user_id:     user.id,
      title:       title.trim(),
      type,
      priority,
      start_time:  startISO,
      end_time:    endISO,
      all_day:     allDay,
      location:    location.trim() || null,
      description: notes.trim() || null,
    });

    setSaving(false);
    if (!error) {
      onSaved();
      onClose();
    }
  }

  // Close on backdrop click
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleBackdropClick}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,.55)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 1000,
          animation: 'sheetBdIn .22s ease',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 1001,
          background: 'var(--glass-bg, rgba(18,17,30,0.88))',
          backdropFilter: 'var(--glass-blur, blur(24px))',
          WebkitBackdropFilter: 'var(--glass-blur, blur(24px))',
          borderTop: '1px solid var(--glass-border2, rgba(255,255,255,.12))',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -12px 48px rgba(0,0,0,.40), 0 -1px 0 var(--glass-border, rgba(255,255,255,.06))',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'sheetUp .28s cubic-bezier(.32,1,.3,1)',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, background: 'var(--border2)', borderRadius: 2, margin: '12px auto 0', flexShrink: 0 }} />

        {/* Sheet header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px 14px', flexShrink: 0,
          borderBottom: '1px solid var(--glass-border, rgba(255,255,255,.07))',
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', letterSpacing: '-.3px' }}>Add Schedule</div>
            <div style={{ fontSize: 12, color: 'var(--purple)', fontWeight: 600, marginTop: 2 }}>{dateLabel}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32,
              background: 'var(--glass-bg2, rgba(255,255,255,.06))',
              border: '1px solid var(--glass-border, rgba(255,255,255,.10))',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--mid)', cursor: 'pointer', fontSize: 18, lineHeight: 1,
              flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* Scrollable body */}
        <div
          ref={bodyRef}
          style={{
            flex: 1, overflowY: 'auto', padding: '18px 20px 32px',
            display: 'flex', flexDirection: 'column', gap: 20,
            WebkitOverflowScrolling: 'touch',
          }}
        >

          {/* Holiday banner */}
          {holiday && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,107,107,.10)', border: '1px solid rgba(255,107,107,.25)',
              borderRadius: 12, padding: '10px 14px',
            }}>
              <span style={{ fontSize: 18 }}>🎌</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#FF6B8A' }}>{holiday.localName}</div>
                <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>Public holiday — you can still schedule!</div>
              </div>
            </div>
          )}

          {/* ── Title ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label style={labelStyle}>Schedule Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Team standup, Site visit, Deadline…"
              maxLength={100}
              autoFocus
              style={inputStyle}
            />
          </div>

          {/* ── Type ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={labelStyle}>Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 5, padding: '10px 4px',
                    background: type === t.value ? t.color + '22' : 'var(--glass-bg2, rgba(255,255,255,.04))',
                    border: `1.5px solid ${type === t.value ? t.color : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                    borderRadius: 12, cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{t.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: type === t.value ? t.color : 'var(--mid)', letterSpacing: '.2px' }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Priority ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={labelStyle}>Priority</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  style={{
                    padding: '9px 4px',
                    background: priority === p.value ? p.bg : 'var(--glass-bg2, rgba(255,255,255,.04))',
                    border: `1.5px solid ${priority === p.value ? p.color : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                    borderRadius: 12, cursor: 'pointer',
                    fontSize: 11, fontWeight: 700,
                    color: priority === p.value ? p.color : 'var(--mid)',
                    transition: 'all .15s',
                  }}
                >{p.label}</button>
              ))}
            </div>
          </div>

          {/* ── Date display (read-only) + All Day toggle ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{
              flex: 1, padding: '11px 14px',
              background: 'var(--glass-bg2, rgba(255,255,255,.04))',
              border: '1px solid var(--glass-border, rgba(255,255,255,.08))',
              borderRadius: 12,
              fontSize: 13, fontWeight: 600, color: 'var(--purple)',
            }}>
              📆 {dateLabel}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: 'var(--mid)', fontWeight: 700, letterSpacing: '.3px', textTransform: 'uppercase' }}>All Day</span>
              <button
                type="button"
                onClick={() => setAllDay(!allDay)}
                style={{
                  width: 44, height: 26,
                  background: allDay ? 'var(--purple)' : 'var(--glass-bg2, rgba(255,255,255,.08))',
                  border: '1px solid var(--glass-border, rgba(255,255,255,.10))',
                  borderRadius: 13, cursor: 'pointer', padding: 0,
                  position: 'relative', transition: 'background .2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3,
                  left: allDay ? 21 : 3,
                  width: 20, height: 20,
                  background: '#fff', borderRadius: '50%',
                  transition: 'left .2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,.3)',
                }} />
              </button>
            </div>
          </div>

          {/* ── Time pickers ── */}
          {!allDay && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <label style={labelStyle}>Start Time</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <label style={labelStyle}>End Time</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
              </div>
            </div>
          )}

          {/* ── Location ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label style={labelStyle}>Location <span style={{ fontWeight: 400, opacity: .55 }}>— optional</span></label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Office, Zoom, Client site…"
              maxLength={120}
              style={inputStyle}
            />
          </div>

          {/* ── Notes ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label style={labelStyle}>Notes <span style={{ fontWeight: 400, opacity: .55 }}>— optional</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any details, links, or reminders…"
              rows={3}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
            />
          </div>

          {/* ── AI button ── */}
          <button
            type="button"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '11px 16px',
              background: 'var(--pur-lt, rgba(124,106,240,.12))',
              border: '1px solid var(--purple)',
              borderRadius: 12, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: 'var(--purple)',
              opacity: .7,
            }}
            onClick={() => {/* future: open AI assistant */}}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1L9.18 5.23L13.5 5.64L10.35 8.38L11.3 12.5L7.5 10.27L3.7 12.5L4.65 8.38L1.5 5.64L5.82 5.23L7.5 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
            Check Schedule Balance with AI
          </button>

        </div>

        {/* ── Save button ── */}
        <div style={{
          padding: '14px 20px 32px', flexShrink: 0,
          borderTop: '1px solid var(--glass-border, rgba(255,255,255,.07))',
          background: 'var(--glass-bg, rgba(18,17,30,.72))',
        }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            style={{
              width: '100%', padding: 16,
              background: title.trim() ? 'var(--gradient)' : 'var(--glass-bg2, rgba(255,255,255,.06))',
              border: 'none', borderRadius: 16,
              color: title.trim() ? '#fff' : 'var(--mid)',
              fontSize: 16, fontWeight: 800, fontFamily: 'inherit',
              cursor: title.trim() ? 'pointer' : 'default',
              letterSpacing: '-.2px',
              boxShadow: title.trim() ? '0 4px 20px rgba(124,106,240,.35)' : 'none',
              transition: 'all .18s',
              opacity: saving ? .7 : 1,
            }}
          >
            {saving ? '⟳ Saving…' : '✓ Save Schedule'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sheetBdIn { from { opacity:0 } to { opacity:1 } }
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
      `}</style>
    </>
  );
}

// ─── Shared micro-styles ──────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--mid)',
  textTransform: 'uppercase', letterSpacing: '.7px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: 'var(--glass-bg2, rgba(255,255,255,.05))',
  border: '1.5px solid var(--glass-border, rgba(255,255,255,.09))',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  borderRadius: 12,
  color: 'var(--dark)',
  fontSize: 14, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box' as const,
  transition: 'border-color .15s',
  colorScheme: 'dark' as const,
};
