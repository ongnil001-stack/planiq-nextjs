'use client';

import { FONT_IDS, FONT_META, type FontId } from '@/lib/fontPref';

const PREVIEW_TEXT  = 'Plan your day with clarity.';
const PREVIEW_SUB   = "Today's focus: 3 tasks remaining.";

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
        position:'fixed', inset:0, zIndex:480,
        background:'rgba(0,0,0,.55)',
        backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition:'opacity .22s ease',
      }} />

      <div onClick={e => e.stopPropagation()} style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:490,
        borderRadius:'24px 24px 0 0',
        background:'var(--surf, #131424)',
        border:'1px solid var(--glass-border,rgba(255,255,255,.09))',
        borderBottom:'none',
        display:'flex', flexDirection:'column',
        boxShadow:'0 -12px 60px rgba(0,0,0,.45)',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform .32s cubic-bezier(.32,1,.52,1)',
        paddingBottom:'max(env(safe-area-inset-bottom,0px),20px)',
        maxHeight: '90dvh',
      }}>
        <div style={{ width:36,height:4,borderRadius:2,background:'var(--border2)',margin:'12px auto 0',flexShrink:0 }} />

        {/* Header */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 20px 12px', flexShrink:0,
          borderBottom:'1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:'var(--dark)', lineHeight:1 }}>Font Style</div>
            <div style={{ fontSize:11, color:'var(--mid)', marginTop:3 }}>Tap a style to preview — tap again to apply</div>
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
        <div style={{ flex:1, overflowY:'auto', overscrollBehavior:'contain', padding:'12px 16px' }}>
          {FONT_IDS.map(id => {
            const f        = FONT_META[id];
            const isActive = id === active;
            return (
              <button key={id} onClick={() => { onSelect(id); onClose(); }} style={{
                display:'flex', flexDirection:'column', gap:0,
                width:'100%', padding:'16px',
                background: isActive
                  ? 'var(--pur-lt,rgba(124,106,240,.12))'
                  : 'var(--glass-bg2,rgba(255,255,255,.04))',
                border: isActive
                  ? '1.5px solid var(--border2)'
                  : '1px solid var(--glass-border,rgba(255,255,255,.08))',
                borderRadius:16, cursor:'pointer',
                fontFamily:'inherit', textAlign:'left',
                WebkitTapHighlightColor:'transparent',
                transition:'background .12s, border-color .12s',
                marginBottom: 10,
              }}>

                {/* Top row: name + tag + check */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{
                      fontFamily: `'${f.family}', system-ui, sans-serif`,
                      fontSize:16, fontWeight:700,
                      color: isActive ? 'var(--purple)' : 'var(--dark)',
                      lineHeight:1,
                    }}>
                      {f.name}
                    </span>
                    <span style={{
                      fontSize:8, fontWeight:800, letterSpacing:'.6px',
                      color: isActive ? 'var(--purple)' : 'var(--mid)',
                      background: isActive ? 'var(--pur-lt)' : 'var(--surf2)',
                      borderRadius:4, padding:'2px 6px',
                      border: isActive ? '1px solid var(--border2)' : '1px solid var(--border)',
                    }}>
                      {f.tag}
                    </span>
                  </div>
                  {isActive ? (
                    <div style={{
                      width:20, height:20, borderRadius:'50%', background:'var(--purple)',
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                    }}>
                      <svg width="10" height="8" viewBox="0 0 13 10" fill="none">
                        <polyline points="1,5 5,9 12,1" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : (
                    <div style={{ width:20, height:20, borderRadius:'50%', border:'1.5px solid var(--border)', flexShrink:0 }} />
                  )}
                </div>

                {/* Live preview */}
                <div style={{
                  background:'var(--bg)',
                  border:'1px solid var(--border)',
                  borderRadius:10, padding:'12px 14px',
                }}>
                  <div style={{
                    fontFamily: `'${f.family}', system-ui, sans-serif`,
                    fontSize:15, fontWeight:700, color:'var(--dark)', lineHeight:1.3, marginBottom:5,
                  }}>
                    {PREVIEW_TEXT}
                  </div>
                  <div style={{
                    fontFamily: `'${f.family}', system-ui, sans-serif`,
                    fontSize:12, fontWeight:400, color:'var(--mid)', lineHeight:1.4,
                  }}>
                    {PREVIEW_SUB}
                  </div>
                  {/* Character showcase */}
                  <div style={{
                    fontFamily: `'${f.family}', system-ui, sans-serif`,
                    fontSize:11, color:'var(--lite)', marginTop:7, letterSpacing:'.5px',
                  }}>
                    Aa Bb Cc 01 23 — @#
                  </div>
                </div>

                {/* Description */}
                <div style={{
                  fontFamily: `'${f.family}', system-ui, sans-serif`,
                  fontSize:11, color:'var(--mid)', marginTop:8, lineHeight:1.4,
                }}>
                  {f.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
