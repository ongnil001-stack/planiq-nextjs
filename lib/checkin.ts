/**
 * lib/checkin.ts — Daily visit / check-in streak system for PlanIQ.
 *
 * Stored entirely in localStorage so it works offline and requires no
 * DB migration.  Keys are prefixed with planiq_ci_ to avoid collisions.
 *
 * Rules:
 *  - Opening the app on a new calendar day records a check-in.
 *  - If the previous check-in was yesterday → streak continues.
 *  - Any gap longer than 1 day → streak resets to 1.
 *  - maxStreak is a high-water mark; earned awards are never lost even
 *    if the current streak resets.
 */

const K_STREAK  = 'planiq_ci_streak';   // current consecutive-day count
const K_LAST    = 'planiq_ci_last';     // ISO date of last check-in  (YYYY-MM-DD)
const K_MAX     = 'planiq_ci_max';      // all-time highest streak

export interface CheckinData {
  streak:         number;   // current consecutive visit days
  maxStreak:      number;   // all-time peak (never decreases)
  lastCheckin:    string | null;  // ISO date string or null
  checkedInToday: boolean;  // true if already visited today
  isNew:          boolean;  // true if THIS call just recorded a fresh check-in
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Read current check-in state without modifying anything. */
export function getCheckinData(): CheckinData {
  if (typeof window === 'undefined') {
    return { streak: 0, maxStreak: 0, lastCheckin: null, checkedInToday: false, isNew: false };
  }
  const streak    = parseInt(localStorage.getItem(K_STREAK) ?? '0', 10);
  const maxStreak = parseInt(localStorage.getItem(K_MAX)    ?? '0', 10);
  const lastCheckin = localStorage.getItem(K_LAST);
  const checkedInToday = lastCheckin === todayIso();
  return { streak, maxStreak, lastCheckin, checkedInToday, isNew: false };
}

/**
 * Record today's visit (idempotent — safe to call on every page load).
 * Returns the resulting check-in state, with `isNew = true` only when
 * this call actually advances the streak for the first time today.
 */
export function recordCheckin(): CheckinData {
  if (typeof window === 'undefined') {
    return { streak: 0, maxStreak: 0, lastCheckin: null, checkedInToday: false, isNew: false };
  }

  const today     = todayIso();
  const yesterday = yesterdayIso();
  const last      = localStorage.getItem(K_LAST);

  // Already checked in today — nothing to do
  if (last === today) {
    return { ...getCheckinData(), isNew: false };
  }

  // Compute new streak
  const prevStreak = parseInt(localStorage.getItem(K_STREAK) ?? '0', 10);
  const newStreak  = last === yesterday ? prevStreak + 1 : 1;

  const prevMax   = parseInt(localStorage.getItem(K_MAX) ?? '0', 10);
  const newMax    = Math.max(prevMax, newStreak);

  localStorage.setItem(K_STREAK, String(newStreak));
  localStorage.setItem(K_LAST,   today);
  localStorage.setItem(K_MAX,    String(newMax));

  return {
    streak:         newStreak,
    maxStreak:      newMax,
    lastCheckin:    today,
    checkedInToday: true,
    isNew:          true,
  };
}

/** Milestone days that unlock visit awards (ascending). */
export const VISIT_MILESTONES = [1, 7, 14, 30] as const;
