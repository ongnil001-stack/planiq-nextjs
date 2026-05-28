import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Dedicated password-reset callback.
 * redirectTo in resetPasswordForEmail points HERE (/auth/reset).
 * Supabase appends ?code=xxx — we exchange it and always land on /reset-password.
 * No query-param tricks needed.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

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
            } catch {}
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}/reset-password`);
    }
  }

  // Code missing or exchange failed → back to login with error flag
  return NextResponse.redirect(`${origin}/login?error=reset_link_expired`);
}
