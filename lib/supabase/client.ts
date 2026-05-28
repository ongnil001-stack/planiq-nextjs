/* eslint-disable @typescript-eslint/no-explicit-any */
import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Standard SSR-compatible browser client (PKCE + cookie storage).
 * Used for all normal auth: login, signup, session refresh, protected routes.
 *
 * NOTE: @supabase/ssr hardcodes flowType:"pkce" internally and overwrites any
 * flowType option you pass — it is not configurable here.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ) as any;
}

/**
 * Implicit-flow client (localStorage, no PKCE code-verifier).
 * Used ONLY for password reset.
 *
 * Why this exists:
 * iOS PWAs have isolated storage — cookies and localStorage set inside the
 * PWA are NOT accessible in a regular Safari tab.  With PKCE, the
 * code_verifier is written to PWA storage when the user requests a reset;
 * when the email link opens in Safari the verifier is gone → "Link expired".
 *
 * With implicit flow Supabase puts the tokens directly in the URL hash
 * (#access_token=…&type=recovery) — no verifier lookup needed — so it
 * works regardless of which browser context opens the link.
 */
export function createImplicitClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'implicit',
        persistSession: true,
        detectSessionInUrl: false, // we handle URL parsing manually
        autoRefreshToken: true,
      },
    }
  );
}
