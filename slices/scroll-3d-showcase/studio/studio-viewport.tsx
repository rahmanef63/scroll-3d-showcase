'use client';

import type { CSSProperties, ReactNode } from 'react';
import { ASPECTS } from './presets';
import type { StudioLayout } from './use-studio-layout';

export interface StudioViewportProps {
  layout: StudioLayout;
  children: ReactNode;
}

/** Chrome each edge gives up, in px. Mirrors the fixed bars around it. */
const CHROME_TOP = 36;
const CHROME_BOTTOM = 56;
const RAIL = 208;
const PANEL = 256;
const PANEL_STUB = 32;

/**
 * A `transform` makes an element the containing block for `fixed` descendants.
 * That is the whole mechanism here: the showcase's canvas, HUD and boot overlay
 * all say `fixed inset-0`, and this box silently redefines what "the viewport"
 * means for them — no props threaded through the slice, no second layout path
 * inside it, and the public page is untouched.
 *
 * `translateZ(0)` over `translate(0)` on purpose: it is the form every engine
 * treats as a compositor hint, so the canvas keeps its own layer.
 */
const CONTAINING_BLOCK: CSSProperties = { transform: 'translateZ(0)' };

/**
 * The scene, either framed inside the chrome or filling the screen.
 *
 * Framing it is what makes the editor honest about composition: `screenShiftX`
 * is a fraction of the camera's half-width, so the shot only reads correctly at
 * the aspect ratio it will be viewed at. A full-bleed canvas with the chrome
 * laid over it previews *your window minus whatever the panel happens to cover*,
 * which is a composition no visitor ever sees. A 16:9 box previews 16:9.
 *
 * Below 1024px it stays full-bleed regardless — there is no room to letterbox a
 * phone, and the phone's own aspect is the one worth previewing there anyway.
 */
export function StudioViewport({ layout, children }: StudioViewportProps) {
  if (layout.preview || layout.mobile) {
    return (
      <div className="fixed inset-0 z-0" style={CONTAINING_BLOCK}>
        {children}
      </div>
    );
  }

  const ratio = ASPECTS.find((entry) => entry.id === layout.aspect)?.ratio ?? null;
  const right = layout.panelCollapsed ? PANEL_STUB : PANEL;

  /*
   * Both axes are computed, rather than `aspect-ratio` plus a max on one of them.
   * That shorthand only fits when the box is taller than the space: clamping the
   * width does not pull the height back with it, so a 16:9 frame in a 976×808
   * hole came out 976×808 — the container, wearing a ratio it did not have.
   *
   * `min()` against the container's own size in both directions is exact, and it
   * stays pure CSS: the container is a known inset of the viewport, so `100vw`
   * minus the bars is its width without measuring anything.
   */
  const width = `calc(100vw - ${RAIL + right}px)`;
  const height = `calc(100dvh - ${CHROME_TOP + CHROME_BOTTOM}px)`;
  const framed: CSSProperties = ratio
    ? {
        width: `min(${width}, ${height} * ${ratio})`,
        height: `min(${height}, ${width} / ${ratio})`,
      }
    : { width: '100%', height: '100%' };

  return (
    <div
      className="fixed z-0 flex items-center justify-center bg-showcase-bg"
      style={{ top: CHROME_TOP, bottom: CHROME_BOTTOM, left: RAIL, right }}
    >
      <div
        className="relative outline outline-showcase-line"
        style={{ ...CONTAINING_BLOCK, ...framed }}
      >
        {children}
      </div>
    </div>
  );
}
