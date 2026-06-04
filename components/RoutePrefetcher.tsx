'use client';

/**
 * RoutePrefetcher — warms all main module routes on first app load.
 * Called once from root layout. Ensures that when the user taps a BottomNav
 * item for the first time, the loading skeleton shows immediately because
 * Next.js has already prefetched the route's loading state and static shell.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ROUTES = ['/dashboard', '/calendar', '/progress', '/profile'];

export default function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    // Stagger prefetches to avoid competing with the initial page load
    ROUTES.forEach((route, i) => {
      setTimeout(() => router.prefetch(route), 800 + i * 300);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null; // renders nothing
}
