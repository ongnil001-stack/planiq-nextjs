/**
 * PlanIQ Plan & Entitlement Store
 * ─────────────────────────────────────────────────────────────────────────────
 * UI-only for now. No real payments connected yet.
 * Phase 2: connect RevenueCat / App Store / Google Play.
 *
 * Usage:
 *   import { getPlan, hasFeature, PLAN_META } from '@/lib/planStore';
 *   if (!hasFeature('autoAI')) { showUpgradePrompt(); }
 */

export type PlanId = 'free' | 'plus' | 'pro';

export interface PlanMeta {
  id:       PlanId;
  name:     string;
  tagline:  string;
  price:    { monthly: string; yearly: string; trialDays: number } | null;
  badge:    string | null; // e.g. "COMING SOON"
  features: string[];
  color:    string;
}

export const PLAN_META: Record<PlanId, PlanMeta> = {
  free: {
    id: 'free', name: 'Free', tagline: 'For basic planning.',
    price: null, badge: null, color: '#6B7280',
    features: [
      'Basic schedule and task management',
      'Daily, Weekly, Monthly and Yearly views',
      'Manual Focus Hub — tap to analyze',
      'Basic Progress tracking',
      'Basic themes',
      'Limited AI runs',
    ],
  },
  plus: {
    id: 'plus', name: 'PlanIQ Plus', tagline: 'For smarter planning.',
    price: { monthly: '$4.99', yearly: '$39.99', trialDays: 7 },
    badge: null, color: '#7C3AED',
    features: [
      'Unlimited schedules and tasks',
      'Full Focus Hub — AI Brief, Priorities, Conflict Check',
      'Smart Reschedule recommendations',
      'Full dashboard customisation',
      'Activity notifications',
      'Progress insights and analytics',
      'All premium themes',
      'More AI runs per month',
    ],
  },
  pro: {
    id: 'pro', name: 'PlanIQ Pro', tagline: 'For advanced AI planning.',
    price: { monthly: '$9.99', yearly: '$79.99', trialDays: 7 },
    badge: 'COMING SOON', color: '#0066FF',
    features: [
      'Everything in Plus',
      'Automatic AI analysis',
      'Monthly AI priorities',
      'Advanced workload analytics',
      'Higher AI usage limits',
      'Saved planning presets',
      'Priority support queue',
    ],
  },
};

// ── Feature gates ──────────────────────────────────────────────────────────────
// Map each premium feature to the minimum plan required
export const FEATURE_PLAN: Record<string, PlanId> = {
  // Focus Hub / AI
  autoAI:           'pro',
  monthlyAIPriorities: 'pro',
  aiConflictCheck:  'plus',
  smartReschedule:  'plus',
  aiBrief:          'plus',
  aiPriorities:     'plus',
  moreAIRuns:       'plus',
  // Dashboard
  fullDashboard:    'plus',
  activityNotifs:   'plus',
  // Progress
  advancedProgress: 'plus',
  // Themes
  premiumThemes:    'plus',
  // Scheduling
  unlimitedSchedules: 'plus',
};

const PLAN_RANK: Record<PlanId, number> = { free: 0, plus: 1, pro: 2 };
const LS_KEY = 'planiq_plan';

/** Get the current plan (defaults to free) */
export function getPlan(): PlanId {
  if (typeof window === 'undefined') return 'free';
  const v = localStorage.getItem(LS_KEY) as PlanId | null;
  return v === 'plus' || v === 'pro' ? v : 'free';
}

/** Temporarily set plan (UI demo only — replaced by RevenueCat in Phase 2) */
export function setPlan(id: PlanId) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, id);
  window.dispatchEvent(new Event('planiq_plan_changed'));
}

/** Check if current plan has access to a feature */
export function hasFeature(feature: string): boolean {
  const required = FEATURE_PLAN[feature];
  if (!required) return true; // unknown feature = not gated
  return PLAN_RANK[getPlan()] >= PLAN_RANK[required];
}

/** Plan comparison: is current plan at least X? */
export function isAtLeast(plan: PlanId): boolean {
  return PLAN_RANK[getPlan()] >= PLAN_RANK[plan];
}

// ── Upgrade prompt copy ────────────────────────────────────────────────────────
export const FEATURE_COPY: Record<string, { title: string; desc: string }> = {
  autoAI:         { title: 'Auto AI Analysis', desc: 'Automatic AI review of your schedule — set it and let PlanIQ work for you.' },
  aiConflictCheck:{ title: 'AI Conflict Check', desc: 'Spot scheduling clashes before they happen.' },
  smartReschedule:{ title: 'Smart Reschedule',  desc: 'AI picks the best time to move tasks — one tap, done.' },
  aiBrief:        { title: 'AI Brief',           desc: 'A daily personalised summary of what matters most.' },
  aiPriorities:   { title: 'AI Priorities',      desc: 'Understand which tasks deserve your energy today.' },
  premiumThemes:  { title: 'Premium Themes',     desc: 'Unlock all 18+ themes including Clean Workspace and more.' },
  fullDashboard:  { title: 'Full Dashboard',     desc: 'Customise every card, shortcut, and layout.' },
  advancedProgress:{ title: 'Progress Insights', desc: 'Deep analytics on your streaks, completion rate, and momentum.' },
};
