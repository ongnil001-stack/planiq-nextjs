/**
 * useAppUpdate — user-controlled update detection for PlanIQ PWA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * UPDATE FLOW (fully user-controlled, no silent refreshes):
 *
 *  1. New build deploys to Vercel.
 *  2. PWA detects new Service Worker installing in the background.
 *  3. New SW reaches "waiting" state — it does NOT activate automatically
 *     because skipWaiting is false.
 *  4. hasUpdate = true → badge appears in Profile nav + System Settings.
 *  5. User taps "Update Now" at a convenient time.
 *  6. We send {type:'SKIP_WAITING'} to the waiting SW.
 *  7. New SW activates → controllerchange fires → page reloads with new bundle.
 *  8. Badge cleared, "up to date" shown.
 *
 * The app NEVER reloads mid-session without explicit user action.
 *
 * DETECTION (two parallel signals):
 *  A. SW waiting state — most reliable: new SW is installed and waiting
 *  B. version.json + /api/build-hash polling — catches deployments even if
 *     the SW check is slow or unavailable
 *
 * NINJA UPDATE DETECTION (localStorage):
 *  If the app was closed when the SW updated (iOS PWA reload), we detect
 *  the version change on next open and show "App was updated" banner.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ChangelogEntry { version: string; date: string; notes: string[]; }
export interface VersionManifest {
  version: string; releaseDate: string; summary: string; changelog: ChangelogEntry[];
}

export interface AppUpdateState {
  hasUpdate:           boolean;   // new version available (show badge)
  updateReady:         boolean;   // new SW is waiting — Update Now will take effect immediately
  currentVersion:      string;
  currentVersionClean: string;
  currentBuildSha:     string;
  latestVersion:       string | null;
  latestVersionClean:  string | null;
  latestBuildSha:      string | null;
  summary:             string | null;
  changelog:           ChangelogEntry[];
  releaseDate:         string | null;
  checking:            boolean;
  updating:            boolean;
  justUpdated:         boolean;
  justUpdatedFrom:     string | null;
  recheck:             () => void;
  refreshToUpdate:     () => Promise<void>;
  dismissUpdate:       () => void;
  clearJustUpdated:    () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const POLL_MS        = 3 * 60 * 1000;
const DISMISSED_KEY  = 'planiq_dismissed_sha';
const LAST_SHA_KEY   = 'planiq_last_sha';
const LAST_VER_KEY   = 'planiq_last_version';
const UPDATE_BADGE   = 'planiq_has_update';  // read by BottomNav

function normalize(v: string): string {
  return v.replace(/^v/i, '').split('-')[0].trim();
}
function getRaw(): string { return process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0'; }
function getSha(): string  { return process.env.NEXT_PUBLIC_BUILD_SHA   ?? 'dev';  }

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAppUpdate(): AppUpdateState {
  const rawVersion   = getRaw();
  const currentClean = normalize(rawVersion);
  const currentSha   = getSha();

  const [manifest,        setManifest]        = useState<VersionManifest | null>(null);
  const [liveSha,         setLiveSha]         = useState<string | null>(null);
  const [updateReady,     setUpdateReady]     = useState(false);  // SW waiting
  const [checking,        setChecking]        = useState(false);
  const [updating,        setUpdating]        = useState(false);
  const [dismissed,       setDismissed]       = useState<string | null>(null);
  const [justUpdated,     setJustUpdated]     = useState(false);
  const [justUpdatedFrom, setJustUpdatedFrom] = useState<string | null>(null);

  const initDoneRef = useRef(false);

  // ── Ninja update + dismissed init ─────────────────────────────────────────
  useEffect(() => {
    if (initDoneRef.current || typeof window === 'undefined') return;
    initDoneRef.current = true;

    const lastSha = localStorage.getItem(LAST_SHA_KEY);
    const lastVer = localStorage.getItem(LAST_VER_KEY);

    const shaChanged = lastSha && lastSha !== currentSha && currentSha !== 'dev';
    const verChanged = lastVer && lastVer !== currentClean;

    if (shaChanged || verChanged) {
      // Ninja update happened while app was closed — record it silently.
      // We intentionally do NOT show a banner or badge for this:
      // the user couldn't control it (iOS killed the context), so announcing it
      // would feel alarming. The app is already up to date at this point.
      setJustUpdated(true);
      setJustUpdatedFrom(lastVer && verChanged ? 'v' + lastVer : lastSha ?? null);
      // Don't clear dismissed key — let user's dismissed preference persist
    }

    localStorage.setItem(LAST_SHA_KEY, currentSha);
    localStorage.setItem(LAST_VER_KEY, currentClean);

    const d = localStorage.getItem(DISMISSED_KEY);
    if (d) setDismissed(d);
  }, [currentSha, currentClean]);

  // ── Service Worker waiting state detection ─────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const checkWaiting = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;
        // SW already in waiting state when page loaded
        if (reg.waiting) { setUpdateReady(true); return; }
        // Watch for future installs
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW installed, old SW still active → waiting state
              setUpdateReady(true);
            }
          });
        });
      } catch { /* ignore */ }
    };
    checkWaiting();
  }, []);

  // ── Fetch: version.json + /api/build-hash ─────────────────────────────────
  const fetchAll = useCallback(async () => {
    setChecking(true);
    try {
      const [vRes, bRes] = await Promise.allSettled([
        fetch(`/version.json?_=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        }),
        fetch(`/api/build-hash?_=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        }),
      ]);
      if (vRes.status === 'fulfilled' && vRes.value.ok) {
        setManifest(await vRes.value.json());
      }
      if (bRes.status === 'fulfilled' && bRes.value.ok) {
        const d: { sha: string } = await bRes.value.json();
        setLiveSha(d.sha);
      }
    } catch { /* ignore */ }
    finally { setChecking(false); }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(t);
  }, [fetchAll]);

  // ── Derive hasUpdate ──────────────────────────────────────────────────────
  const latestClean     = manifest ? normalize(manifest.version) : null;
  const versionMismatch = latestClean != null && latestClean !== currentClean;
  const shaMismatch     = liveSha != null && liveSha !== currentSha
                          && currentSha !== 'dev' && liveSha !== 'dev';
  const updateKey       = shaMismatch ? (liveSha ?? '') : (latestClean ?? '');
  const hasUpdate       = (versionMismatch || shaMismatch || updateReady) && updateKey !== dismissed;

  // Write badge signal to localStorage so BottomNav can read it
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasUpdate || updateReady) {
      localStorage.setItem(UPDATE_BADGE, '1');
    } else {
      localStorage.removeItem(UPDATE_BADGE);
    }
  }, [hasUpdate, updateReady]);

  // ── refreshToUpdate: user-initiated, sends SKIP_WAITING to waiting SW ─────
  const refreshToUpdate = useCallback(async () => {
    setUpdating(true);
    if (typeof window !== 'undefined') localStorage.removeItem(DISMISSED_KEY);
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          // Tell the waiting SW to activate — user-controlled
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          // Wait for it to take control before reloading
          await new Promise<void>(resolve => {
            navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
            // Fallback: reload after 1.5s if controllerchange doesn't fire
            setTimeout(resolve, 1500);
          });
        } else {
          // No waiting SW — fall back to cache-clear reload
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch { /* ignore */ }
    window.location.reload();
  }, []);

  const dismissUpdate = useCallback(() => {
    if (!updateKey) return;
    if (typeof window !== 'undefined') localStorage.setItem(DISMISSED_KEY, updateKey);
    setDismissed(updateKey);
    setUpdateReady(false);
  }, [updateKey]);

  const clearJustUpdated = useCallback(() => {
    setJustUpdated(false);
    setJustUpdatedFrom(null);
  }, []);

  return {
    hasUpdate,
    updateReady,
    currentVersion:       rawVersion,
    currentVersionClean:  currentClean,
    currentBuildSha:      currentSha,
    latestVersion:        manifest?.version ?? null,
    latestVersionClean:   latestClean,
    latestBuildSha:       liveSha,
    summary:              manifest?.summary ?? null,
    changelog:            manifest?.changelog ?? [],
    releaseDate:          manifest?.releaseDate ?? null,
    checking,
    updating,
    justUpdated,
    justUpdatedFrom,
    recheck:              fetchAll,
    refreshToUpdate,
    dismissUpdate,
    clearJustUpdated,
  };
}
