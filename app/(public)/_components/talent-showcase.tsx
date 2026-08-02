'use client';

import { useMemo } from 'react';
import {
  Scroll3DShowcase,
  type AnchorMarker,
  type CameraKeyframe,
  type SceneSettings,
  type ShowcaseContent,
  type ShowcaseError,
} from '@/slices/scroll-3d-showcase';
import { TALENT_LABELS, buildSections } from '../_content/sections';

export interface TalentShowcaseProps {
  modelUrl: string;
  /** Words. Either this site's defaults or whatever /studio last saved. */
  content: ShowcaseContent;
  /** Omitted props fall through to the slice's own defaults. */
  keyframes?: readonly CameraKeyframe[];
  markers?: readonly AnchorMarker[];
  settings?: Partial<SceneSettings>;
}

/**
 * Host-side wiring: picks the asset, joins the saved copy to this site's rich
 * blocks, and decides what to do when the model fails to load. The slice itself
 * stays brand-agnostic. Camera and copy both arrive as props, so the page can
 * serve a studio-saved preset without this file knowing a backend exists.
 */
export function TalentShowcase({
  modelUrl,
  content,
  keyframes,
  markers,
  settings,
}: TalentShowcaseProps) {
  const sections = useMemo(() => buildSections(content), [content]);
  const labels = useMemo(() => ({ ...TALENT_LABELS, brand: content.brand }), [content.brand]);

  const handleError = (error: ShowcaseError) => {
    // The boot overlay already tells the visitor what happened; this is the
    // hook for wiring a toast or error reporter in a fuller app.
    console.error('[public:talent-showcase]', error.code, error.detail);
  };

  return (
    <Scroll3DShowcase
      modelUrl={modelUrl}
      title={content.title}
      bootTitle={content.bootTitle}
      sections={sections}
      keyframes={keyframes}
      markers={markers}
      settings={settings}
      labels={labels}
      onError={handleError}
    />
  );
}
