/**
 * useAppUpdate — detects when a new version of PlanIQ is available.
 *
 * How it works (Vercel PWA with skipWaiting: true):
 *  1. Fetches /version.json (always fresh — cache-busted) on mount and every 10 min.
 *  2. Compares the normalised latest version against NEXT_PUBLIC_APP_VERSION (set at build time).
 *  3. Also checks localStorage "planiq_dismissed_version" — if the user dismissed this
 *     exact version, hasUpdate = false (no persistent badge for already-seen updates).
 *  4. "Update Now" clears all SW caches then calls location.reload().
 *  5. "Dismiss" stores the latest version in localStorage so the badge won't re-appear.
 *
 * Version normalisation:
 *  Strips a leading "v" and any pre-release suffix (e.g. "v1.0.0-early-access" → "1.0.0")
 *  before comparing, so tag format differences don't create phantom updates.
 *
 * To release a new version:
 *  1. Update public/version.json   (version, releaseDate, summary, changelog).
 *  2. Update NEXT_PUBLIC_APP_VERSION in .env.local / Vercel env vars to match.
 *  3. Deploy — users will see the update badge on next page load.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';

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
  /** raw version string from NEXT_PUBLIC_APP_VERSION (build-time) */
  currentVersion: string;
  /** normalized (semver only) current version, e.g. "1.0.0" */
  currentVersionClean: string;
  /** version string from version.json (latest deployed) */
  latestVersion: string | null;
  /** normalized latest version */
  latestVersionClean: string | null;
  /** one-line what's new summary from version.json */
  summary: string | null;
  /** full changelog from version.json */
  changelog: ChangelogEntry[];
  /** ISO date string of latest release */
  releaseDate: string | null;
  /** whether the check is in progress */
  checking: boolean;
  /** whether the update reload is in progress */
  updating: boolean;
  /** call to force re-check */
  recheck: () => void;
  /** call to apply the update — clears SW caches then reloads */
  refreshToUpdate: () => Promise<void>;
  /** dismiss the current update badge without updating (stores in localStorage) */
  dismissUpdate: () => void;
}

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const DISMISSED_KEY = 'planiq_dismissed_version';

/** Strip leading "v" and pre-release tags, e.g. "v1.0.0-early-access" → "1.0.0" */
function normalizeVersion(v: string): string {
  return v.replace(/^v/i, '').split('-')[0].trim();
}

function getRawVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0';
}

function getDismissedVersion(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DISMISSED_KEY);
}

export function useAppUpdate(): AppUpdateState {
  const rawVersion          = getRawVersion();
  const currentVersionClean = normalizeVersion(rawVersion);

  const [manifest,         setManifest]         = useState<VersionManifest | null>(null);
  const [checking,         setChecking]         = useState(false);
  const [updating,         setUpdating]         = useState(false);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);

  // Load dismissed version from localStorage on mount
  useEffect(() => {
    setDismissedVersion(getDismissedVersion());
  }, []);

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
      // silently ignore network errors
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    fetchManifest();
    const timer = setInterval(fetchManifest, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchManifest]);

  const latestVersionClean = manifest ? normalizeVersion(manifest.version) : null;

  // hasUpdate: latest differs from current AND user hasn't dismissed this version
  const hasUpdate =
    latestVersionClean != null &&
    latestVersionClean !== currentVersionClean &&
    latestVersionClean !== dismissedVersion;

  /**
   * Apply update:
   *  1. Clear dismissed version so badge works correctly after reload.
   *  2. Delete all SW caches so new assets are fetched fresh.
   *  3. Unregister the current SW (new build registers a fresh one).
   *  4. Hard reload.
   */
  const refreshToUpdate = useCallback(async () => {
    setUpdating(true);
    // Clear any dismissed state so the badge behaves correctly post-update
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DISMISSED_KEY);
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
    } catch {
      // ignore — still reload even if cache clearing fails
    }
    window.location.reload();
  }, []);

  /** Dismiss the badge for the current latest version without reloading */
  const dismissUpdate = useCallback(() => {
    if (!latestVersionClean) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISSED_KEY, latestVersionClean);
    }
    setDismissedVersion(latestVersionClean);
  }, [latestVersionClean]);

  return {
    hasUpdate,
    currentVersion:       rawVersion,
    currentVersionClean,
    latestVersion:        manifest?.version ?? null,
    latestVersionClean,
    summary:              manifest?.summary ?? null,
    changelog:            manifest?.changelog ?? [],
    releaseDate:          manifest?.releaseDate ?? null,
    checking,
    updating,
    recheck:              fetchManifest,
    refreshToUpdate,
    dismissUpdate,
  };
}
