'use client';

/**
 * ThemePickerSheet — bottom-sheet theme browser
 * ─────────────────────────────────────────────────────────────────────────────
 * Groups all 17 themes into Recommended / Dark / Light sections.
 * Each card shows: name · tag · 3-color swatch strip · dark/light indicator.
 * Tapping a theme applies it immediately and closes the sheet.
 */

import { THEME_IDS, THEME_META, type ThemeId } from '@/lib/theme';

const THEME_GROUPS: { label: string; ids: ThemeId[] }[] = [
  {
    label: 'Recommended',
    ids: ['clean', 'focused', 'soft', 'dark', 'calm'],
  },
  {
    label: 'Dark Themes',
    ids: ['focused', 'dark', 'blue', 'clarity', 'deepfocus', 'probalance', 'pixel'],
  },
  {
    label: 'Light Themes',
    ids: ['clean', 'soft', 'minimal', 'calm', 'bright', 'teal', 'mint', 'coral', 'pink', 'lady', 'colorful'],
  },
];

interface Props {
  open:      boolean;
  active:    ThemeId;
  onSelect:  (id: ThemeId) => void;
  onClose:   () => void;
}

export default function ThemePickerSheet({ open, active, onSelect, onClose }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 380,
          background: 'rgba(0,0,0,.55)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .22s ease',
        }}
      />

      {/* Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 390,
          maxHeight: '88dvh',
          borderRadius: '24px 24px 0 0',
          background: 'var(--surf, #131424)',
          border: '1px solid var(--glass-border, rgba(255,255,255,.09))',
          borderBottom: 'none',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -12px 60px rgba(0,0,0,.45)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform .32s cubic-bezier(.32,1,.52,1)',
          paddingBottom: 'max(env(safe-area-inset-bottom,0px),20px)',
        }}
      >
        {/* Handle */}
        <div style={{ width:36, height:4, borderRadius:2, background:'var(--border2)', margin:'12px auto 0', flexShrink:0 }} />

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px 10px', flexShrink: 0,
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:'var(--dark)', lineHeight:1 }}>
              Choose Theme
            </div>
            <div style={{ fontSize:11, color:'var(--mid)', marginTop:3 }}>
              {THEME_IDS.length} themes · tap to preview & apply
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width:32, height:32, borderRadius:'50%',
              background:'var(--glass-bg2)', border:'1px solid var(--border)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', WebkitTapHighlightColor:'transparent',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="var(--mid)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex:1, overflowY:'auto', overscrollBehavior:'contain', padding:'12px 16px' }}>
          {THEME_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom:20 }}>

              {/* Group header */}
              <div style={{
                fontSize:10, fontWeight:800, color:'var(--mid)',
                textTransform:'uppercase', letterSpacing:'.7px',
                marginBottom:10,
              }}>
                {group.label}
              </div>

              {/* Theme cards */}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {group.ids.map(id => {
                  const t       = THEME_META[id];
                  const isActive = id === active;
                  const isDark   = ['focused','dark','pixel','blue','clarity','deepfocus','probalance'].includes(id);

                  return (
                    <button
                      key={id}
                      onClick={() => { onSelect(id); onClose(); }}
                      style={{
                        display:'flex', alignItems:'center', gap:12,
                        padding:'12px 14px',
                        background: isActive
                          ? 'var(--pur-lt,rgba(124,106,240,.12))'
                          : 'var(--glass-bg2,rgba(255,255,255,.04))',
                        border: isActive
                          ? '1.5px solid var(--border2)'
                          : '1px solid var(--glass-border,rgba(255,255,255,.08))',
                        borderRadius:14, cursor:'pointer',
                        fontFamily:'inherit', textAlign:'left',
                        WebkitTapHighlightColor:'transparent',
                        transition:'background .12s, border-color .12s',
                      }}
                    >
                      {/* Color swatch */}
                      <div style={{
                        width:44, height:36, borderRadius:10, overflow:'hidden',
                        flexShrink:0, display:'flex', gap:0,
                        border:'1px solid rgba(255,255,255,.10)',
                        boxShadow:'0 2px 8px rgba(0,0,0,.2)',
                      }}>
                        <div style={{ flex:2, background:t.bg  }} />
                        <div style={{ flex:1.5, background:t.pri }} />
                        <div style={{ flex:1, background:t.acc }} />
                      </div>

                      {/* Name + description */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:'var(--dark)', marginBottom:2 }}>
                          {t.name}
                        </div>
                        <div style={{ fontSize:11, color:'var(--mid)' }}>
                          {t.desc}
                        </div>
                      </div>

                      {/* Right side: tag + check */}
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                        <span style={{
                          fontSize:8, fontWeight:800, letterSpacing:'.5px',
                          color: isDark ? 'var(--sky,#60A5FA)' : 'var(--amber,#FFB830)',
                          background: isDark ? 'rgba(96,165,250,.12)' : 'rgba(255,184,48,.12)',
                          border: isDark ? '1px solid rgba(96,165,250,.22)' : '1px solid rgba(255,184,48,.22)',
                          borderRadius:5, padding:'2px 6px',
                        }}>
                          {isDark ? 'DARK' : 'LIGHT'}
                        </span>
                        {isActive ? (
                          <div style={{
                            width:20, height:20, borderRadius:'50%',
                            background:'var(--purple)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                          }}>
                            <svg width="10" height="8" viewBox="0 0 13 10" fill="none">
                              <polyline points="1,5 5,9 12,1" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        ) : (
                          <div style={{
                            width:20, height:20, borderRadius:'50%',
                            border:'1.5px solid var(--border)',
                          }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
