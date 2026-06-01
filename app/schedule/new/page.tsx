'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { getHolidays, findHoliday, type Holiday } from '@/lib/holidays';
import { COUNTRY_TIMEZONES } from '@/lib/countries';
import { detectLocation, type GeoResult } from '@/lib/geoDetect';
import type { ScheduleType, Priority, RecurrenceRule } from '@/types/database';
import BottomNav from '@/components/layout/BottomNav';

// ─── SVG Icon ─────────────────────────────────────────────────────────────────
function Icon({ d, size = 16, stroke = 'currentColor', strokeWidth = 1.6, fill = 'none' }: {
  d: string | string[]; size?: number; stroke?: string; strokeWidth?: number; fill?: string;
}) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={fill} xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}>
      {paths.map((p, i) => (
        <path key={i} d={p} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={fill} />
      ))}
    </svg>
  );
}

// ─── Icon library ─────────────────────────────────────────────────────────────
type IconKey = keyof typeof ICONS;
const ICONS = {
  task:     <Icon d={['M7 10l2.5 2.5L14 7.5', 'M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z']} />,
  event:    <Icon d={['M3 8h14', 'M6 5V3m8 2V3', 'M5 5h10a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z', 'M10 13h.01']} />,
  reminder: <Icon d={['M10 17a2 2 0 01-2-2h4a2 2 0 01-2 2z', 'M4.5 9a5.5 5.5 0 1111 0c0 3 1.5 5 1.5 6h-14c0-1 1.5-3 1.5-6z']} />,
  block:    <Icon d={['M10 10m-3 0a3 3 0 106 0 3 3 0 10-6 0', 'M10 3v2m0 10v2M3 10h2m10 0h2', 'M5.6 5.6l1.4 1.4m6 6l1.4 1.4M5.6 14.4l1.4-1.4m6-6l1.4-1.4']} />,
  flagLow:      <Icon d={['M4 3v14', 'M4 5h9l-2 3.5L13 12H4']} />,
  flagMedium:   <Icon d={['M4 3v14', 'M4 5h9l-2 3.5L13 12H4']} strokeWidth={1.8} />,
  flagHigh:     <Icon d={['M4 3v14', 'M4 5h9l-2 3.5L13 12H4']} strokeWidth={2} />,
  flagCritical: <Icon d={['M4 3v14', 'M4 4.5h9l-2 3.5 2 3.5H4', 'M10 3v3']} strokeWidth={2} />,
  noRepeat: <Icon d={['M10 3a7 7 0 100 14A7 7 0 0010 3z', 'M5.2 5.2l9.6 9.6']} />,
  daily:    <Icon d={['M4 10a6 6 0 106-6', 'M7 7L4 4 1 7']} />,
  weekly:   <Icon d={['M3 8h14', 'M6 5V3m8 2V3', 'M5 5h10a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z', 'M7 12h2m4 0h-1']} />,
  monthly:  <Icon d={['M3 3h6v6H3zm8 0h6v6h-6zM3 11h6v6H3zm8 0h6v6h-6z']} strokeWidth={1.4} />,
  yearly:   <Icon d={['M4 12a6 6 0 001 3.2M16 8a6 6 0 00-1-3.2', 'M3 15.5l1-3.5 3.5 1', 'M17 4.5l-1 3.5-3.5-1']} />,
  custom:   <Icon d={['M4 6h12M4 10h12M4 14h12', 'M8 4v4m4-2v4m4-2v4']} strokeWidth={1.5} />,
  location: <Icon d={['M10 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z', 'M10 2a8 8 0 018 8c0 5-8 12-8 12S2 15 2 10a8 8 0 018-8z']} />,
  globe:    <Icon d={['M10 3a7 7 0 100 14A7 7 0 0010 3z', 'M3 10h14', 'M10 3c-2 2.5-3 5-3 7s1 4.5 3 7', 'M10 3c2 2.5 3 5 3 7s-1 4.5-3 7']} />,
  gps:      <Icon d={['M10 10m-1.5 0a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0', 'M5.2 14.8a8 8 0 000-9.6', 'M14.8 5.2a8 8 0 010 9.6', 'M7.4 12.6a5 5 0 010-5.2', 'M12.6 7.4a5 5 0 010 5.2']} />,
  settings: <Icon d={['M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z', 'M16.5 10a6.5 6.5 0 01-.1 1l1.7 1.3-1.6 2.8-2-.8a6.5 6.5 0 01-1.7 1l-.3 2.1h-3.2l-.3-2.1a6.5 6.5 0 01-1.7-1l-2 .8L3.9 12.3l1.7-1.3A6.5 6.5 0 015.5 10c0-.34.04-.67.1-1L3.9 7.7l1.6-2.8 2 .8a6.5 6.5 0 011.7-1L9.5 2.5h3.2l.3 2.1a6.5 6.5 0 011.7 1l2-.8 1.6 2.8-1.7 1.3c.06.33.1.66.1 1z']} />,
  ai:       <Icon d={['M10 3v2m0 10v2M3 10h2m10 0h2', 'M5.6 5.6l1.2 1.2m6.4 6.4l1.2 1.2M5.6 14.4l1.2-1.2m6.4-6.4l1.2-1.2', 'M10 7a3 3 0 100 6 3 3 0 000-6z']} />,
  alert:    <Icon d={['M10 3L2 17h16L10 3z', 'M10 9v4m0 2v.5']} />,
  back:     <Icon d={['M13 4l-6 6 6 6']} strokeWidth={2} />,
  clock:    <Icon d={['M10 3a7 7 0 100 14A7 7 0 0010 3z', 'M10 6v4.5l3 2']} />,
  arrow:    <Icon d={['M4 10h12m-4-4l4 4-4 4']} strokeWidth={1.8} />,
  check:    <Icon d={['M4 10l5 5 8-8']} strokeWidth={2.2} />,
  spin:     <Icon d={['M4 10a6 6 0 106-6']} strokeWidth={2} />,
} as const;

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPES: { value: ScheduleType; iconKey: IconKey; label: string; color: string; activeBg: string }[] = [
  { value: 'task',     iconKey: 'task',     label: 'Task',        color: 'var(--purple, #7C6AF0)', activeBg: 'rgba(124,106,240,.14)' },
  { value: 'event',    iconKey: 'event',    label: 'Event',       color: 'var(--cyan,   #00C6FF)', activeBg: 'rgba(0,198,255,.12)'   },
  { value: 'reminder', iconKey: 'reminder', label: 'Reminder',    color: 'var(--amber,  #FDCB6E)', activeBg: 'rgba(253,203,110,.13)' },
  { value: 'block',    iconKey: 'block',    label: 'Focus Block', color: 'var(--mint,   #2DD4BF)', activeBg: 'rgba(45,212,191,.13)'  },
];

