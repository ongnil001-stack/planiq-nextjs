'use client';

/**
 * SwipeDeleteRow  v3
 * ─────────────────────────────────────────────────────────────
 * Track approach  →  red panel starts outside the clip boundary.
 * 2-step confirmation:
 *   swipe-left → red panel snaps open
 *   tap DELETE  → panel transforms to "Cancel / Confirm Delete"
 *   tap Confirm → delete fires, 4-second undo toast
 *   tap Cancel  → row springs closed
 */

import { useRef, useState, useCallback } from 'react';

interface Props {
  onDelete: () => Promise<void>;
  undoLabel?: string;
  children: React.ReactNode;
  borderRadius?: number;
}

const DELETE_WIDTH   = 76;
const SNAP_THRESHOLD = 40;
const AUTO_DELETE_PX = 200;

export default function SwipeDeleteRow({
  onDelete,
  undoLabel    = 'Item deleted',
  children,
  borderRadius = 14,
}: Props) {
  const [offset,      setOffset]      = useState(0);
  const [snapped,     setSnapped]     = useState(false);
  const [confirming,  setConfirming]  = useState(false); // waiting for 2nd tap
  const [deleting,    setDeleting]    = useState(false);
  const [toastMsg,    setToastMsg]    = useState<string | null>(null);
  const [undoFn,      setUndoFn]      = useState<(() => void) | null>(null);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging  = useRef(false);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── touch handlers ─────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current  = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx =  touchStartX.current - e.touches[0].clientX;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (!isDragging.current && dy > 8 && dy > Math.abs(dx)) return;
    if (!isDragging.current && Math.abs(dx) > 6) isDragging.current = true;
    if (!isDragging.current) return;
    e.preventDefault();
    const base = snapped ? DELETE_WIDTH : 0;
    setOffset(Math.max(0, Math.min(base + dx, DELETE_WIDTH + 40)));
  }, [snapped]);

  const onTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (offset > AUTO_DELETE_PX) {
      // Hard swipe — skip confirmation, go straight to undo toast
      executeDelete();
    } else if (offset > SNAP_THRESHOLD) {
      setOffset(DELETE_WIDTH);
      setSnapped(true);
    } else {
      setOffset(0);
      setSnapped(false);
      setConfirming(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  // ── close on tap when panel is open ───────────────────────────────────────
  const handleContentTap = useCallback(() => {
    if (snapped) { setOffset(0); setSnapped(false); setConfirming(false); }
  }, [snapped]);

  // ── step 1: tap DELETE button → show confirmation ─────────────────────────
  const requestDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirming(true);
  }, []);

  // ── step 2a: user cancels ─────────────────────────────────────────────────
  const cancelDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirming(false);
    setOffset(0);
    setSnapped(false);
  }, []);

  // ── step 2b: user confirms ────────────────────────────────────────────────
  const confirmDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirming(false);
    executeDelete();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── actual delete with undo ───────────────────────────────────────────────
  const executeDelete = useCallback(() => {
    setDeleting(true);
    let undone = false;

    setToastMsg(undoLabel);
    setUndoFn(() => () => {
      undone = true;
      setDeleting(false);
      setOffset(0);
      setSnapped(false);
      setConfirming(false);
      setToastMsg(null);
      setUndoFn(null);
      if (timerRef.current) clearTimeout(timerRef.current);
    });

    timerRef.current = setTimeout(async () => {
      setToastMsg(null);
      setUndoFn(null);
      if (!undone) await onDelete();
    }, 4000);
  }, [onDelete, undoLabel]);

  const isAnimating = !isDragging.current;

  // ── panel content: trash icon → confirm buttons ───────────────────────────
  const panelContent = confirming ? (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 6, width: '100%', height: '100%',
      padding: '0 6px',
    }}>
      <button
        onClick={confirmDelete}
        style={{
          width: '100%', padding: '5px 0',
          background: 'rgba(255,255,255,.22)', border: 'none',
          borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 800,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Confirm
      </button>
      <button
        onClick={cancelDelete}
        style={{
          width: '100%', padding: '5px 0',
          background: 'transparent', border: '1px solid rgba(255,255,255,.3)',
          borderRadius: 6, color: 'rgba(255,255,255,.8)', fontSize: 10, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Cancel
      </button>
    </div>
  ) : (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, pointerEvents: 'auto' }}
      onClick={requestDelete}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
          stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '.3px' }}>DELETE</span>
    </div>
  );

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius }}>

      {/* Track: wider than the clip container so the red panel lives off-screen at rest */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleContentTap}
        style={{
          display:    'flex',
          width:      `calc(100% + ${confirming ? DELETE_WIDTH + 20 : DELETE_WIDTH}px)`,
          transform:  deleting ? 'translateX(-100%)' : `translateX(${-offset}px)`,
          transition: isAnimating
            ? 'transform .22s cubic-bezier(.25,.8,.25,1), opacity .22s ease, width .18s ease'
            : 'none',
          opacity:    deleting ? 0 : 1,
          willChange: 'transform',
        }}
      >
        {/* Content slot */}
        <div style={{
          flex:             1,
          minWidth:         0,
          borderRadius,
          userSelect:       'none',
          WebkitUserSelect: 'none',
        }}>
          {children}
        </div>

        {/* Red panel: off-screen at rest, slides in from right as track moves left */}
        <div
          style={{
            width:          confirming ? DELETE_WIDTH + 20 : DELETE_WIDTH,
            flexShrink:     0,
            background:     confirming ? '#c0392b' : '#FF3B30',
            borderRadius:   `0 ${borderRadius}px ${borderRadius}px 0`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            cursor:         'pointer',
            transition:     'width .18s ease, background .15s ease',
          }}
        >
          {panelContent}
        </div>
      </div>

      {/* Undo toast */}
      {toastMsg && (
        <div style={{
          position:             'fixed',
          bottom:               88,
          left:                 '50%',
          transform:            'translateX(-50%)',
          zIndex:               9999,
          display:              'flex',
          alignItems:           'center',
          gap:                  12,
          background:           'rgba(20,18,36,.96)',
          border:               '1px solid rgba(255,255,255,.12)',
          borderRadius:         14,
          padding:              '11px 16px',
          boxShadow:            '0 8px 32px rgba(0,0,0,.45)',
          backdropFilter:       'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          animation:            'swipeRowToastIn .2s ease',
          minWidth:             220,
          pointerEvents:        'auto',
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
              stroke="rgba(255,255,255,.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)' }}>
            {toastMsg}
          </span>
          {undoFn && (
            <button
              onClick={undoFn}
              style={{
                padding:                 '5px 12px',
                borderRadius:            8,
                background:              'rgba(124,106,240,.35)',
                border:                  '1px solid rgba(124,106,240,.50)',
                color:                   '#A89AF5',
                fontSize:                12,
                fontWeight:              800,
                cursor:                  'pointer',
                fontFamily:              'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes swipeRowToastIn {
          from { opacity:0; transform:translateX(-50%) translateY(10px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
