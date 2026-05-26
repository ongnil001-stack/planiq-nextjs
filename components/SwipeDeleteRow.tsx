'use client';

/**
 * SwipeDeleteRow
 * Wrap any row to get swipe-left → reveal Delete → tap → undo toast.
 *
 * Props
 *   onDelete()        – async fn that removes the item from DB + parent state
 *   undoLabel?        – text in the undo toast  (default "Item deleted")
 *   disabled?         – disables swipe (e.g. while another row is open)
 *   children          – the row content
 */

import { useRef, useState, useCallback } from 'react';

interface Props {
  onDelete: () => Promise<void>;
  undoLabel?: string;
  children: React.ReactNode;
  borderRadius?: number;
}

const DELETE_WIDTH = 76;   // px width of the red panel
const SNAP_THRESHOLD = 40; // px drag needed to snap open
const AUTO_DELETE_PX = 180; // drag this far → auto-trigger delete

export default function SwipeDeleteRow({
  onDelete,
  undoLabel = 'Item deleted',
  children,
  borderRadius = 14,
}: Props) {
  const [offset, setOffset]       = useState(0);          // current translateX (negative = swiped left)
  const [snapped, setSnapped]     = useState(false);       // delete panel fully revealed
  const [deleting, setDeleting]   = useState(false);       // mid-delete animation
  const [toastMsg, setToastMsg]   = useState<string|null>(null);
  const [undoFn,   setUndoFn]     = useState<(() => void)|null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging  = useRef(false);
  const timerRef    = useRef<ReturnType<typeof setTimeout>|null>(null);

  // ── touch handlers ────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current  = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);

    // Only hijack horizontal swipes; let vertical scroll pass through
    if (!isDragging.current && dy > 8 && Math.abs(dx) < dy) return;
    if (!isDragging.current && Math.abs(dx) > 6) isDragging.current = true;
    if (!isDragging.current) return;

    e.preventDefault(); // prevent scroll while swiping
    const base = snapped ? -DELETE_WIDTH : 0;
    const next = Math.min(0, base + dx);   // can't drag right past 0
    setOffset(next);
  }, [snapped]);

  const onTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    const absOffset = Math.abs(offset);

    if (absOffset > AUTO_DELETE_PX) {
      // Fast full swipe → auto trigger delete
      triggerDelete();
    } else if (absOffset > SNAP_THRESHOLD) {
      // Past threshold → snap open
      setOffset(-DELETE_WIDTH);
      setSnapped(true);
    } else {
      // Not far enough → spring back
      setOffset(0);
      setSnapped(false);
    }
  }, [offset]);

  // ── delete flow ───────────────────────────────────────────────────────────
  const triggerDelete = useCallback(async () => {
    // Animate the row out
    setDeleting(true);

    // Capture snapshot for undo (the parent's onDelete will update state)
    // We'll call onDelete after the undo window expires
    let undone = false;

    // Show undo toast immediately
    setToastMsg(undoLabel);
    setUndoFn(() => () => {
      undone = true;
      setDeleting(false);
      setOffset(0);
      setSnapped(false);
      setToastMsg(null);
      setUndoFn(null);
      if (timerRef.current) clearTimeout(timerRef.current);
    });

    // After 4 s — if not undone, commit the delete
    timerRef.current = setTimeout(async () => {
      setToastMsg(null);
      setUndoFn(null);
      if (!undone) {
        await onDelete();
      }
    }, 4000);
  }, [onDelete, undoLabel]);

  const handleDeleteTap = useCallback(() => {
    triggerDelete();
  }, [triggerDelete]);

  // ── close panel if tapping the main content while open ───────────────────
  const handleContentTap = useCallback(() => {
    if (snapped) { setOffset(0); setSnapped(false); }
  }, [snapped]);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius }}>

      {/* ── Red delete panel (revealed underneath on swipe) ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: DELETE_WIDTH,
          background: '#FF3B30',
          borderRadius: `0 ${borderRadius}px ${borderRadius}px 0`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
        onClick={handleDeleteTap}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '.3px' }}>DELETE</span>
        </div>
      </div>

      {/* ── Main row (slides left) ── */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleContentTap}
        style={{
          transform: `translateX(${deleting ? '-100%' : offset + 'px'})`,
          transition: isDragging.current ? 'none' : 'transform .22s cubic-bezier(.25,.8,.25,1)',
          opacity: deleting ? 0 : 1,
          willChange: 'transform',
          borderRadius,
          position: 'relative', zIndex: 1,
          userSelect: 'none', WebkitUserSelect: 'none',
        }}
      >
        {children}
      </div>

      {/* ── Undo toast ── */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(20,18,36,.96)',
            border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 14, padding: '11px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,.45)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            animation: 'toastIn .2s ease',
            minWidth: 220,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="rgba(255,255,255,.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)' }}>
            {toastMsg}
          </span>
          {undoFn && (
            <button
              onClick={undoFn}
              style={{
                padding: '5px 12px', borderRadius: 8,
                background: 'rgba(124,106,240,.35)',
                border: '1px solid rgba(124,106,240,.50)',
                color: '#A89AF5', fontSize: 12, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
