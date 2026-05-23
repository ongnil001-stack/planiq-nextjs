'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getHolidays, findHoliday, type Holiday } from '@/lib/holidays';
import { COUNTRY_TIMEZONES } from '@/lib/countries';
import type { ScheduleType, Priority, RecurrenceRule } from '@/types/database';

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

const RECURRENCE_OPTIONS: { value: RecurrenceRule; label: string; icon: string }[] = [
  { value: 'none',    label: 'No repeat', icon: '🚫' },
  { value: 'daily',   label: 'Daily',     icon: '🔁' },
  { value: 'weekly',  label: 'Weekly',    icon: '📅' },
  { value: 'monthly', label: 'Monthly',   icon: '🗓️'  },
  { value: 'yearly',  label: 'Yearly',    icon: '🎯' },
  { value: 'custom',  label: 'Custom',    icon: '⚙️'  },
];

const CUSTOM_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_FULL    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a proper ISO string for a wall-clock time (HH:MM) on a given date (YYYY-MM-DD)
 * in a specific IANA timezone.  Uses the UTC-offset trick via Intl.DateTimeFormat so
 * the result is always correct regardless of the browser's own timezone.
 */
function buildISO(dateStr: string, timeHHMM: string, tz: string): string {
  try {
    // 1. Construct the target wall-clock as UTC (we'll adjust in step 3)
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, mi]    = timeHHMM.split(':').map(Number);
    const utcWall    = Date.UTC(y, mo - 1, d, h, mi, 0);

    // 2. Ask Intl what wall-clock that UTC point represents in `tz`
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    const parts: Record<string, string> = {};
    fmt.formatToParts(new Date(utcWall)).forEach(({ type, value }) => { parts[type] = value; });

    // 3. Compute the offset between the UTC probe and the TZ's wall-clock at that UTC point
    const formattedUTC = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      parts.hour === '24' ? 0 : Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const offsetMs = utcWall - formattedUTC;  // e.g. +8h for PH → -28800000

    // 4. The correct UTC ms for our wall-clock in `tz` is utcWall - offsetMs
    return new Date(utcWall - offsetMs).toISOString();
  } catch {
    // Safe fallback: treat dateStr+time as local
    return new Date(`${dateStr}T${timeHHMM}:00`).toISOString();
  }
}

