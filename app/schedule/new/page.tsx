'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { getHolidays, findHoliday, type Holiday } from '@/lib/holidays';
import type { ScheduleType, Priority } from '@/types/database';
import BottomNav from '@/components/layout/BottomNav';

const TYPES: { value: ScheduleType; icon: string; label: string }[] = [
  { value: 'task',     icon: '✅', label: 'Task' },
  { value: 'event',    icon: '📅', label: 'Event' },
  { value: 'reminder', icon: '🔔', label: 'Reminder' },
  { value: 'block',    icon: '🚫', label: 'Focus Block' },
];

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'high',   label: 'High',   color: '#FF6B8A' },
  { value: 'medium', label: 'Medium', color: '#FDCB6E' },
  { value: 'low',    label: 'Low',    color: '#00D67E' },
];

export default function AddSchedulePage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle]         = useState('');
  const [description, setDesc]    = useState('');
  const [type, setType]           = useState<ScheduleType>('task');
  const [priority, setPriority]   = useState<Priority>('medium');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime]     = useState('');
  const [allDay, setAllDay]         = useState(false);

  const [saving, setSaving]         = useState(false);
  const [holidayWarning, setHolidayWarning] = useState<Holiday | null>(null);
  const [countryCode, setCountryCode]       = useState('');
  const [holidays, setHolidays]             = useState<Holiday[]>([]);

  // Load user's country on mount
  useEffect(() => {
    async function loadCountry() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('country_code').eq('id', user.id).single();
      setCountryCode(data?.country_code || '');
    }
    loadCountry();
  }, []);

  // Check holiday when date or country changes
  useEffect(() => {
    async function checkHoliday() {
      if (!startDate || !countryCode) { setHolidayWarning(null); return; }
      const year = parseInt(startDate.split('-')[0]);
      let hols = holidays;
      if (hols.length === 0 || (hols[0] && hols[0].countryCode?.toUpperCase() !== countryCode.toUpperCase())) {
        hols = await getHolidays(year, countryCode);
        setHolidays(hols);
      }
      const h = findHoliday(startDate, hols);
      setHolidayWarning(h);
    }
    checkHoliday();
  }, [startDate, countryCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) { toast.error('Please select a date.'); return; }
    if (!allDay && !startTime) { toast.error('Please select a start time.'); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const startISO = allDay
      ? new Date(`${startDate}T00:00:00`).toISOString()
      : new Date(`${startDate}T${startTime}`).toISOString();

    const endISO = endTime
      ? new Date(`${startDate}T${endTime}`).toISOString()
      : null;

    const { error } = await supabase.from('schedules').insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      type,
      priority,
      start_time: startISO,
      end_time: endISO,
      all_day: allDay,
    });

    setSaving(false);
    if (error) {
      toast.error(`Save failed: ${error.message} (${error.code})`);
    } else {
      toast.success('Schedule added!');
      router.push('/dashboard');
    }
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="pg-header">
        <button className="back-btn" onClick={() => router.back()}>←</button>
        <h1 className="pg-title">Add Schedule</h1>
        <div style={{ width: 36 }} />
      </div>

      <form onSubmit={handleSubmit} className="form">
        {/* Title */}
        <div className="field">
          <label className="flabel">Title *</label>
          <input
            type="text"
            className="finput"
            placeholder="e.g., Team standup"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
          />
        </div>

        {/* Type */}
        <div className="field">
          <label className="flabel">Type</label>
          <div className="type-grid">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`type-btn ${type === t.value ? 'on' : ''}`}
                onClick={() => setType(t.value)}
              >
                <span className="type-icon">{t.icon}</span>
                <span className="type-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="field">
          <label className="flabel">Priority</label>
          <div className="pri-row">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`pri-btn ${priority === p.value ? 'on' : ''}`}
                style={priority === p.value ? { borderColor: p.color, color: p.color, background: p.color + '22' } : {}}
                onClick={() => setPriority(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div className="field">
          <label className="flabel">Date *</label>
          <input
            type="date"
            className="finput"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        {/* Holiday warning */}
        {holidayWarning && (
          <div className="holiday-warn">
            <span className="hw-icon">🎌</span>
            <div className="hw-text">
              <div className="hw-title">{holidayWarning.localName} — Public Holiday</div>
              <div className="hw-sub">You can still schedule. Just a heads-up!</div>
            </div>
          </div>
        )}

        {/* All day toggle */}
        <div className="field toggle-row">
          <label className="flabel">All Day</label>
          <button
            type="button"
            className={`toggle ${allDay ? 'on' : ''}`}
            onClick={() => setAllDay(!allDay)}
          >
            <span className="toggle-knob" />
          </button>
        </div>

        {!allDay && (
          <div className="time-row">
            <div className="field" style={{ flex: 1 }}>
              <label className="flabel">Start Time</label>
              <input type="time" className="finput" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="flabel">End Time</label>
              <input type="time" className="finput" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
        )}

        {/* Description */}
        <div className="field">
          <label className="flabel">Notes (optional)</label>
          <textarea
            className="finput"
            placeholder="Add any notes or details…"
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            style={{ resize: 'none' }}
          />
        </div>

        <button type="submit" className="submit-btn" disabled={saving}>
          {saving ? '⟳ Saving…' : '✓ Save Schedule'}
        </button>
      </form>

      <BottomNav />

      <style jsx>{`
        .page { min-height:100vh; background:var(--bg); font-family:inherit; color:var(--dark); }
        .pg-header { padding:52px 20px 14px; display:flex; align-items:center; gap:12px; background:var(--glass-bg, var(--surf)); backdrop-filter:var(--glass-blur, blur(18px)); -webkit-backdrop-filter:var(--glass-blur, blur(18px)); border-bottom:1px solid var(--glass-border, var(--border)); }
        .back-btn { background:none; border:none; color:var(--mid); font-size:24px; cursor:pointer; padding:4px; line-height:1; }
        .pg-title { font-size:20px; font-weight:800; color:var(--dark); }
        .form-body { padding:18px 18px 100px; display:flex; flex-direction:column; gap:16px; }
        .field { display:flex; flex-direction:column; gap:6px; }
        .label { font-size:12px; font-weight:700; color:var(--mid); text-transform:uppercase; letter-spacing:.6px; }
        input, textarea, select {
          background:var(--glass-bg2, var(--surf)); border:1.5px solid var(--glass-border2, var(--border2));
          backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
          border-radius:var(--rsm); padding:13px 14px;
          font-size:15px; color:var(--dark); font-family:inherit;
          transition:border-color .18s; width:100%; color-scheme:dark;
          outline:none;
        }
        input::placeholder, textarea::placeholder { color:var(--lite); }
        input:focus, textarea:focus, select { border-color:var(--purple); }
        select option { background:var(--surf2); color:var(--dark); }
        textarea { resize:vertical; min-height:80px; }
        .row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .type-grid { display:flex; flex-wrap:wrap; gap:8px; }
        .type-btn {
          padding:8px 14px; border-radius:var(--rxs);
          border:1.5px solid var(--border2); background:var(--surf);
          color:var(--mid); font-size:13px; font-weight:600;
          cursor:pointer; font-family:inherit; transition:all .15s;
        }
        .type-btn.on { background:var(--pur-lt); border-color:var(--purple); color:var(--purple); }
        .pri-row { display:flex; gap:8px; }
        .pri-btn {
          flex:1; padding:10px 6px; border-radius:var(--rxs);
          border:1.5px solid var(--border2); background:var(--surf);
          font-size:12px; font-weight:700; cursor:pointer;
          font-family:inherit; transition:all .15s; text-align:center;
        }
        .pri-btn.high.on   { background:var(--coral-lt); border-color:var(--coral); color:var(--coral); }
        .pri-btn.medium.on { background:var(--amber-lt); border-color:var(--amber); color:var(--amber); }
        .pri-btn.low.on    { background:var(--mint-lt); border-color:var(--mint); color:var(--mint); }
        .submit-btn {
          padding:16px; background:var(--gradient); border:none;
          border-radius:var(--rmd); color:#fff; font-size:16px; font-weight:700;
          font-family:inherit; cursor:pointer; transition:opacity .18s;
          box-shadow:var(--card-sh);
        }
        .submit-btn:active { opacity:.85; }
        .submit-btn:disabled { opacity:.5; cursor:not-allowed; }
      `}</style>
    </div>
  );
}
