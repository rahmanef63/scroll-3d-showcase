import { cacheLife, cacheTag } from 'next/cache';
import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { SHOWCASE_TAG, loadShowcase } from '@/lib/showcase-source';
import { SiteNav } from './_components/site-nav';
import { TalentShowcase } from './_components/talent-showcase';

/** Captured from the live scene; `metadataBase` in the layout makes it absolute. */
const OG_IMAGE = '/og.jpg';

/**
 * Title and description follow the saved copy, so renaming the site in /studio
 * renames the browser tab, the search result and the link preview together.
 * Cached like the page itself — nothing per-request is read, so the route stays
 * static.
 *
 * The card image is a real frame of the running scene, shot by a headless
 * browser (`bun run capture`) rather than drawn by hand. It goes stale the day
 * the model or the copy changes, which is exactly when that command is worth
 * re-running — a link preview of the previous model is worse than none.
 */
export async function generateMetadata(): Promise<Metadata> {
  'use cache';
  cacheLife('days');
  cacheTag(SHOWCASE_TAG);

  const { content } = await loadShowcase();
  const { title, description } = content;

  const images = [{ url: OG_IMAGE, width: 1200, height: 630, alt: `${title} — ${description}` }];

  return {
    title,
    description,
    openGraph: { title, description, type: 'website', siteName: content.brand || title, images },
    twitter: { card: 'summary_large_image', title, description, images },
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