const PRIORITIES: { value: Priority; label: string; iconKey: IconKey; color: string; bg: string }[] = [
  { value: 'low',      label: 'Low',      iconKey: 'flagLow',      color: 'var(--mint,  #2DD4BF)', bg: 'rgba(45,212,191,.13)'  },
  { value: 'medium',   label: 'Medium',   iconKey: 'flagMedium',   color: 'var(--amber, #FDCB6E)', bg: 'rgba(253,203,110,.13)' },
  { value: 'high',     label: 'High',     iconKey: 'flagHigh',     color: 'var(--coral, #FF6B8A)', bg: 'rgba(255,107,138,.13)' },
];

const RECURRENCE_OPTIONS: { value: RecurrenceRule; label: string; iconKey: IconKey }[] = [
  { value: 'none',    label: 'No Repeat', iconKey: 'noRepeat' },
  { value: 'daily',   label: 'Daily',     iconKey: 'daily'    },
  { value: 'weekly',  label: 'Weekly',    iconKey: 'weekly'   },
  { value: 'monthly', label: 'Monthly',   iconKey: 'monthly'  },
  { value: 'yearly',  label: 'Yearly',    iconKey: 'yearly'   },
  { value: 'custom',  label: 'Custom',    iconKey: 'custom'   },
];

