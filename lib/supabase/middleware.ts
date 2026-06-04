import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: any) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── PERFORMANCE FIX ──────────────────────────────────────────────────────
  // getUser() makes a network round-trip to Supabase on EVERY navigation.
  // getSession() reads the JWT from cookies locally — no network call.
  // For routing/redirect decisions, getSession() is sufficient and ~10× faster.
  // Actual server page components use getUser() for security-critical queries.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  // ─────────────────────────────────────────────────────────────────────────

  const { pathname } = request.nextUrl;

  // Protected routes — redirect to login if no session
  const protectedPaths = ['/dashboard', '/schedule', '/calendar', '/ai-analysis', '/progress', '/profile'];
  const isProtected = protectedPaths.some(p => pathname.startsWith(p));
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Auth pages — redirect logged-in users to dashboard
  const isRecoveryRoute = pathname.startsWith('/reset-password') || pathname.startsWith('/auth/callback');
  if ((pathname === '/login' || pathname === '/signup') && user && !isRecoveryRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
