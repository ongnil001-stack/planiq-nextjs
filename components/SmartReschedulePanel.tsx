'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Optimization {
  schedule_id: string;
  schedule_title: string;
  current_day: string;
  current_time: string;
  current_date: string;
  suggested_day: string;
  suggested_time: string;
  suggested_date: string;
  reason: string;
  impact: string;
  confidence: 'high' | 'medium' | 'low';
}

interface RescheduleResult {
  optimizations: Optimization[];
  summary: string;
}

interface ExistingSchedule {
  id: string;
  title: string;
  type: string;
  priority: string;
  start_time: string;
  end_time: string | null;
  all_day: boolean;
  is_completed: boolean;
}

interface Props {
  schedules: ExistingSchedule[];
  onApplied: () => void; // called after any change so parent can refresh
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CONF: Record<string, { color: string; label: string }> = {
  high:   { color: '#00C896', label: 'High confidence' },
  medium: { color: '#FDCB6E', label: 'Medium confidence' },
  low:    { color: '#FF9F43', label: 'Low confidence' },
};

function fmt12(time24: string) {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SmartReschedulePanel({ schedules, onApplied }: Props) {
  const [result,    setResult]    = useState<RescheduleResult | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [applying,  setApplying]  = useState<string | null>(null);  // schedule_id being applied
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [applied,   setApplied]   = useState<Set<string>>(new Set());
  const [error,     setError]     = useState<string | null>(null);
  // edit mode: store overridden suggested time per schedule_id
  const [editMode,  setEditMode]  = useState<string | null>(null);
  const [editTime,  setEditTime]  = useState('');
  const [editDate,  setEditDate]  = useState('');

  const run = useCallback(async () => {
    if (!schedules.length) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setDismissed(new Set<string>());
    setApplied(new Set<string>());

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-schedule`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            action: 'reschedule_suggest',
            schedules: schedules.filter(s => !s.is_completed).map(s => ({
              id: s.id, title: s.title, type: s.type, priority: s.priority,
              start_time: s.start_time, end_time: s.end_time,
              all_day: s.all_day ?? false, is_completed: s.is_completed,
            })),
          }),
        }
      );
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json() as RescheduleResult;
      setResult(data);
    } catch (err) {
      setError('Could not generate suggestions. Check your connection.');
      console.warn('SmartReschedule error:', err);
    } finally {
      setLoading(false);
    }
  }, [schedules]);

  async function applyMove(opt: Optimization, overrideTime?: string, overrideDate?: string) {
    setApplying(opt.schedule_id);
    const supabase = createClient();

    const useDate = overrideDate || opt.suggested_date;
    const useTime = overrideTime || opt.suggested_time;

    // Find the original item to preserve duration
    const orig = schedules.find(s => s.id === opt.schedule_id);
    let endISO: string | null = null;
    if (orig?.end_time && orig?.start_time) {
      const dur = new Date(orig.end_time).getTime() - new Date(orig.start_time).getTime();
      const newStart = new Date(`${useDate}T${useTime}:00`);
      endISO = new Date(newStart.getTime() + dur).toISOString();
    }

    const newStartISO = new Date(`${useDate}T${useTime}:00`).toISOString();

    const { error: dbErr } = await supabase.from('schedules')
      .update({ start_time: newStartISO, ...(endISO ? { end_time: endISO } : {}) })
      .eq('id', opt.schedule_id);

    if (dbErr) {
      setError(`Could not apply: ${dbErr.message}`);
    } else {
      setApplied(prev => new Set(Array.from(prev).concat(opt.schedule_id)));
      setEditMode(null);
      onApplied();
    }
    setApplying(null);
  }

  const activeOpts = result?.optimizations.filter(
    o => !dismissed.has(o.schedule_id) && !applied.has(o.schedule_id)
  ) ?? [];
  const appliedCount = applied.size;

  // ── Styles ───────────────────────────────────────────────────────────────────
  const WRAP: React.CSSProperties = {
    background: 'var(--glass-bg, var(--surf))',
    border: '1px solid var(--glass-border, rgba(255,255,255,.09))',
    borderRadius: 18, overflow: 'hidden',
  };
  const HEADER: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
    borderBottom: '1px solid var(--border, rgba(255,255,255,.07))',
  };
  const RUN_BTN: React.CSSProperties = {
    marginLeft: 'auto', flexShrink: 0,
    padding: '7px 14px', borderRadius: 12,
    background: loading ? 'rgba(124,106,240,.18)' : 'var(--gradient)',
    border: 'none', color: '#fff',
    fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
    cursor: loading ? 'default' : 'pointer',
    boxShadow: loading ? 'none' : '0 3px 12px rgba(124,106,240,.35)',
    display: 'flex', alignItems: 'center', gap: 6,
    WebkitTapHighlightColor: 'transparent',
  };

  return (
    <div style={WRAP}>
      {/* Header */}
      <div style={HEADER}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(124,106,240,.25), rgba(0,198,255,.20))',
          border: '1px solid rgba(124,106,240,.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>🔀</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--dark)' }}>Smart Reschedule</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--mid)', marginTop: 1 }}>
            {result
              ? result.optimizations.length === 0
                ? 'Schedule looks balanced ✓'
                : `${result.optimizations.length} move${result.optimizations.length !== 1 ? 's' : ''} suggested${appliedCount > 0 ? ` · ${appliedCount} applied` : ''}`
              : 'AI-powered schedule optimizer'}
          </p>
        </div>
        <button style={RUN_BTN} onClick={run} disabled={loading}>
          {loading ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"
                strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M4 12H2m2 0l2-2M20 12h2m-2 0l-2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
          {loading ? 'Analyzing…' : result ? '↻ Re-run' : 'Optimize'}
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '0 4px 4px' }}>

        {/* Loading state */}
        {loading && (
          <div style={{ padding: '20px 12px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--mid)', fontWeight: 600 }}>
              Claude is reviewing your schedule…
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ padding: '10px 12px' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#FF9F43' }}>{error}</p>
          </div>
        )}

        {/* Summary */}
        {result && !loading && result.summary && (
          <div style={{ padding: '10px 12px 4px' }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--mid)', fontStyle: 'italic', lineHeight: 1.5 }}>
              {result.summary}
            </p>
          </div>
        )}

        {/* Optimization cards */}
        {!loading && activeOpts.map((opt, i) => {
          const conf = CONF[opt.confidence] ?? CONF.medium;
          const isApplying = applying === opt.schedule_id;
          const isEditing  = editMode === opt.schedule_id;

          return (
            <div key={opt.schedule_id} style={{
              margin: '8px 8px 0',
              background: 'var(--surf2, rgba(255,255,255,.04))',
              border: '1px solid var(--border, rgba(255,255,255,.08))',
              borderRadius: 14, overflow: 'hidden',
            }}>
              {/* Card header */}
              <div style={{ padding: '12px 14px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Item number + confidence */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--pur-lt, rgba(124,106,240,.18))',
                        color: 'var(--purple)', fontSize: 10, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{i + 1}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: conf.color, letterSpacing: '.3px' }}>
                        {conf.label}
                      </span>
                    </div>

                    {/* Title */}
                    <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: 'var(--dark)', lineHeight: 1.3 }}>
                      {opt.schedule_title}
                    </p>

                    {/* Move arrow */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 10,
                      background: 'var(--glass-bg2, rgba(255,255,255,.04))',
                      border: '1px solid var(--border, rgba(255,255,255,.07))',
                      marginBottom: 8,
                    }}>
                      {/* From */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--lite)', fontWeight: 700, letterSpacing: '.3px', textTransform: 'uppercase' }}>From</p>
                        <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#FF6B8A' }}>
                          {opt.current_day}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--mid)' }}>{fmt12(opt.current_time)}</p>
                      </div>

                      {/* Arrow */}
                      <div style={{ flexShrink: 0, color: 'var(--purple)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12H19M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>

                      {/* To */}
                      <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--lite)', fontWeight: 700, letterSpacing: '.3px', textTransform: 'uppercase' }}>To</p>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                            <input type="date" value={editDate}
                              onChange={e => setEditDate(e.target.value)}
                              style={{
                                width: '100%', padding: '3px 6px', borderRadius: 6,
                                border: '1px solid rgba(124,106,240,.40)',
                                background: 'var(--surf, #131424)', color: 'var(--dark)',
                                fontSize: 11, fontFamily: 'inherit', outline: 'none',
                              }} />
                            <input type="time" value={editTime}
                              onChange={e => setEditTime(e.target.value)}
                              style={{
                                width: '100%', padding: '3px 6px', borderRadius: 6,
                                border: '1px solid rgba(124,106,240,.40)',
                                background: 'var(--surf, #131424)', color: 'var(--dark)',
                                fontSize: 11, fontFamily: 'inherit', outline: 'none',
                              }} />
                          </div>
                        ) : (
                          <>
                            <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#00C896' }}>
                              {opt.suggested_day}
                            </p>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--mid)' }}>{fmt12(opt.suggested_time)}</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Reason */}
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--mid)', lineHeight: 1.5 }}>
                      {opt.reason}
                    </p>

                    {/* Impact chip */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 20,
                      background: 'rgba(0,200,150,.10)', border: '1px solid rgba(0,200,150,.22)',
                      fontSize: 10, fontWeight: 700, color: '#00C896',
                    }}>
                      ✓ {opt.impact}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isEditing ? '1fr 1fr' : '1fr 1fr 1fr',
                borderTop: '1px solid var(--border, rgba(255,255,255,.07))',
              }}>
                {/* Apply / Confirm */}
                <button
                  onClick={() => {
                    if (isEditing) applyMove(opt, editTime, editDate);
                    else applyMove(opt);
                  }}
                  disabled={!!applying || (isEditing && (!editTime || !editDate))}
                  style={{
                    padding: '11px 0', border: 'none', borderRight: '1px solid var(--border, rgba(255,255,255,.07))',
                    background: 'transparent',
                    color: isApplying ? 'var(--lite)' : '#00C896',
                    fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                    cursor: applying ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                  {isApplying ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                      style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"
                        strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12L10 17L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {isEditing ? 'Confirm' : 'Apply'}
                </button>

                {/* Edit / Cancel edit */}
                <button
                  onClick={() => {
                    if (isEditing) { setEditMode(null); }
                    else {
                      setEditMode(opt.schedule_id);
                      setEditTime(opt.suggested_time);
                      setEditDate(opt.suggested_date);
                    }
                  }}
                  style={{
                    padding: '11px 0', border: 'none',
                    borderRight: isEditing ? 'none' : '1px solid var(--border, rgba(255,255,255,.07))',
                    background: 'transparent',
                    color: isEditing ? 'var(--lite)' : 'var(--purple)',
                    fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                  {isEditing ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                      </svg>
                      Cancel
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Edit
                    </>
                  )}
                </button>

                {/* Skip — hidden in edit mode */}
                {!isEditing && (
                  <button
                    onClick={() => setDismissed(prev => new Set(Array.from(prev).concat(opt.schedule_id)))}
                    style={{
                      padding: '11px 0', border: 'none', background: 'transparent',
                      color: 'var(--lite)', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      WebkitTapHighlightColor: 'transparent',
                    }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Skip
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Applied confirmations */}
        {Array.from(applied).map(id => {
          const opt = result?.optimizations.find(o => o.schedule_id === id);
          if (!opt) return null;
          return (
            <div key={`applied-${id}`} style={{
              margin: '8px 8px 0', padding: '10px 14px',
              background: 'rgba(0,200,150,.08)',
              border: '1px solid rgba(0,200,150,.25)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" stroke="#00C896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#00C896' }}>Move applied</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.schedule_title} → {opt.suggested_day} {fmt12(opt.suggested_time)}
                </p>
              </div>
            </div>
          );
        })}

        {/* All done / empty state */}
        {!loading && result && activeOpts.length === 0 && result.optimizations.length > 0 && applied.size > 0 && (
          <div style={{ padding: '16px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>🎉</div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#00C896' }}>
              All suggestions applied!
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--mid)' }}>
              Your schedule has been optimized.
            </p>
          </div>
        )}

        {/* Empty: no optimizations needed */}
        {!loading && result && result.optimizations.length === 0 && (
          <div style={{ padding: '16px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#00C896' }}>
              Schedule looks balanced
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--mid)' }}>
              No moves needed at this time.
            </p>
          </div>
        )}

        {/* No result yet */}
        {!loading && !result && !error && (
          <div style={{ padding: '16px 12px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--mid)', lineHeight: 1.5 }}>
              Tap <strong style={{ color: 'var(--purple)' }}>Optimize</strong> to let Claude identify specific schedule moves and apply them with one tap.
            </p>
          </div>
        )}

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}