const CUSTOM_DAYS  = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const REMINDER_OPTIONS = [
  { value: 0,   label: 'No reminder'   },
  { value: 5,   label: '5 min before'  },
  { value: 10,  label: '10 min before' },
  { value: 15,  label: '15 min before' },
  { value: 30,  label: '30 min before' },
  { value: 60,  label: '1 hour before' },
  { value: 120, label: '2 hrs before'  },
];
const DAYS_FULL    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildISO(dateStr: string, timeHHMM: string, tz: string): string {
  try {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, mi]    = timeHHMM.split(':').map(Number);
    const utcWall    = Date.UTC(y, mo - 1, d, h, mi, 0);
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    const parts: Record<string, string> = {};
    fmt.formatToParts(new Date(utcWall)).forEach(({ type, value }) => { parts[type] = value; });
    const formattedUTC = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      parts.hour === '24' ? 0 : Number(parts.hour), Number(parts.minute), Number(parts.second),
    );
    return new Date(utcWall - (utcWall - formattedUTC)).toISOString();
  } catch {
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

// ─── Shared styles (declared outside component for reuse) ─────────────────────
const inputBase: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: 'var(--glass-bg2, rgba(255,255,255,.05))',
  border: '1.5px solid var(--glass-border, rgba(255,255,255,.09))',
  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
  borderRadius: 12, color: 'var(--dark)',
  fontSize: 14, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color .15s', colorScheme: 'dark',
};
const labelBase: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--mid)',
  textTransform: 'uppercase', letterSpacing: '.7px',
};
const fieldWrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 7 };
const optMark:   React.CSSProperties = { fontWeight: 400, opacity: .45, textTransform: 'none', letterSpacing: 0 };

