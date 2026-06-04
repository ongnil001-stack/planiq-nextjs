/**
 * useAppUpdate — detects new versions and surfaces update state to the UI.
 *
 * ── Why "ninja updates" happen ────────────────────────────────────────────
 * PlanIQ is a PWA with `skipWaiting: true`. When a new build is deployed:
 *
 *   1. Vercel serves new assets (new JS bundle with new version baked in).
 *   2. The new Service Worker installs and immediately activates (skipWaiting).
 *   3. On the NEXT navigation / app open, the new bundle loads silently.
 *   4. Because the new bundle already has the NEW version baked in,
 *      version.json == bundle version → hasUpdate = false → badge never shows.
 *
 * The user's app updated without them seeing anything — a "ninja update."
 *
 * ── How we fix it ────────────────────────────────────────────────────────
 *
 *  A. NINJA UPDATE DETECTION (localStorage):
 *     On every app load we persist the current bundle version as
 *     `planiq_last_version`. On the next load we compare:
 *       lastVersion ≠ currentVersion  →  justUpdated = true
 *     This catches updates that happened while the app was closed.
 *
 *  B. FAST BADGE FOR OPEN-APP UPDATES (controllerchange):
 *     When the new SW takes control (controllerchange), we immediately
 *     re-poll version.json. At that moment the old bundle is still running
 *     (old version) but version.json already has the new version → badge
 *     appears before the user navigates away.
 *
 *  C. POLLING (every 3 min, reduced from 10):
 *     Catches updates while the user is actively using the app.
 *
 * ── Release checklist ─────────────────────────────────────────────────────
 *  1. Bump version in public/version.json.
 *  2. git push → Vercel auto-deploys, version is auto-baked into bundle.
 *  No Vercel env var update needed (next.config.js handles this).
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export interface ChangelogEntry {
  version: string;
  date: string;
  notes: string[];
}

export interface VersionManifest {
  version: string;
  releaseDate: string;
  summary: string;
  changelog: ChangelogEntry[];
}

export interface AppUpdateState {
  /** true when version.json has a newer version than the running build AND not dismissed */
  hasUpdate: boolean;
  /** raw version string from NEXT_PUBLIC_APP_VERSION (baked at build time) */
  currentVersion: string;
  /** normalised semver, e.g. "1.1.2" */
  currentVersionClean: string;
  /** latest version string from version.json */
  latestVersion: string | null;
  latestVersionClean: string | null;
  summary: string | null;
  changelog: ChangelogEntry[];
  releaseDate: string | null;
  checking: boolean;
  updating: boolean;
  /** true when a ninja update was detected on this load */
  justUpdated: boolean;
  /** the version the app was on before the ninja update */
  justUpdatedFrom: string | null;
  recheck: () => void;
  refreshToUpdate: () => Promise<void>;
  dismissUpdate: () => void;
  clearJustUpdated: () => void;
}

const POLL_MS         = 3 * 60 * 1000;   // 3 minutes (down from 10)
const DISMISSED_KEY   = 'planiq_dismissed_version';
const LAST_VER_KEY    = 'planiq_last_version';

function normalize(v: string): string {
  return v.replace(/^v/i, '').split('-')[0].trim();
}

function getRaw(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0';
}

export function useAppUpdate(): AppUpdateState {
  const rawVersion    = getRaw();
  const currentClean  = normalize(rawVersion);

  const [manifest,         setManifest]         = useState<VersionManifest | null>(null);
  const [checking,         setChecking]         = useState(false);
  const [updating,         setUpdating]         = useState(false);
  const [dismissed,        setDismissed]        = useState<string | null>(null);
  const [justUpdated,      setJustUpdated]      = useState(false);
  const [justUpdatedFrom,  setJustUpdatedFrom]  = useState<string | null>(null);

  // Track whether we've done the initial ninja-update check
  const initDoneRef = useRef(false);

  // ── A. NINJA UPDATE DETECTION ──────────────────────────────────────────
  useEffect(() => {
    if (initDoneRef.current || typeof window === 'undefined') return;
    initDoneRef.current = true;

    const last       = localStorage.getItem(LAST_VER_KEY);
    const wasDismiss = localStorage.getItem(DISMISSED_KEY);

    if (last && last !== currentClean) {
      // Version changed since last open → ninja update happened
      setJustUpdated(true);
      setJustUpdatedFrom(last);
      // Clear any stale dismissed version (it was for the old version)
      if (wasDismiss) localStorage.removeItem(DISMISSED_KEY);
    }

    // Always persist the current version for next-load comparison
    localStorage.setItem(LAST_VER_KEY, currentClean);

    // Load dismissed version
    const d = localStorage.getItem(DISMISSED_KEY);
    if (d) setDismissed(d);
  }, [currentClean]);

  // ── C. POLLING ─────────────────────────────────────────────────────────
  const fetchManifest = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch(`/version.json?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      });
      if (!res.ok) return;
      const data: VersionManifest = await res.json();
      setManifest(data);
    } catch {
      // ignore network errors silently
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    fetchManifest();
    const t = setInterval(fetchManifest, POLL_MS);
    return () => clearInterval(t);
  }, [fetchManifest]);

  // ── B. FAST BADGE: listen for SW controller change ─────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const handler = () => {
      // New SW just took control — old bundle is still running in memory.
      // Immediately re-check version.json: it will likely be newer than
      // the old bundle, making hasUpdate = true and the badge appear.
      fetchManifest();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handler);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handler);
  }, [fetchManifest]);

  const latestClean = manifest ? normalize(manifest.version) : null;

  // hasUpdate = new version available AND not dismissed
  const hasUpdate =
    latestClean != null &&
    latestClean !== currentClean &&
    latestClean !== dismissed;

  // ── refreshToUpdate: clear caches, unregister SW, reload ───────────────
  const refreshToUpdate = useCallback(async () => {
    setUpdating(true);
    if (typeof window !== 'undefined') {
      // Remove dismissed flag so badge logic resets correctly after reload
      localStorage.removeItem(DISMISSED_KEY);
      // DO NOT update LAST_VER_KEY here — we want the post-reload load
      // to detect the version change and show "Just Updated" banner.
      // (LAST_VER_KEY still has the old version; new bundle will have new version)
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

  // ── dismissUpdate: hide badge for this version without reloading ────────
  const dismissUpdate = useCallback(() => {
    if (!latestClean) return;
    if (typeof window !== 'undefined') localStorage.setItem(DISMISSED_KEY, latestClean);
    setDismissed(latestClean);
  }, [latestClean]);

  // ── clearJustUpdated: dismiss the "Just Updated" banner ────────────────
  const clearJustUpdated = useCallback(() => {
    setJustUpdated(false);
    setJustUpdatedFrom(null);
  }, []);

  return {
    hasUpdate,
    currentVersion:       rawVersion,
    currentVersionClean:  currentClean,
    latestVersion:        manifest?.version ?? null,
    latestVersionClean:   latestClean,
    summary:              manifest?.summary ?? null,
    changelog:            manifest?.changelog ?? [],
    releaseDate:          manifest?.releaseDate ?? null,
    checking,
    updating,
    justUpdated,
    justUpdatedFrom,
    recheck:              fetchManifest,
    refreshToUpdate,
    dismissUpdate,
    clearJustUpdated,
  };
}
