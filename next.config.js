/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/offline.html',
  },
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/icons\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'planiq-icons',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-static',
        expiration: { maxEntries: 128, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/_next\/image\?.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        networkTimeoutSeconds: 8,
        expiration: { maxEntries: 32, maxAgeSeconds: 5 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/planiq-nextjs\.vercel\.app\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'planiq-pages',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  // Required for Sentry instrumentation hook
  experimental: {
    instrumentationHook: true,
  },
};

// ── Sentry ────────────────────────────────────────────────────────────────────
// withSentryConfig is a no-op when NEXT_PUBLIC_SENTRY_DSN is not set,
// so this is safe to commit without a DSN.
const { withSentryConfig } = require('@sentry/nextjs');

const sentryWebpackOptions = {
  // Suppresses all Sentry build-time logs
  silent: true,
  // Upload source maps to Sentry for readable stack traces.
  // Requires SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT env vars.
  // Safe to leave unset — source maps just won't upload.
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
};

const sentryOptions = {
  // Disable the Sentry tunnel route (not needed for most apps)
  tunnelRoute: undefined,
  // Tree-shake Sentry logger statements from production bundle
  hideSourceMaps: true,
  // Disable automatic instrumentation of API routes to keep bundle lean
  disableLogger: true,
  // Don't automatically instrument all fetch calls (we do it explicitly)
  automaticVercelMonitors: false,
};

module.exports = withSentryConfig(
  withPWA(nextConfig),
  sentryWebpackOptions,
  sentryOptions,
);
