'use client';

// The rAF loop writes these nodes directly 60×/s, so the whole ref bag travels
// as one prop. The compiler's ref rule cannot see that and flags every hand-off.
/* eslint-disable react-hooks/refs */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { DEFAULT_HUD_LABELS } from '../config/labels';
import {
  DEFAULT_KEYFRAMES,
  DEFAULT_MARKERS,
  DEFAULT_SCENE_SETTINGS,
} from '../config/keyframes';
import { useMediaFlags } from '../hooks/use-media-flags';
import { usePointerParallax } from '../hooks/use-pointer-parallax';
import { useScrollProgress } from '../hooks/use-scroll-progress';
import { useShowcaseEngine } from '../hooks/use-showcase-engine';
import { ShowcaseJumpProvider } from '../hooks/use-showcase-jump';
import type {
  AnchorMarker,
  CameraKeyframe,
  HudLabels,
  SceneSettings,
  ShowcaseError,
  ShowcaseSection,
} from '../types';
import { applyFrameToDom, type ShowcaseDomRefs } from '../utils/apply-frame-to-dom';
import { BootOverlay } from './boot-overlay';
import { PanelLayer } from './panel-layer';
import { ShowcaseHud } from './showcase-hud';

export interface Scroll3DShowcaseProps {
  /** Path to the .glb, relative to the site root. */
  modelUrl: string;
  /** Shown in the HUD bar. */
  title: string;
  /** Shown on the boot screen instead of `title`, when the host wants it different. */
  bootTitle?: string;
  /** Copy panels, in scroll order. The slice ships no content of its own. */
  sections: readonly ShowcaseSection[];
  keyframes?: readonly CameraKeyframe[];
  markers?: readonly AnchorMarker[];
  settings?: Partial<SceneSettings>;
  labels?: Partial<HudLabels>;
  /**
   * Set false when the host frames the scene in a box of its own. A framed
   * wrapper is `position: fixed`, so a spacer inside it contributes no page
   * height — and the scroll position is the whole timeline. The host renders
   * its own, outside the box.
   */
  scrollSpacer?: boolean;
  /** Lets the host surface load failures its own way — a toast, logging, anything. */
  onError?: (error: ShowcaseError) => void;
}

export function Scroll3DShowcase({
  modelUrl,
  title,
  bootTitle,
  sections,
  keyframes = DEFAULT_KEYFRAMES,
  markers = DEFAULT_MARKERS,
  settings,
  labels,
  scrollSpacer = true,
  onError,
}: Scroll3DShowcaseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mergedSettings = useMemo(
    () => ({ ...DEFAULT_SCENE_SETTINGS, ...settings }),
    [settings],
  );
  const mergedLabels = useMemo<HudLabels>(
    () => ({ ...DEFAULT_HUD_LABELS, ...labels }),
    [labels],
  );

  const domRefs: ShowcaseDomRefs = {
    meterFill: useRef<HTMLDivElement>(null),
    meterValue: useRef<HTMLElement>(null),
    sectionLabel: useRef<HTMLElement>(null),
    targetLabel: useRef<HTMLElement>(null),
    reticle: useRef<HTMLDivElement>(null),
    scrollHint: useRef<HTMLDivElement>(null),
    markers: useRef<(HTMLElement | null)[]>([]),
    panels: useRef<(HTMLElement | null)[]>([]),
    railNodes: useRef<(HTMLElement | null)[]>([]),
  };

  const { compact, reducedMotion } = useMediaFlags();
  const { getProgress, scrollToProgress } = useScrollProgress();
  const { getPointer } = usePointerParallax(!compact && !reducedMotion);

  const onFrame = useCallback(
    (state: Parameters<typeof applyFrameToDom>[1]) =>
      applyFrameToDom(domRefs, state, sections, mergedLabels),
    // domRefs holds stable ref objects; only the data feeding the DOM matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sections, mergedLabels],
  );

  const { status, error, loadFraction } = useShowcaseEngine({
    canvasRef,
    modelUrl,
    settings: mergedSettings,
    keyframes,
    markers,
    sections,
    compact,
    reducedMotion,
    getScroll: getProgress,
    getPointer,
    onFrame,
    onError,
  });

  const jump = useCallback(
    (progress: number) => scrollToProgress(progress, reducedMotion ? 'auto' : 'smooth'),
    [scrollToProgress, reducedMotion],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const forward = event.key === 'ArrowDown' || event.key === 'PageDown';
      const back = event.key === 'ArrowUp' || event.key === 'PageUp';
      if (!forward && !back) return;
      const current = getProgress();
      const next = forward
        ? sections.find((section) => section.progress > current + 0.02)
        : [...sections].reverse().find((section) => section.progress < current - 0.02);
      if (!next) return;
      event.preventDefault();
      jump(next.progress);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sections, getProgress, jump]);

  return (
    <>
      <div className="fixed inset-0 z-0 bg-showcase-bg">
        <canvas ref={canvasRef} className="block size-full" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(125%_92%_at_50%_50%,transparent_40%,var(--showcase-vignette)_100%)]"
        />
      </div>

      <ShowcaseJumpProvider jumpTo={jump} sections={sections}>
        <PanelLayer sections={sections} panelRefs={domRefs.panels} />
      </ShowcaseJumpProvider>

      <ShowcaseHud
        labels={mergedLabels}
        title={title}
        sections={sections}
        markers={markers}
        refs={domRefs}
        onJump={jump}
      />

      {/* Gives the page its scrollable height; the visuals are all fixed above it. */}
      {scrollSpacer ? (
        <div
          aria-hidden
          style={{ height: `${mergedSettings.scrollLength * 100}vh` }}
          className="pointer-events-none relative z-1"
        />
      ) : null}

      <BootOverlay
        status={status}
        loadFraction={loadFraction}
        error={error}
        labels={mergedLabels}
        title={bootTitle || title}
      />
    </>
  );
}
