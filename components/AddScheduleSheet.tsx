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

  // form state
  const [title,     setTitle]     = useState('');
  const [type,      setType]      = useState<ScheduleType>('task');
  const [priority,  setPriority]  = useState<Priority>('medium');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime,   setEndTime]   = useState('10:00');
  const [allDay,    setAllDay]    = useState(false);
  const [location,  setLocation]  = useState('');
  const [notes,     setNotes]     = useState('');
  const [saving,    setSaving]    = useState(false);
  const [holiday,   setHoliday]   = useState<Holiday | null>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [open]);

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
    const year = selectedDate.getFullYear();
    getHolidays(year, countryCode).then((hols) => {
      setHoliday(findHoliday(toDateStr(selectedDate), hols));
    });
  }, [open, selectedDate, countryCode]);

  function toDateStr(d: Date) {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
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

  if (!open) return null;

  return (
    <>
      {/* Full-screen overlay — covers entire viewport, locks background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          // Subtle dark vignette at bottom to hint scrollable content
          background: 'rgba(0,0,0,.45)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          animation: 'modalOverlayIn .22s ease',
          // Prevent touch events reaching the background
          touchAction: 'none',
          overscrollBehavior: 'contain',
        }}
        onClick={onClose}
      />

      {/* Modal panel — slides down from top, full width, top-anchored */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          // Leaves a small gap at the bottom so user knows they can dismiss
          bottom: '48px',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--glass-bg, rgba(14,13,24,0.94))',
          backdropFilter: 'var(--glass-blur, blur(28px))',
          WebkitBackdropFilter: 'var(--glass-blur, blur(28px))',
          borderBottom: '1px solid var(--glass-border2, rgba(255,255,255,.12))',
          borderRadius: '0 0 24px 24px',
          boxShadow: '0 12px 60px rgba(0,0,0,.50), 0 1px 0 var(--glass-border, rgba(255,255,255,.06)) inset',
          animation: 'modalSlideDown .30s cubic-bezier(.22,.8,.32,1)',
          overflow: 'hidden',
        }}
      >
        {/* ── Pinned header ── */}
        <div style={{
          flexShrink: 0,
          padding: 'env(safe-area-inset-top, 52px) 20px 0',
          paddingTop: 'max(env(safe-area-inset-top, 0px), 52px)',
          background: 'var(--glass-bg, rgba(14,13,24,.96))',
          backdropFilter: 'var(--glass-blur, blur(28px))',
          WebkitBackdropFilter: 'var(--glass-blur, blur(28px))',
          borderBottom: '1px solid var(--glass-border, rgba(255,255,255,.07))',
          zIndex: 2,
        }}>
          {/* Title row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingBottom: 14,
          }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark)', letterSpacing: '-.3px', lineHeight: 1 }}>
                Add Schedule
              </div>
              <div style={{ fontSize: 12, color: 'var(--purple)', fontWeight: 600, marginTop: 3 }}>
                📆 {dateLabel}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 34, height: 34,
                background: 'var(--glass-bg2, rgba(255,255,255,.07))',
                border: '1px solid var(--glass-border, rgba(255,255,255,.10))',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--mid)', cursor: 'pointer',
                fontSize: 20, lineHeight: 1, flexShrink: 0,
                fontFamily: 'inherit',
              }}
            >×</button>
          </div>

          {/* Holiday banner — inside header so it's always visible */}
          {holiday && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,107,107,.10)',
              border: '1px solid rgba(255,107,107,.25)',
              borderRadius: 10, padding: '8px 12px', marginBottom: 14,
            }}>
              <span style={{ fontSize: 16 }}>🎌</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#FF6B8A' }}>{holiday.localName}</div>
                <div style={{ fontSize: 10, color: 'var(--mid)', marginTop: 1 }}>Public holiday — you can still schedule!</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Scrollable form body — ONLY this scrolls ── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch' as never,
            padding: '20px 20px 12px',
            display: 'flex', flexDirection: 'column', gap: 22,
          }}
          // Prevent overlay click-through while scrolling
          onClick={(e) => e.stopPropagation()}
        >

          {/* ── Title ── */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Schedule Title <span style={reqStar}>*</span></label>
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

          {/* ── Category ── */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 5, padding: '11px 4px',
                    background: type === t.value ? t.color + '22' : 'var(--glass-bg2, rgba(255,255,255,.04))',
                    border: `1.5px solid ${type === t.value ? t.color : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                    borderRadius: 12, cursor: 'pointer', transition: 'all .14s',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{t.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: type === t.value ? t.color : 'var(--mid)', letterSpacing: '.2px' }}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Priority ── */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Priority</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  style={{
                    padding: '10px 4px',
                    background: priority === p.value ? p.bg : 'var(--glass-bg2, rgba(255,255,255,.04))',
                    border: `1.5px solid ${priority === p.value ? p.color : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                    borderRadius: 12, cursor: 'pointer',
                    fontSize: 11, fontWeight: 700,
                    color: priority === p.value ? p.color : 'var(--mid)',
                    transition: 'all .14s',
                    fontFamily: 'inherit',
                  }}
                >{p.label}</button>
              ))}
            </div>
          </div>

          {/* ── All Day toggle ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>All Day</div>
              <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>No specific start or end time</div>
            </div>
            <button
              type="button"
              onClick={() => setAllDay(!allDay)}
              style={{
                width: 46, height: 27,
                background: allDay ? 'var(--purple)' : 'var(--glass-bg2, rgba(255,255,255,.08))',
                border: '1px solid var(--glass-border, rgba(255,255,255,.12))',
                borderRadius: 14, cursor: 'pointer', padding: 0,
                position: 'relative', transition: 'background .2s', flexShrink: 0,
                fontFamily: 'inherit',
              }}
            >
              <span style={{
                position: 'absolute', top: 3,
                left: allDay ? 22 : 3,
                width: 21, height: 21,
                background: '#fff', borderRadius: '50%',
                transition: 'left .2s',
                boxShadow: '0 1px 4px rgba(0,0,0,.30)',
              }} />
            </button>
          </div>

          {/* ── Time pickers ── */}
          {!allDay && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={fieldWrap}>
                <label style={labelStyle}>Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {/* ── Location ── */}
          <div style={fieldWrap}>
            <label style={labelStyle}>
              Location <span style={{ fontWeight: 400, opacity: .5, textTransform: 'none', letterSpacing: 0 }}>— optional</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                fontSize: 14, pointerEvents: 'none', opacity: .5,
              }}>📍</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Office, Zoom, Client site…"
                maxLength={120}
                style={{ ...inputStyle, paddingLeft: 36 }}
              />
            </div>
          </div>

          {/* ── Notes ── */}
          <div style={fieldWrap}>
            <label style={labelStyle}>
              Notes <span style={{ fontWeight: 400, opacity: .5, textTransform: 'none', letterSpacing: 0 }}>— optional</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add details, links, or reminders…"
              rows={3}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.55 }}
            />
          </div>

          {/* ── AI button ── */}
          <button
            type="button"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 16px',
              background: 'var(--pur-lt, rgba(124,106,240,.10))',
              border: '1px solid rgba(124,106,240,.35)',
              borderRadius: 12, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: 'var(--purple)',
              fontFamily: 'inherit',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1L9.18 5.23L13.5 5.64L10.35 8.38L11.3 12.5L7.5 10.27L3.7 12.5L4.65 8.38L1.5 5.64L5.82 5.23L7.5 1Z"
                stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
            Check Schedule Balance with AI
          </button>

          {/* bottom breathing room */}
          <div style={{ height: 8 }} />
        </div>

        {/* ── Pinned save footer ── */}
        <div
          style={{
            flexShrink: 0,
            padding: '14px 20px',
            paddingBottom: 'max(14px, env(safe-area-inset-bottom, 14px))',
            borderTop: '1px solid var(--glass-border, rgba(255,255,255,.07))',
            background: 'var(--glass-bg, rgba(14,13,24,.96))',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            style={{
              width: '100%', padding: '15px 0',
              background: title.trim() ? 'var(--gradient)' : 'var(--glass-bg2, rgba(255,255,255,.06))',
              border: 'none', borderRadius: 16,
              color: title.trim() ? '#fff' : 'var(--mid)',
              fontSize: 15, fontWeight: 800, fontFamily: 'inherit',
              cursor: title.trim() && !saving ? 'pointer' : 'default',
              letterSpacing: '-.2px',
              boxShadow: title.trim() ? '0 4px 20px rgba(124,106,240,.35)' : 'none',
              transition: 'all .18s',
              opacity: saving ? .7 : 1,
            }}
          >
            {saving ? '⟳  Saving…' : '✓  Save Schedule'}
          </button>
        </div>
      </div>

      {/* Dismiss strip at the bottom — tap to close */}
      <div
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          height: 48,
          zIndex: 1002,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          animation: 'modalOverlayIn .30s ease',
        }}
        onClick={onClose}
      >
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          color: 'rgba(255,255,255,.45)', fontSize: 11, fontWeight: 600, letterSpacing: '.3px',
          userSelect: 'none',
        }}>
          <span style={{
            width: 36, height: 4,
            background: 'rgba(255,255,255,.25)',
            borderRadius: 2,
            display: 'block',
          }} />
          <span style={{ fontSize: 10, opacity: .7 }}>tap to dismiss</span>
        </div>
      </div>

      <style>{`
        @keyframes modalOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalSlideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(0.5);
        }
      `}</style>
    </>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const fieldWrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 7,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--mid)',
  textTransform: 'uppercase', letterSpacing: '.7px',
};

const reqStar: React.CSSProperties = {
  color: 'var(--purple)', fontWeight: 900,
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