// ─── Component ────────────────────────────────────────────────────────────────
export default function AddSchedulePage() {
  const router   = useRouter();
  const supabase = createClient();

  const today     = new Date();
  const todayStr  = toDateStr(today);
  const dateLabel = `${DAYS_FULL[today.getDay()]}, ${MONTHS_SHORT[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

  // Form state
  const [title,         setTitle]         = useState('');
  const [type,          setType]          = useState<ScheduleType>('task');
  const [priority,      setPriority]      = useState<Priority>('medium');
  const [startDate,     setStartDate]     = useState(todayStr);
  const [startTime,     setStartTime]     = useState('09:00');
  const [endTime,       setEndTime]       = useState('09:30');
  const [endTouched,    setEndTouched]    = useState(false);
  const [allDay,        setAllDay]        = useState(false);
  const [schedLocation, setSchedLocation] = useState('');
  const [notes,         setNotes]         = useState('');
  const [recurrence,    setRecurrence]    = useState<RecurrenceRule>('none');
  const [customDays,    setCustomDays]    = useState<number[]>([]);
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number>(15);
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState<string | null>(null);
  const [holiday,       setHoliday]       = useState<Holiday | null>(null);

  // Timezone state
  const [countryCode,    setCountryCode]    = useState('');
  const [activeTimezone, setActiveTimezone] = useState('');
  const [tzSource,       setTzSource]       = useState<'profile'|'gps'|'manual'>('profile');
  const [gpsTimezone,    setGpsTimezone]    = useState<string | null>(null);
  const [gpsResult,      setGpsResult]      = useState<GeoResult | null>(null);
  const [gpsDetecting,   setGpsDetecting]   = useState(false);
  const [showTzPanel,    setShowTzPanel]    = useState(false);
  const [manualTz,       setManualTz]       = useState('');

  // Load user country
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase.from('profiles').select('country_code').eq('id', user.id).single();
      setCountryCode(data?.country_code || '');
    }
    load();
  }, []);

  // Sync timezone
  useEffect(() => {
    if (tzSource === 'gps' && gpsTimezone) setActiveTimezone(gpsTimezone);
    else if (tzSource === 'manual' && manualTz.trim()) setActiveTimezone(manualTz.trim());
    else setActiveTimezone(COUNTRY_TIMEZONES[countryCode] || Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [tzSource, gpsTimezone, countryCode, manualTz]);

  // Auto end-time
  useEffect(() => {
    if (!endTouched) setEndTime(addMinutes(startTime, 30));
  }, [startTime, endTouched]);

  // Holiday check
  useEffect(() => {
    if (!startDate || !countryCode) { setHoliday(null); return; }
    const year = parseInt(startDate.split('-')[0]);
    getHolidays(year, countryCode).then(hols => setHoliday(findHoliday(startDate, hols)));
  }, [startDate, countryCode]);

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

  async function handleSave() {
    if (!title.trim()) { setSaveError('Please enter a schedule title.'); return; }
    if (!startDate)    { setSaveError('Please select a date.');          return; }
    if (!allDay && !startTime) { setSaveError('Please select a start time.'); return; }
    setSaving(true); setSaveError(null);
    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData.user) { setSaveError('Not signed in.'); setSaving(false); return; }
      const user = authData.user;
      const tz   = activeTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const startISO = allDay ? `${startDate}T00:00:00.000Z` : buildISO(startDate, startTime, tz);
      const endISO   = (!allDay && endTime) ? buildISO(startDate, endTime, tz) : null;
      let rrule: string | null = null;
      if (recurrence !== 'none') {
        if (recurrence === 'custom' && customDays.length > 0) {
          const codes = ['SU','MO','TU','WE','TH','FR','SA'];
          rrule = `FREQ=WEEKLY;BYDAY=${customDays.map(i => codes[i]).join(',')}`;
        } else if (recurrence !== 'custom') {
          const freq: Record<string, string> = { daily: 'FREQ=DAILY', weekly: 'FREQ=WEEKLY', monthly: 'FREQ=MONTHLY', yearly: 'FREQ=YEARLY' };
          rrule = freq[recurrence] ?? null;
        }
        if (rrule && recurrenceEnd) rrule += `;UNTIL=${recurrenceEnd.replace(/-/g,'')}T000000Z`;
      }
      const { error } = await supabase.from('schedules').insert({
        user_id: user.id, title: title.trim(), type, priority,
        start_time: startISO, end_time: endISO, all_day: allDay,
        location: schedLocation.trim() || null, description: notes.trim() || null,
        recurrence_rule: rrule, recurrence_end: recurrenceEnd || null, timezone: tz,
        reminder_minutes: reminderMinutes > 0 ? reminderMinutes : null,
      });
      if (error) { setSaveError(`Database error: ${error.message}`); setSaving(false); return; }
      toast.success('Schedule added!');
      router.push('/calendar');
    } catch (e: unknown) {
      setSaveError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
      setSaving(false);
    }
  }

  const tzLabel       = activeTimezone || 'Browser default';
  const tzSourceLabel = tzSource === 'gps' ? 'GPS' : tzSource === 'manual' ? 'Manual' : 'Profile';

  const toggleWrap = (on: boolean): React.CSSProperties => ({
    width: 46, height: 27,
    background: on ? 'var(--purple)' : 'var(--glass-bg2, rgba(255,255,255,.08))',
    border: '1px solid var(--glass-border, rgba(255,255,255,.12))',
    borderRadius: 14, cursor: 'pointer', padding: 0,
    position: 'relative', transition: 'background .2s', flexShrink: 0, fontFamily: 'inherit',
  });
  const toggleThumb = (on: boolean): React.CSSProperties => ({
    position: 'absolute', top: 3, left: on ? 22 : 3,
    width: 21, height: 21, background: '#fff', borderRadius: '50%',
    transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.30)',
  });

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── Sticky Header ── */}
      <div style={{
        flexShrink: 0,
        paddingTop: 'max(env(safe-area-inset-top, 0px), 52px)',
        paddingLeft: 20, paddingRight: 20,
        background: 'var(--glass-bg, rgba(14,13,24,.96))',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--glass-border, rgba(255,255,255,.07))',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, paddingTop: 4 }}>
          <button onClick={() => router.back()} style={{
            width: 36, height: 36,
            background: 'var(--glass-bg2, rgba(255,255,255,.07))',
            border: '1px solid var(--glass-border, rgba(255,255,255,.10))',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, color: 'var(--mid)', padding: 0,
          }} aria-label="Back">
            {ICONS.back}
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', letterSpacing: '-.3px' }}>Add Schedule</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 2, color: 'var(--purple)' }}>
              {ICONS.event}
              <span style={{ fontSize: 11, fontWeight: 600 }}>{dateLabel}</span>
            </div>
          </div>
          <div style={{ width: 36 }} />
        </div>

        {holiday && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,107,138,.08)', border: '1px solid rgba(255,107,138,.22)',
            borderRadius: 10, padding: '8px 12px', marginBottom: 12,
          }}>
            {ICONS.alert}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--coral, #FF6B8A)' }}>{holiday.localName} — Public Holiday</div>
              <div style={{ fontSize: 10, color: 'var(--mid)', marginTop: 1 }}>You can still schedule — just a heads-up!</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div style={{
        flex: 1, overflowY: 'auto', overscrollBehavior: 'contain',
        padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 22,
      }}>

        {/* Title */}
        <div style={fieldWrap}>
          <label style={labelBase}>Schedule Title <span style={{ color: 'var(--purple)', fontWeight: 900 }}>*</span></label>
          <input type="text" value={title} autoFocus maxLength={100}
            onChange={e => { setTitle(e.target.value); setSaveError(null); }}
            placeholder="e.g., Team standup, Site visit, Deadline…"
            style={inputBase} />
        </div>

        {/* Date */}
        <div style={fieldWrap}>
          <label style={labelBase}>Date <span style={{ color: 'var(--purple)', fontWeight: 900 }}>*</span></label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            style={{ ...inputBase, colorScheme: 'dark' }} />
        </div>

        {/* Category */}
        <div style={fieldWrap}>
          <label style={labelBase}>Category</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {TYPES.map(t => {
              const active = type === t.value;
              return (
                <button key={t.value} type="button" onClick={() => setType(t.value)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '11px 4px 10px',
                  background: active ? t.activeBg : 'var(--glass-bg2, rgba(255,255,255,.04))',
                  border: `1.5px solid ${active ? t.color : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                  borderRadius: 12, cursor: 'pointer', transition: 'all .14s', fontFamily: 'inherit',
                  color: active ? t.color : 'var(--lite)',
                }}>
                  {ICONS[t.iconKey]}
                  <span style={{ fontSize: 10, fontWeight: 700 }}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority */}
        <div style={fieldWrap}>
          <label style={labelBase}>Priority</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {PRIORITIES.map(p => {
              const active = priority === p.value;
              return (
                <button key={p.value} type="button" onClick={() => setPriority(p.value)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  padding: '10px 4px 9px',
                  background: active ? p.bg : 'var(--glass-bg2, rgba(255,255,255,.04))',
                  border: `1.5px solid ${active ? p.color : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                  borderRadius: 12, cursor: 'pointer', transition: 'all .14s', fontFamily: 'inherit',
                  color: active ? p.color : 'var(--lite)',
                }}>
                  {ICONS[p.iconKey]}
                  <span style={{ fontSize: 10, fontWeight: 700 }}>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* All Day toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '12px 14px', background: 'var(--glass-bg2, rgba(255,255,255,.04))',
          border: '1.5px solid var(--glass-border, rgba(255,255,255,.08))', borderRadius: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: allDay ? 'var(--purple)' : 'var(--lite)' }}>{ICONS.clock}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>All Day</div>
              <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 1 }}>No specific start or end time</div>
            </div>
          </div>
          <button type="button" onClick={() => setAllDay(!allDay)} style={toggleWrap(allDay)}>
            <span style={toggleThumb(allDay)} />
          </button>
        </div>

        {/* Time picker */}
        {!allDay && (
          <div style={fieldWrap}>
            <label style={labelBase}>Time</label>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
              background: 'var(--glass-bg2, rgba(255,255,255,.05))',
              border: '1.5px solid var(--glass-border, rgba(255,255,255,.09))',
              borderRadius: 14, overflow: 'hidden',
            }}>
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.6px' }}>Start</span>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--dark)', fontSize: 18, fontWeight: 700, fontFamily: 'inherit', width: '100%', padding: 0, colorScheme: 'dark', letterSpacing: '-.3px' }} />
              </div>
              <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--glass-border, rgba(255,255,255,.09))', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--glass-bg, rgba(14,13,24,.9))', border: '1px solid var(--glass-border, rgba(255,255,255,.09))', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', zIndex: 1, color: 'var(--mid)' }}>
                  {ICONS.arrow}
                </div>
              </div>
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.6px' }}>
                  End <span style={{ fontSize: 8, fontWeight: 400, opacity: .5, textTransform: 'none', letterSpacing: 0 }}>auto</span>
                </span>
                <input type="time" value={endTime} onChange={e => { setEndTime(e.target.value); setEndTouched(true); }}
                  style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--dark)', fontSize: 18, fontWeight: 700, fontFamily: 'inherit', width: '100%', padding: 0, colorScheme: 'dark', letterSpacing: '-.3px' }} />
              </div>
            </div>
          </div>
        )}

        {/* Repeat */}
        <div style={fieldWrap}>
          <label style={labelBase}>Repeat</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {RECURRENCE_OPTIONS.map(r => {
              const active = recurrence === r.value;
              return (
                <button key={r.value} type="button" onClick={() => setRecurrence(r.value)} style={{
                  padding: '10px 6px 9px', borderRadius: 12,
                  background: active ? 'var(--pur-lt, rgba(124,106,240,.15))' : 'var(--glass-bg2, rgba(255,255,255,.04))',
                  border: `1.5px solid ${active ? 'var(--purple)' : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                  color: active ? 'var(--purple)' : 'var(--lite)',
                  fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  transition: 'all .14s',
                }}>
                  {ICONS[r.iconKey]}
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
          {recurrence === 'custom' && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--mid)', fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 8 }}>Select days</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {CUSTOM_DAYS.map((d, i) => (
                  <button key={d} type="button"
                    onClick={() => setCustomDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                    style={{
                      flex: 1, height: 36, borderRadius: 10,
                      background: customDays.includes(i) ? 'var(--purple)' : 'var(--glass-bg2, rgba(255,255,255,.05))',
                      border: `1.5px solid ${customDays.includes(i) ? 'var(--purple)' : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                      color: customDays.includes(i) ? '#fff' : 'var(--lite)',
                      fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}>{d}</button>
                ))}
              </div>
            </div>
          )}
          {recurrence !== 'none' && (
            <div style={{ marginTop: 10 }}>
              <label style={{ ...labelBase, marginBottom: 6, display: 'block' }}>
                End repeat <span style={optMark}>— optional</span>
              </label>
              <input type="date" value={recurrenceEnd} min={addDays(startDate, 1)}
                onChange={e => setRecurrenceEnd(e.target.value)}
                style={{ ...inputBase, colorScheme: 'dark' }} />
            </div>
          )}
        </div>

        {/* Reminder */}
        <div style={fieldWrap}>
          <label style={labelBase}>Reminder</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {REMINDER_OPTIONS.slice(0, 4).map(r => {
              const active = reminderMinutes === r.value;
              return (
                <button key={r.value} type="button" onClick={() => setReminderMinutes(r.value)} style={{
                  padding: '9px 4px 8px', borderRadius: 12,
                  background: active ? 'var(--pur-lt, rgba(124,106,240,.15))' : 'var(--glass-bg2, rgba(255,255,255,.04))',
                  border: `1.5px solid ${active ? 'var(--purple)' : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                  color: active ? 'var(--purple)' : 'var(--lite)',
                  fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all .14s',
                }}>
                  {r.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 8 }}>
            {REMINDER_OPTIONS.slice(4).map(r => {
              const active = reminderMinutes === r.value;
              return (
                <button key={r.value} type="button" onClick={() => setReminderMinutes(r.value)} style={{
                  padding: '9px 4px 8px', borderRadius: 12,
                  background: active ? 'var(--pur-lt, rgba(124,106,240,.15))' : 'var(--glass-bg2, rgba(255,255,255,.04))',
                  border: `1.5px solid ${active ? 'var(--purple)' : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                  color: active ? 'var(--purple)' : 'var(--lite)',
                  fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all .14s',
                }}>
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Location */}
        <div style={fieldWrap}>
          <label style={labelBase}>Location <span style={optMark}>— optional</span></label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--lite)', opacity: .6 }}>
              {ICONS.location}
            </span>
            <input type="text" value={schedLocation} maxLength={120}
              onChange={e => setSchedLocation(e.target.value)}
              placeholder="Office, Zoom, Client site…"
              style={{ ...inputBase, paddingLeft: 38 }} />
          </div>
        </div>

        {/* Timezone */}
        <div style={fieldWrap}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={labelBase}>Time Zone</label>
            <button type="button" onClick={() => setShowTzPanel(!showTzPanel)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--purple)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              {showTzPanel ? 'Hide' : 'Change'}
              <Icon d={showTzPanel ? ['M5 12l5-5 5 5'] : ['M5 8l5 5 5-5']} size={13} stroke="var(--purple)" strokeWidth={2} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'var(--glass-bg2, rgba(255,255,255,.05))', border: '1.5px solid var(--glass-border, rgba(255,255,255,.09))' }}>
            <span style={{ color: 'var(--purple)', flexShrink: 0 }}>{ICONS.globe}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tzLabel}</div>
              <div style={{ fontSize: 10, color: 'var(--mid)', marginTop: 1 }}>{tzSourceLabel}</div>
            </div>
          </div>
          {showTzPanel && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <button type="button" onClick={detectGps} disabled={gpsDetecting} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 11,
                background: tzSource === 'gps' ? 'rgba(45,212,191,.10)' : 'var(--glass-bg2, rgba(255,255,255,.04))',
                border: `1.5px solid ${tzSource === 'gps' ? 'var(--mint, #2DD4BF)' : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                color: tzSource === 'gps' ? 'var(--mint, #2DD4BF)' : 'var(--mid)',
                fontSize: 12, fontWeight: 600, cursor: gpsDetecting ? 'default' : 'pointer',
                fontFamily: 'inherit', opacity: gpsDetecting ? .6 : 1, transition: 'all .14s',
              }}>
                {ICONS.gps}
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
              <button type="button" onClick={() => setTzSource('profile')} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 11,
                background: tzSource === 'profile' ? 'var(--pur-lt, rgba(124,106,240,.12))' : 'var(--glass-bg2, rgba(255,255,255,.04))',
                border: `1.5px solid ${tzSource === 'profile' ? 'var(--purple)' : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                color: tzSource === 'profile' ? 'var(--purple)' : 'var(--mid)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .14s',
              }}>
                {ICONS.settings}
                <span>Use profile country ({COUNTRY_TIMEZONES[countryCode] || 'Browser default'})</span>
              </button>
              <div>
                <div style={{ fontSize: 10, color: 'var(--mid)', fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 6 }}>Manual override</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" value={manualTz} onChange={e => setManualTz(e.target.value)}
                    placeholder="e.g. Asia/Manila, America/New_York"
                    style={{ ...inputBase, flex: 1, fontSize: 12, padding: '9px 12px' }} />
                  <button type="button" onClick={() => { if (manualTz.trim()) setTzSource('manual'); }}
                    style={{ padding: '9px 14px', borderRadius: 10, cursor: 'pointer', background: 'var(--purple)', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', flexShrink: 0 }}>Apply</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div style={fieldWrap}>
          <label style={labelBase}>Notes <span style={optMark}>— optional</span></label>
          <textarea value={notes} rows={3} onChange={e => setNotes(e.target.value)}
            placeholder="Add details, links, or context…"
            style={{ ...inputBase, resize: 'none', lineHeight: 1.55 }} />
        </div>

        {/* AI balance check */}
        <button type="button" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px',
          background: 'var(--pur-lt, rgba(124,106,240,.10))',
          border: '1px solid rgba(124,106,240,.30)', borderRadius: 12,
          cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--purple)', fontFamily: 'inherit',
        }}>
          {ICONS.ai}
          Check Schedule Balance with AI
        </button>

        <div style={{ height: 8 }} />
      </div>

      {/* ── Pinned Footer ── */}
      <div style={{
        flexShrink: 0, padding: '12px 20px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
        borderTop: '1px solid var(--glass-border, rgba(255,255,255,.07))',
        background: 'var(--glass-bg, rgba(14,13,24,.98))',
      }}>
        {saveError && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 14px', marginBottom: 10,
            background: 'rgba(255,59,48,.10)', border: '1px solid rgba(255,59,48,.28)',
            borderRadius: 10, fontSize: 12, color: '#FF3B30', fontWeight: 600,
          }}>
            {ICONS.alert}
            <span style={{ flex: 1 }}>{saveError}</span>
          </div>
        )}
        <button type="button" onClick={handleSave} disabled={saving || !title.trim()} style={{
          width: '100%', padding: '15px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          background: title.trim() ? 'var(--gradient)' : 'var(--glass-bg2, rgba(255,255,255,.06))',
          border: 'none', borderRadius: 16,
          color: title.trim() ? '#fff' : 'var(--mid)',
          fontSize: 15, fontWeight: 800, fontFamily: 'inherit',
          cursor: title.trim() && !saving ? 'pointer' : 'default',
          letterSpacing: '-.2px',
          boxShadow: title.trim() ? '0 4px 20px rgba(124,106,240,.35)' : 'none',
          transition: 'all .18s', opacity: saving ? .7 : 1,
        }}>
          {saving ? <>{ICONS.spin} Saving…</> : <>{ICONS.check} Save Schedule</>}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