/** Add `mins` minutes to an HH:MM string, wrapping at midnight */
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
  onClose: () => void;
  onSaved: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddScheduleSheet({ open, selectedDate, countryCode, onClose, onSaved }: Props) {
  const supabase = createClient();

  // ── form ──
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
  const [holiday,       setHoliday]       = useState<Holiday | null>(null);

  // ── timezone ──
  const [activeTimezone, setActiveTimezone] = useState('');
  const [tzSource,       setTzSource]       = useState<'profile'|'gps'|'manual'>('profile');
  const [gpsTimezone,    setGpsTimezone]    = useState<string | null>(null);
  const [gpsDetecting,   setGpsDetecting]   = useState(false);
  const [showTzPanel,    setShowTzPanel]    = useState(false);
  const [manualTz,       setManualTz]       = useState('');

  // Derive active timezone
  useEffect(() => {
    if (tzSource === 'gps' && gpsTimezone) {
      setActiveTimezone(gpsTimezone);
    } else if (tzSource === 'manual' && manualTz.trim()) {
      setActiveTimezone(manualTz.trim());
    } else {
      setActiveTimezone(
        COUNTRY_TIMEZONES[countryCode] || Intl.DateTimeFormat().resolvedOptions().timeZone
      );
    }
  }, [tzSource, gpsTimezone, countryCode, manualTz]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow    = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow    = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow    = '';
      document.body.style.touchAction = '';
    };
  }, [open]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setTitle(''); setType('task'); setPriority('medium');
      setStartTime('09:00'); setEndTime('09:30'); setEndTouched(false);
      setAllDay(false); setSchedLocation(''); setNotes('');
      setRecurrence('none'); setCustomDays([]); setRecurrenceEnd('');
      setSaving(false); setSaveError(null);
      setTzSource('profile'); setGpsTimezone(null); setManualTz(''); setShowTzPanel(false);
    }
  }, [open]);

  // Auto end-time: +30 min from start unless user touched it
  useEffect(() => {
    if (!endTouched) setEndTime(addMinutes(startTime, 30));
  }, [startTime, endTouched]);

  // Holiday lookup
  useEffect(() => {
    if (!open || !countryCode) { setHoliday(null); return; }
    getHolidays(selectedDate.getFullYear(), countryCode).then((hols) => {
      setHoliday(findHoliday(toDateStr(selectedDate), hols));
    });
  }, [open, selectedDate, countryCode]);

  // GPS detect
  const detectGps = useCallback(() => {
    if (!navigator.geolocation) { setSaveError('Geolocation not supported on this device.'); return; }
    setGpsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        // Browser already uses OS timezone which reflects physical location
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setGpsTimezone(browserTz);
        setManualTz(browserTz);
        setTzSource('gps');
        setGpsDetecting(false);
      },
      (err) => { setGpsDetecting(false); setSaveError(`GPS: ${err.message}`); },
      { timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  const dateStr   = toDateStr(selectedDate);
  const dateLabel = `${DAYS_FULL[selectedDate.getDay()]}, ${MONTHS_SHORT[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;
  const tzLabel   = activeTimezone
    ? `${activeTimezone} (${tzSource === 'gps' ? '📡 GPS' : tzSource === 'manual' ? '✏️ Manual' : '⚙️ Profile'})`
    : 'Browser default';

  // ── Save ──
  async function handleSave() {
    if (!title.trim()) { setSaveError('Please enter a schedule title.'); return; }
    setSaving(true);
    setSaveError(null);

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData.user) {
        setSaveError('Not signed in — please refresh and try again.');
        setSaving(false);
        return;
      }
      const user = authData.user;

      const tz = activeTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

      const startISO = allDay
        ? `${dateStr}T00:00:00.000Z`
        : buildISO(dateStr, startTime, tz);

      const endISO = (!allDay && endTime)
        ? buildISO(dateStr, endTime, tz)
        : null;

      // Build RRULE string (RFC 5545 subset)
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
        if (rrule && recurrenceEnd) {
          rrule += `;UNTIL=${recurrenceEnd.replace(/-/g,'')}T000000Z`;
        }
      }

      const payload = {
        user_id:         user.id,
        title:           title.trim(),
        type,
        priority,
        start_time:      startISO,
        end_time:        endISO,
        all_day:         allDay,
        location:        schedLocation.trim() || null,
        description:     notes.trim() || null,
        recurrence_rule: rrule,
        recurrence_end:  recurrenceEnd || null,
        timezone:        tz,
      };

      const { error: insertErr } = await supabase.from('schedules').insert(payload);

      if (insertErr) {
        // Show the real DB error message so it's diagnosable
        setSaveError(`Database error: ${insertErr.message}`);
        setSaving(false);
        return;
      }

      setSaving(false);
      onSaved();
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
      <div
        style={{ position:'fixed', inset:0, zIndex:1000,
          background:'rgba(0,0,0,.50)',
          backdropFilter:'blur(3px)', WebkitBackdropFilter:'blur(3px)',
          animation:'modalOverlayIn .22s ease',
          touchAction:'none', overscrollBehavior:'contain' }}
        onClick={onClose}
      />

      {/* Modal panel */}
      <div style={{
        position:'fixed', top:0, left:0, right:0, bottom:'48px',
        zIndex:1001, display:'flex', flexDirection:'column',
        background:'var(--glass-bg, rgba(14,13,24,0.96))',
        backdropFilter:'var(--glass-blur, blur(28px))',
        WebkitBackdropFilter:'var(--glass-blur, blur(28px))',
        borderBottom:'1px solid var(--glass-border2, rgba(255,255,255,.12))',
        borderRadius:'0 0 24px 24px',
        boxShadow:'0 12px 60px rgba(0,0,0,.50)',
        animation:'modalSlideDown .30s cubic-bezier(.22,.8,.32,1)',
        overflow:'hidden',
      }}>

        {/* ── Pinned Header ── */}
        <div style={{
          flexShrink:0,
          paddingTop:'max(env(safe-area-inset-top, 0px), 52px)',
          paddingLeft:'20px',
          paddingRight:'20px',
          paddingBottom:0,
          background:'var(--glass-bg, rgba(14,13,24,.98))',
          backdropFilter:'var(--glass-blur, blur(28px))',
          WebkitBackdropFilter:'var(--glass-blur, blur(28px))',
          borderBottom:'1px solid var(--glass-border, rgba(255,255,255,.07))',
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:12, paddingTop:4 }}>
            <div>
              <div style={{ fontSize:18, fontWeight:800, color:'var(--dark)', letterSpacing:'-.3px' }}>Add Schedule</div>
              <div style={{ fontSize:12, color:'var(--purple)', fontWeight:600, marginTop:2 }}>📆 {dateLabel}</div>
            </div>
            <button onClick={onClose} style={closeBtn}>×</button>
          </div>
          {holiday && (
            <div style={{ display:'flex', alignItems:'center', gap:10,
              background:'rgba(255,107,107,.10)', border:'1px solid rgba(255,107,107,.25)',
              borderRadius:10, padding:'8px 12px', marginBottom:12 }}>
              <span style={{ fontSize:16 }}>🎌</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#FF6B8A' }}>{holiday.localName}</div>
                <div style={{ fontSize:10, color:'var(--mid)', marginTop:1 }}>Public holiday — you can still schedule!</div>
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
              {TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setType(t.value)} style={{
                  display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'11px 4px',
                  background: type === t.value ? t.color+'22' : 'var(--glass-bg2, rgba(255,255,255,.04))',
                  border:`1.5px solid ${type === t.value ? t.color : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                  borderRadius:12, cursor:'pointer', transition:'all .14s', fontFamily:'inherit',
                }}>
                  <span style={{ fontSize:20 }}>{t.icon}</span>
                  <span style={{ fontSize:10, fontWeight:700, color: type === t.value ? t.color : 'var(--mid)' }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Priority</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {PRIORITIES.map(p => (
                <button key={p.value} type="button"
                  onClick={() => { setPriority(p.value); setSaveError(null); }} style={{
                  padding:'10px 4px',
                  background: priority === p.value ? p.bg : 'var(--glass-bg2, rgba(255,255,255,.04))',
                  border:`1.5px solid ${priority === p.value ? p.color : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                  borderRadius:12, cursor:'pointer', fontSize:11, fontWeight:700,
                  color: priority === p.value ? p.color : 'var(--mid)',
                  transition:'all .14s', fontFamily:'inherit',
                }}>{p.label}</button>
              ))}
            </div>
          </div>

          {/* All Day */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--dark)' }}>All Day</div>
              <div style={{ fontSize:11, color:'var(--mid)', marginTop:2 }}>No specific start or end time</div>
            </div>
            <button type="button" onClick={() => setAllDay(!allDay)} style={toggleWrap(allDay)}>
              <span style={toggleThumb(allDay)} />
            </button>
          </div>

          {/* Time pickers */}
          {!allDay && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={fieldWrap}>
                <label style={labelStyle}>Start Time</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} />
              </div>
              <div style={fieldWrap}>
                <label style={labelStyle}>
                  End Time <span style={{ fontWeight:400, opacity:.5, textTransform:'none', letterSpacing:0, fontSize:9 }}>auto +30 min</span>
                </label>
                <input type="time" value={endTime}
                  onChange={e => { setEndTime(e.target.value); setEndTouched(true); }}
                  style={inputStyle} />
              </div>
            </div>
          )}

          {/* Recurrence */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Repeat</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {RECURRENCE_OPTIONS.map(r => (
                <button key={r.value} type="button" onClick={() => setRecurrence(r.value)} style={{
                  padding:'7px 11px', borderRadius:10,
                  background: recurrence === r.value ? 'var(--pur-lt, rgba(124,106,240,.15))' : 'var(--glass-bg2, rgba(255,255,255,.04))',
                  border:`1.5px solid ${recurrence === r.value ? 'var(--purple)' : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                  color: recurrence === r.value ? 'var(--purple)' : 'var(--mid)',
                  fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  display:'flex', alignItems:'center', gap:5, transition:'all .14s',
                }}>
                  <span>{r.icon}</span>{r.label}
                </button>
              ))}
            </div>

            {/* Custom days picker */}
            {recurrence === 'custom' && (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:11, color:'var(--mid)', fontWeight:600, marginBottom:6 }}>Select days:</div>
                <div style={{ display:'flex', gap:6 }}>
                  {CUSTOM_DAYS.map((d, i) => (
                    <button key={d} type="button"
                      onClick={() => setCustomDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                      style={{
                        width:36, height:36, borderRadius:10,
                        background: customDays.includes(i) ? 'var(--purple)' : 'var(--glass-bg2, rgba(255,255,255,.05))',
                        border:`1.5px solid ${customDays.includes(i) ? 'var(--purple)' : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                        color: customDays.includes(i) ? '#fff' : 'var(--mid)',
                        fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                      }}>{d}</button>
                  ))}
                </div>
              </div>
            )}

            {/* End date for recurrence */}
            {recurrence !== 'none' && (
              <div style={{ marginTop:10 }}>
                <label style={{ ...labelStyle, marginBottom:6, display:'block' }}>
                  End repeat <span style={{ fontWeight:400, opacity:.5, textTransform:'none', letterSpacing:0 }}>— optional</span>
                </label>
                <input type="date" value={recurrenceEnd} min={addDays(dateStr, 1)}
                  onChange={e => setRecurrenceEnd(e.target.value)}
                  style={{ ...inputStyle, colorScheme:'dark' as const }} />
              </div>
            )}
          </div>

          {/* Location */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Location <span style={{ fontWeight:400, opacity:.5, textTransform:'none', letterSpacing:0 }}>— optional</span></label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:14, pointerEvents:'none', opacity:.5 }}>📍</span>
              <input type="text" value={schedLocation} maxLength={120}
                onChange={e => setSchedLocation(e.target.value)}
                placeholder="Office, Zoom, Client site…"
                style={{ ...inputStyle, paddingLeft:36 }} />
            </div>
          </div>

          {/* Timezone */}
          <div style={fieldWrap}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
              <label style={labelStyle}>Time Zone</label>
              <button type="button" onClick={() => setShowTzPanel(!showTzPanel)}
                style={{ fontSize:11, color:'var(--purple)', fontWeight:700, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                {showTzPanel ? 'Hide ▲' : 'Change ▼'}
              </button>
            </div>
            <div style={{ padding:'10px 14px', borderRadius:10,
              background:'var(--glass-bg2, rgba(255,255,255,.05))',
              border:'1.5px solid var(--glass-border, rgba(255,255,255,.09))',
              fontSize:12, color:'var(--dark)', fontWeight:500 }}>
              🌐 {tzLabel}
            </div>

            {showTzPanel && (
              <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
                {/* GPS */}
                <button type="button" onClick={detectGps} disabled={gpsDetecting} style={{
                  padding:'10px 14px', borderRadius:10,
                  background: tzSource === 'gps' ? 'rgba(45,212,191,.12)' : 'var(--glass-bg2, rgba(255,255,255,.04))',
                  border:`1.5px solid ${tzSource === 'gps' ? '#2DD4BF' : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                  color: tzSource === 'gps' ? '#2DD4BF' : 'var(--mid)',
                  fontSize:12, fontWeight:700, cursor: gpsDetecting ? 'default' : 'pointer',
                  fontFamily:'inherit', display:'flex', alignItems:'center', gap:8, opacity: gpsDetecting ? .6 : 1,
                }}>
                  <span>📡</span>
                  {gpsDetecting ? 'Detecting…' : tzSource === 'gps' ? `GPS: ${gpsTimezone}` : 'Auto-detect via GPS'}
                </button>

                {/* Profile TZ */}
                <button type="button" onClick={() => setTzSource('profile')} style={{
                  padding:'10px 14px', borderRadius:10,
                  background: tzSource === 'profile' ? 'var(--pur-lt, rgba(124,106,240,.12))' : 'var(--glass-bg2, rgba(255,255,255,.04))',
                  border:`1.5px solid ${tzSource === 'profile' ? 'var(--purple)' : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                  color: tzSource === 'profile' ? 'var(--purple)' : 'var(--mid)',
                  fontSize:12, fontWeight:700, cursor:'pointer',
                  fontFamily:'inherit', display:'flex', alignItems:'center', gap:8,
                }}>
                  <span>⚙️</span>Use profile country ({COUNTRY_TIMEZONES[countryCode] || 'Browser default'})
                </button>

                {/* Manual override */}
                <div>
                  <div style={{ fontSize:11, color:'var(--mid)', fontWeight:600, marginBottom:6 }}>✏️ Manual IANA timezone:</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <input type="text" value={manualTz}
                      onChange={e => setManualTz(e.target.value)}
                      placeholder="e.g. Asia/Manila, America/New_York"
                      style={{ ...inputStyle, flex:1, fontSize:12, padding:'9px 12px' }} />
                    <button type="button"
                      onClick={() => { if (manualTz.trim()) setTzSource('manual'); }}
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
            <label style={labelStyle}>Notes <span style={{ fontWeight:400, opacity:.5, textTransform:'none', letterSpacing:0 }}>— optional</span></label>
            <textarea value={notes} rows={3}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add details, links, or reminders…"
              style={{ ...inputStyle, resize:'none', lineHeight:1.55 }} />
          </div>

          {/* AI check */}
          <button type="button" style={aiBtn}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1L9.18 5.23L13.5 5.64L10.35 8.38L11.3 12.5L7.5 10.27L3.7 12.5L4.65 8.38L1.5 5.64L5.82 5.23L7.5 1Z"
                stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
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

          {saveError && (
            <div style={{ padding:'9px 14px', marginBottom:10,
              background:'rgba(255,59,48,.12)', border:'1px solid rgba(255,59,48,.30)',
              borderRadius:10, fontSize:12, color:'#FF3B30', fontWeight:600 }}>
              ⚠️ {saveError}
            </div>
          )}

          <button type="button" onClick={handleSave} disabled={saving || !title.trim()} style={{
            width:'100%', padding:'15px 0',
            background: title.trim() ? 'var(--gradient)' : 'var(--glass-bg2, rgba(255,255,255,.06))',
            border:'none', borderRadius:16,
            color: title.trim() ? '#fff' : 'var(--mid)',
            fontSize:15, fontWeight:800, fontFamily:'inherit',
            cursor: title.trim() && !saving ? 'pointer' : 'default',
            letterSpacing:'-.2px',
            boxShadow: title.trim() ? '0 4px 20px rgba(124,106,240,.35)' : 'none',
            transition:'all .18s', opacity: saving ? .7 : 1,
          }}>
            {saving ? '⟳  Saving…' : '✓  Save Schedule'}
          </button>
        </div>
      </div>

      {/* Dismiss strip */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, height:48, zIndex:1002,
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', animation:'modalOverlayIn .30s ease' }}
        onClick={onClose}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4,
          color:'rgba(255,255,255,.45)', userSelect:'none' }}>
          <span style={{ width:36, height:4, background:'rgba(255,255,255,.25)', borderRadius:2, display:'block' }} />
          <span style={{ fontSize:10, opacity:.7 }}>tap to dismiss</span>
        </div>
      </div>

      <style>{`
        @keyframes modalOverlayIn { from{opacity:0} to{opacity:1} }
        @keyframes modalSlideDown {
          from { transform:translateY(-100%); opacity:0; }
          to   { transform:translateY(0);     opacity:1; }
        }
        input[type="time"]::-webkit-calendar-picker-indicator,
        input[type="date"]::-webkit-calendar-picker-indicator { filter:invert(0.5); }
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

const closeBtn: React.CSSProperties = {
  width:34, height:34,
  background:'var(--glass-bg2, rgba(255,255,255,.07))',
  border:'1px solid var(--glass-border, rgba(255,255,255,.10))',
  borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
  color:'var(--mid)', cursor:'pointer', fontSize:20, lineHeight:'1',
  flexShrink:0, fontFamily:'inherit',
};

const toggleWrap = (on: boolean): React.CSSProperties => ({
  width:46, height:27,
  background: on ? 'var(--purple)' : 'var(--glass-bg2, rgba(255,255,255,.08))',
  border:'1px solid var(--glass-border, rgba(255,255,255,.12))',
  borderRadius:14, cursor:'pointer', padding:0,
  position:'relative', transition:'background .2s', flexShrink:0,
  fontFamily:'inherit',
});

const toggleThumb = (on: boolean): React.CSSProperties => ({
  position:'absolute', top:3, left: on ? 22 : 3,
  width:21, height:21, background:'#fff', borderRadius:'50%',
  transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.30)',
});

const aiBtn: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
  padding:'12px 16px',
  background:'var(--pur-lt, rgba(124,106,240,.10))',
  border:'1px solid rgba(124,106,240,.35)',
  borderRadius:12, cursor:'pointer',
  fontSize:13, fontWeight:600, color:'var(--purple)', fontFamily:'inherit',
};
