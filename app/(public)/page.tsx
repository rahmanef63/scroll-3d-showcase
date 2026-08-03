import { cacheLife, cacheTag } from 'next/cache';
import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { SHOWCASE_TAG, loadShowcase } from '@/lib/showcase-source';
import { SiteNav } from './_components/site-nav';
import { TalentShowcase } from './_components/talent-showcase';

/**
 * Title and description follow the saved copy, so renaming the site in /studio
 * renames the browser tab, the search result and the link preview together.
 * Cached like the page itself — nothing per-request is read, so the route stays
 * static.
 *
 * No image yet: the only art this site has is a WebGL scene, and a link card
 * with a real title beats one with a stale screenshot of a model that has since
 * been swapped. `summary` rather than `summary_large_image` for the same reason
 * — the large card reserves space for a picture that is not coming.
 */
export async function generateMetadata(): Promise<Metadata> {
  'use cache';
  cacheLife('days');
  cacheTag(SHOWCASE_TAG);

  const { content } = await loadShowcase();
  const { title, description } = content;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website', siteName: content.brand || title },
    twitter: { card: 'summary', title, description },
  };
}

/**
 * Static marketing route. Nothing here is per-request, so the shell is cached
 * and the interactive layer hydrates on top of it. The tag is repeated here
 * rather than relied on to propagate out of `loadShowcase`, so a studio save
 * refreshes this entry deterministically.
 */
export default async function HomePage() {
  'use cache';
  cacheLife('days');
  cacheTag(SHOWCASE_TAG);

  const showcase = await loadShowcase();

  // The model is megabytes, and nothing can start fetching it until the engine
  // chunk has downloaded and hydrated. This puts one <link rel="preload"> in the
  // head, so the transfer begins while the HTML is still being parsed.
  //
  // The preload has to match the request the loader will make or the browser
  // fetches the whole thing twice: a file in public/ is a plain same-origin XHR,
  // and one in the backend's storage is a CORS request. The Cache-Control in
  // next.config.ts is the belt for the first case.
  const bundled = showcase.modelUrl.startsWith('/');
  preload(showcase.modelUrl, { as: 'fetch', ...(bundled ? {} : { crossOrigin: 'anonymous' }) });

  return (
    <>
      <TalentShowcase {...showcase} />
      <SiteNav />
    </>
  );
}
