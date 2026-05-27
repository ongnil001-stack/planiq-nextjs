/**
 * useAppUpdate — detects when a new version of PlanIQ is available.
 *
 * How it works (Vercel PWA with skipWaiting: true):
 *  1. Fetches /version.json (always fresh — cache-busted) on mount and every 10 min.
 *  2. Compares the fetched version against NEXT_PUBLIC_APP_VERSION (set at build time).
 *  3. If they differ, hasUpdate = true — show badge + update section.
 *  4. "Refresh Now" calls location.reload(); the SW already took over, so the
 *     new code loads immediately.
 *
 * To release a new version:
 *  1. Update public/version.json (version, releaseDate, summary, changelog).
 *  2. Update NEXT_PUBLIC_APP_VERSION in .env.local / Vercel env vars.
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
  /** true when version.json has a newer version than the running build */
  hasUpdate: boolean;
  /** version string from NEXT_PUBLIC_APP_VERSION (build-time) */
  currentVersion: string;
  /** version string from version.json (latest deployed) */
  latestVersion: string | null;
  /** one-line what's new summary from version.json */
  summary: string | null;
  /** full changelog from version.json */
  changelog: ChangelogEntry[];
  /** ISO date string of latest release */
  releaseDate: string | null;
  /** whether the check is in progress */
  checking: boolean;
  /** call to force re-check */
  recheck: () => void;
  /** call to apply the update — reloads the page */
  refreshToUpdate: () => void;
}

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

function getRunningVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0';
}

export function useAppUpdate(): AppUpdateState {
  const currentVersion = getRunningVersion();
  const [manifest, setManifest]   = useState<VersionManifest | null>(null);
  const [checking, setChecking]   = useState(false);

  const fetchManifest = useCallback(async () => {
    setChecking(true);
    try {
      // Cache-bust so the browser never serves a stale version.json from SW cache
      const res = await fetch('/version.json?_=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return;
      const data: VersionManifest = await res.json();
      setManifest(data);
    } catch {
      // silently ignore network errors — do not crash the app
    } finally {
      setChecking(false);
    }
  }, []);

  // Initial check + polling
  useEffect(() => {
    fetchManifest();
    const timer = setInterval(fetchManifest, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchManifest]);

  // Compare versions (simple string compare; works for semver X.Y.Z)
  const hasUpdate = manifest != null && manifest.version !== currentVersion;

  return {
    hasUpdate,
    currentVersion,
    latestVersion:    manifest?.version ?? null,
    summary:          manifest?.summary ?? null,
    changelog:        manifest?.changelog ?? [],
    releaseDate:      manifest?.releaseDate ?? null,
    checking,
    recheck:          fetchManifest,
    refreshToUpdate:  () => window.location.reload(),
  };
}
