import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Only run on page routes — skip API routes, static assets, and build files.
    // This prevents the auth check running on /api/build-hash, /version.json,
    // sw.js, and every JS/CSS chunk the browser loads on navigation.
    '/((?!_next/static|_next/image|_next/data|api/|favicon\\.ico|icons|manifest\\.json|version\\.json|sw\\.js|workbox-|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|json|txt|xml|woff|woff2)$).*)',
  ],
};
