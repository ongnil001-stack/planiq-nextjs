'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
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
  const [allDay, setAllDay]       = useState(false);
  const [saving, setSaving]       = useState(false);

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
        .page { min-height: 100vh; background: #0B0D1A; font-family: 'Sora', sans-serif; color: #fff; }
        .pg-header {
          padding: 52px 20px 16px;
          display: flex; align-items: center; justify-content: space-between;
          background: #161829; border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .back-btn { background: rgba(255,255,255,0.07); border: none; font-size: 20px; color: #fff; cursor: pointer; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-family: inherit; }
        .pg-title { font-size: 18px; font-weight: 800; color: #fff; }
        .form { padding: 20px 18px 100px; display: flex; flex-direction: column; gap: 18px; max-width: 480px; margin: 0 auto; }
        .field { display: flex; flex-direction: column; gap: 7px; }
        .flabel { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: .8px; }
        .finput {
          padding: 13px 14px;
          background: #161829; border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 12px; color: #fff; font-size: 15px;
          font-family: inherit; outline: none; transition: border-color .18s; width: 100%;
          color-scheme: dark;
        }
        .finput::placeholder { color: rgba(255,255,255,0.25); }
        .finput:focus { border-color: #7C6AF0; }
        .type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .type-btn {
          background: #161829; border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 12px 4px;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          cursor: pointer; transition: all .18s; font-family: inherit;
        }
        .type-btn.on { background: rgba(124,106,240,0.18); border-color: #7C6AF0; }
        .type-icon { font-size: 20px; }
        .type-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); }
        .type-btn.on .type-label { color: #A78BFA; }
        .pri-row { display: flex; gap: 8px; }
        .pri-btn {
          flex: 1; padding: 11px; border-radius: 10px;
          border: 1.5px solid rgba(255,255,255,0.1); background: #161829;
          text-align: center; cursor: pointer; font-size: 13px; font-weight: 700;
          color: rgba(255,255,255,0.4); transition: all .18s; font-family: inherit;
        }
        .toggle-row { flex-direction: row; align-items: center; justify-content: space-between; }
        .toggle {
          width: 48px; height: 28px; border-radius: 100px;
          background: rgba(255,255,255,0.12); border: none; cursor: pointer;
          position: relative; transition: background .2s;
          display: flex; align-items: center; padding: 3px;
        }
        .toggle.on { background: #7C6AF0; }
        .toggle-knob {
          width: 22px; height: 22px; border-radius: 50%; background: #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,.3);
          transition: transform .2s; display: block;
        }
        .toggle.on .toggle-knob { transform: translateX(20px); }
        .time-row { display: flex; gap: 12px; }
        .submit-btn {
          width: 100%; padding: 16px; font-size: 16px; font-weight: 700;
          background: linear-gradient(135deg, #6C5CE7, #A78BFA);
          border: none; border-radius: 14px; color: #fff;
          font-family: inherit; cursor: pointer;
          box-shadow: 0 8px 24px rgba(108,92,231,0.45);
          transition: transform .15s; margin-top: 4px;
        }
        .submit-btn:active { transform: scale(0.97); }
        .submit-btn:disabled { opacity: 0.6; }
      `}</style>
    </div>
  );
}
