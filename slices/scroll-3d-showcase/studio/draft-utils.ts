import type {
  AnchorMarker,
  CameraKeyframe,
  SceneSettings,
  ShowcaseContent,
  ShowcaseCopy,
} from '../types';
import type { ShowcasePreset } from './types';

/** One undoable state of the editor. Every field is JSON-safe by construction. */
export interface StudioSnapshot {
  keyframes: CameraKeyframe[];
  markers: AnchorMarker[];
  settings: Partial<SceneSettings>;
  content: ShowcaseContent;
  selected: number;
}

/**
 * What the editor shows when a preset carries no copy at all. Empty rather than
 * lorem: the slice ships no content of its own, and inventing some here would
 * put words on a live site that nobody wrote.
 */
export const EMPTY_CONTENT: ShowcaseContent = {
  title: '',
  brand: '',
  description: '',
  sections: [],
};

/** Enough of a camera to render something when a preset arrives with no path. */
export const FALLBACK_KEYFRAME: CameraKeyframe = {
  p: 0, azimuth: 0, elevation: 0, radius: 3, targetX: 0, targetY: 0, targetZ: 0,
  screenShiftX: 0, fov: 36, label: 'KEY',
};

/** Copies every level the draft mutates, so edits can never reach the host's props. */
export const fromPreset = (preset: ShowcasePreset) => ({
  keyframes: preset.keyframes.length
    ? preset.keyframes.map((keyframe) => ({ ...keyframe }))
    : [{ ...FALLBACK_KEYFRAME }],
  markers: preset.markers.map((marker) => ({ ...marker })),
  settings: { ...preset.settings } as Partial<SceneSettings>,
  content: {
    ...EMPTY_CONTENT,
    ...preset.content,
    sections: (preset.content?.sections ?? []).map((section) => ({ ...section })),
  },
});

/* ------------------------------------------------------------ copy reducers */

/**
 * Pure so the draft hook stays a list of one-liners. Each returns a new object
 * at every level the editor can touch — the engine and the history stack both
 * compare by identity.
 */
export const patchSectionAt = (
  content: ShowcaseContent,
  index: number,
  values: Partial<ShowcaseCopy>,
): ShowcaseContent => ({
  ...content,
  sections: content.sections.map((section, at) =>
    at === index ? { ...section, ...values } : section,
  ),
});

/** A preset the host owns must never be handed to the draft by reference. */
export const copyContent = (content: ShowcaseContent): ShowcaseContent => ({
  ...content,
  sections: content.sections.map((section) => ({ ...section })),
});

export const removeSectionAt = (content: ShowcaseContent, index: number): ShowcaseContent => ({
  ...content,
  sections: content.sections.filter((_, at) => at !== index),
});

/**
 * A new panel lands at the scroll position you are looking at, with a fade
 * window around it — a section whose window excludes its own `progress` is
 * invisible, and that reads as the editor being broken.
 */
export const addSectionAt = (content: ShowcaseContent, p: number): ShowcaseContent => {
  const section: ShowcaseCopy = {
    id: uniqueSectionId(content.sections),
    name: 'SECTION',
    progress: p,
    fadeIn: p - 0.08,
    fadeOut: p + 0.08,
    align: content.sections.length % 2 === 0 ? 'start' : 'end',
    kicker: '',
    heading: '',
    body: '',
  };
  return { ...content, sections: [...content.sections, section] };
};

/** Ids are DOM ids and React keys, so a duplicate would break in-page jumps. */
const uniqueSectionId = (taken: readonly ShowcaseCopy[]): string => {
  let next = taken.length + 1;
  while (taken.some((section) => section.id === String(next).padStart(2, '0'))) next += 1;
  return String(next).padStart(2, '0');
};

/* ---------------------------------------------------------- marker reducers */

export const renameMarkerAt = (
  markers: readonly AnchorMarker[],
  index: number,
  name: string,
): AnchorMarker[] =>
  markers.map((marker, at) =>
    at === index
      ? { ...marker, name: uniqueMarkerName(name, markers.filter((_, i) => i !== index)) }
      : marker,
  );

/** Marker names double as React keys in the HUD, so duplicates would collide. */
export const uniqueMarkerName = (name: string, taken: readonly AnchorMarker[]): string => {
  const base = name.trim() || 'MARKER';
  let candidate = base;
  let suffix = 2;
  while (taken.some((marker) => marker.name === candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
};

/**
 * Index of the keyframe whose `p` is closest to `p`.
 *
 * This is what keeps selection tied to the playhead: every seek re-selects, so
 * an orbit drag can never quietly edit a keyframe that is off screen.
 */
export const nearestKeyframeIndex = (
  keyframes: readonly CameraKeyframe[],
  p: number,
): number => {
  let best = 0;
  let nearest = Infinity;
  keyframes.forEach((keyframe, index) => {
    const gap = Math.abs(keyframe.p - p);
    if (gap < nearest) {
      nearest = gap;
      best = index;
    }
  });
  return best;
};
