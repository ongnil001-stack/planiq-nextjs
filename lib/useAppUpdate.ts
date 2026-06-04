/**
 * useAppUpdate — complete update detection for PlanIQ PWA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * TWO detection mechanisms work in parallel:
 *
 * ① SEMANTIC VERSION (version.json vs bundle)
 *    - version.json is the human-readable version record.
 *    - NEXT_PUBLIC_APP_VERSION is baked into the bundle by next.config.js.
 *    - Mismatch → hasUpdate = true → "New version available" badge.
 *    - This fires when the developer bumps version.json.
 *
 * ② BUILD SHA (/api/build-hash vs bundle)
 *    - NEXT_PUBLIC_BUILD_SHA is baked from VERCEL_GIT_COMMIT_SHA at build time.
 *    - /api/build-hash returns the CURRENTLY DEPLOYED SHA (server-side, no cache).
 *    - Mismatch → hasUpdate = true → badge even without a version bump.
 *    - This catches every Vercel deploy: bug-fixes, config changes, any push.
 *
 * NINJA UPDATE DETECTION (localStorage)
 *    - planiq_last_sha is stored on every load.
 *    - If it differs on the next load → a background update happened.
 *    - justUpdated = true → "App Updated Automatically" banner.
 *
 * CONTROLLERCHANGE FAST-BADGE
 *    - When the new Service Worker activates → immediately re-poll both endpoints.
 *    - Old bundle (old SHA) is still running → SHA mismatch → badge appears
 *      within seconds, before the user navigates away.
 *
 * RELEASE PROCESS (two options):
 *   Option A — version bump: update public/version.json, git push.
 *   Option B — any push:     just git push. Build SHA changes automatically.
 *   Both are detected. Option A also updates the changelog display.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ChangelogEntry { version: string; date: string; notes: string[]; }
export interface VersionManifest {
  version: string; releaseDate: string; summary: string; changelog: ChangelogEntry[];
}

export interface AppUpdateState {
  hasUpdate:           boolean;   // new version or new build available
  currentVersion:      string;    // raw NEXT_PUBLIC_APP_VERSION
  currentVersionClean: string;    // normalized, e.g. "1.1.2"
  currentBuildSha:     string;    // short SHA baked into this bundle
  latestVersion:       string | null;
  latestVersionClean:  string | null;
  latestBuildSha:      string | null; // short SHA of the live deployment
  summary:             string | null;
  changelog:           ChangelogEntry[];
  releaseDate:         string | null;
  checking:            boolean;
  updating:            boolean;
  justUpdated:         boolean;   // background update detected
  justUpdatedFrom:     string | null; // previous SHA/version
  recheck:             () => void;
  refreshToUpdate:     () => Promise<void>;
  dismissUpdate:       () => void;
  clearJustUpdated:    () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const POLL_MS       = 3 * 60 * 1000;  // 3 minutes
const DISMISSED_KEY = 'planiq_dismissed_sha';  // key changed: now per-SHA
const LAST_SHA_KEY  = 'planiq_last_sha';
const LAST_VER_KEY  = 'planiq_last_version';

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizeVersion(v: string): string {
  return v.replace(/^v/i, '').split('-')[0].trim();
}

function getRawVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0';
}

function getBuildSha(): string {
  return process.env.NEXT_PUBLIC_BUILD_SHA ?? 'dev';
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAppUpdate(): AppUpdateState {
  const rawVersion   = getRawVersion();
  const currentClean = normalizeVersion(rawVersion);
  const currentSha   = getBuildSha();

  const [manifest,         setManifest]         = useState<VersionManifest | null>(null);
  const [liveSha,          setLiveSha]          = useState<string | null>(null);
  const [checking,         setChecking]         = useState(false);
  const [updating,         setUpdating]         = useState(false);
  const [dismissed,        setDismissed]        = useState<string | null>(null);
  const [justUpdated,      setJustUpdated]      = useState(false);
  const [justUpdatedFrom,  setJustUpdatedFrom]  = useState<string | null>(null);

  const initDoneRef = useRef(false);

  // ── NINJA UPDATE + DISMISSED INIT ─────────────────────────────────────────
  useEffect(() => {
    if (initDoneRef.current || typeof window === 'undefined') return;
    initDoneRef.current = true;

    const lastSha  = localStorage.getItem(LAST_SHA_KEY);
    const lastVer  = localStorage.getItem(LAST_VER_KEY);
    const wasDismissed = localStorage.getItem(DISMISSED_KEY);

    // Detect background update: SHA or version changed since last open
    const shaChanged = lastSha && lastSha !== currentSha && currentSha !== 'dev';
    const verChanged = lastVer && lastVer !== currentClean;

    if (shaChanged || verChanged) {
      setJustUpdated(true);
      setJustUpdatedFrom(lastVer && verChanged ? `v${lastVer}` : lastSha ?? null);
      // Clear stale dismiss key
      localStorage.removeItem(DISMISSED_KEY);
    }

    // Persist current identifiers
    localStorage.setItem(LAST_SHA_KEY,  currentSha);
    localStorage.setItem(LAST_VER_KEY,  currentClean);

    // Load dismissed key
    if (wasDismissed) setDismissed(wasDismissed);
  }, [currentSha, currentClean]);

  // ── FETCH: version.json + /api/build-hash ─────────────────────────────────
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
        const data: VersionManifest = await vRes.value.json();
        setManifest(data);
      }
      if (bRes.status === 'fulfilled' && bRes.value.ok) {
        const data: { sha: string; version: string } = await bRes.value.json();
        setLiveSha(data.sha);
      }
    } catch { /* ignore */ }
    finally { setChecking(false); }
  }, []);

  // Polling
  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(t);
  }, [fetchAll]);

  // ── CONTROLLERCHANGE fast-badge ───────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const handler = () => fetchAll();
    navigator.serviceWorker.addEventListener('controllerchange', handler);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handler);
  }, [fetchAll]);

  // ── Derive hasUpdate ──────────────────────────────────────────────────────
  const latestClean = manifest ? normalizeVersion(manifest.version) : null;

  // Update available if EITHER version OR SHA changed, and not dismissed
  const versionMismatch = latestClean != null && latestClean !== currentClean;
  const shaMismatch     = liveSha != null && liveSha !== currentSha && currentSha !== 'dev' && liveSha !== 'dev';
  const updateKey       = shaMismatch ? (liveSha ?? '') : (latestClean ?? '');
  const hasUpdate       = (versionMismatch || shaMismatch) && updateKey !== dismissed;

  // ── refreshToUpdate ───────────────────────────────────────────────────────
  const refreshToUpdate = useCallback(async () => {
    setUpdating(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DISMISSED_KEY);
      // Intentionally keep LAST_SHA_KEY/LAST_VER_KEY as-is (old values)
      // so that after reload the new bundle detects the change → justUpdated banner
    }
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch { /* ignore */ }
    window.location.reload();
  }, []);

  // ── dismissUpdate ─────────────────────────────────────────────────────────
  const dismissUpdate = useCallback(() => {
    if (!updateKey) return;
    if (typeof window !== 'undefined') localStorage.setItem(DISMISSED_KEY, updateKey);
    setDismissed(updateKey);
  }, [updateKey]);

  // ── clearJustUpdated ──────────────────────────────────────────────────────
  const clearJustUpdated = useCallback(() => {
    setJustUpdated(false);
    setJustUpdatedFrom(null);
  }, []);

  return {
    hasUpdate,
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
