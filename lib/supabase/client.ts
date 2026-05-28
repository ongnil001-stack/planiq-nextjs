/* eslint-disable @typescript-eslint/no-explicit-any */
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Use implicit flow so email links (password reset, magic link)
        // deliver tokens in the URL hash — no PKCE code_verifier needed.
        // This fixes the cross-context issue where the verifier stored in
        // the PWA's localStorage is not accessible when the email link
        // opens in a regular Safari tab.
        flowType: 'implicit',
      },
    }
  ) as any;
}
