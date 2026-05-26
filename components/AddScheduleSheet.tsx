'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getHolidays, findHoliday, type Holiday } from '@/lib/holidays';
import { COUNTRY_TIMEZONES } from '@/lib/countries';
import { detectLocation, type GeoResult } from '@/lib/geoDetect';
import type { Schedule, ScheduleType, Priority, RecurrenceRule } from '@/types/database';
import SmartScheduleAI from '@/components/SmartScheduleAI';

// ─── SVG Icon Library ─────────────────────────────────────────────────────────

function Icon({ d, size = 16, stroke = 'currentColor', strokeWidth = 1.6, fill = 'none' }: {
  d: string | string[]; size?: number; stroke?: string; strokeWidth?: number; fill?: string;
}) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={fill} xmlns="http://www.w3.org/2000/svg"
      style={{ display:'block', flexShrink:0 }}>
      {paths.map((p, i) => (
        <path key={i} d={p} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={fill} />
      ))}
    </svg>
  );
}

// Category icons
const ICONS = {
  // checkmark square — Task
  task: (
    <Icon d={['M7 10l2.5 2.5L14 7.5','M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z']} />
  ),
  // calendar with dot — Event
  event: (
    <Icon d={['M3 8h14','M6 5V3m8 2V3','M5 5h10a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z','M10 13h.01']} />
  ),
  // bell — Reminder
  reminder: (
    <Icon d={['M10 17a2 2 0 01-2-2h4a2 2 0 01-2 2z','M4.5 9a5.5 5.5 0 1111 0c0 3 1.5 5 1.5 6h-14c0-1 1.5-3 1.5-6z']} />
  ),
  // target / focus — Block
  block: (
    <Icon d={['M10 10m-3 0a3 3 0 106 0 3 3 0 10-6 0','M10 3v2m0 10v2M3 10h2m10 0h2','M5.6 5.6l1.4 1.4m6 6l1.4 1.4M5.6 14.4l1.4-1.4m6-6l1.4-1.4']} />
  ),
  // calendar header
  calendar: (
    <Icon d={['M3 8h14','M6 5V3m8 2V3','M5 5h10a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z']} />
  ),
  // flag — priority
  flagLow: (
    <Icon d={['M4 3v14','M4 5h9l-2 3.5L13 12H4']} />
  ),
  flagMedium: (
    <Icon d={['M4 3v14','M4 5h9l-2 3.5L13 12H4']} strokeWidth={1.8} />
  ),
  flagHigh: (
    <Icon d={['M4 3v14','M4 5h9l-2 3.5L13 12H4']} strokeWidth={2} />
  ),
  flagCritical: (
    <Icon d={['M4 3v14','M4 4.5h9l-2 3.5 2 3.5H4','M10 3v3']} strokeWidth={2} />
  ),
  // no-repeat / ban circle
  noRepeat: (
    <Icon d={['M10 3a7 7 0 100 14A7 7 0 0010 3z','M5.2 5.2l9.6 9.6']} />
  ),
  // arrow loop — daily
  daily: (
    <Icon d={['M4 10a6 6 0 106-6','M7 7L4 4 1 7']} size={16} />
  ),
  // calendar week — weekly
  weekly: (
    <Icon d={['M3 8h14','M6 5V3m8 2V3','M5 5h10a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z','M7 12h2m4 0h-1']} />
  ),
  // grid 2×2 — monthly
  monthly: (
    <Icon d={['M3 3h6v6H3zm8 0h6v6h-6zM3 11h6v6H3zm8 0h6v6h-6z']} strokeWidth={1.4} />
  ),
  // refresh arrows — yearly
  yearly: (
    <Icon d={['M4 12a6 6 0 001 3.2M16 8a6 6 0 00-1-3.2','M3 15.5l1-3.5 3.5 1','M17 4.5l-1 3.5-3.5-1']} />
  ),
  // sliders — custom
  custom: (
    <Icon d={['M4 6h12M4 10h12M4 14h12','M8 4v4m4-2v4m4-2v4']} strokeWidth={1.5} />
  ),
  // pin — location
  location: (
    <Icon d={['M10 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z','M10 2a8 8 0 018 8c0 5-8 12-8 12S2 15 2 10a8 8 0 018-8z']} />
  ),
  // globe — timezone
  globe: (
    <Icon d={['M10 3a7 7 0 100 14A7 7 0 0010 3z','M3 10h14','M10 3c-2 2.5-3 5-3 7s1 4.5 3 7','M10 3c2 2.5 3 5 3 7s-1 4.5-3 7']} />
  ),
  // signal / GPS
  gps: (
    <Icon d={['M10 10m-1.5 0a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0','M5.2 14.8a8 8 0 000-9.6','M14.8 5.2a8 8 0 010 9.6','M7.4 12.6a5 5 0 010-5.2','M12.6 7.4a5 5 0 010 5.2']} />
  ),
  // settings cog — profile tz
  settings: (
    <Icon d={['M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z','M16.5 10a6.5 6.5 0 01-.1 1l1.7 1.3-1.6 2.8-2-.8a6.5 6.5 0 01-1.7 1l-.3 2.1h-3.2l-.3-2.1a6.5 6.5 0 01-1.7-1l-2 .8L3.9 12.3l1.7-1.3A6.5 6.5 0 015.5 10c0-.34.04-.67.1-1L3.9 7.7l1.6-2.8 2 .8a6.5 6.5 0 011.7-1L9.5 2.5h3.2l.3 2.1a6.5 6.5 0 011.7 1l2-.8 1.6 2.8-1.7 1.3c.06.33.1.66.1 1z']} />
  ),
  // sparkle / AI
  ai: (
    <Icon d={['M10 3v2m0 10v2M3 10h2m10 0h2','M5.6 5.6l1.2 1.2m6.4 6.4l1.2 1.2M5.6 14.4l1.2-1.2m6.4-6.4l1.2-1.2','M10 7a3 3 0 100 6 3 3 0 000-6z']} />
  ),
  // alert triangle — holiday / warning
  alert: (
    <Icon d={['M10 3L2 17h16L10 3z','M10 9v4m0 2v.5']} />
  ),
  // close X
  close: (
    <Icon d={['M5 5l10 10M15 5L5 15']} strokeWidth={2} />
  ),
  // chevron down
  chevronDown: (
    <Icon d={['M5 8l5 5 5-5']} strokeWidth={2} />
  ),
  // chevron up
  chevronUp: (
    <Icon d={['M5 12l5-5 5 5']} strokeWidth={2} />
  ),
  // check save
  check: (
    <Icon d={['M4 10l5 5 8-8']} strokeWidth={2.2} />
  ),
  // clock / all-day
  allDay: (
    <Icon d={['M10 3a7 7 0 100 14A7 7 0 0010 3z','M10 6v4.5l3 2']} />
  ),
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPES: { value: ScheduleType; iconKey: keyof typeof ICONS; label: string; color: string; activeBg: string }[] = [
  { value: 'task',     iconKey: 'task',     label: 'Task',        color: 'var(--purple, #7C6AF0)', activeBg: 'rgba(124,106,240,.14)' },
  { value: 'event',    iconKey: 'event',    label: 'Event',       color: 'var(--cyan,   #00C6FF)', activeBg: 'rgba(0,198,255,.12)'   },
  { value: 'reminder', iconKey: 'reminder', label: 'Reminder',    color: 'var(--amber,  #FDCB6E)', activeBg: 'rgba(253,203,110,.13)' },
  { value: 'block',    iconKey: 'block',    label: 'Focus Block', color: 'var(--mint,   #2DD4BF)', activeBg: 'rgba(45,212,191,.13)'  },
];

const PRIORITIES: { value: Priority; label: string; iconKey: keyof typeof ICONS; color: string; bg: string }[] = [
  { value: 'low',      label: 'Low',      iconKey: 'flagLow',      color: 'var(--mint,  #2DD4BF)', bg: 'rgba(45,212,191,.13)'  },
  { value: 'medium',   label: 'Medium',   iconKey: 'flagMedium',   color: 'var(--amber, #FDCB6E)', bg: 'rgba(253,203,110,.13)' },
  { value: 'high',     label: 'High',     iconKey: 'flagHigh',     color: 'var(--coral, #FF6B8A)', bg: 'rgba(255,107,138,.13)' },
  { value: 'critical', label: 'Critical', iconKey: 'flagCritical', color: 'var(--red,   #FF3B30)', bg: 'rgba(255,59,48,.13)'   },
];

const RECURRENCE_OPTIONS: { value: RecurrenceRule; label: string; iconKey: keyof typeof ICONS }[] = [
  { value: 'none',    label: 'No Repeat', iconKey: 'noRepeat' },
  { value: 'daily',   label: 'Daily',     iconKey: 'daily'    },
  { value: 'weekly',  label: 'Weekly',    iconKey: 'weekly'   },
  { value: 'monthly', label: 'Monthly',   iconKey: 'monthly'  },
  { value: 'yearly',  label: 'Yearly',    iconKey: 'yearly'   },
  { value: 'custom',  label: 'Custom',    iconKey: 'custom'   },
];

const CUSTOM_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_FULL    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildISO(dateStr: string, timeHHMM: string, tz: string): string {
  // Strategy: use Intl to find what UTC time corresponds to "dateStr timeHHMM" in tz.
  // We format a candidate UTC time back into tz and iterate until wall-clock matches.
  try {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, mi]    = timeHHMM.split(':').map(Number);

    // Start with a naive guess: treat as UTC, which will be off by the tz offset
    let candidate = Date.UTC(y, mo - 1, d, h, mi, 0);

    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });

    // Two iterations converges for any tz offset
    for (let i = 0; i < 2; i++) {
      const parts: Record<string, string> = {};
      fmt.formatToParts(new Date(candidate)).forEach(({ type, value }) => { parts[type] = value; });
      const localH = parts.hour === '24' ? 0 : Number(parts.hour);
      const diffMs = (
        (Number(parts.year) - y) * 365 * 86400000 +
        (Number(parts.month) - mo) * 30 * 86400000 +
        (Number(parts.day) - d) * 86400000 +
        (localH - h) * 3600000 +
        (Number(parts.minute) - mi) * 60000
      );
      candidate -= diffMs;
    }
    return new Date(candidate).toISOString();
  } catch {
    // Fallback: parse as local time (browser tz)
    return new Date(`${dateStr}T${timeHHMM}:00`).toISOString();
  }
}

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total  = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  selectedDate: Date;
  countryCode: string;
  initialTime?: string;     // e.g. "14:00" — pre-fills start time when sheet opens
  editSchedule?: Schedule;  // if set, opens in edit mode with fields pre-filled
  onClose: () => void;
  onSaved: (newId?: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddScheduleSheet({ open, selectedDate, countryCode, initialTime, editSchedule, onClose, onSaved }: Props) {
  const supabase = createClient();

  const [title,         setTitle]         = useState('');
  const [type,          setType]          = useState<ScheduleType>('task');
  const [priority,      setPriority]      = useState<Priority>('medium');
  const [startTime,     setStartTime]     = useState('09:00');
  const [endTime,       setEndTime]       = useState('09:30');
  const [endTouched,    setEndTouched]    = useState(false);
  const [allDay,        setAllDay]        = useState(false);
  const [schedLocation, setSchedLocation] = useState('');
  const [notes,         setNotes]         = useState('');
  const [recurrence,    setRecurrence]    = useState<RecurrenceRule>('none');
  const [customDays,    setCustomDays]    = useState<number[]>([]);
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState<string | null>(null);
  const [daySchedules,  setDaySchedules]  = useState<Schedule[]>([]);
  const [holiday,       setHoliday]       = useState<Holiday | null>(null);

  const [activeTimezone, setActiveTimezone] = useState('');
  const [tzSource,       setTzSource]       = useState<'profile'|'gps'|'manual'>('profile');
  const [gpsTimezone,    setGpsTimezone]    = useState<string | null>(null);
  const [gpsResult,      setGpsResult]      = useState<GeoResult | null>(null);
  const [gpsDetecting,   setGpsDetecting]   = useState(false);
  const [showTzPanel,    setShowTzPanel]    = useState(false);
  const [manualTz,       setManualTz]       = useState('');

  useEffect(() => {
    if (tzSource === 'gps' && gpsTimezone) setActiveTimezone(gpsTimezone);
    else if (tzSource === 'manual' && manualTz.trim()) setActiveTimezone(manualTz.trim());
    else setActiveTimezone(COUNTRY_TIMEZONES[countryCode] || Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [tzSource, gpsTimezone, countryCode, manualTz]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow    = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow    = '';
      document.body.style.touchAction = '';
    }
    return () => { document.body.style.overflow = ''; document.body.style.touchAction = ''; };
  }, [open]);

  useEffect(() => {
    if (open) {
      if (editSchedule) {
        // Edit mode — pre-fill all fields from existing record
        const startD = new Date(editSchedule.start_time);
        const endD   = editSchedule.end_time ? new Date(editSchedule.end_time) : null;
        const fmt2   = (n: number) => String(n).padStart(2,'0');
        const t0     = `${fmt2(startD.getHours())}:${fmt2(startD.getMinutes())}`;
        const t1     = endD ? `${fmt2(endD.getHours())}:${fmt2(endD.getMinutes())}` : addMinutes(t0, 30);
        setTitle(editSchedule.title);
        setType(editSchedule.type as ScheduleType);
        setPriority(editSchedule.priority as Priority);
        setStartTime(t0); setEndTime(t1); setEndTouched(true);
        setAllDay(editSchedule.all_day ?? false);
        setSchedLocation((editSchedule as Schedule & { location?: string }).location ?? '');
        setNotes((editSchedule as Schedule & { description?: string }).description ?? '');
        setRecurrence((editSchedule.recurrence_rule ? editSchedule.recurrence_rule : 'none') as RecurrenceRule);
        setCustomDays([]); setRecurrenceEnd(editSchedule.recurrence_end ?? '');
      } else {
        // Add mode — clear all fields
        setTitle(''); setType('task'); setPriority('medium');
        const t0 = initialTime ?? '09:00';
        setStartTime(t0); setEndTime(addMinutes(t0, 30)); setEndTouched(false);
        setAllDay(false); setSchedLocation(''); setNotes('');
        setRecurrence('none'); setCustomDays([]); setRecurrenceEnd('');
      }
      setSaving(false); setSaveError(null);
      setTzSource('profile'); setGpsTimezone(null); setGpsResult(null); setManualTz(''); setShowTzPanel(false);
    }
  }, [open]);

  useEffect(() => {
    if (!endTouched) setEndTime(addMinutes(startTime, 30));
  }, [startTime, endTouched]);

  useEffect(() => {
    if (!open || !countryCode) { setHoliday(null); return; }
    getHolidays(selectedDate.getFullYear(), countryCode).then((hols) => {
      setHoliday(findHoliday(toDateStr(selectedDate), hols));
    });
  }, [open, selectedDate, countryCode]);

  const detectGps = useCallback(() => {
    setGpsDetecting(true);
    setSaveError(null);
    detectLocation(
      (result) => {
        setGpsResult(result);
        setGpsTimezone(result.timezone);
        setManualTz(result.timezone);
        setTzSource('gps');
        setGpsDetecting(false);
      },
      (errMsg) => {
        setGpsDetecting(false);
        setSaveError(errMsg);
      }
    );
  }, []);

  const dateStr   = toDateStr(selectedDate);
  const dateLabel = `${DAYS_FULL[selectedDate.getDay()]}, ${MONTHS_SHORT[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;
  const tzLabel   = activeTimezone || 'Browser default';
  const tzSourceLabel = tzSource === 'gps' ? 'GPS' : tzSource === 'manual' ? 'Manual' : 'Profile';

  async function handleSave() {
    if (!title.trim()) { setSaveError('Please enter a schedule title.'); return; }
    setSaving(true); setSaveError(null);
    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData.user) {
        setSaveError('Not signed in — please refresh and try again.');
        setSaving(false); return;
      }
      const user = authData.user;
      const tz = activeTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const startISO = allDay ? `${dateStr}T00:00:00.000Z` : buildISO(dateStr, startTime, tz);
      const endISO   = (!allDay && endTime) ? buildISO(dateStr, endTime, tz) : null;

      let rrule: string | null = null;
      if (recurrence !== 'none') {
        if (recurrence === 'custom' && customDays.length > 0) {
          const dayCodes = ['SU','MO','TU','WE','TH','FR','SA'];
          rrule = `FREQ=WEEKLY;BYDAY=${customDays.map(i => dayCodes[i]).join(',')}`;
        } else if (recurrence !== 'custom') {
          const freq: Record<string, string> = {
            daily: 'FREQ=DAILY', weekly: 'FREQ=WEEKLY',
            monthly: 'FREQ=MONTHLY', yearly: 'FREQ=YEARLY',
          };
          rrule = freq[recurrence] ?? null;
        }
        if (rrule && recurrenceEnd) rrule += `;UNTIL=${recurrenceEnd.replace(/-/g,'')}T000000Z`;
      }

      let savedId: string | undefined;

      if (editSchedule) {
        // Edit mode — UPDATE existing record
        const { error: updateErr } = await supabase.from('schedules').update({
          title: title.trim(), type, priority,
          start_time: startISO, end_time: endISO, all_day: allDay,
          location: schedLocation.trim() || null, description: notes.trim() || null,
          recurrence_rule: rrule, recurrence_end: recurrenceEnd || null, timezone: tz,
        }).eq('id', editSchedule.id);
        if (updateErr) { setSaveError(`Update error: ${updateErr.message}`); setSaving(false); return; }
        savedId = String(editSchedule.id);
      } else {
        // Add mode — INSERT new record
        const { data: insertedRows, error: insertErr } = await supabase.from('schedules').insert({
          user_id: user.id, title: title.trim(), type, priority,
          start_time: startISO, end_time: endISO, all_day: allDay,
          location: schedLocation.trim() || null, description: notes.trim() || null,
          recurrence_rule: rrule, recurrence_end: recurrenceEnd || null, timezone: tz,
        }).select();
        if (insertErr) { setSaveError(`Database error: ${insertErr.message}`); setSaving(false); return; }
        savedId = Array.isArray(insertedRows) && insertedRows[0]?.id ? String(insertedRows[0].id) : undefined;
      }

      setSaving(false);
      onSaved(savedId);
      onClose();
    } catch (e: unknown) {
      setSaveError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={{ position:'fixed', inset:0, zIndex:1000,
        background:'rgba(0,0,0,.50)', backdropFilter:'blur(3px)', WebkitBackdropFilter:'blur(3px)',
        animation:'modalOverlayIn .22s ease', touchAction:'none', overscrollBehavior:'contain' }}
        onClick={onClose}
      />

      {/* Modal panel */}
      <div style={{
        position:'fixed', top:0, left:0, right:0, bottom:'48px',
        zIndex:1001, display:'flex', flexDirection:'column',
        background:'var(--glass-bg, rgba(14,13,24,0.96))',
        backdropFilter:'var(--glass-blur, blur(28px))', WebkitBackdropFilter:'var(--glass-blur, blur(28px))',
        borderBottom:'1px solid var(--glass-border2, rgba(255,255,255,.12))',
        borderRadius:'0 0 24px 24px', boxShadow:'0 12px 60px rgba(0,0,0,.50)',
        animation:'modalSlideDown .30s cubic-bezier(.22,.8,.32,1)', overflow:'hidden',
      }}>

        {/* ── Pinned Header ── */}
        <div style={{
          flexShrink:0,
          paddingTop:'max(env(safe-area-inset-top, 0px), 52px)',
          paddingLeft:'20px', paddingRight:'20px', paddingBottom:0,
          background:'var(--glass-bg, rgba(14,13,24,.98))',
          backdropFilter:'var(--glass-blur, blur(28px))', WebkitBackdropFilter:'var(--glass-blur, blur(28px))',
          borderBottom:'1px solid var(--glass-border, rgba(255,255,255,.07))',
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:12, paddingTop:4 }}>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:'var(--dark)', letterSpacing:'-.3px' }}>{editSchedule ? 'Edit Schedule' : 'Add Schedule'}</div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3, color:'var(--purple)' }}>
                <Icon d={['M3 8h14','M6 5V3m8 2V3','M5 5h10a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z']} size={13} stroke="var(--purple)" />
                <span style={{ fontSize:12, fontWeight:600 }}>{dateLabel}</span>
              </div>
            </div>
            <button onClick={onClose} style={closeBtn} aria-label="Close">
              <Icon d={['M5 5l10 10M15 5L5 15']} size={16} stroke="var(--mid)" strokeWidth={2} />
            </button>
          </div>

          {/* Holiday banner */}
          {holiday && (
            <div style={{ display:'flex', alignItems:'center', gap:10,
              background:'rgba(255,107,138,.08)', border:'1px solid rgba(255,107,138,.22)',
              borderRadius:10, padding:'8px 12px', marginBottom:12 }}>
              <Icon d={['M10 3L2 17h16L10 3z','M10 9v4m0 2.5v.01']} size={16} stroke="var(--coral, #FF6B8A)" strokeWidth={1.6} />
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--coral, #FF6B8A)' }}>{holiday.localName}</div>
                <div style={{ fontSize:10, color:'var(--mid)', marginTop:1 }}>Public holiday — you can still schedule</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex:1, overflowY:'auto', overscrollBehavior:'contain',
          padding:'20px 20px 12px', display:'flex', flexDirection:'column', gap:22 }}
          onClick={e => e.stopPropagation()}>

          {/* Title */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Schedule Title <span style={reqStar}>*</span></label>
            <input type="text" value={title} autoFocus maxLength={100}
              onChange={e => { setTitle(e.target.value); setSaveError(null); }}
              placeholder="e.g., Team standup, Site visit, Deadline…"
              style={inputStyle} />
          </div>

          {/* Category */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Category</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {TYPES.map(t => {
                const active = type === t.value;
                return (
                  <button key={t.value} type="button" onClick={() => setType(t.value)} style={{
                    display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                    padding:'11px 4px 10px',
                    background: active ? t.activeBg : 'var(--glass-bg2, rgba(255,255,255,.04))',
                    border:`1.5px solid ${active ? t.color : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                    borderRadius:12, cursor:'pointer', transition:'all .14s', fontFamily:'inherit',
                    color: active ? t.color : 'var(--lite)',
                  }}>
                    {ICONS[t.iconKey]}
                    <span style={{ fontSize:10, fontWeight:700 }}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Priority</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {PRIORITIES.map(p => {
                const active = priority === p.value;
                return (
                  <button key={p.value} type="button"
                    onClick={() => { setPriority(p.value); setSaveError(null); }} style={{
                    display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                    padding:'10px 4px 9px',
                    background: active ? p.bg : 'var(--glass-bg2, rgba(255,255,255,.04))',
                    border:`1.5px solid ${active ? p.color : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                    borderRadius:12, cursor:'pointer', transition:'all .14s', fontFamily:'inherit',
                    color: active ? p.color : 'var(--lite)',
                  }}>
                    {ICONS[p.iconKey]}
                    <span style={{ fontSize:10, fontWeight:700 }}>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* All Day */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
            padding:'12px 14px', background:'var(--glass-bg2, rgba(255,255,255,.04))',
            border:'1.5px solid var(--glass-border, rgba(255,255,255,.08))', borderRadius:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ color: allDay ? 'var(--purple)' : 'var(--lite)' }}>
                <Icon d={['M10 3a7 7 0 100 14A7 7 0 0010 3z','M10 6v4.5l3 2']} size={18} stroke="currentColor" />
              </span>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--dark)' }}>All Day</div>
                <div style={{ fontSize:11, color:'var(--mid)', marginTop:1 }}>No specific start or end time</div>
              </div>
            </div>
            <button type="button" onClick={() => setAllDay(!allDay)} style={toggleWrap(allDay)}>
              <span style={toggleThumb(allDay)} />
            </button>
          </div>

          {/* Time pickers */}
          {!allDay && (
            <div style={fieldWrap}>
              <label style={labelStyle}>Time</label>
              <div style={{
                display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center',
                background:'var(--glass-bg2, rgba(255,255,255,.05))',
                border:'1.5px solid var(--glass-border, rgba(255,255,255,.09))',
                borderRadius:14, overflow:'hidden',
              }}>
                <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:4 }}>
                  <span style={{ fontSize:9, fontWeight:700, color:'var(--mid)', textTransform:'uppercase', letterSpacing:'.6px' }}>Start</span>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={timeInputStyle} />
                </div>
                <div style={{ width:1, alignSelf:'stretch', background:'var(--glass-border, rgba(255,255,255,.09))',
                  position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:24, height:24, borderRadius:'50%',
                    background:'var(--glass-bg, rgba(14,13,24,.9))',
                    border:'1px solid var(--glass-border, rgba(255,255,255,.09))',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    position:'absolute', zIndex:1, color:'var(--mid)' }}>
                    <Icon d={['M4 10h12m-4-4l4 4-4 4']} size={13} stroke="var(--mid)" strokeWidth={1.8} />
                  </div>
                </div>
                <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:4 }}>
                  <span style={{ fontSize:9, fontWeight:700, color:'var(--mid)', textTransform:'uppercase', letterSpacing:'.6px' }}>
                    End <span style={{ fontSize:8, fontWeight:400, opacity:.5, textTransform:'none', letterSpacing:0 }}>auto</span>
                  </span>
                  <input type="time" value={endTime}
                    onChange={e => { setEndTime(e.target.value); setEndTouched(true); }}
                    style={timeInputStyle} />
                </div>
              </div>
            </div>
          )}

          {/* Recurrence */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Repeat</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {RECURRENCE_OPTIONS.map(r => {
                const active = recurrence === r.value;
                return (
                  <button key={r.value} type="button" onClick={() => setRecurrence(r.value)} style={{
                    padding:'10px 6px 9px',
                    borderRadius:12,
                    background: active ? 'var(--pur-lt, rgba(124,106,240,.15))' : 'var(--glass-bg2, rgba(255,255,255,.04))',
                    border:`1.5px solid ${active ? 'var(--purple)' : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                    color: active ? 'var(--purple)' : 'var(--lite)',
                    fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                    transition:'all .14s',
                  }}>
                    {ICONS[r.iconKey]}
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom days */}
            {recurrence === 'custom' && (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:10, color:'var(--mid)', fontWeight:700, letterSpacing:'.5px',
                  textTransform:'uppercase', marginBottom:8 }}>Select days</div>
                <div style={{ display:'flex', gap:6 }}>
                  {CUSTOM_DAYS.map((d, i) => (
                    <button key={d} type="button"
                      onClick={() => setCustomDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                      style={{
                        flex:1, height:36, borderRadius:10,
                        background: customDays.includes(i) ? 'var(--purple)' : 'var(--glass-bg2, rgba(255,255,255,.05))',
                        border:`1.5px solid ${customDays.includes(i) ? 'var(--purple)' : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                        color: customDays.includes(i) ? '#fff' : 'var(--lite)',
                        fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                      }}>{d}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Recurrence end date */}
            {recurrence !== 'none' && (
              <div style={{ marginTop:10 }}>
                <label style={{ ...labelStyle, marginBottom:6, display:'block' }}>
                  End repeat <span style={{ fontWeight:400, opacity:.45, textTransform:'none', letterSpacing:0 }}>— optional</span>
                </label>
                <input type="date" value={recurrenceEnd} min={addDays(dateStr, 1)}
                  onChange={e => setRecurrenceEnd(e.target.value)}
                  style={{ ...inputStyle, colorScheme:'dark' as const }} />
              </div>
            )}
          </div>

          {/* Location */}
          <div style={fieldWrap}>
            <label style={labelStyle}>
              Location <span style={{ fontWeight:400, opacity:.45, textTransform:'none', letterSpacing:0 }}>— optional</span>
            </label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)',
                pointerEvents:'none', color:'var(--lite)', opacity:.6 }}>
                <Icon d={['M10 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z','M10 2a8 8 0 018 8c0 5-8 12-8 12S2 15 2 10a8 8 0 018-8z']} size={16} stroke="currentColor" />
              </span>
              <input type="text" value={schedLocation} maxLength={120}
                onChange={e => setSchedLocation(e.target.value)}
                placeholder="Office, Zoom, Client site…"
                style={{ ...inputStyle, paddingLeft:38 }} />
            </div>
          </div>

          {/* Timezone */}
          <div style={fieldWrap}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
              <label style={labelStyle}>Time Zone</label>
              <button type="button" onClick={() => setShowTzPanel(!showTzPanel)}
                style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--purple)',
                  fontWeight:700, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                {showTzPanel ? 'Hide' : 'Change'}
                <Icon d={showTzPanel ? ['M5 12l5-5 5 5'] : ['M5 8l5 5 5-5']} size={13} stroke="var(--purple)" strokeWidth={2} />
              </button>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12,
              background:'var(--glass-bg2, rgba(255,255,255,.05))',
              border:'1.5px solid var(--glass-border, rgba(255,255,255,.09))' }}>
              <span style={{ color:'var(--purple)', flexShrink:0 }}>
                <Icon d={['M10 3a7 7 0 100 14A7 7 0 0010 3z','M3 10h14','M10 3c-2 2.5-3 5-3 7s1 4.5 3 7','M10 3c2 2.5 3 5 3 7s-1 4.5-3 7']} size={16} stroke="var(--purple)" />
              </span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--dark)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tzLabel}</div>
                <div style={{ fontSize:10, color:'var(--mid)', marginTop:1 }}>
                  {tzSource === 'gps' && gpsResult?.city
                    ? `GPS · ${gpsResult.city}${gpsResult.country ? `, ${gpsResult.country}` : ''}`
                    : tzSourceLabel}
                </div>
              </div>
            </div>

            {showTzPanel && (
              <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:7 }}>

                {/* GPS */}
                <button type="button" onClick={detectGps} disabled={gpsDetecting} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:11,
                  background: tzSource === 'gps' ? 'rgba(45,212,191,.10)' : 'var(--glass-bg2, rgba(255,255,255,.04))',
                  border:`1.5px solid ${tzSource === 'gps' ? 'var(--mint, #2DD4BF)' : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                  color: tzSource === 'gps' ? 'var(--mint, #2DD4BF)' : 'var(--mid)',
                  fontSize:12, fontWeight:600, cursor: gpsDetecting ? 'default' : 'pointer',
                  fontFamily:'inherit', opacity: gpsDetecting ? .6 : 1, transition:'all .14s',
                }}>
                  <Icon d={['M10 10m-1.5 0a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0','M5.2 14.8a8 8 0 000-9.6','M14.8 5.2a8 8 0 010 9.6','M7.4 12.6a5 5 0 010-5.2','M12.6 7.4a5 5 0 010 5.2']} size={16} stroke="currentColor" />
                  <span>
                    {gpsDetecting
                      ? 'Detecting location…'
                      : tzSource === 'gps' && gpsResult
                        ? `GPS: ${gpsResult.displayLabel}`
                        : tzSource === 'gps' && gpsTimezone
                          ? `GPS: ${gpsTimezone}`
                          : 'Auto-detect via GPS'}
                  </span>
                </button>

                {/* Profile TZ */}
                <button type="button" onClick={() => setTzSource('profile')} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:11,
                  background: tzSource === 'profile' ? 'var(--pur-lt, rgba(124,106,240,.12))' : 'var(--glass-bg2, rgba(255,255,255,.04))',
                  border:`1.5px solid ${tzSource === 'profile' ? 'var(--purple)' : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                  color: tzSource === 'profile' ? 'var(--purple)' : 'var(--mid)',
                  fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .14s',
                }}>
                  <Icon d={['M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z','M16.5 10a6.5 6.5 0 01-.1 1l1.7 1.3-1.6 2.8-2-.8a6.5 6.5 0 01-1.7 1l-.3 2.1h-3.2l-.3-2.1a6.5 6.5 0 01-1.7-1l-2 .8L3.9 12.3l1.7-1.3A6.5 6.5 0 015.5 10c0-.34.04-.67.1-1L3.9 7.7l1.6-2.8 2 .8a6.5 6.5 0 011.7-1L9.5 2.5h3.2l.3 2.1a6.5 6.5 0 011.7 1l2-.8 1.6 2.8-1.7 1.3c.06.33.1.66.1 1z']} size={16} stroke="currentColor" />
                  <span>Use profile country ({COUNTRY_TIMEZONES[countryCode] || 'Browser default'})</span>
                </button>

                {/* Manual */}
                <div>
                  <div style={{ fontSize:10, color:'var(--mid)', fontWeight:700,
                    letterSpacing:'.5px', textTransform:'uppercase', marginBottom:6 }}>Manual override</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <input type="text" value={manualTz} onChange={e => setManualTz(e.target.value)}
                      placeholder="e.g. Asia/Manila, America/New_York"
                      style={{ ...inputStyle, flex:1, fontSize:12, padding:'9px 12px' }} />
                    <button type="button" onClick={() => { if (manualTz.trim()) setTzSource('manual'); }}
                      style={{ padding:'9px 14px', borderRadius:10, cursor:'pointer',
                        background:'var(--purple)', border:'none', color:'#fff',
                        fontSize:11, fontWeight:700, fontFamily:'inherit', flexShrink:0 }}>Apply</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={fieldWrap}>
            <label style={labelStyle}>
              Notes <span style={{ fontWeight:400, opacity:.45, textTransform:'none', letterSpacing:0 }}>— optional</span>
            </label>
            <textarea value={notes} rows={3} onChange={e => setNotes(e.target.value)}
              placeholder="Add details, links, or context…"
              style={{ ...inputStyle, resize:'none', lineHeight:1.55 }} />
          </div>

          {/* AI check */}
          <button type="button" style={aiBtn}>
            <Icon d={['M10 3v2m0 10v2M3 10h2m10 0h2','M5.6 5.6l1.2 1.2m6.4 6.4l1.2 1.2M5.6 14.4l1.2-1.2m6.4-6.4l1.2-1.2','M10 7a3 3 0 100 6 3 3 0 000-6z']} size={15} stroke="var(--purple)" />
            Check Schedule Balance with AI
          </button>

          <div style={{ height:8 }} />
        </div>

        {/* ── Pinned Footer ── */}
        <div style={{ flexShrink:0, padding:'12px 20px',
          paddingBottom:'max(12px, env(safe-area-inset-bottom, 12px))',
          borderTop:'1px solid var(--glass-border, rgba(255,255,255,.07))',
          background:'var(--glass-bg, rgba(14,13,24,.98))' }}
          onClick={e => e.stopPropagation()}>

          {/* Smart Schedule AI panel */}
          <SmartScheduleAI
            proposed={title.trim() && !allDay ? {
              title: title.trim(),
              type,
              priority,
              start_time: (() => {
                try {
                  const tz = activeTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
                  const dateStr2 = selectedDate.toISOString().slice(0,10);
                  const [h, m] = startTime.split(':').map(Number);
                  const d = new Date(`${dateStr2}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
                  void tz; return d.toISOString();
                } catch { return ''; }
              })(),
              end_time: endTime ? (() => {
                try {
                  const dateStr2 = selectedDate.toISOString().slice(0,10);
                  const [h, m] = endTime.split(':').map(Number);
                  const d = new Date(`${dateStr2}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
                  return d.toISOString();
                } catch { return null; }
              })() : null,
            } : null}
            existingSchedules={daySchedules.map(s => ({
              id: s.id, title: s.title, type: s.type, priority: s.priority,
              start_time: s.start_time, end_time: s.end_time,
              all_day: s.all_day ?? false, is_completed: s.is_completed,
            }))}
            onSelectTime={t => { setStartTime(t); setEndTouched(false); }}
          />

          {saveError && (
            <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'9px 14px', marginBottom:10,
              background:'rgba(255,59,48,.10)', border:'1px solid rgba(255,59,48,.28)',
              borderRadius:10, fontSize:12, color:'#FF3B30', fontWeight:600 }}>
              <Icon d={['M10 3L2 17h16L10 3z','M10 9v4m0 2.5v.01']} size={15} stroke="#FF3B30" strokeWidth={1.8} />
              <span style={{ flex:1 }}>{saveError}</span>
            </div>
          )}

          <button type="button" onClick={handleSave} disabled={saving || !title.trim()} style={{
            width:'100%', padding:'15px 0',
            display:'flex', alignItems:'center', justifyContent:'center', gap:9,
            background: title.trim() ? 'var(--gradient)' : 'var(--glass-bg2, rgba(255,255,255,.06))',
            border:'none', borderRadius:16,
            color: title.trim() ? '#fff' : 'var(--mid)',
            fontSize:15, fontWeight:800, fontFamily:'inherit',
            cursor: title.trim() && !saving ? 'pointer' : 'default',
            letterSpacing:'-.2px',
            boxShadow: title.trim() ? '0 4px 20px rgba(124,106,240,.35)' : 'none',
            transition:'all .18s', opacity: saving ? .7 : 1,
          }}>
            {saving
              ? <><Icon d={['M4 10a6 6 0 106-6']} size={16} stroke="currentColor" strokeWidth={2} /> Saving…</>
              : <><Icon d={['M4 10l5 5 8-8']} size={16} stroke="currentColor" strokeWidth={2.2} /> {editSchedule ? 'Update Schedule' : 'Save Schedule'}</>
            }
          </button>
        </div>
      </div>

      {/* Dismiss strip */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, height:48, zIndex:1002,
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', animation:'modalOverlayIn .30s ease' }}
        onClick={onClose}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4,
          color:'rgba(255,255,255,.35)', userSelect:'none' }}>
          <span style={{ width:36, height:4, background:'rgba(255,255,255,.20)', borderRadius:2, display:'block' }} />
          <span style={{ fontSize:10, opacity:.6 }}>tap to dismiss</span>
        </div>
      </div>

      <style>{`
        @keyframes modalOverlayIn { from{opacity:0} to{opacity:1} }
        @keyframes modalSlideDown {
          from { transform:translateY(-100%); opacity:0; }
          to   { transform:translateY(0);     opacity:1; }
        }
        input[type="time"]::-webkit-calendar-picker-indicator,
        input[type="date"]::-webkit-calendar-picker-indicator { filter:invert(0.5); cursor:pointer; }
      `}</style>
    </>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const fieldWrap: React.CSSProperties = { display:'flex', flexDirection:'column', gap:7 };

const labelStyle: React.CSSProperties = {
  fontSize:10, fontWeight:700, color:'var(--mid)',
  textTransform:'uppercase', letterSpacing:'.7px',
};

const reqStar: React.CSSProperties = { color:'var(--purple)', fontWeight:900 };

const inputStyle: React.CSSProperties = {
  width:'100%', padding:'12px 14px',
  background:'var(--glass-bg2, rgba(255,255,255,.05))',
  border:'1.5px solid var(--glass-border, rgba(255,255,255,.09))',
  backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
  borderRadius:12, color:'var(--dark)',
  fontSize:14, fontFamily:'inherit',
  outline:'none', boxSizing:'border-box' as const,
  transition:'border-color .15s', colorScheme:'dark' as const,
};

const timeInputStyle: React.CSSProperties = {
  background:'none', border:'none', outline:'none',
  color:'var(--dark)', fontSize:18, fontWeight:700,
  fontFamily:'inherit', width:'100%', padding:0,
  colorScheme:'dark' as const, letterSpacing:'-.3px',
};

const closeBtn: React.CSSProperties = {
  width:34, height:34,
  background:'var(--glass-bg2, rgba(255,255,255,.07))',
  border:'1px solid var(--glass-border, rgba(255,255,255,.10))',
  borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
  cursor:'pointer', flexShrink:0, fontFamily:'inherit', padding:0,
};

const toggleWrap = (on: boolean): React.CSSProperties => ({
  width:46, height:27,
  background: on ? 'var(--purple)' : 'var(--glass-bg2, rgba(255,255,255,.08))',
  border:'1px solid var(--glass-border, rgba(255,255,255,.12))',
  borderRadius:14, cursor:'pointer', padding:0,
  position:'relative', transition:'background .2s', flexShrink:0, fontFamily:'inherit',
});

const toggleThumb = (on: boolean): React.CSSProperties => ({
  position:'absolute', top:3, left: on ? 22 : 3,
  width:21, height:21, background:'#fff', borderRadius:'50%',
  transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.30)',
});

const aiBtn: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px 16px',
  background:'var(--pur-lt, rgba(124,106,240,.10))',
  border:'1px solid rgba(124,106,240,.30)',
  borderRadius:12, cursor:'pointer',
  fontSize:13, fontWeight:600, color:'var(--purple)', fontFamily:'inherit',
};
