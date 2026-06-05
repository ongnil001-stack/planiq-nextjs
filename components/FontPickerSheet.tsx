'use client';

import { FONT_IDS, FONT_META, type FontId } from '@/lib/fontPref';

interface Props {
  open:     boolean;
  active:   FontId;
  onSelect: (id: FontId) => void;
  onClose:  () => void;
}

export default function FontPickerSheet({ open, active, onSelect, onClose }: Props) {
  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:380,
        background:'rgba(0,0,0,.55)',
        backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition:'opacity .22s ease',
      }} />

      <div onClick={e => e.stopPropagation()} style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:390,
        borderRadius:'24px 24px 0 0',
        background:'var(--surf, #131424)',
        border:'1px solid var(--glass-border,rgba(255,255,255,.09))',
        borderBottom:'none',
        display:'flex', flexDirection:'column',
        boxShadow:'0 -12px 60px rgba(0,0,0,.45)',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform .32s cubic-bezier(.32,1,.52,1)',
        paddingBottom:'max(env(safe-area-inset-bottom,0px),20px)',
      }}>
        <div style={{ width:36, height:4, borderRadius:2, background:'var(--border2)', margin:'12px auto 0', flexShrink:0 }} />

        {/* Header */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 20px 12px', flexShrink:0,
          borderBottom:'1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:'var(--dark)', lineHeight:1 }}>Font Style</div>
            <div style={{ fontSize:11, color:'var(--mid)', marginTop:3 }}>Choose how text looks across PlanIQ</div>
          </div>
          <button onClick={onClose} style={{
            width:32, height:32, borderRadius:'50%',
            background:'var(--glass-bg2)', border:'1px solid var(--border)',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', WebkitTapHighlightColor:'transparent',
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="var(--mid)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Font cards */}
        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:8 }}>
          {FONT_IDS.map(id => {
            const f        = FONT_META[id];
            const isActive = id === active;
            return (
              <button key={id} onClick={() => { onSelect(id); onClose(); }} style={{
                display:'flex', alignItems:'center', gap:14,
                padding:'14px 16px',
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
              }}>
                {/* Sample text in the actual font */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{
                    fontFamily: `'${f.family}', system-ui, sans-serif`,
                    fontSize:18, fontWeight:700,
                    color: isActive ? 'var(--purple)' : 'var(--dark)',
                    lineHeight:1.2, marginBottom:5, letterSpacing:'-.2px',
                  }}>
                    Aa — {f.name}
                  </div>
                  <div style={{
                    fontFamily: `'${f.family}', system-ui, sans-serif`,
                    fontSize:12, color:'var(--mid)', lineHeight:1.4, fontWeight:400,
                  }}>
                    {f.desc}
                  </div>
                  <div style={{
                    fontFamily: `'${f.family}', system-ui, sans-serif`,
                    fontSize:11, color:'var(--lite)', lineHeight:1.3, marginTop:4,
                    fontWeight: 500,
                  }}>
                    The quick planner organised the day.
                  </div>
                </div>

                {/* Selection indicator */}
                <div style={{ flexShrink:0 }}>
                  {isActive ? (
                    <div style={{
                      width:22, height:22, borderRadius:'50%', background:'var(--purple)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <svg width="11" height="9" viewBox="0 0 13 10" fill="none">
                        <polyline points="1,5 5,9 12,1" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : (
                    <div style={{
                      width:22, height:22, borderRadius:'50%',
                      border:'1.5px solid var(--border)',
                    }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
