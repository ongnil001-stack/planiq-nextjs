/**
 * Font preference — save/load the user's chosen font style.
 * Applied via data-font on <html>; body uses font-family:inherit so it cascades globally.
 */

export const FONT_IDS = ['default', 'modern', 'soft', 'professional', 'creative', 'readable'] as const;
export type FontId = typeof FONT_IDS[number];

export const FONT_META: Record<FontId, {
  name: string; desc: string; family: string; tag: string;
}> = {
  default:      { name: 'PlanIQ Standard', desc: 'Clean, balanced — the original PlanIQ feel',    family: 'Sora',             tag: 'DEFAULT'  },
  modern:       { name: 'Modern Focus',    desc: 'Sharp, geometric, tech-forward',                 family: 'Inter',            tag: 'CRISP'    },
  soft:         { name: 'Soft Planner',    desc: 'Rounded, friendly — calming on the eyes',        family: 'DM Sans',          tag: 'CALM'     },
  professional: { name: 'Pro Mode',        desc: 'Polished and business-grade',                    family: 'Plus Jakarta Sans', tag: 'FORMAL'   },
  creative:     { name: 'Creative Flow',   desc: 'Geometric with personality — stands out cleanly',family: 'Space Grotesk',    tag: 'UNIQUE'   },
  readable:     { name: 'Bold Clarity',    desc: 'Optimised legibility — great for long reading',  family: 'Nunito',           tag: 'CLEAR'    },
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
  if (id !== 'default') document.documentElement.setAttribute('data-font', id);
}
