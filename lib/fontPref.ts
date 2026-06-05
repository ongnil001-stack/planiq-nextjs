/**
 * Font preference — save/load the user's chosen font style.
 * Applied via data-font attribute on <html> so all CSS inherits it.
 */

export const FONT_IDS = ['default', 'modern', 'soft', 'readable', 'professional'] as const;
export type FontId = typeof FONT_IDS[number];

export const FONT_META: Record<FontId, {
  name: string; desc: string; family: string; sample: string;
}> = {
  default:      { name: 'PlanIQ Standard', desc: 'Balanced and recommended',  family: 'Sora',             sample: 'The quick brown fox' },
  modern:       { name: 'Modern',          desc: 'Sharp and tech-focused',     family: 'Inter',            sample: 'The quick brown fox' },
  soft:         { name: 'Soft',            desc: 'Rounded and friendly',       family: 'DM Sans',          sample: 'The quick brown fox' },
  readable:     { name: 'Readable',        desc: 'Clear and easy on the eyes', family: 'Nunito',           sample: 'The quick brown fox' },
  professional: { name: 'Professional',    desc: 'Polished and formal',        family: 'Plus Jakarta Sans', sample: 'The quick brown fox' },
};

const LS_KEY = 'planiq_font';

export function getSavedFont(): FontId {
  if (typeof window === 'undefined') return 'default';
  const v = localStorage.getItem(LS_KEY) as FontId | null;
  return (v && FONT_IDS.includes(v)) ? v : 'default';
}

export function saveFont(id: FontId) {
  if (id === 'default') {
    localStorage.removeItem(LS_KEY);
    document.documentElement.removeAttribute('data-font');
  } else {
    localStorage.setItem(LS_KEY, id);
    document.documentElement.setAttribute('data-font', id);
  }
  window.dispatchEvent(new StorageEvent('storage', { key: LS_KEY, newValue: id }));
}

export function applyFontFromStorage() {
  const id = getSavedFont();
  if (id !== 'default') {
    document.documentElement.setAttribute('data-font', id);
  }
}
