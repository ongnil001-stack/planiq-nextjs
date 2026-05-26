'use client';

import { useState, useEffect, useRef } from 'react';
import {
  DASHBOARD_CARDS,
  ALL_SHORTCUTS,
  loadFullPrefs,
  saveFullPrefs,
  savePreset,
  applyPreset,
  deletePreset,
  defaultFullPrefs,
  type DashboardFullPrefs,
  type DashboardCardKey,
  type ShortcutKey,
  type AiRefreshInterval,
} from '@/lib/dashboardPrefs';

// ─── Icon helper ──────────────────────────────────────────────────────────────
function Ico({ d, d2, size = 16, stroke = 'currentColor', sw = 1.6 }: {
  d: string; d2?: string; size?: number; stroke?: string; sw?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={{ display:'block', flexShrink:0 }}>
      <path d={d} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>
      {d2 && <path d={d2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"/>}
    </svg>
  );
}

// Card icon paths (20×20)
const CARD_ICONS: Record<string, string> = {
  todayCard:        'M10 3a7 7 0 100 14A7 7 0 0010 3zM10 6v4.5l3 2',
  quickStats:       'M3 14l4-5 4 2.5 4-6 3 3',
  pinnedShortcuts:  'M5 3h10v10l-5-3-5 3V3z',
  performanceCard:  'M10 3a7 7 0 100 14A7 7 0 0010 3z M6 10h4l2-4 2 8 2-4h2',
  weeklySchedule:   'M3 8h14M6 5V3m8 2V3M5 5h10a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z',
  workloadBalance:  'M3 15l4-5 4 2.5 4-7 3 4M3 4v12h14',
  aiPriorities:     'M3 17l4-5 4 3 4-7 4 4M3 19h14M3 5v14',
  upcomingTasks:    'M4 6h12M4 10h8M4 14h10',
};

const CARD_COLORS: Record<string, string> = {
  todayCard:        'var(--purple)',
  quickStats:       'var(--cyan)',
  pinnedShortcuts:  'var(--amber)',
  performanceCard:  'var(--mint)',
  weeklySchedule:   'var(--purple)',
  workloadBalance:  'var(--amber)',
  aiPriorities:     'var(--mint)',
  upcomingTasks:    'var(--mid)',
};

const AI_REFRESH_OPTIONS: { value: AiRefreshInterval; label: string; sub: string }[] = [
  { value: 'onOpen', label: 'On App Open',   sub: 'Every time you launch PlanIQ' },
  { value: 'daily',  label: 'Daily',          sub: 'Once per day automatically'     },
  { value: 'weekly', label: 'Weekly',         sub: 'Once per week automatically'    },
  { value: 'manual', label: 'Manual Only',    sub: 'You control when AI re-analyzes'},
];

type Tab = 'cards' | 'shortcuts' | 'ai' | 'presets';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}


// Per-card icon bg/border tints — avoids color-mix(var()) which silently fails
const CARD_ICON_BG: Record<string, string> = {
  todayCard:        'rgba(124,106,240,.15)',
  quickStats:       'rgba(0,198,255,.15)',
  pinnedShortcuts:  'rgba(255,184,0,.15)',
  performanceCard:  'rgba(0,220,160,.15)',
  weeklySchedule:   'rgba(124,106,240,.15)',
  workloadBalance:  'rgba(255,184,0,.15)',
  aiPriorities:     'rgba(45,212,191,.15)',
  upcomingTasks:    'rgba(160,160,180,.15)',
};
const CARD_ICON_BORDER: Record<string, string> = {
  todayCard:        'rgba(124,106,240,.30)',
  quickStats:       'rgba(0,198,255,.30)',
  pinnedShortcuts:  'rgba(255,184,0,.30)',
  performanceCard:  'rgba(0,220,160,.30)',
  weeklySchedule:   'rgba(124,106,240,.30)',
  workloadBalance:  'rgba(255,184,0,.30)',
  aiPriorities:     'rgba(45,212,191,.30)',
  upcomingTasks:    'rgba(160,160,180,.30)',
};

export default function DashboardCustomizeSheet({ open, onClose, onSaved }: Props) {
  const [prefs,       setPrefs]       = useState<DashboardFullPrefs | null>(null);
  const [hasChanges,  setHasChanges]  = useState(false);
  const [activeTab,   setActiveTab]   = useState<Tab>('cards');
  const [dragIdx,     setDragIdx]     = useState<number | null>(null);
  const [dragOver,    setDragOver]    = useState<number | null>(null);
  const [presetName,  setPresetName]  = useState('');
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [toast,       setToast]       = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  useEffect(() => {
    if (open) { setPrefs(loadFullPrefs()); setHasChanges(false); setActiveTab('cards'); }
  }, [open]);

  function mutate(fn: (p: DashboardFullPrefs) => DashboardFullPrefs) {
    setPrefs(prev => prev ? fn(prev) : prev);
    setHasChanges(true);
  }

  // ── Card visibility toggle
  function toggleVisible(key: DashboardCardKey) {
    const card = DASHBOARD_CARDS.find(c => c.key === key);
    if (!card?.canHide) return;
    mutate(p => ({ ...p, visible: { ...p.visible, [key]: !p.visible[key] } }));
  }

  // ── Card size toggle
  function toggleSize(key: DashboardCardKey) {
    mutate(p => ({ ...p, size: { ...p.size, [key]: p.size[key] === 'full' ? 'compact' : 'full' } }));
  }

  // ── Drag-to-reorder (touch + mouse)
  function onDragStart(idx: number) { setDragIdx(idx); }
  function onDragEnter(idx: number) { setDragOver(idx); }
  function onDragEnd() {
    if (dragIdx !== null && dragOver !== null && dragIdx !== dragOver) {
      mutate(p => {
        const next = [...p.order];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(dragOver, 0, moved);
        return { ...p, order: next };
      });
    }
    setDragIdx(null); setDragOver(null);
  }

  // Touch drag
  const touchStartY = useRef<number>(0);
  const touchDragIdx = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent, idx: number) {
    touchStartY.current = e.touches[0].clientY;
    touchDragIdx.current = idx;
    setDragIdx(idx);
  }
  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    const row = el?.closest('[data-drag-idx]');
    if (row) {
      const idx = parseInt(row.getAttribute('data-drag-idx') || '-1', 10);
      if (idx >= 0) setDragOver(idx);
    }
  }
  function onTouchEnd() { onDragEnd(); touchDragIdx.current = null; }

  // ── Shortcut toggle
  function toggleShortcut(key: ShortcutKey) {
    mutate(p => {
      const has = p.pinnedShortcuts.includes(key);
      return {
        ...p,
        pinnedShortcuts: has
          ? p.pinnedShortcuts.filter(k => k !== key)
          : [...p.pinnedShortcuts, key],
      };
    });
  }

  // ── AI refresh
  function setAiRefresh(v: AiRefreshInterval) {
    mutate(p => ({ ...p, aiRefreshInterval: v }));
  }

  // ── Presets
  function handleSavePreset() {
    if (!prefs || !presetName.trim()) return;
    const next = savePreset(prefs, presetName.trim());
    setPrefs(next);
    saveFullPrefs(next);
    setPresetName('');
    setShowPresetInput(false);
    showToast(`Preset "${presetName.trim()}" saved`);
  }
  function handleApplyPreset(name: string) {
    if (!prefs) return;
    const next = applyPreset(prefs, name);
    setPrefs(next);
    setHasChanges(true);
    showToast(`Applied "${name}"`);
  }
  function handleDeletePreset(name: string) {
    if (!prefs) return;
    const next = deletePreset(prefs, name);
    setPrefs(next);
    saveFullPrefs(next);
    showToast(`Deleted "${name}"`);
  }

  // ── Save
  function handleSave() {
    if (!prefs) return;
    saveFullPrefs(prefs);
    onSaved();
    onClose();
  }

  function handleReset() {
    setPrefs(defaultFullPrefs());
    setHasChanges(true);
  }

  if (!open || !prefs) return null;

  const orderedCards = prefs.order
    .map(key => DASHBOARD_CARDS.find(c => c.key === key)!)
    .filter(Boolean);

  const visibleCount = DASHBOARD_CARDS.filter(c => prefs.visible[c.key]).length;
  const presetNames  = Object.keys(prefs.presets);

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'cards',     label: 'Cards',     icon: 'M2 2h7v7H2zm9 0h7v7h-7zM2 11h7v7H2zm9 0h7v7h-7z' },
    { id: 'shortcuts', label: 'Shortcuts', icon: 'M5 3h10v10l-5-3-5 3V3z' },
    { id: 'ai',        label: 'AI',        icon: 'M10 3v2m0 10v2M3 10h2m10 0h2M5.6 5.6l1.2 1.2m6.4 6.4 1.2 1.2M5.6 14.4l1.2-1.2m6.4-6.4 1.2-1.2' },
    { id: 'presets',   label: 'Presets',   icon: 'M4 4h4v4H4zm0 8h4v4H4zm8-8h4v4h-4zm0 8h4v4h-4z' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:1200,
        background:'rgba(0,0,0,.55)',
        backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)',
        animation:'custOverlayIn .22s ease',
      }} />

      {/* Sheet */}
      <div style={{
        position:'fixed', left:0, right:0, bottom:0, zIndex:1201,
        background:'var(--glass-bg, rgba(12,11,22,.97))',
        backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
        borderTop:'1px solid var(--glass-border2, rgba(255,255,255,.12))',
        borderRadius:'20px 20px 0 0',
        maxHeight:'91dvh', display:'flex', flexDirection:'column',
        boxShadow:'0 -12px 60px rgba(0,0,0,.50)',
        animation:'custSlideUp .30s cubic-bezier(.22,.8,.32,1)',
      }}>

        {/* Drag handle */}
        <div style={{ flexShrink:0, display:'flex', justifyContent:'center', paddingTop:12, paddingBottom:4 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,.18)' }} />
        </div>

        {/* Header */}
        <div style={{
          flexShrink:0, padding:'6px 20px 10px',
          borderBottom:'1px solid var(--glass-border, rgba(255,255,255,.07))',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:'var(--dark)', letterSpacing:'-.3px' }}>Customize Home</div>
            <div style={{ fontSize:11, color:'var(--mid)', marginTop:2 }}>{visibleCount} of {DASHBOARD_CARDS.length} sections visible</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={handleReset} style={btnSm}>Reset</button>
            <button onClick={onClose} style={closeBtn}>
              <Ico d="M5 5l10 10M15 5L5 15" size={14} sw={2} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ flexShrink:0, display:'flex', gap:6, padding:'10px 16px', borderBottom:'1px solid var(--glass-border, rgba(255,255,255,.07))' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4,
              padding:'7px 4px',
              borderRadius:10,
              background: activeTab === t.id ? 'var(--pur-lt, rgba(124,106,240,.15))' : 'var(--glass-bg2, rgba(255,255,255,.04))',
              border:`1.5px solid ${activeTab === t.id ? 'var(--purple)' : 'var(--glass-border, rgba(255,255,255,.07))'}`,
              color: activeTab === t.id ? 'var(--purple)' : 'var(--mid)',
              fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all .14s',
            }}>
              <Ico d={t.icon} size={14} stroke="currentColor" sw={1.5}/>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div style={{ flex:1, overflowY:'auto', overscrollBehavior:'contain', padding:'14px 16px 4px' }}>

          {/* ══ TAB: CARDS ══ */}
          {activeTab === 'cards' && (
            <>
              <p style={{ fontSize:11, color:'var(--mid)', marginBottom:12, lineHeight:1.5 }}>
                Hold <strong style={{ color:'var(--purple)' }}>☰</strong> to drag and reorder. Toggle visibility and size per card.
              </p>
              {orderedCards.map((card, i) => {
                if (!card) return null;
                const isOn    = prefs.visible[card.key];
                const locked  = !card.canHide;
                const size    = prefs.size[card.key];
                const isDragging = dragIdx === i;
                const isOver   = dragOver === i;
                const color    = CARD_COLORS[card.key];

                return (
                  <div
                    key={card.key}
                    data-drag-idx={i}
                    draggable
                    onDragStart={() => onDragStart(i)}
                    onDragEnter={() => onDragEnter(i)}
                    onDragEnd={onDragEnd}
                    onDragOver={e => e.preventDefault()}
                    onTouchStart={e => onTouchStart(e, i)}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    style={{
                      display:'flex', alignItems:'center', gap:10,
                      padding:'11px 12px',
                      marginBottom:7,
                      background: isOver
                        ? 'var(--pur-lt, rgba(124,106,240,.12))'
                        : isOn ? 'var(--glass-bg2, rgba(255,255,255,.05))' : 'rgba(255,255,255,.02)',
                      border:`1.5px solid ${isOver ? 'var(--purple)' : isOn ? 'var(--glass-border, rgba(255,255,255,.10))' : 'var(--glass-border, rgba(255,255,255,.05))'}`,
                      borderRadius:14,
                      opacity: isDragging ? 0.4 : isOn ? 1 : 0.5,
                      transition:'all .12s',
                      touchAction:'none',
                    }}
                  >
                    {/* Drag handle */}
                    <div style={{ flexShrink:0, color:'var(--mid)', opacity:.5, cursor:'grab', padding:'2px 4px', touchAction:'none' }}>
                      <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
                        <circle cx="3.5" cy="3"  r="1.5" fill="currentColor"/>
                        <circle cx="8.5" cy="3"  r="1.5" fill="currentColor"/>
                        <circle cx="3.5" cy="8"  r="1.5" fill="currentColor"/>
                        <circle cx="8.5" cy="8"  r="1.5" fill="currentColor"/>
                        <circle cx="3.5" cy="13" r="1.5" fill="currentColor"/>
                        <circle cx="8.5" cy="13" r="1.5" fill="currentColor"/>
                      </svg>
                    </div>

                    {/* Icon */}
                    <div style={{
                      width:36, height:36, borderRadius:10, flexShrink:0,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      background: isOn ? (CARD_ICON_BG[card.key] ?? 'rgba(124,106,240,.15)') : 'rgba(255,255,255,.04)',
                      border:`1px solid ${isOn ? (CARD_ICON_BORDER[card.key] ?? 'rgba(124,106,240,.30)') : 'rgba(255,255,255,.06)'}`,
                      transition:'all .15s',
                    }}>
                      <Ico d={CARD_ICONS[card.key]} size={15} stroke={isOn ? color : 'var(--mid)'} sw={1.5}/>
                    </div>

                    {/* Text */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'var(--dark)' }}>{card.label}</span>
                        {locked && <span style={reqBadge}>Required</span>}
                        {!locked && isOn && card.supportsCompact && (
                          <button onClick={() => toggleSize(card.key)} style={{
                            fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:6,
                            background: size === 'compact' ? 'rgba(0,198,255,.14)' : 'rgba(255,255,255,.07)',
                            border:`1px solid ${size === 'compact' ? 'rgba(0,198,255,.35)' : 'rgba(255,255,255,.12)'}`,
                            color: size === 'compact' ? 'var(--cyan)' : 'var(--mid)',
                            cursor:'pointer', fontFamily:'inherit', transition:'all .13s',
                          }}>
                            {size === 'compact' ? 'Compact' : 'Full'}
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize:10, color:'var(--mid)', marginTop:1, lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {card.description}
                      </div>
                    </div>

                    {/* Toggle */}
                    {locked
                      ? <div style={{ flexShrink:0, color:'var(--mid)', opacity:.4 }}><Ico d="M5 11a5 5 0 0110 0v1H5v-1zM8 11V8a2 2 0 114 0v3" size={15} sw={1.5}/></div>
                      : (
                        <div onClick={() => toggleVisible(card.key)} style={toggleTrack(isOn)}>
                          <div style={toggleThumb(isOn)} />
                        </div>
                      )
                    }
                  </div>
                );
              })}

              <div style={tipBox}>
                <Ico d="M10 3v2m0 10v2M3 10h2m10 0h2M5.6 5.6l1.2 1.2m6.4 6.4 1.2 1.2M5.6 14.4l1.2-1.2m6.4-6.4 1.2-1.2M10 7a3 3 0 100 6 3 3 0 000-6z" size={14} stroke="var(--purple)" sw={1.5}/>
                <span style={{ fontSize:11, color:'var(--mid)', lineHeight:1.5 }}>
                  <strong style={{ color:'var(--purple)', fontWeight:700 }}>Tip:</strong> Drag the ☰ handle to reorder. Tap <em>Full / Compact</em> to change card size.
                </span>
              </div>
              <div style={{ height:8 }} />
            </>
          )}

          {/* ══ TAB: SHORTCUTS ══ */}
          {activeTab === 'shortcuts' && (
            <>
              <p style={{ fontSize:11, color:'var(--mid)', marginBottom:14, lineHeight:1.5 }}>
                Choose which shortcuts appear in the Pinned Shortcuts row on your Home screen.
              </p>
              {ALL_SHORTCUTS.map(sc => {
                const pinned = prefs.pinnedShortcuts.includes(sc.key);
                return (
                  <div key={sc.key} style={{
                    display:'flex', alignItems:'center', gap:12, padding:'12px 14px', marginBottom:8,
                    background: pinned ? 'var(--glass-bg2, rgba(255,255,255,.05))' : 'rgba(255,255,255,.02)',
                    border:`1.5px solid ${pinned ? 'var(--glass-border, rgba(255,255,255,.10))' : 'rgba(255,255,255,.05)'}`,
                    borderRadius:14, opacity: pinned ? 1 : .55, transition:'all .14s',
                  }}>
                    <div style={{
                      width:38, height:38, borderRadius:10, flexShrink:0,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      background: pinned ? `color-mix(in srgb, ${sc.color} 15%, transparent)` : 'rgba(255,255,255,.04)',
                      border:`1px solid ${pinned ? `color-mix(in srgb, ${sc.color} 28%, transparent)` : 'rgba(255,255,255,.06)'}`,
                    }}>
                      <Ico d={sc.iconPath} d2={sc.iconPath2} size={16} stroke={pinned ? sc.color : 'var(--mid)'} sw={1.6}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--dark)' }}>{sc.label}</div>
                      <div style={{ fontSize:10, color:'var(--mid)', marginTop:1 }}>{sc.href}</div>
                    </div>
                    <div onClick={() => toggleShortcut(sc.key)} style={toggleTrack(pinned)}>
                      <div style={toggleThumb(pinned)} />
                    </div>
                  </div>
                );
              })}
              <div style={tipBox}>
                <Ico d="M5 3h10v10l-5-3-5 3V3z" size={14} stroke="var(--amber)" sw={1.5}/>
                <span style={{ fontSize:11, color:'var(--mid)', lineHeight:1.5 }}>
                  Pinned shortcuts appear above all dashboard cards for one-tap access.
                </span>
              </div>
              <div style={{ height:8 }} />
            </>
          )}

          {/* ══ TAB: AI ══ */}
          {activeTab === 'ai' && (
            <>
              <p style={{ fontSize:11, color:'var(--mid)', marginBottom:14, lineHeight:1.5 }}>
                Choose how often PlanIQ&apos;s AI re-analyzes your schedule and updates the Priorities card.
              </p>
              {AI_REFRESH_OPTIONS.map(opt => {
                const active = prefs.aiRefreshInterval === opt.value;
                return (
                  <div key={opt.value} onClick={() => setAiRefresh(opt.value)} style={{
                    display:'flex', alignItems:'center', gap:12, padding:'13px 14px', marginBottom:8,
                    background: active ? 'var(--pur-lt, rgba(124,106,240,.13))' : 'var(--glass-bg2, rgba(255,255,255,.04))',
                    border:`1.5px solid ${active ? 'var(--purple)' : 'var(--glass-border, rgba(255,255,255,.08))'}`,
                    borderRadius:14, cursor:'pointer', transition:'all .14s',
                  }}>
                    <div style={{
                      width:36, height:36, borderRadius:10, flexShrink:0,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      background: active ? 'rgba(124,106,240,.18)' : 'rgba(255,255,255,.05)',
                      border:`1px solid ${active ? 'rgba(124,106,240,.35)' : 'rgba(255,255,255,.08)'}`,
                    }}>
                      <Ico d={active
                        ? 'M10 3v2m0 10v2M3 10h2m10 0h2M5.6 5.6l1.2 1.2m6.4 6.4 1.2 1.2M5.6 14.4l1.2-1.2m6.4-6.4 1.2-1.2'
                        : 'M10 3a7 7 0 100 14A7 7 0 0010 3zM10 6v4.5l3 2'
                      } size={15} stroke={active ? 'var(--purple)' : 'var(--mid)'} sw={1.5}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color: active ? 'var(--dark)' : 'var(--mid)' }}>{opt.label}</div>
                      <div style={{ fontSize:10, color:'var(--mid)', marginTop:1 }}>{opt.sub}</div>
                    </div>
                    {active && (
                      <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--purple)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Ico d="M4 10l5 5 8-8" size={12} stroke="#fff" sw={2.2}/>
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={tipBox}>
                <Ico d="M10 3v2m0 10v2M3 10h2m10 0h2M5.6 5.6l1.2 1.2m6.4 6.4 1.2 1.2M5.6 14.4l1.2-1.2m6.4-6.4 1.2-1.2M10 7a3 3 0 100 6 3 3 0 000-6z" size={14} stroke="var(--purple)" sw={1.5}/>
                <span style={{ fontSize:11, color:'var(--mid)', lineHeight:1.5 }}>
                  More frequent analysis keeps your priorities sharp. &apos;Manual Only&apos; saves battery on low-end devices.
                </span>
              </div>
              <div style={{ height:8 }} />
            </>
          )}

          {/* ══ TAB: PRESETS ══ */}
          {activeTab === 'presets' && (
            <>
              <p style={{ fontSize:11, color:'var(--mid)', marginBottom:14, lineHeight:1.5 }}>
                Save your current layout as a named preset. Restore or switch between presets any time.
              </p>

              {/* Save current as preset */}
              {!showPresetInput ? (
                <button onClick={() => setShowPresetInput(true)} style={{
                  width:'100%', padding:'13px 16px', marginBottom:14,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  background:'var(--pur-lt, rgba(124,106,240,.12))',
                  border:'1.5px dashed rgba(124,106,240,.45)',
                  borderRadius:14, cursor:'pointer', fontFamily:'inherit',
                  fontSize:13, fontWeight:700, color:'var(--purple)',
                }}>
                  <Ico d="M10 3v14M3 10h14" size={15} stroke="var(--purple)" sw={2}/> Save Current Layout as Preset
                </button>
              ) : (
                <div style={{ marginBottom:14, display:'flex', gap:8 }}>
                  <input
                    type="text" value={presetName} maxLength={32} autoFocus
                    onChange={e => setPresetName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSavePreset(); if (e.key === 'Escape') setShowPresetInput(false); }}
                    placeholder="Preset name…"
                    style={{ flex:1, padding:'10px 12px', background:'var(--glass-bg2, rgba(255,255,255,.05))', border:'1.5px solid var(--purple)', borderRadius:10, color:'var(--dark)', fontSize:13, fontFamily:'inherit', outline:'none', colorScheme:'dark' }}
                  />
                  <button onClick={handleSavePreset} disabled={!presetName.trim()} style={{ padding:'10px 14px', borderRadius:10, background:'var(--purple)', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: presetName.trim() ? 1 : .5 }}>Save</button>
                  <button onClick={() => { setShowPresetInput(false); setPresetName(''); }} style={{ padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.10)', color:'var(--mid)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
                </div>
              )}

              {/* Saved presets list */}
              {presetNames.length === 0 ? (
                <div style={{ textAlign:'center', padding:'28px 0', color:'var(--mid)' }}>
                  <div style={{ fontSize:32, opacity:.25, marginBottom:8 }}>☁</div>
                  <div style={{ fontSize:12 }}>No presets saved yet</div>
                  <div style={{ fontSize:11, marginTop:4, opacity:.6 }}>Configure your layout and save it above</div>
                </div>
              ) : (
                presetNames.map(name => {
                  const p = prefs.presets[name];
                  const date = new Date(p.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
                  return (
                    <div key={name} style={{
                      display:'flex', alignItems:'center', gap:10, padding:'12px 14px', marginBottom:8,
                      background:'var(--glass-bg2, rgba(255,255,255,.04))',
                      border:'1.5px solid var(--glass-border, rgba(255,255,255,.08))',
                      borderRadius:14,
                    }}>
                      <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(124,106,240,.12)', border:'1px solid rgba(124,106,240,.22)' }}>
                        <Ico d="M4 4h4v4H4zm0 8h4v4H4zm8-8h4v4h-4zm0 8h4v4h-4z" size={15} stroke="var(--purple)" sw={1.4}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'var(--dark)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
                        <div style={{ fontSize:10, color:'var(--mid)', marginTop:1 }}>Saved {date}</div>
                      </div>
                      <button onClick={() => handleApplyPreset(name)} style={{ padding:'6px 12px', borderRadius:8, background:'var(--pur-lt, rgba(124,106,240,.15))', border:'1px solid rgba(124,106,240,.3)', color:'var(--purple)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>Apply</button>
                      <button onClick={() => handleDeletePreset(name)} style={{ width:30, height:30, borderRadius:8, background:'rgba(255,59,48,.08)', border:'1px solid rgba(255,59,48,.18)', color:'#FF3B30', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit', flexShrink:0, padding:0 }}>
                        <Ico d="M5 5l10 10M15 5L5 15" size={12} stroke="#FF3B30" sw={2}/>
                      </button>
                    </div>
                  );
                })
              )}
              <div style={{ height:8 }} />
            </>
          )}

        </div>{/* end scroll */}

        {/* Footer */}
        <div style={{
          flexShrink:0, padding:'12px 16px',
          paddingBottom:'max(16px, env(safe-area-inset-bottom, 16px))',
          borderTop:'1px solid var(--glass-border, rgba(255,255,255,.07))',
          background:'var(--glass-bg, rgba(12,11,22,.98))',
        }}>
          <button onClick={handleSave} style={{
            width:'100%', padding:'15px 0',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            background: hasChanges ? 'var(--gradient)' : 'var(--glass-bg2, rgba(255,255,255,.07))',
            border:'none', borderRadius:14,
            color: hasChanges ? '#fff' : 'var(--mid)',
            fontSize:15, fontWeight:800, fontFamily:'inherit',
            cursor:'pointer', letterSpacing:'-.2px',
            boxShadow: hasChanges ? '0 4px 20px rgba(124,106,240,.30)' : 'none',
            transition:'all .18s',
          }}>
            <Ico d="M4 10l5 5 8-8" size={16} stroke="currentColor" sw={2.2}/>
            {hasChanges ? 'Apply Changes' : 'Done'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:'calc(env(safe-area-inset-bottom, 0px) + 90px)', left:'50%', transform:'translateX(-50%)',
          zIndex:1300, pointerEvents:'none',
          background:'var(--glass-bg, rgba(30,28,48,.9))',
          border:'1px solid var(--glass-border2, rgba(255,255,255,.14))',
          borderRadius:16, padding:'10px 18px',
          fontSize:12, fontWeight:600, color:'var(--dark)', whiteSpace:'nowrap',
          backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
          boxShadow:'0 6px 24px rgba(0,0,0,.3)',
          animation:'toastIn .22s ease',
        }}>{toast}</div>
      )}

      <style>{`
        @keyframes custOverlayIn { from{opacity:0} to{opacity:1} }
        @keyframes custSlideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
      `}</style>
    </>
  );
}

// ── Shared micro-styles ────────────────────────────────────────────────────────
const toggleTrack = (on: boolean): React.CSSProperties => ({
  width:44, height:26, borderRadius:13, flexShrink:0, cursor:'pointer',
  background: on ? 'var(--purple)' : 'var(--glass-bg2, rgba(255,255,255,.08))',
  border:`1px solid ${on ? 'var(--purple)' : 'rgba(255,255,255,.12)'}`,
  position:'relative', transition:'background .2s',
});
const toggleThumb = (on: boolean): React.CSSProperties => ({
  position:'absolute', top:2.5, left: on ? 20 : 2.5,
  width:21, height:21, background:'#fff', borderRadius:'50%',
  transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.28)',
});
const reqBadge: React.CSSProperties = {
  fontSize:9, fontWeight:700, color:'var(--mid)',
  background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.10)',
  borderRadius:4, padding:'1px 5px', letterSpacing:'.5px', textTransform:'uppercase',
};
const btnSm: React.CSSProperties = {
  padding:'7px 12px', fontSize:11, fontWeight:700, color:'var(--mid)',
  background:'var(--glass-bg2, rgba(255,255,255,.06))',
  border:'1px solid var(--glass-border, rgba(255,255,255,.09))',
  borderRadius:9, cursor:'pointer', fontFamily:'inherit',
};
const closeBtn: React.CSSProperties = {
  width:32, height:32,
  background:'var(--glass-bg2, rgba(255,255,255,.07))',
  border:'1px solid var(--glass-border, rgba(255,255,255,.10))',
  borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
  cursor:'pointer', color:'var(--mid)', padding:0,
};
const tipBox: React.CSSProperties = {
  display:'flex', alignItems:'flex-start', gap:10, padding:'11px 13px', marginTop:14,
  background:'rgba(124,106,240,.07)', border:'1px solid rgba(124,106,240,.18)', borderRadius:12,
};
