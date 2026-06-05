'use client';

/**
 * UpgradePrompt — inline gating prompt shown when a Free user
 * tries to access a Plus/Pro feature.
 */

import { useState } from 'react';
import { FEATURE_COPY } from '@/lib/planStore';
import UpgradeSheet from './UpgradeSheet';

interface Props {
  feature: string; // key from FEATURE_COPY / FEATURE_PLAN
  children?: React.ReactNode; // optional content to replace
}

export default function UpgradePrompt({ feature, children }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const copy = FEATURE_COPY[feature] ?? {
    title: 'PlanIQ Plus Feature',
    desc:  'Unlock smarter planning, AI recommendations, and advanced insights.',
  };

  return (
    <>
      <div style={{
        margin:'4px 0',
        padding:'16px',
        background:'var(--pur-lt,rgba(124,106,240,.09))',
        border:'1.5px solid var(--border2,rgba(124,106,240,.25))',
        borderRadius:16,
        display:'flex', alignItems:'flex-start', gap:12,
      }}>
        {/* Lock icon */}
        <div style={{
          width:36, height:36, borderRadius:10, flexShrink:0,
          background:'var(--pur-lt)', border:'1px solid var(--border2)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--purple)" strokeWidth="1.8"/>
            <path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--purple)" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:800, color:'var(--dark)', marginBottom:3 }}>
            {copy.title} — Plus
          </div>
          <div style={{ fontSize:11, color:'var(--mid)', lineHeight:1.5, marginBottom:10 }}>
            {copy.desc}
          </div>
          <button onClick={() => setSheetOpen(true)} style={{
            padding:'9px 16px', borderRadius:10,
            background:'var(--purple)', border:'none',
            fontSize:12, fontWeight:700, color:'#fff',
            cursor:'pointer', fontFamily:'inherit',
            WebkitTapHighlightColor:'transparent',
          }}>
            Start 7-Day Free Trial
          </button>
          <button onClick={() => {}} style={{
            marginLeft:10, padding:'9px 10px',
            background:'none', border:'none',
            fontSize:12, fontWeight:600, color:'var(--mid)',
            cursor:'pointer', fontFamily:'inherit',
            WebkitTapHighlightColor:'transparent',
          }}>
            Maybe Later
          </button>
        </div>
      </div>

      <UpgradeSheet open={sheetOpen} onClose={() => setSheetOpen(false)} feature={feature} />
    </>
  );
}
