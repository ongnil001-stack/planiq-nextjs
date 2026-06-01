/**
 * lib/scheduleExpand.ts
 * Shared, recurrence-aware schedule fetching + per-occurrence completion.
 *
 * Used by every surface (Dashboard, Progress, Focus Hub, Calendar, AI Priorities)
 * so a recurring schedule's occurrences appear consistently everywhere, and each
 * occurrence's completion is tracked independently in `schedule_completions`.
 *
 * Isomorphic: pass either the server or browser Supabase client.
 */

import { buildDisplaySchedules, completionKey, type DisplaySchedule, type CompletionMap } from './recurrence';
import { calcDaysLate } from './timeProgress';
import type { Schedule } from '@/types/database';

// Minimal structural type covering both @supabase/ssr and supabase-js clients.
type DbLike = { from: (table: string) => any };

/**
 * Fetch the per-occurrence completion map for a user within a date window.
 * Resilient: if the `schedule_completions` table is missing (migration not yet
 * run) it returns an empty map instead of throwing, so the app keeps working.
 */
export async function fetchCompletions(
  db: DbLike, userId: string, startISO: string, endISO: string,
): Promise<CompletionMap> {
  const map: CompletionMap = new Map();
  try {
    const { data, error } = await db.from('schedule_completions')
      .select('schedule_id, occurrence_date, completed_at, days_late')
      .eq('user_id', userId)
      .gte('occurrence_date', startISO.slice(0, 10))
      .lte('occurrence_date', endISO.slice(0, 10));
    if (error || !data) return map;
    for (const r of data as Array<{ schedule_id: string; occurrence_date: string; completed_at: string | null; days_late: number | null }>) {
      map.set(completionKey(r.schedule_id, r.occurrence_date), {
        completed_at: r.completed_at,
        days_late: r.days_late,
      });
    }
  } catch { /* table missing or transient error — treat as no completions */ }
  return map;
}

/**
 * Fetch all schedule occurrences (recurring expanded) that fall within
 * [rangeStart, rangeEnd], with per-occurrence completion applied.
 *
 * Mirrors CalendarClient's two-query approach:
 *   1. rows whose start_time is in the window (base rows, recurring or not)
 *   2. recurring masters that started BEFORE the window but recur into it
 * then expands and filters to the window.
 */
export async function fetchExpandedSchedules(
  db: DbLike, userId: string, rangeStart: Date, rangeEnd: Date,
): Promise<DisplaySchedule[]> {
  const startISO = rangeStart.toISOString();
  const endISO   = rangeEnd.toISOString();

  const [regularRes, recurringRes, completions] = await Promise.all([
    db.from('schedules').select('*')
      .eq('user_id', userId)
      .gte('start_time', startISO)
      .lte('start_time', endISO)
      .order('start_time'),
    db.from('schedules').select('*')
      .eq('user_id', userId)
      .not('recurrence_rule', 'is', null)
      .lt('start_time', startISO)
      .or(`recurrence_end.is.null,recurrence_end.gte.${startISO.slice(0, 10)}`)
      .order('start_time'),
    fetchCompletions(db, userId, startISO, endISO),
  ]);

  const regular   = (regularRes?.data ?? []) as Schedule[];
  const recurring = (recurringRes?.data ?? []) as Schedule[];
  const ids = new Set(regular.map(s => s.id));
  const merged = [...regular, ...recurring.filter(s => !ids.has(s.id))];

  const startMs = rangeStart.getTime();
  const endMs   = rangeEnd.getTime();
  return buildDisplaySchedules(merged, rangeStart, rangeEnd, completions)
    .filter(s => {
      const t = new Date(s.start_time).getTime();
      return t >= startMs && t <= endMs;
    });
}

/**
 * Mark a single occurrence complete / incomplete.
 *  - Non-recurring schedule → toggles schedules.is_completed (unchanged behavior).
 *  - Recurring occurrence    → upserts/deletes a row in schedule_completions,
 *                              keyed by (schedule_id, occurrence_date).
 * Returns { error } so callers can surface failures.
 */
export async function setOccurrenceCompletion(
  db: DbLike,
  sched: DisplaySchedule | Schedule,
  userId: string,
  complete: boolean,
): Promise<{ error: { message: string } | null }> {
  const s = sched as DisplaySchedule;
  const isRecurring = !!s.recurrence_rule || !!s._is_virtual;

  if (!isRecurring) {
    const payload = complete
      ? { is_completed: true, completed_at: new Date().toISOString(), days_late: calcDaysLate(s.start_time) }
      : { is_completed: false, completed_at: null, days_late: null };
    const { error } = await db.from('schedules').update(payload).eq('id', s.id);
    return { error: error ?? null };
  }

  const scheduleId = s._base_id ?? s.id;
  const occDate    = s._occurrence_date ?? s.start_time.slice(0, 10);

  if (complete) {
    const { error } = await db.from('schedule_completions').upsert({
      schedule_id: scheduleId,
      user_id: userId,
      occurrence_date: occDate,
      completed_at: new Date().toISOString(),
      days_late: calcDaysLate(s.start_time),
    }, { onConflict: 'schedule_id,occurrence_date' });
    return { error: error ?? null };
  }

  const { error } = await db.from('schedule_completions')
    .delete()
    .eq('schedule_id', scheduleId)
    .eq('occurrence_date', occDate);
  return { error: error ?? null };
}
