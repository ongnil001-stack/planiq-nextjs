/**
 * Dashboard customization preferences — persisted to localStorage
 * Covers: visibility, size mode, card order, pinned shortcuts,
 *         AI refresh interval, and named layout presets.
 */

// ─── Card registry ────────────────────────────────────────────────────────────

export type DashboardCardKey =
  | 'todayCard'
  | 'quickStats'
  | 'pinnedShortcuts'
  | 'performanceCard'
  | 'weeklySchedule'
  | 'workloadBalance'
  | 'aiPriorities'
  | 'upcomingTasks';

export type CardSize = 'full' | 'compact';

export type AiRefreshInterval = 'onOpen' | 'daily' | 'weekly' | 'manual';

export interface DashboardCard {
  key: DashboardCardKey;
  label: string;
  description: string;
  defaultVisible: boolean;
  canHide: boolean;
  supportsCompact: boolean;
}

export const DASHBOARD_CARDS: DashboardCard[] = [
  {
    key: 'todayCard',
    label: "Today's Overview",
    description: 'Focus bar, progress ring, and today\'s task list',
    defaultVisible: true,
    canHide: false,
    supportsCompact: true,
  },
  {
    key: 'quickStats',
    label: 'Quick Stats Bar',
    description: 'Streak · Tasks done · Productivity score in one glance',
    defaultVisible: true,
    canHide: true,
    supportsCompact: false,
  },
  {
    key: 'pinnedShortcuts',
    label: 'Pinned Shortcuts',
    description: 'Quick-access row for your most-used actions',
    defaultVisible: true,
    canHide: true,
    supportsCompact: false,
  },
  {
    key: 'performanceCard',
    label: 'Performance Score',
    description: 'Workload score ring, streak counter, and task stats',
    defaultVisible: true,
    canHide: true,
    supportsCompact: true,
  },
  {
    key: 'weeklySchedule',
    label: 'Weekly Schedule',
    description: 'Horizontal 7-day strip with activity dots',
    defaultVisible: true,
    canHide: true,
    supportsCompact: true,
  },
  {
    key: 'workloadBalance',
    label: 'Workload Balance Chart',
    description: 'Bar chart showing daily workload across the week',
    defaultVisible: true,
    canHide: true,
    supportsCompact: true,
  },
  {
    key: 'aiPriorities',
    label: 'Weekly Progress',
    description: 'Completion rate, streak, and 7-day performance summary',
    defaultVisible: true,
    canHide: true,
    supportsCompact: true,
  },
  {
    key: 'upcomingTasks',
    label: 'Upcoming Tasks',
    description: 'Short list of upcoming incomplete schedule items',
    defaultVisible: true,
    canHide: true,
    supportsCompact: true,
  },
];

// ─── Pinned shortcuts ─────────────────────────────────────────────────────────

export type ShortcutKey = 'addTask' | 'viewCalendar' | 'addSchedule' | 'viewPriorities';

export interface ShortcutDef {
  key: ShortcutKey;
  label: string;
  href: string;
  iconPath: string;    // SVG path d= string (20×20 viewBox)
  iconPath2?: string;
  color: string;
}

export const ALL_SHORTCUTS: ShortcutDef[] = [
  {
    key: 'addTask',
    label: 'Add Task',
    href: '/schedule/new',
    iconPath: 'M10 3v14M3 10h14',
    color: 'var(--purple, #7C6AF0)',
  },
  {
    key: 'viewCalendar',
    label: 'Calendar',
    href: '/calendar',
    iconPath: 'M3 8h14M6 5V3m8 2V3M5 5h10a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z',
    color: 'var(--cyan, #00C6FF)',
  },
  {
    key: 'addSchedule',
    label: 'Schedule',
    href: '/schedule/new',
    iconPath: 'M10 3v14M3 10h14',
    iconPath2: 'M3 8h14M6 5V3m8 2V3M5 5h10a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z',
    color: 'var(--mint, #2DD4BF)',
  },
  {
    key: 'viewPriorities',
    label: 'Progress',
    href: '/progress',
    iconPath: 'M3 17l4-5 4 3 4-7 4 4M3 21h18M3 3v18',
    color: 'var(--mint, #2DD4BF)',
  },
];

// ─── Full preferences type ────────────────────────────────────────────────────

export interface DashboardFullPrefs {
  /** Visibility toggle per card */
  visible: Record<DashboardCardKey, boolean>;
  /** Size mode per card */
  size: Record<DashboardCardKey, CardSize>;
  /** Ordered list of card keys (all cards, visible or not) */
  order: DashboardCardKey[];
  /** Which shortcuts are pinned and in what order */
  pinnedShortcuts: ShortcutKey[];
  /** How often AI re-analyzes */
  aiRefreshInterval: AiRefreshInterval;
  /** Show SparkAssistant character animations in the Awards section */
  awardAnimations: boolean;
  /** Named layout presets { presetName → serialised prefs } */
  presets: Record<string, SavedPreset>;
}

