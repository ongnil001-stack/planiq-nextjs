/**
 * lib/awards.ts — Shared award definitions for PlanIQ.
 *
 * Awards are computed entirely from real user data — no hardcoded `earned: true`.
 * Both Profile (full view) and Dashboard (count only) import from here so the
 * number is always consistent across every surface.
 *
 * Data inputs:
 *   streakDays  — consecutive days with ≥1 completed task
 *   tasksDone   — total all-time completed tasks
 *   avgScore    — completion rate % over last 28 days (null = no data yet)
 *   focusWins   — days in last 28 where ALL planned tasks were completed
 */

export interface Award {
  id: string;
  label: string;
  /** One-sentence explanation of how to earn this */
  desc: string;
  /** Progress hint shown when locked */
  hint: string;
  /** SVG path string — stroke-style, 24×24 viewBox */
  icon: string;
  /** Accent colour when earned */
  color: string;
  earned: boolean;
  /** Optional progress toward the award threshold */
  progress: { current: number; target: number };
}

export interface AwardStats {
  streakDays:    number;
  tasksDone:     number;
  avgScore:      number | null;
  focusWins:     number;
  /** Current consecutive visit-days streak (from localStorage via lib/checkin.ts) */
  visitStreak:   number;
  /** All-time peak visit streak — awards never disappear if current streak resets */
  maxVisitStreak: number;
}

