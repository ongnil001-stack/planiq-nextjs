'use client';

/**
 * UpgradeSheet — the Plan & Billing paywall bottom sheet.
 * UI-only. No real payments yet. Phase 2: connect RevenueCat.
 */

import { useState } from 'react';
import { PLAN_META, setPlan } from '@/lib/planStore';

interface Props {
  open:    boolean;
  onClose: () => void;
  // Optional: feature that triggered this (for contextual copy)
  feature?: string;
}

const CHECK = (color: string) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0,marginTop:1 }}>
    <path d="M3 8l4 4 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function UpgradeSheet({ open, onClose, feature }: Props) {
  const [billing, setBilling] = useState<'monthly'|'yearly'>('yearly');
  const plus = PLAN_META.plus;
  const free = PLAN_META.free;

  const price   = billing === 'yearly' ? plus.price!.yearly : plus.price!.monthly;
  const perMo   = billing === 'yearly' ? '~$3.33/mo' : '';
  const savings = billing === 'yearly' ? 'Save 33%' : null;

  const handleStartTrial = () => {
    // Phase 2: trigger RevenueCat purchase flow
    // For now: demo — set plan to plus locally
    setPlan('plus');
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:500,
        background:'rgba(0,0,0,.65)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
        opacity: open?1:0, pointerEvents: open?'auto':'none', transition:'opacity .22s ease',
      }} />

      <div onClick={e=>e.stopPropagation()} style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:510,
        maxHeight:'92dvh', borderRadius:'26px 26px 0 0',
        background:'var(--surf,#131424)',
        border:'1px solid var(--glass-border,rgba(255,255,255,.09))', borderBottom:'none',
        display:'flex', flexDirection:'column',
        boxShadow:'0 -16px 64px rgba(0,0,0,.55)',
        transform: open?'translateY(0)':'translateY(100%)',
        transition:'transform .32s cubic-bezier(.32,1,.52,1)',
        paddingBottom:'max(env(safe-area-inset-bottom,0px),24px)',
      }}>
        <div style={{ width:36,height:4,borderRadius:2,background:'var(--border2)',margin:'12px auto 0',flexShrink:0 }} />

        {/* Scrollable */}
        <div style={{ flex:1, overflowY:'auto', overscrollBehavior:'contain', padding:'20px 20px 0' }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:20 }}>
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:'1.2px', color:'var(--purple)', textTransform:'uppercase', marginBottom:8 }}>
              ⚡ PlanIQ Plus
            </div>
            <div style={{ fontSize:24, fontWeight:900, color:'var(--dark)', letterSpacing:'-.4px', lineHeight:1.2, marginBottom:6 }}>
              Plan smarter with AI
            </div>
            <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.5, maxWidth:280, margin:'0 auto' }}>
              Unlock AI-powered planning, smart recommendations, and full customisation.
            </div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:10, fontSize:11, fontWeight:700, color:'#00C896', background:'rgba(0,200,150,.10)', border:'1px solid rgba(0,200,150,.25)', borderRadius:20, padding:'4px 12px' }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 2v3l2 1.5" stroke="#00C896" strokeWidth="1.4" strokeLinecap="round"/><circle cx="6" cy="6" r="5" stroke="#00C896" strokeWidth="1.2"/></svg>
              7-day free trial — no charge today
            </div>
          </div>

          {/* Billing toggle */}
          <div style={{ display:'flex', background:'var(--glass-bg2)', border:'1px solid var(--border)', borderRadius:12, padding:3, marginBottom:16 }}>
            {(['monthly','yearly'] as const).map(t => (
              <button key={t} onClick={() => setBilling(t)} style={{
                flex:1, padding:'9px 0', borderRadius:10, border:'none', cursor:'pointer', fontFamily:'inherit',
                fontSize:13, fontWeight:700,
                background: billing===t ? 'var(--purple)' : 'transparent',
                color: billing===t ? '#fff' : 'var(--mid)',
                transition:'all .15s', WebkitTapHighlightColor:'transparent',
              }}>
                {t === 'yearly' ? 'Yearly' : 'Monthly'}
                {t === 'yearly' && savings && (
                  <span style={{ marginLeft:6, fontSize:9, fontWeight:800, background:'rgba(255,255,255,.2)', borderRadius:5, padding:'1px 5px' }}>
                    {savings}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Price */}
          <div style={{ textAlign:'center', marginBottom:16 }}>
            <span style={{ fontSize:32, fontWeight:900, color:'var(--dark)', letterSpacing:'-.5px' }}>{price}</span>
            <span style={{ fontSize:13, color:'var(--mid)', marginLeft:4 }}>{billing==='yearly'?'/year':'/month'}</span>
            {perMo && <div style={{ fontSize:11, color:'var(--mid)', marginTop:2 }}>{perMo} billed annually</div>}
          </div>

          {/* Free vs Plus comparison */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:18 }}>
            {/* Free column */}
            <div style={{ background:'var(--glass-bg2)', border:'1px solid var(--border)', borderRadius:14, padding:'12px 10px' }}>
              <div style={{ fontSize:10, fontWeight:800, color:'var(--mid)', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:10 }}>Free</div>
              {free.features.slice(0,4).map((f,i) => (
                <div key={i} style={{ display:'flex', gap:6, marginBottom:6, alignItems:'flex-start' }}>
                  {CHECK('var(--mid)')}
                  <span style={{ fontSize:10, color:'var(--mid)', lineHeight:1.35 }}>{f}</span>
                </div>
              ))}
            </div>
            {/* Plus column */}
            <div style={{ background:'var(--pur-lt)', border:'1.5px solid var(--border2)', borderRadius:14, padding:'12px 10px', position:'relative' }}>
              <div style={{ fontSize:10, fontWeight:800, color:'var(--purple)', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:10 }}>
                Plus ✦
              </div>
              {plus.features.slice(0,5).map((f,i) => (
                <div key={i} style={{ display:'flex', gap:6, marginBottom:6, alignItems:'flex-start' }}>
                  {CHECK('var(--purple)')}
                  <span style={{ fontSize:10, color:'var(--dark)', lineHeight:1.35, fontWeight:500 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fixed CTA area */}
        <div style={{ padding:'12px 20px 0', flexShrink:0, borderTop:'1px solid var(--border)' }}>
          <button onClick={handleStartTrial} style={{
            width:'100%', padding:'16px 0',
            background:'var(--gradient,linear-gradient(135deg,#7C3AED,#0066FF))',
            border:'none', borderRadius:16,
            fontSize:15, fontWeight:800, color:'#fff',
            cursor:'pointer', fontFamily:'inherit',
            boxShadow:'0 4px 20px rgba(124,58,237,.35)',
            WebkitTapHighlightColor:'transparent',
            marginBottom:8,
          }}>
            Start 7-Day Free Trial
          </button>
          <button onClick={onClose} style={{
            width:'100%', padding:'12px 0',
            background:'transparent', border:'none',
            fontSize:13, fontWeight:600, color:'var(--mid)',
            cursor:'pointer', fontFamily:'inherit', marginBottom:4,
            WebkitTapHighlightColor:'transparent',
          }}>
            Continue with Free
          </button>
          <div style={{ textAlign:'center', fontSize:10, color:'var(--lite)', lineHeight:1.5, paddingBottom:4 }}>
            By continuing you agree to our{' '}
            <span style={{ textDecoration:'underline' }}>Terms</span> and{' '}
            <span style={{ textDecoration:'underline' }}>Privacy Policy</span>.
            {' '}Subscription renews automatically. Cancel anytime.
          </div>
        </div>
      </div>
    </>
  );
}