export interface SavedPreset {
  name: string;
  createdAt: string;
  visible: Record<DashboardCardKey, boolean>;
  size: Record<DashboardCardKey, CardSize>;
  order: DashboardCardKey[];
  pinnedShortcuts: ShortcutKey[];
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export function defaultFullPrefs(): DashboardFullPrefs {
  const visible = {} as Record<DashboardCardKey, boolean>;
  const size    = {} as Record<DashboardCardKey, CardSize>;
  DASHBOARD_CARDS.forEach(c => {
    visible[c.key] = c.defaultVisible;
    size[c.key]    = 'full';
  });
  return {
    visible,
    size,
    order: DASHBOARD_CARDS.map(c => c.key),
    pinnedShortcuts: ['addTask', 'viewCalendar', 'viewPriorities'],
    aiRefreshInterval: 'onOpen',
    awardAnimations: true,
    presets: {},
  };
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'planiq_dash_prefs_v2';

export function loadFullPrefs(): DashboardFullPrefs {
  if (typeof window === 'undefined') return defaultFullPrefs();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFullPrefs();
    const saved = JSON.parse(raw) as Partial<DashboardFullPrefs>;
    const base  = defaultFullPrefs();
    // Merge visible
    if (saved.visible) {
      DASHBOARD_CARDS.forEach(c => {
        if (typeof saved.visible![c.key] === 'boolean') base.visible[c.key] = saved.visible![c.key];
        if (!c.canHide) base.visible[c.key] = true;
      });
    }
    // Merge size
    if (saved.size) {
      DASHBOARD_CARDS.forEach(c => {
        if (saved.size![c.key]) base.size[c.key] = saved.size![c.key];
      });
    }
    // Merge order — only keep valid keys, append any missing
    if (saved.order && Array.isArray(saved.order)) {
      const validKeys = DASHBOARD_CARDS.map(c => c.key);
      const filtered  = saved.order.filter(k => validKeys.includes(k as DashboardCardKey));
      const missing   = validKeys.filter(k => !filtered.includes(k));
      base.order = [...filtered, ...missing] as DashboardCardKey[];
    }
    // Merge shortcuts
    if (saved.pinnedShortcuts && Array.isArray(saved.pinnedShortcuts)) {
      base.pinnedShortcuts = saved.pinnedShortcuts;
    }
    // AI refresh
    if (saved.aiRefreshInterval) base.aiRefreshInterval = saved.aiRefreshInterval;
    if (typeof saved.awardAnimations === 'boolean') base.awardAnimations = saved.awardAnimations;
    // Presets
    if (saved.presets) base.presets = saved.presets;
    return base;
  } catch {
    return defaultFullPrefs();
  }
}

export function saveFullPrefs(prefs: DashboardFullPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new Event('planiq_dash_prefs_changed'));
  } catch { /* ignore */ }
}

// ─── Preset helpers ───────────────────────────────────────────────────────────

export function savePreset(prefs: DashboardFullPrefs, name: string): DashboardFullPrefs {
  const preset: SavedPreset = {
    name,
    createdAt: new Date().toISOString(),
    visible: { ...prefs.visible },
    size:    { ...prefs.size },
    order:   [...prefs.order],
    pinnedShortcuts: [...prefs.pinnedShortcuts],
  };
  return { ...prefs, presets: { ...prefs.presets, [name]: preset } };
}

export function applyPreset(prefs: DashboardFullPrefs, name: string): DashboardFullPrefs {
  const preset = prefs.presets[name];
  if (!preset) return prefs;
  return {
    ...prefs,
    visible: { ...prefs.visible, ...preset.visible },
    size:    { ...prefs.size, ...preset.size },
    order:   preset.order.length ? preset.order : prefs.order,
    pinnedShortcuts: preset.pinnedShortcuts,
  };
}

export function deletePreset(prefs: DashboardFullPrefs, name: string): DashboardFullPrefs {
  const next = { ...prefs.presets };
  delete next[name];
  return { ...prefs, presets: next };
}

// ─── Legacy compat (v1 prefs key) ────────────────────────────────────────────
// Remove old key so storage doesn't accumulate
export function migrateFromV1(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem('planiq_dash_prefs_v1'); } catch { /* ignore */ }
}

// ─── Legacy shim for files still importing DashboardPrefs / loadDashboardPrefs ─
export type DashboardPrefs = Record<DashboardCardKey, boolean>;
export function loadDashboardPrefs(): DashboardPrefs {
  const full = loadFullPrefs();
  return full.visible as DashboardPrefs;
}
