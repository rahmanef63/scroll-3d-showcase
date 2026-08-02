'use client';

import type { ReactNode } from 'react';
import type {
  HudLabels,
  ShowcaseContent,
  ShowcaseCopy,
  ShowcaseSection,
} from '@/slices/scroll-3d-showcase';
import { HeroTitle, Kicker, Lead, PanelTitle, TitleOutline } from './panel-atoms';
import { EXTRAS } from './panel-extras';

export { BLOCK_IDS, EXTRAS } from './panel-extras';

/** Joins saved copy to this site's blocks. The slice itself ships neither. */
export function buildSections(content: ShowcaseContent): ShowcaseSection[] {
  return content.sections.map((copy, index) => ({
    id: copy.id,
    name: copy.name,
    progress: copy.progress,
    fade: [copy.fadeIn, copy.fadeOut] as [number, number],
    align: copy.align,
    // The first panel carries the page's <h1>; the rest are <h2>s under it.
    content: <PanelCopy copy={copy} hero={index === 0} />,
  }));
}

function PanelCopy({ copy, hero }: { copy: ShowcaseCopy; hero: boolean }) {
  const Title = hero ? HeroTitle : PanelTitle;
  return (
    <>
      {copy.kicker ? <Kicker>{copy.kicker}</Kicker> : null}
      {copy.heading ? <Title>{withOutline(copy.heading)}</Title> : null}
      {copy.body ? <Lead>{copy.body}</Lead> : null}
      {EXTRAS[copy.id]}
    </>
  );
}

/** Everything after the first `|` gets the outlined treatment. */
function withOutline(heading: string): ReactNode {
  const at = heading.indexOf('|');
  if (at < 0) return heading;
  return (
    <>
      {heading.slice(0, at)}
      <TitleOutline>{heading.slice(at + 1)}</TitleOutline>
    </>
  );
}

/** HUD chrome. Overrides only what differs from the slice defaults; `brand` comes from the saved copy. */
export const TALENT_LABELS: Partial<HudLabels> = {
  errors: {
    FILE_PROTOCOL:
      'This page is open over file:// — the browser refuses to read the 3D model. Serve it over http.',
    MODEL_FETCH_FAILED:
      'The model never arrived. Check that the .glb is actually sitting in public/.',
    MODEL_PARSE_FAILED:
      'The model downloaded and then turned out to be unreadable. Probably corrupt.',
    WEBGL_UNAVAILABLE:
      'WebGL is switched off in this browser, so there is no scene to show you.',
  },
};
