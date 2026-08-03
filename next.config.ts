import type { NextConfig } from 'next';

/** A year, for files whose name changes when their bytes do. */
const IMMUTABLE = 'public, max-age=31536000, immutable';
/** An hour of silence, then a week of serving stale while it refreshes. */
const ASSET = 'public, max-age=3600, stale-while-revalidate=604800';

const nextConfig: NextConfig = {
  // Docker runner copies .next/standalone and runs server.js.
  output: 'standalone',
  // Lets marketing routes opt into "use cache" with cacheLife/cacheTag.
  // Top-level since 16.2 — it was `experimental.cacheComponents` before that.
  cacheComponents: true,
  // Nothing here needs to announce the framework in every response.
  poweredByHeader: false,

  experimental: {
    // Rewrites `import { Vector3 } from 'three'` to the module that defines it,
    // so a cold compile does not walk the whole barrel. three is the only
    // dependency here big enough for it to matter.
    optimizePackageImports: ['three'],
  },

  /**
   * The model is the heaviest thing this site serves — megabytes against a page
   * measured in kilobytes — and Next serves `public/` with `max-age=0`, which
   * costs a revalidation round trip on every view and on the second request of
   * the same page load. An hour of freshness plus a week of stale-while-
   * revalidate keeps a model swap visible within the hour without paying that.
   *
   * Fonts are the opposite case: their filenames carry a build hash, so the
   * bytes behind a URL never change and the answer is a year.
   */
  async headers() {
    return [
      { source: '/(.*\\.(?:glb|gltf))', headers: [{ key: 'Cache-Control', value: ASSET }] },
      { source: '/docs/(.*\\.webp)', headers: [{ key: 'Cache-Control', value: ASSET }] },
      // three's Draco decoder, vendored under public/draco/. Not `immutable`:
      // the filenames are stable across three releases, so the bytes behind them
      // change on an upgrade.
      { source: '/draco/(.*)', headers: [{ key: 'Cache-Control', value: ASSET }] },
      { source: '/_next/static/media/(.*)', headers: [{ key: 'Cache-Control', value: IMMUTABLE }] },
    ];
  },
};

export default nextConfig;
