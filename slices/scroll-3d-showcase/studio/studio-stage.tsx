'use client';

import type { RefObject } from 'react';
import { Scroll3DShowcase } from '../components/scroll-3d-showcase';
import type {
  AnchorMarker,
  CameraKeyframe,
  HudLabels,
  SceneSettings,
  ShowcaseSection,
} from '../types';
import type { ShowcaseModel } from './types';
import { StudioViewport } from './studio-viewport';
import type { StudioLayout } from './use-studio-layout';

export interface StudioStageProps {
  layout: StudioLayout;
  model: ShowcaseModel | undefined;
  /** Remount key: a new model or an applied scene setting needs a fresh context. */
  sceneKey: string;
  title: string;
  bootTitle: string | undefined;
  labels: Partial<HudLabels>;
  keyframes: CameraKeyframe[];
  markers: AnchorMarker[];
  settings: Partial<SceneSettings>;
  scrollLength: number;
  /** Orbit/dolly surface. Lives inside the frame so the letterbox is inert. */
  surfaceRef: RefObject<HTMLDivElement | null>;
}

/** The slice ships no copy, and the studio has its own rail, so no panels here. */
const NO_SECTIONS: readonly ShowcaseSection[] = [];

/**
 * Everything a visitor would see, plus the page height that drives it.
 *
 * Split out of the composition root because the two have different jobs: this
 * one decides what the scene is mounted inside, the root decides what edits it.
 */
export function StudioStage({
  layout,
  model,
  sceneKey,
  title,
  bootTitle,
  labels,
  keyframes,
  markers,
  settings,
  scrollLength,
  surfaceRef,
}: StudioStageProps) {
  return (
    <>
      <StudioViewport layout={layout}>
    {/* Keyed on the model and the scene epoch: both need a fresh WebGL context. */}
    {model ? (
      <Scroll3DShowcase
        key={sceneKey}
        modelUrl={model.url} title={title} bootTitle={bootTitle}
        sections={NO_SECTIONS} scrollSpacer={false}
        keyframes={keyframes} markers={markers} settings={settings}
        labels={labels}
      />
    ) : (
      <div className="fixed inset-0 z-0 bg-showcase-bg" />
    )}

    {/* Orbit surface: above the canvas, below the copy layer (z-5) and the
        HUD (z-6). It swallows wheel events, so the scrubber is the scrub.
        Inside the frame, so a drag on the letterbox does not orbit. */}
    <div
      ref={surfaceRef}
      className="fixed inset-0 z-4 cursor-grab touch-none active:cursor-grabbing"
    />
  </StudioViewport>

  {/* The page height, out here on purpose: a framed viewport is `fixed`, so
      a spacer inside it would contribute none — and the scroll IS the timeline. */}
  <div
    aria-hidden
    style={{ height: `${scrollLength * 100}vh` }}
    className="pointer-events-none relative z-1"
  />
    </>
  );
}
