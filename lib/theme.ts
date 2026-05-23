/**
 * PlanIQ Theme System — ported from PlanIQ_Prototype_v3.html
 * Each theme overrides CSS custom properties on <body data-theme="X">
 */

export const THEME_IDS = ['focused', 'soft', 'dark', 'colorful', 'minimal', 'pixel', 'lady'] as const;
export type ThemeId = typeof THEME_IDS[number];

export const THEME_META: Record<ThemeId, {
  name: string; desc: string; tag: string; bg: string; pri: string; acc: string;
}> = {
  focused:  { name: 'Focused & Clean',     desc: 'Violet & teal',       tag: 'DEFAULT', bg: '#0F0E17', pri: '#8B7CF6', acc: '#2DD4BF' },
  soft:     { name: 'Soft Professional',   desc: 'Calm & elegant',      tag: 'LIGHT',   bg: '#F5F7FF', pri: '#6C5CE7', acc: '#A78BFA' },
  dark:     { name: 'Dark & Serious',      desc: 'Deep & focused',      tag: 'DARK',    bg: '#060610', pri: '#7B6CF6', acc: '#5AABF0' },
  colorful: { name: 'Colorful Pro',        desc: 'Vibrant & energetic', tag: 'BRIGHT',  bg: '#EEF0FF', pri: '#E8445A', acc: '#FF8C42' },
  minimal:  { name: 'Minimal Executive',   desc: 'Premium & refined',   tag: 'GOLD',    bg: '#F8F8FA', pri: '#1A1A2E', acc: '#C9A96E' },
  pixel:    { name: 'Playful Pixel',       desc: 'Fun & organized',     tag: 'PIXEL',   bg: '#1A2432', pri: '#56C26A', acc: '#F0C040' },
  lady:     { name: 'Lady Professional',   desc: 'Stylish & modern',    tag: 'ROSE',    bg: '#FDF5F8', pri: '#D4608A', acc: '#9B72CF' },
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
  document.body.setAttribute('data-theme', id);
}
