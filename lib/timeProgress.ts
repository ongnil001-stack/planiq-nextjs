/**
 * lib/timeProgress.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Pure time-math helpers for real-time task progress.
 *
 * All functions accept "HH:MM" or "HH:MM:SS" strings (how Supabase stores them)
 * and work against today's date so the math is always "right now vs the schedule".
 */

/**
 * Parse a schedule time string into a Date object.
 *
 * AddScheduleSheet saves full ISO strings ("2026-05-27T01:00:00.000Z") to Supabase.
 * Legacy / form inputs may pass bare "HH:MM" or "HH:MM:SS".
 * Both formats are handled here so all time math is NaN-free.
 */
export function timeStrToDate(timeStr: string | null | undefined): Date {
  if (!timeStr) return new Date(NaN);

  // ── Plain time: "HH:MM" or "HH:MM:SS" ────────────────────────────────────
  if (/^\d{1,2}:\d{2}/.test(timeStr) && !timeStr.includes('T')) {
    const parts = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, 0);
    return d;
  }

  // ── Full ISO datetime ("2026-05-27T09:00:00.000Z") ───────────────────────
  // Parse normally — gives the exact local moment the task was scheduled for.
  const parsed = new Date(timeStr);
  return parsed; // caller checks isNaN(parsed.getTime()) if needed
}

/**
 * What percentage of the task's time window has elapsed right now?
 * Returns 0 if not started yet, 100 if past end_time.
 * Returns null if start_time is missing (can't compute).
 */
export function getTaskTimePct(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): number | null {
  if (!startTime) return null;
  const now   = new Date();
  const start = timeStrToDate(startTime);
  const end   = endTime
    ? timeStrToDate(endTime)
    : new Date(start.getTime() + 60 * 60 * 1000); // default 1 h window

  if (now < start) return 0;
  if (now >= end)  return 100;
  // Return raw float — callers use Math.round/floor for labels,
  // bar WIDTH uses the float directly for sub-percent precision.
  return ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
}

/**
 * How many minutes remain until end_time (or 1 h after start)?
 * Positive = time left, negative = overdue by that many minutes.
 */
export function getRemainingMinutes(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): number | null {
  if (!startTime) return null;
  const now = new Date();
  const end = endTime
    ? timeStrToDate(endTime)
    : new Date(timeStrToDate(startTime).getTime() + 60 * 60 * 1000);
  return Math.round((end.getTime() - now.getTime()) / 60_000);
}

/** True when the task's time window has elapsed and it is not yet completed. */
export function isTaskEndReached(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): boolean {
  if (!startTime) return false;
  const pct = getTaskTimePct(startTime, endTime);
  return pct !== null && pct >= 100;
}

/**
 * How many minutes the user saved by completing BEFORE end_time.
 * Returns 0 if they finished late or right on time.
 */
export function getSavedMinutes(
  endTime: string | null,
  completedAt: Date = new Date()
): number {
  if (!endTime) return 0;
  const end = timeStrToDate(endTime);
  return Math.max(0, Math.round((end.getTime() - completedAt.getTime()) / 60_000));
}

/**
 * Label for the current task's time status.
 * Used in the Dashboard focus bar.
 */
export type TimeStatus = 'upcoming' | 'on_track' | 'early' | 'overdue';

export function getTimeStatus(
  startTime: string | null,
  endTime: string | null,
  pct: number | null
): TimeStatus {
  if (pct === null) return 'upcoming';
  if (pct === 0)    return 'upcoming';

  const remaining = getRemainingMinutes(startTime, endTime);
  if (remaining === null) return 'on_track';
  if (remaining < 0)      return 'overdue';
  if (remaining <= 5)     return 'on_track'; // in the last 5 min
  return 'on_track';
}

export function formatSavedTime(mins: number): string {
  if (mins <= 0) return '';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
