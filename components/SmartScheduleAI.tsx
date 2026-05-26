'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Conflict {
  with_title: string;
  overlap_minutes: number;
  severity: 'high' | 'medium' | 'low';
}
interface Suggestion {
  text: string;
  reason: string;
}
interface SmartResult {
  has_conflicts: boolean;
  conflicts: Conflict[];
  suggestions: Suggestion[];
  best_times: string[];
}

interface ProposedSchedule {
  title: string;
  type: string;
  priority: string;
  start_time: string;  // ISO string
  end_time: string | null;
  duration_minutes?: number;
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
  proposed: ProposedSchedule | null;
  existingSchedules: ExistingSchedule[];
  /** called when user taps a suggested time — parent should update start time */
  onSelectTime?: (time: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = { high: '#FF3B30', medium: '#FF9F43', low: '#FDCB6E' };
const SEV_BG:    Record<string, string> = { high: 'rgba(255,59,48,.10)', medium: 'rgba(255,159,67,.10)', low: 'rgba(253,203,110,.10)' };

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SmartScheduleAI({ proposed, existingSchedules, onSelectTime }: Props) {
  const [result,   setResult]   = useState<SmartResult | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [checked,  setChecked]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const checkConflicts = useCallback(async () => {
    if (!proposed || !proposed.title.trim() || !proposed.start_time) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setError('Sign in required for AI conflict check.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-schedule`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'smart_suggest',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            proposed,
            schedules: existingSchedules,
          }),
        }
      );

      if (!res.ok) throw new Error(`API ${res.status}`);

      const data = await res.json() as SmartResult;
      setResult(data);
      setChecked(true);
    } catch (err) {
      setError('AI check unavailable. Check your connection.');
      console.warn('SmartScheduleAI error:', err);
    } finally {
      setLoading(false);
    }
  }, [proposed, existingSchedules]);

  // Reset when proposed changes significantly
  const canCheck = proposed && proposed.title.trim().length > 0 && proposed.start_time;

  if (!canCheck) return null;

  const hasConflicts = result?.has_conflicts ?? false;

  // ── Styles ───────────────────────────────────────────────────────────────────
  const WRAP: React.CSSProperties = {
    borderRadius: 14,
    border: `1px solid ${checked
      ? hasConflicts ? 'rgba(255,59,48,.30)' : 'rgba(0,200,150,.28)'
      : 'rgba(124,106,240,.22)'}`,
    background: checked
      ? hasConflicts ? 'rgba(255,59,48,.06)' : 'rgba(0,200,150,.06)'
      : 'rgba(124,106,240,.07)',
    padding: '12px 14px',
    marginBottom: 12,
    transition: 'all .2s ease',
  };

  const ROW: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
  };

  const LABEL: React.CSSProperties = {
    flex: 1, fontSize: 12, fontWeight: 600, lineHeight: 1.4,
    color: checked
      ? hasConflicts ? '#FF3B30' : '#00C896'
      : 'var(--purple)',
  };

  const BTN: React.CSSProperties = {
    flexShrink: 0,
    padding: '6px 12px', borderRadius: 10,
    border: `1px solid ${checked
      ? hasConflicts ? 'rgba(255,59,48,.35)' : 'rgba(0,200,150,.35)'
      : 'rgba(124,106,240,.35)'}`,
    background: 'transparent',
    color: checked
      ? hasConflicts ? '#FF3B30' : '#00C896'
      : 'var(--purple)',
    fontSize: 11, fontWeight: 700,
    cursor: loading ? 'default' : 'pointer',
    fontFamily: 'inherit',
    WebkitTapHighlightColor: 'transparent',
    whiteSpace: 'nowrap' as const,
  };

  const STATUS_ICON = () => {
    if (loading) return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        style={{ animation: 'spin 1s linear infinite', flexShrink: 0, color: 'var(--purple)' }}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"
          strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
      </svg>
    );
    if (!checked) return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        style={{ flexShrink: 0, color: 'var(--purple)' }}>
        <path d="M12 3L14.5 9L21 9.75L16.4 14.1L17.8 20.5L12 17.3L6.2 20.5L7.6 14.1L3 9.75L9.5 9L12 3Z"
          stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    );
    if (hasConflicts) return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: '#FF3B30' }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: '#00C896' }}>
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  };

  const statusLabel = loading
    ? 'Checking for conflicts…'
    : !checked
    ? 'AI Conflict Check available'
    : hasConflicts
    ? `${result!.conflicts.length} conflict${result!.conflicts.length !== 1 ? 's' : ''} detected`
    : 'No conflicts — looks good!';

  return (
    <div style={WRAP}>
      {/* Header row */}
      <div style={ROW}>
        <STATUS_ICON />
        <span style={LABEL}>{statusLabel}</span>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {!loading && (
            <button style={BTN} onClick={() => { setChecked(false); setResult(null); checkConflicts(); }}>
              {checked ? '↻ Recheck' : '✦ Check'}
            </button>
          )}
          {checked && result && !loading && (
            <button
              onClick={() => { setChecked(false); setResult(null); setError(null); }}
              title="Clear results"
              style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                border: '1px solid rgba(255,255,255,.15)',
                background: 'rgba(255,255,255,.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="var(--mid)" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p style={{ fontSize: 11, color: '#FF9F43', marginTop: 8, margin: '8px 0 0' }}>{error}</p>
      )}

      {/* Conflicts list */}
      {checked && result && result.conflicts.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {result.conflicts.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 9, marginBottom: 5,
              background: SEV_BG[c.severity] ?? SEV_BG.low,
              border: `1px solid rgba(${hexToRgb(SEV_COLOR[c.severity] ?? '#FF9F43')},.25)`,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: SEV_COLOR[c.severity] ?? '#FF9F43' }} />
              <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'var(--dark)' }}>
                Overlaps with &ldquo;{c.with_title}&rdquo;
              </span>
              <span style={{ fontSize: 10, color: SEV_COLOR[c.severity] ?? '#FF9F43', fontWeight: 700 }}>
                {c.overlap_minutes}min
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {checked && result && result.suggestions.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {result.suggestions.map((s, i) => (
            <p key={i} style={{ fontSize: 11, color: 'var(--mid)', margin: '0 0 4px', lineHeight: 1.4 }}>
              💡 {s.text}{s.reason ? ` — ${s.reason}` : ''}
            </p>
          ))}
        </div>
      )}

      {/* Best time chips */}
      {checked && result && result.best_times.length > 0 && onSelectTime && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--lite)', letterSpacing: '.5px', textTransform: 'uppercase', margin: '0 0 6px' }}>
            Suggested times
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {result.best_times.map((t, i) => (
              <button key={i} onClick={() => onSelectTime(t)}
                style={{
                  padding: '5px 12px', borderRadius: 20,
                  border: '1px solid rgba(0,198,255,.30)',
                  background: 'rgba(0,198,255,.09)',
                  color: '#00C6FF', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
