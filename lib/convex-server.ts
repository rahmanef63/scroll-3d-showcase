import { ConvexHttpClient } from 'convex/browser';

/**
 * Server-side Convex client, or `null` when the site is deployed without a
 * backend — which is the default. Every caller must handle `null` and fall back
 * to the bundled defaults; the public site has to render with zero env vars set.
 *
 * `undefined` means "not resolved yet", `null` means "resolved to no client", so
 * a missing URL is only looked up once per process.
 */
let cached: ConvexHttpClient | null | undefined;

export function getConvex(): ConvexHttpClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    cached = null;
    return cached;
  }

  try {
    cached = new ConvexHttpClient(url, {
      // No console noise during prerender, and no auth is ever set on this
      // client — the studio authorises with a token argument instead — so one
      // instance per process is safe to share.
      logger: false,
      // A hanging backend must not stall a build or wedge a request.
      fetch: (input, init) =>
        fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(5000) }),
    });
  } catch {
    // A malformed URL is a deploy typo, not a reason to 500 the whole site.
    cached = null;
  }
  return cached;
}
