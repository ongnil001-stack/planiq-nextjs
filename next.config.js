/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Disable in development to avoid confusion
  disable: process.env.NODE_ENV === 'development',
  // Offline fallback page
  fallbacks: {
    document: '/offline.html',
  },
  // Custom caching strategies
  runtimeCaching: [
    // Google Fonts — cache first
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
    // App icons and static assets — cache first
    {
      urlPattern: /\/icons\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'planiq-icons',
        expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    // Next.js static chunks — stale-while-revalidate
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-static',
        expiration: { maxEntries: 128, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // Next.js image optimization
    {
      urlPattern: /\/_next\/image\?.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
    // Supabase API — network first, fall back to cache
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        networkTimeoutSeconds: 8,
        expiration: { maxEntries: 32, maxAgeSeconds: 5 * 60 },
      },
    },
    // App pages — network first with offline fallback
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
};

module.exports = withPWA(nextConfig);
