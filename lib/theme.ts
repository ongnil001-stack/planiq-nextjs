/**
 * PlanIQ Theme System — ported from PlanIQ_Prototype_v3.html
 * Each theme overrides CSS custom properties on <body data-theme="X">
 */

export const THEME_IDS = ['focused', 'soft', 'dark', 'colorful', 'minimal', 'pixel', 'lady', 'blue', 'clarity', 'teal', 'mint', 'coral', 'pink', 'deepfocus', 'calm', 'bright', 'probalance', 'clean'] as const;
export type ThemeId = typeof THEME_IDS[number];

export const THEME_META: Record<ThemeId, {
  name: string; desc: string; tag: string; bg: string; pri: string; acc: string;
}> = {
  focused:  { name: 'Ocean Focus',          desc: 'Deep navy & cyan',    tag: 'DEFAULT', bg: '#080E1A', pri: '#00C6FF', acc: '#0066FF' },
  soft:     { name: 'Soft Professional',    desc: 'Sapphire & ivory',    tag: 'LIGHT',   bg: '#F4F6FB', pri: '#4A40D4', acc: '#7B6FFF' },
  dark:     { name: 'Dark & Serious',       desc: 'Midnight & violet',   tag: 'DARK',    bg: '#05050F', pri: '#9B8BFF', acc: '#5B8FFF' },
  colorful: { name: 'Colorful Pro',         desc: 'Coral & amber fire',  tag: 'BRIGHT',  bg: '#FFFAF7', pri: '#FF4560', acc: '#FF8C00' },
  minimal:  { name: 'Minimal Executive',    desc: 'Cream & real gold',   tag: 'GOLD',    bg: '#FAFAF7', pri: '#1C1C28', acc: '#B8962E' },
  pixel:    { name: 'Playful Pixel',        desc: 'Terminal green',      tag: 'PIXEL',   bg: '#0E1A14', pri: '#00E878', acc: '#C8F020' },
  lady:     { name: 'Lady Professional',    desc: 'Berry & ivory',       tag: 'ROSE',    bg: '#FDF7F9', pri: '#A0306A', acc: '#C86898' },
  // ── Monday.com-inspired new themes ──────────────────────────────────────────
  blue:      { name: 'Focus Blue',       desc: 'Deep navy & sky',     tag: 'NAVY',    bg: '#071324', pri: '#0086D4', acc: '#00BCF2' },
  clarity:   { name: 'Clarity Purple',   desc: 'Midnight & violet',   tag: 'VIOLET',  bg: '#120E24', pri: '#7C3AED', acc: '#A78BFA' },
  teal:      { name: 'Smart Teal',       desc: 'Arctic & teal',       tag: 'TEAL',    bg: '#E6F4F3', pri: '#0097A7', acc: '#00BCD4' },
  mint:      { name: 'Momentum Mint',    desc: 'Sage & emerald',      tag: 'GREEN',   bg: '#E4F5EE', pri: '#059669', acc: '#34D399' },
  coral:     { name: 'Energy Coral',     desc: 'Warm & vibrant',      tag: 'CORAL',   bg: '#FFF3F0', pri: '#DC4825', acc: '#F97316' },
  pink:      { name: 'Flow Pink',        desc: 'Berry & blush',       tag: 'PINK',    bg: '#FEF0F7', pri: '#BE185D', acc: '#EC4899' },
  deepfocus: { name: 'Deep Focus',       desc: 'Obsidian & electric', tag: 'DEEP',    bg: '#06090F', pri: '#3B82F6', acc: '#60A5FA' },
  calm:      { name: 'Calm Planner',     desc: 'Sage & deep teal',    tag: 'SAGE',    bg: '#EBF4F2', pri: '#0D7377', acc: '#14B8A6' },
  bright:    { name: 'Bright Schedule',  desc: 'Sand & amber',        tag: 'AMBER',   bg: '#FFF8EC', pri: '#B45309', acc: '#F59E0B' },
  probalance:{ name: 'Pro Balance',      desc: 'Abyss & emerald',     tag: 'PRO',     bg: '#0A1410', pri: '#10B981', acc: '#34D399' },
  clean:     { name: 'Clean Workspace',  desc: 'White & electric blue', tag: 'WHITE',  bg: '#FFFFFF', pri: '#0066FF', acc: '#00C875' },
};

export const LS_KEY = 'planiq_theme';

export function getSavedTheme(): ThemeId {
  if (typeof window === 'undefined') return 'focused';
  const v = localStorage.getItem(LS_KEY) as ThemeId | null;
  return (v && THEME_IDS.includes(v)) ? v : 'focused';
}

export function saveTheme(id: ThemeId) {
  localStorage.setItem(LS_KEY, id);
  window.dispatchEvent(new StorageEvent('storage', { key: LS_KEY, newValue: id }));
}

export function applyThemeToBody(id: ThemeId) {
  // Set on <html> (documentElement) so the no-flash inline script and the CSS
  // html[data-theme] selectors all align — body always inherits via cascade.
  document.documentElement.setAttribute('data-theme', id);
  // Also keep on body as belt-and-suspenders for any residual body[] selectors
  document.body.setAttribute('data-theme', id);
}