export function computeAwards(s: AwardStats): Award[] {
  const { streakDays, tasksDone, avgScore, focusWins, visitStreak, maxVisitStreak } = s;
  return [
    {
      id:       'first_step',
      label:    'First Step',
      desc:     'Complete your very first planned task.',
      hint:     'Complete 1 task to unlock.',
      icon:     'M12 2l2.09 6.26L20 9.27l-4 3.89.94 5.84L12 16.2l-4.94 2.8.94-5.84L4 9.27l5.91-.01L12 2z',
      color:    '#F59E0B',
      earned:   tasksDone >= 1,
      progress: { current: Math.min(tasksDone, 1), target: 1 },
    },
    {
      id:       'streak_3',
      label:    '3-Day Streak',
      desc:     'Complete tasks 3 days in a row.',
      hint:     `${Math.max(0, 3 - streakDays)} more day${3 - streakDays === 1 ? '' : 's'} needed.`,
      icon:     'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
      color:    '#8B5CF6',
      earned:   streakDays >= 3,
      progress: { current: Math.min(streakDays, 3), target: 3 },
    },
    {
      id:       'streak_7',
      label:    'Week Warrior',
      desc:     'Stay consistent for 7 days straight.',
      hint:     `${Math.max(0, 7 - streakDays)} more days needed.`,
      icon:     'M9 12l2 2 4-4M12 3a9 9 0 110 18A9 9 0 0112 3z',
      color:    '#3B82F6',
      earned:   streakDays >= 7,
      progress: { current: Math.min(streakDays, 7), target: 7 },
    },
    {
      id:       'tasks_10',
      label:    'Getting Going',
      desc:     'Complete 10 tasks in total.',
      hint:     `${Math.max(0, 10 - tasksDone)} more tasks to go.`,
      icon:     'M5 13l4 4L19 7',
      color:    '#10B981',
      earned:   tasksDone >= 10,
      progress: { current: Math.min(tasksDone, 10), target: 10 },
    },
    {
      id:       'focus_pro',
      label:    'Focus Pro',
      desc:     'Finish every task for the day — 5 perfect days.',
      hint:     `${Math.max(0, 5 - focusWins)} more perfect days needed.`,
      icon:     'M9 11l3 3L22 4M21 12a9 9 0 11-9-9',
      color:    '#06B6D4',
      earned:   focusWins >= 5,
      progress: { current: Math.min(focusWins, 5), target: 5 },
    },
    {
      id:       'tasks_50',
      label:    'On a Roll',
      desc:     'Complete 50 tasks — you\'re building momentum.',
      hint:     `${Math.max(0, 50 - tasksDone)} more tasks to go.`,
      icon:     'M12 2l2.09 6.26L20 9.27l-5 4.87 1.18 6.88L12 17.77l-4.18 3.25L9 14.14 4 9.27l5.91-.01L12 2z',
      color:    '#F97316',
      earned:   tasksDone >= 50,
      progress: { current: Math.min(tasksDone, 50), target: 50 },
    },
    {
      id:       'sharp_focus',
      label:    'Sharp Focus',
      desc:     'Maintain 80%+ task completion over 28 days.',
      hint:     avgScore !== null
        ? `Currently at ${avgScore}% — keep going to reach 80%.`
        : 'Complete more tasks to unlock.',
      icon:     'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3l3 7H9l3-7zm0 13a4 4 0 110-8 4 4 0 010 8z',
      color:    '#EC4899',
      earned:   (avgScore ?? 0) >= 80,
      progress: { current: Math.min(avgScore ?? 0, 80), target: 80 },
    },
    {
      id:       'tasks_100',
      label:    'Century',
      desc:     'Complete 100 tasks — a true planning habit.',
      hint:     `${Math.max(0, 100 - tasksDone)} more tasks to go.`,
      icon:     'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      color:    '#7C3AED',
      earned:   tasksDone >= 100,
      progress: { current: Math.min(tasksDone, 100), target: 100 },
    },
    {
      id:       'streak_30',
      label:    'Month Champion',
      desc:     '30 consecutive days of planning. Elite level.',
      hint:     `${Math.max(0, 30 - streakDays)} more days to go.`,
      icon:     'M5 3l14 9-14 9V3z',
      color:    '#EF4444',
      earned:   streakDays >= 30,
      progress: { current: Math.min(streakDays, 30), target: 30 },
    },
    // ── Visit / Check-in Awards ─────────────────────────────────────────────
    // These use maxVisitStreak so earned status never resets when streak breaks.
    {
      id:       'visit_1',
      label:    'First Login',
      desc:     'Open PlanIQ for the very first time.',
      hint:     'Just open the app to unlock.',
      icon:     'M15 3H7a2 2 0 00-2 2v14a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2zM12 17v.01M12 13a1 1 0 100-2 1 1 0 000 2z',
      color:    '#64748B',
      earned:   maxVisitStreak >= 1,
      progress: { current: Math.min(maxVisitStreak, 1), target: 1 },
    },
    {
      id:       'visit_7',
      label:    'Regular',
      desc:     'Visit PlanIQ 7 days in a row.',
      hint:     `${Math.max(0, 7 - visitStreak)} more visit days needed (current streak: ${visitStreak}).`,
      icon:     'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      color:    '#0EA5E9',
      earned:   maxVisitStreak >= 7,
      progress: { current: Math.min(maxVisitStreak, 7), target: 7 },
    },
    {
      id:       'visit_14',
      label:    'Habit Builder',
      desc:     'Check in for 14 days straight — a real habit.',
      hint:     `${Math.max(0, 14 - visitStreak)} more visit days needed.`,
      icon:     'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      color:    '#8B5CF6',
      earned:   maxVisitStreak >= 14,
      progress: { current: Math.min(maxVisitStreak, 14), target: 14 },
    },
    {
      id:       'visit_30',
      label:    'Power User',
      desc:     '30 days of daily check-ins. Truly dedicated.',
      hint:     `${Math.max(0, 30 - visitStreak)} more visit days needed.`,
      icon:     'M13 10V3L4 14h7v7l9-11h-7z',
      color:    '#F59E0B',
      earned:   maxVisitStreak >= 30,
      progress: { current: Math.min(maxVisitStreak, 30), target: 30 },
    },
  ];
}

/** Returns only the count of earned awards — used by Dashboard quick stats */
export function countEarnedAwards(s: AwardStats): number {
  return computeAwards(s).filter(a => a.earned).length;
}

/** Returns total number of awards available */
export const TOTAL_AWARDS = 13;
