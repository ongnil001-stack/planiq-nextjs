'use client';

import { useState, useEffect } from 'react';
import {
  DASHBOARD_CARDS,
  loadDashboardPrefs,
  saveDashboardPrefs,
  type DashboardPrefs,
} from '@/lib/dashboardPrefs';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// Small inline SVG icon helper
function Icon({ d, size = 16, stroke = 'currentColor', strokeWidth = 1.6 }: {
  d: string | string[]; size?: number; stroke?: string; strokeWidth?: number;
}) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={{ display: 'block', flexShrink: 0 }}>
      {paths.map((p, i) => (
        <path key={i} d={p} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

// Card-specific icons
const CARD_ICONS: Record<string, React.ReactNode> = {
  todayCard:        <Icon d={['M10 3a7 7 0 100 14A7 7 0 0010 3z', 'M10 6v4.5l3 2']} stroke="var(--purple)" />,
  performanceCard:  <Icon d={['M4 15L8 9l3.5 4L15 6l3 3']} stroke="var(--cyan)" />,
  weeklySchedule:   <Icon d={['M3 8h14', 'M6 5V3m8 2V3', 'M5 5h10a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z']} stroke="var(--mint)" />,
  workloadBalance:  <Icon d={['M3 15l4-5 4 2.5 4-6 4 3', 'M3 4v12h14']} stroke="var(--amber)" />,
  aiPriorities:     <Icon d={['M10 3v2m0 10v2M3 10h2m10 0h2', 'M5.6 5.6l1.2 1.2m6.4 6.4 1.2 1.2M5.6 14.4l1.2-1.2m6.4-6.4 1.2-1.2', 'M10 7a3 3 0 100 6 3 3 0 000-6z']} stroke="var(--coral)" />,
  upcomingTasks:    <Icon d={['M4 6h12M4 10h8M4 14h10']} stroke="var(--mid)" />,
};

const CARD_COLORS: Record<string, string> = {
  todayCard:        'var(--purple)',
  performanceCard:  'var(--cyan)',
  weeklySchedule:   'var(--mint)',
  workloadBalance:  'var(--amber)',
  aiPriorities:     'var(--coral)',
  upcomingTasks:    'var(--mid)',
};

export default function DashboardCustomizeSheet({ open, onClose, onSaved }: Props) {
  const [prefs, setPrefs] = useState<DashboardPrefs | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load prefs when sheet opens
  useEffect(() => {
    if (open) {
      setPrefs(loadDashboardPrefs());
      setHasChanges(false);
    }
  }, [open]);

  function toggle(key: keyof DashboardPrefs) {
    if (!prefs) return;
    const card = DASHBOARD_CARDS.find(c => c.key === key);
    if (!card?.canHide) return; // can't toggle locked cards
    setPrefs(prev => prev ? { ...prev, [key]: !prev[key] } : prev);
    setHasChanges(true);
  }

  function handleSave() {
    if (!prefs) return;
    saveDashboardPrefs(prefs);
    onSaved();
    onClose();
  }

  function handleReset() {
    const defaults: DashboardPrefs = {} as DashboardPrefs;
    DASHBOARD_CARDS.forEach(c => { defaults[c.key] = c.defaultVisible; });
    setPrefs(defaults);
    setHasChanges(true);
  }

  if (!open || !prefs) return null;

  const visibleCount = DASHBOARD_CARDS.filter(c => prefs[c.key]).length;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1200,
          background: 'rgba(0,0,0,.55)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          animation: 'custOverlayIn .22s ease',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1201,
        background: 'var(--glass-bg, rgba(12,11,22,.97))',
        backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        borderTop: '1px solid var(--glass-border2, rgba(255,255,255,.12))',
        borderRadius: '20px 20px 0 0',
        maxHeight: '88dvh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -12px 60px rgba(0,0,0,.50)',
        animation: 'custSlideUp .30s cubic-bezier(.22,.8,.32,1)',
      }}>

        {/* Drag handle */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.18)' }} />
        </div>

        {/* Header */}
        <div style={{
          flexShrink: 0, padding: '8px 20px 14px',
          borderBottom: '1px solid var(--glass-border, rgba(255,255,255,.07))',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--dark)', letterSpacing: '-.3px' }}>
              Customize Home
            </div>
            <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 3 }}>
              {visibleCount} of {DASHBOARD_CARDS.length} sections visible
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={handleReset} style={{
              padding: '7px 12px', fontSize: 11, fontWeight: 700, color: 'var(--mid)',
              background: 'var(--glass-bg2, rgba(255,255,255,.06))',
              border: '1px solid var(--glass-border, rgba(255,255,255,.09))',
              borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
            }}>Reset</button>
            <button onClick={onClose} style={{
              width: 32, height: 32,
              background: 'var(--glass-bg2, rgba(255,255,255,.07))',
              border: '1px solid var(--glass-border, rgba(255,255,255,.10))',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--mid)', padding: 0,
            }}>
              <Icon d={['M5 5l10 10M15 5L5 15']} size={14} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Scrollable card list */}
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '14px 20px 4px' }}>
          <p style={{ fontSize: 12, color: 'var(--mid)', lineHeight: 1.5, marginBottom: 16 }}>
            Choose which sections appear on your Home screen. Changes take effect immediately after saving.
          </p>

          {DASHBOARD_CARDS.map((card, i) => {
            const isOn    = prefs[card.key];
            const locked  = !card.canHide;
            const accentColor = CARD_COLORS[card.key];

            return (
              <div
                key={card.key}
                onClick={() => !locked && toggle(card.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 14px',
                  marginBottom: i < DASHBOARD_CARDS.length - 1 ? 8 : 0,
                  background: isOn
                    ? 'var(--glass-bg2, rgba(255,255,255,.05))'
                    : 'rgba(255,255,255,.02)',
                  border: `1.5px solid ${isOn
                    ? 'var(--glass-border, rgba(255,255,255,.10))'
                    : 'var(--glass-border, rgba(255,255,255,.05))'}`,
                  borderRadius: 14,
                  cursor: locked ? 'default' : 'pointer',
                  transition: 'all .15s',
                  opacity: isOn ? 1 : 0.55,
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isOn ? `${accentColor}18` : 'rgba(255,255,255,.04)',
                  border: `1px solid ${isOn ? `${accentColor}30` : 'rgba(255,255,255,.06)'}`,
                  transition: 'all .15s',
                }}>
                  {CARD_ICONS[card.key]}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>{card.label}</span>
                    {locked && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: 'var(--mid)',
                        background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.10)',
                        borderRadius: 4, padding: '1px 5px', letterSpacing: '.5px', textTransform: 'uppercase',
                      }}>Required</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2, lineHeight: 1.4 }}>
                    {card.description}
                  </div>
                </div>

                {/* Toggle */}
                {locked ? (
                  <div style={{ flexShrink: 0 }}>
                    <Icon d={['M5 11a5 5 0 0110 0v1H5v-1z', 'M8 11V8a2 2 0 114 0v3']} size={15} stroke="var(--mid)" strokeWidth={1.5} />
                  </div>
                ) : (
                  <div style={{
                    width: 44, height: 26, borderRadius: 13, flexShrink: 0,
                    background: isOn ? 'var(--purple)' : 'var(--glass-bg2, rgba(255,255,255,.08))',
                    border: `1px solid ${isOn ? 'var(--purple)' : 'rgba(255,255,255,.12)'}`,
                    position: 'relative', transition: 'background .2s',
                  }}>
                    <div style={{
                      position: 'absolute', top: 2.5, left: isOn ? 20 : 2.5,
                      width: 21, height: 21, background: '#fff', borderRadius: '50%',
                      transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.28)',
                    }} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Pro tip */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', marginTop: 16, marginBottom: 4,
            background: 'rgba(124,106,240,.07)', border: '1px solid rgba(124,106,240,.18)', borderRadius: 12,
          }}>
            <Icon d={['M10 3v2m0 10v2M3 10h2m10 0h2', 'M5.6 5.6l1.2 1.2m6.4 6.4 1.2 1.2M5.6 14.4l1.2-1.2m6.4-6.4 1.2-1.2', 'M10 7a3 3 0 100 6 3 3 0 000-6z']} size={15} stroke="var(--purple)" />
            <span style={{ fontSize: 11, color: 'var(--mid)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--purple)', fontWeight: 700 }}>Pro tip:</strong> Hide sections you rarely use to keep your dashboard clean and focused.
            </span>
          </div>
          <div style={{ height: 8 }} />
        </div>

        {/* Footer */}
        <div style={{
          flexShrink: 0, padding: '12px 20px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
          borderTop: '1px solid var(--glass-border, rgba(255,255,255,.07))',
          background: 'var(--glass-bg, rgba(12,11,22,.98))',
        }}>
          <button
            onClick={handleSave}
            style={{
              width: '100%', padding: '15px 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: hasChanges ? 'var(--gradient)' : 'var(--glass-bg2, rgba(255,255,255,.07))',
              border: 'none', borderRadius: 14,
              color: hasChanges ? '#fff' : 'var(--mid)',
              fontSize: 15, fontWeight: 800, fontFamily: 'inherit',
              cursor: 'pointer', letterSpacing: '-.2px',
              boxShadow: hasChanges ? '0 4px 20px rgba(124,106,240,.30)' : 'none',
              transition: 'all .18s',
            }}
          >
            <Icon d={['M4 10l5 5 8-8']} size={16} stroke="currentColor" strokeWidth={2.2} />
            {hasChanges ? 'Apply Changes' : 'Done'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes custOverlayIn { from{opacity:0} to{opacity:1} }
        @keyframes custSlideUp {
          from { transform:translateY(100%); opacity:0 }
          to   { transform:translateY(0);    opacity:1 }
        }
      `}</style>
    </>
  );
}
