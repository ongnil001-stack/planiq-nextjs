'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

/** Fires a page_view event on every route change. */
function PageViewTracker() {
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    // Build the full URL for this page view
    const url = pathname + (searchParams.toString() ? `?${searchParams}` : '');
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

/** Initialize PostHog once on the client. No-op without the API key. */
export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host:               process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      ui_host:                'https://us.posthog.com',

      // Capture page views manually via PageViewTracker above
      capture_pageview:       false,
      // Capture rage clicks, dead clicks, etc.
      capture_pageleave:      true,

      // Session replay — records 10% of sessions; 100% when an error occurs
      session_recording: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,

      // Respect Do Not Track browser setting
      respect_dnt:            true,

      // Don't track in development unless explicitly overridden
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') ph.opt_out_capturing();
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}
