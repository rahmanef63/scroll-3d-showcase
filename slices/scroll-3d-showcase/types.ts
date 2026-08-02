import type { ReactNode } from 'react';

/* ---------------------------------------------------------------- errors */

export type ShowcaseErrorCode =
  | 'FILE_PROTOCOL'
  | 'MODEL_FETCH_FAILED'
  | 'MODEL_PARSE_FAILED'
  | 'WEBGL_UNAVAILABLE';

export interface ShowcaseError {
  code: ShowcaseErrorCode;
  /** Machine-readable detail for logs — never rendered raw to end users. */
  detail?: string;
}

/* ------------------------------------------------------------ camera rig */

/** One stop on the scroll timeline. `p` runs 0 (top) → 1 (bottom). */
export interface CameraKeyframe {
  p: number;
  /** Horizontal orbit in degrees. Sweep across all keyframes should total 360. */
  azimuth: number;
  /** Vertical orbit in degrees. Positive looks down at the model. */
  elevation: number;
  /** Distance from the look-at point. Smaller = closer. */
  radius: number;
  /** Height of the look-at point in normalised model space (top +0.9, feet -0.9). */
  targetY: number;
  /**
   * Lateral look-at offset for features off the model's centre line — the
   * sidearm, a held prop, an asymmetric detail. Defaults to 0, so keyframes
   * that only need height stay unchanged. Added in 0.2.0.
   */
  targetX?: number;
  /** Depth look-at offset, same purpose as `targetX`. Defaults to 0. */
  targetZ?: number;
  /** Nudges the model sideways on screen: +1 right, -1 left, as a fraction of half-width. */
  screenShiftX: number;
  fov: number;
  /** Shown in the HUD readout. */
  label: string;
}

/** Interpolated camera state for a single frame. */
export type CameraFrame = Omit<CameraKeyframe, 'p'>;

/* -------------------------------------------------------------- sections */

export interface ShowcaseSection {
  /** Stable id, also used as the DOM id for in-page jumps. */
  id: string;
  /** Short name for the rail. */
  name: string;
  /** Scroll position this section's rail node jumps to. */
  progress: number;
  /** [start, end] scroll window in which the panel is visible. */
  fade: [number, number];
  /** Which side the copy sits on from `md` up. Mobile always stacks to the bottom. */
  align: 'start' | 'end';
  /** Consumer-owned copy. The slice never ships content of its own. */
  content: ReactNode;
}

/* ------------------------------------------------------------ editable copy */

/**
 * The text of one section, as plain data so it can round-trip through a backend
 * and an editor. Deliberately NOT `ShowcaseSection`: `content: ReactNode` is
 * whatever rich blocks the host renders around this text, and those stay in the
 * host — a stat grid is not something you type into a form.
 */
export interface ShowcaseCopy {
  /** Stable id. Also how the host looks up the rich blocks that belong here. */
  id: string;
  name: string;
  progress: number;
  /** `fade` split in two, because a wire tuple needs a length check and this does not. */
  fadeIn: number;
  fadeOut: number;
  align: 'start' | 'end';
  kicker: string;
  /** `\n` breaks the line; `|` outlines everything after it. */
  heading: string;
  body: string;
}

/** Everything about a showcase that is words rather than camera. */
export interface ShowcaseContent {
  /** HUD wordmark, document title, OG card. */
  title: string;
  /**
   * What the boot screen says while the model downloads. Falls back to `title`
   * when empty — the loading moment is the one place a site can say something
   * the tab and the search result should not.
   */
  bootTitle?: string;
  /** The HUD's second word, after the title. */
  brand: string;
  /** `<meta name="description">`. Never rendered on the page itself. */
  description: string;
  sections: ShowcaseCopy[];
}

/* --------------------------------------------------------------- markers */

/** A HUD tag pinned to a point on the model, in normalised model space. */
export interface AnchorMarker {
  name: string;
  position: readonly [number, number, number];
}

/* ---------------------------------------------------------------- engine */

export interface SceneSettings {
  /** Model is re-scaled to this height and centred on the origin. */
  modelHeight: number;
  /** Page height as a multiple of the viewport. Larger = slower scroll. */
  scrollLength: number;
  /** Scroll smoothing, 0–1. Smaller = heavier, more cinematic. */
  damping: number;
  /** How far pointer movement nudges the camera. */
  parallax: number;
  /** Bloom pass. Skipped on coarse-pointer devices regardless. */
  bloom: boolean;
}

/** Everything the render loop hands back to the DOM layer each frame. */
export interface FrameState {
  progress: number;
  activeSection: number;
  label: string;
  reticle: { x: number; y: number; scale: number; opacity: number };
  markers: { x: number; y: number; opacity: number; hot: boolean }[];
}

export interface HudLabels {
  systemStatus: string;
  brand: string;
  sectionPrefix: string;
  targetPrefix: string;
  scrollHint: string;
  meterCaption: string;
  bootStages: string[];
  errors: Record<ShowcaseErrorCode, string>;
}
