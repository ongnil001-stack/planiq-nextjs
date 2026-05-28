import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Supabase PKCE auth callback.
 *
 * Supabase appends ?code=xxx to whatever redirectTo URL you supply.
 * It does NOT append type=recovery — so we pass the destination as
 * a `next` query param in the original redirectTo and read it here.
 *
 * Password reset:  redirectTo = /auth/callback?next=/reset-password
 * OAuth / signup:  redirectTo = /auth/callback  (next defaults to /dashboard)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Only allow relative paths — prevents open-redirect attacks
  const rawNext = searchParams.get('next') ?? '/dashboard';
  const next = rawNext.startsWith('/') ? rawNext : '/dashboard';

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(
                ({ name, value, options }: { name: string; value: string; options?: object }) =>
                  cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
              );
            } catch {
              // Server Component context — middleware handles session refresh
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
