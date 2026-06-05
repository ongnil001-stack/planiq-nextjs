'use client';

/**
 * AwardsSheet — full awards browser in a bottom sheet
 * Opened from Profile when user taps "View All Awards"
 */

import type { Award, AwardStats } from '@/lib/awards';
import { computeAwards } from '@/lib/awards';
import SparkAssistant from '@/components/SparkAssistant';

interface Props {
  open:       boolean;
  onClose:    () => void;
  stats:      AwardStats;
  awardAnimOn: boolean;
}

const GROUPS: { label: string; ids: string[]; icon: string }[] = [
  { label: 'Streaks',     ids: ['streak_3','streak_7','streak_30'],              icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
  { label: 'Visits',      ids: ['visit_1','visit_7','visit_14','visit_30'],       icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { label: 'Completion',  ids: ['first_step','tasks_10','tasks_50','tasks_100'],  icon: 'M5 13l4 4L19 7' },
  { label: 'Focus',       ids: ['focus_pro','sharp_focus'],                       icon: 'M9 11l3 3L22 4M21 12a9 9 0 11-9-9' },
];

export default function AwardsSheet({ open, onClose, stats, awardAnimOn }: Props) {
  const all    = computeAwards(stats);
  const earned = all.filter(a => a.earned);
  const byId   = Object.fromEntries(all.map(a => [a.id, a]));

  const mode = earned.length >= 3 && stats.streakDays >= 7 ? 'celebrate'
             : stats.streakDays >= 3 || stats.visitStreak >= 3 ? 'streak'
             : earned.length > 0 ? 'idle'
             : 'sleeping';

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:480,
        background:'rgba(0,0,0,.60)',
        backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition:'opacity .22s ease',
      }} />

      {/* Sheet */}
      <div onClick={e => e.stopPropagation()} style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:490,
        maxHeight:'92dvh',
        borderRadius:'26px 26px 0 0',
        background:'var(--surf, #131424)',
        border:'1px solid var(--glass-border,rgba(255,255,255,.09))',
        borderBottom:'none',
        display:'flex', flexDirection:'column',
        boxShadow:'0 -16px 64px rgba(0,0,0,.50)',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform .32s cubic-bezier(.32,1,.52,1)',
        paddingBottom:'max(env(safe-area-inset-bottom,0px),20px)',
      }}>
        {/* Handle */}
        <div style={{ width:36,height:4,borderRadius:2,background:'var(--border2)',margin:'12px auto 0',flexShrink:0 }} />

        {/* Header */}
        <div style={{
          display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'14px 20px 12px',flexShrink:0,
          borderBottom:'1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontSize:17,fontWeight:800,color:'var(--dark)',lineHeight:1 }}>Awards & Momentum</div>
            <div style={{ fontSize:11,color:'var(--mid)',marginTop:3 }}>
              {earned.length} of {all.length} awards unlocked
            </div>
          </div>
          <button onClick={onClose} style={{
            width:32,height:32,borderRadius:'50%',
            background:'var(--glass-bg2)',border:'1px solid var(--border)',
            display:'flex',alignItems:'center',justifyContent:'center',
            cursor:'pointer',WebkitTapHighlightColor:'transparent',
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="var(--mid)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex:1, overflowY:'auto', overscrollBehavior:'contain', padding:'16px 16px 8px' }}>

          {/* SparkAssistant */}
          {awardAnimOn && (
            <div style={{ display:'flex',flexDirection:'column',alignItems:'center',marginBottom:20 }}>
              <SparkAssistant size={64} mode={mode} visible />
              <div style={{ fontSize:11,color:'var(--mid)',marginTop:6,textAlign:'center',fontWeight:500 }}>
                {stats.streakDays >= 7
                  ? `🔥 ${stats.streakDays}-day streak — keep going!`
                  : earned.length > 0 ? `${earned.length} award${earned.length===1?'':'s'} unlocked`
                  : 'Complete tasks to unlock your first award'}
              </div>
            </div>
          )}

          {/* Groups */}
          {GROUPS.map(group => {
            const groupAwards = group.ids.map(id => byId[id]).filter(Boolean) as Award[];
            if (!groupAwards.length) return null;
            const groupEarned = groupAwards.filter(a => a.earned).length;
            return (
              <div key={group.label} style={{ marginBottom:20 }}>
                {/* Group header */}
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d={group.icon} stroke="var(--purple)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontSize:11,fontWeight:800,color:'var(--purple)',textTransform:'uppercase',letterSpacing:'.6px' }}>
                      {group.label}
                    </span>
                  </div>
                  <span style={{ fontSize:10,color:'var(--mid)',fontWeight:600 }}>{groupEarned}/{groupAwards.length}</span>
                </div>

                {/* Award cards */}
                <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                  {groupAwards.map(a => (
                    <div key={a.id} style={{
                      display:'flex',alignItems:'flex-start',gap:12,
                      padding:'12px 14px',
                      background: a.earned ? `${a.color}10` : 'var(--glass-bg2,rgba(255,255,255,.04))',
                      border: a.earned ? `1.5px solid ${a.color}28` : '1px solid var(--glass-border,rgba(255,255,255,.08))',
                      borderRadius:14,
                      opacity: a.earned ? 1 : 0.72,
                    }}>
                      {/* Icon */}
                      <div style={{
                        width:38,height:38,borderRadius:11,flexShrink:0,
                        background: a.earned ? `${a.color}20` : 'var(--surf2)',
                        border: `1.5px solid ${a.earned ? a.color + '35' : 'var(--border)'}`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                      }}>
                        {a.earned ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d={a.icon} stroke={a.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--mid)" strokeWidth="1.8"/>
                            <path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--mid)" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        )}
                      </div>

                      {/* Text */}
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:3 }}>
                          <span style={{ fontSize:13,fontWeight:700,color: a.earned ? 'var(--dark)' : 'var(--mid)',lineHeight:1.2 }}>
                            {a.label}
                          </span>
                          {a.earned && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke={a.color} strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          )}
                        </div>
                        <div style={{ fontSize:11,color:'var(--mid)',lineHeight:1.45,marginBottom: a.earned ? 0 : 7 }}>
                          {a.desc}
                        </div>
                        {/* Progress bar — locked only */}
                        {!a.earned && (
                          <>
                            <div style={{ height:4,borderRadius:2,background:'var(--border)',overflow:'hidden',marginBottom:4 }}>
                              <div style={{
                                height:'100%',borderRadius:2,background:a.color,
                                width:`${Math.min(100,Math.round((a.progress.current/a.progress.target)*100))}%`,
                                transition:'width .4s ease',
                              }}/>
                            </div>
                            <div style={{ fontSize:10,color:'var(--lite)',fontWeight:600 }}>
                              {a.hint}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
