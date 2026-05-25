/**
 * Dashboard card preferences — persisted to localStorage
 * Each key maps to a dashboard widget section in DashboardClient.
 */

export type DashboardCardKey =
  | 'todayCard'
  | 'performanceCard'
  | 'weeklySchedule'
  | 'workloadBalance'
  | 'aiPriorities'
  | 'upcomingTasks';

export interface DashboardCard {
  key: DashboardCardKey;
  label: string;
  description: string;
  defaultVisible: boolean;
  /** Whether hiding this card is allowed (some core cards can't be hidden) */
  canHide: boolean;
}

export const DASHBOARD_CARDS: DashboardCard[] = [
  {
    key: 'todayCard',
    label: "Today's Overview",
    description: "Daily task list, active focus bar, and progress ring",
    defaultVisible: true,
    canHide: false, // core card — always shown
  },
  {
    key: 'performanceCard',
    label: 'Performance Score',
    description: 'Workload score ring, streak counter, and task stats',
    defaultVisible: true,
    canHide: true,
  },
  {
    key: 'weeklySchedule',
    label: 'Weekly Schedule Strip',
    description: 'Horizontal 7-day strip with activity dots',
    defaultVisible: true,
    canHide: true,
  },
  {
    key: 'workloadBalance',
    label: 'Workload Balance Chart',
    description: 'Bar chart showing daily workload across the week',
    defaultVisible: true,
    canHide: true,
  },
  {
    key: 'aiPriorities',
    label: 'AI Priorities',
    description: 'AI-generated insight banner and smart suggestions',
    defaultVisible: true,
    canHide: true,
  },
  {
    key: 'upcomingTasks',
    label: 'Upcoming Tasks',
    description: 'Short list of the next upcoming incomplete items',
    defaultVisible: true,
    canHide: true,
  },
];

const STORAGE_KEY = 'planiq_dash_prefs_v1';

export type DashboardPrefs = Record<DashboardCardKey, boolean>;

function defaultPrefs(): DashboardPrefs {
  const prefs: Partial<DashboardPrefs> = {};
  DASHBOARD_CARDS.forEach(c => { prefs[c.key] = c.defaultVisible; });
  return prefs as DashboardPrefs;
}

export function loadDashboardPrefs(): DashboardPrefs {
  if (typeof window === 'undefined') return defaultPrefs();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs();
    const saved = JSON.parse(raw) as Partial<DashboardPrefs>;
    const base  = defaultPrefs();
    // merge — new keys get their defaults, removed keys are dropped
    DASHBOARD_CARDS.forEach(c => {
      if (typeof saved[c.key] === 'boolean') base[c.key] = saved[c.key] as boolean;
      if (!c.canHide) base[c.key] = true; // always-visible cards
    });
    return base;
  } catch {
    return defaultPrefs();
  }
}

export function saveDashboardPrefs(prefs: DashboardPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    // Notify same-tab listeners (DashboardClient) that prefs changed
    window.dispatchEvent(new Event('planiq_dash_prefs_changed'));
  } catch { /* ignore */ }
}
