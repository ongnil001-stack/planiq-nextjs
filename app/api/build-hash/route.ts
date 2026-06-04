/**
 * /api/build-hash
 * ────────────────────────────────────────────────────────────────────────────
 * Returns the SHA and version of the CURRENTLY DEPLOYED build.
 * This route runs server-side on every request (force-dynamic), so it always
 * reflects the live Vercel deployment — not a cached old bundle.
 *
 * Used by useAppUpdate to detect new deployments even when version.json
 * hasn't been bumped (e.g. bug-fixes, content changes, config tweaks).
 *
 * Client-side logic:
 *  1. Bundle has NEXT_PUBLIC_BUILD_SHA baked in at build time (old SHA).
 *  2. This endpoint returns the LATEST deployed SHA.
 *  3. If they differ → a new deployment exists → show update badge.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const sha     = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? 'dev';
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0';

  return Response.json(
    { sha, version },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      },
    }
  );
}
