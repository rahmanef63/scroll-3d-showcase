/**
 * Server actions are public endpoints, so the preset arriving from the studio is
 * untrusted input. This rebuilds it field by field into the exact wire shape the
 * Convex validators accept — extra keys are dropped, bad numbers throw, and the
 * slice types are deliberately not reused here so the wire contract stays
 * explicit and the slice stays backend-agnostic.
 */

import { bounded, maybeNumber, number, record, text } from './wire-guards';
import { toContent, type WireContent } from './sanitize-content';

const MAX_KEYFRAMES = 64;
const MAX_MARKERS = 64;

interface WireKeyframe {
  p: number;
  azimuth: number;
  elevation: number;
  radius: number;
  targetX?: number;
  targetY: number;
  targetZ?: number;
  screenShiftX: number;
  fov: number;
  label: string;
}

interface WireMarker {
  name: string;
  position: number[];
}

interface WirePreset {
  keyframes: WireKeyframe[];
  markers: WireMarker[];
  settings?: {
    modelHeight?: number;
    scrollLength?: number;
    damping?: number;
    parallax?: number;
    bloom?: boolean;
  };
  content?: WireContent;
}

export function sanitizePreset(input: unknown): WirePreset {
  const preset = record(input, 'preset');
  const keyframes = bounded(preset.keyframes, MAX_KEYFRAMES, 'keyframes').map(toKeyframe);
  // An empty path makes sampleKeyframes throw inside the rAF callback, which
  // then never re-arms — a blank canvas the cache would hold for a day.
  if (keyframes.length === 0) throw new Error('Preset: keyframes must not be empty');
  const markers = bounded(preset.markers, MAX_MARKERS, 'markers').map(toMarker);
  const settings = toSettings(preset.settings);
  const content = toContent(preset.content);
  return {
    keyframes,
    markers,
    ...(settings ? { settings } : {}),
    ...(content ? { content } : {}),
  };
}

function toKeyframe(raw: unknown, index: number): WireKeyframe {
  const kf = record(raw, `keyframes[${index}]`);
  const targetX = maybeNumber(kf.targetX, 'targetX');
  const targetZ = maybeNumber(kf.targetZ, 'targetZ');
  return {
    // Progress outside 0–1 would sort the timeline into a shape the rig can't
    // interpolate, so clamp rather than reject an otherwise usable stop.
    p: Math.min(1, Math.max(0, number(kf.p, 'p'))),
    azimuth: number(kf.azimuth, 'azimuth'),
    elevation: number(kf.elevation, 'elevation'),
    radius: number(kf.radius, 'radius'),
    ...(targetX === undefined ? {} : { targetX }),
    targetY: number(kf.targetY, 'targetY'),
    ...(targetZ === undefined ? {} : { targetZ }),
    screenShiftX: number(kf.screenShiftX, 'screenShiftX'),
    fov: number(kf.fov, 'fov'),
    label: text(kf.label, 'label'),
  };
}

function toMarker(raw: unknown, index: number): WireMarker {
  const marker = record(raw, `markers[${index}]`);
  const position = marker.position;
  if (!Array.isArray(position) || position.length !== 3) {
    throw new Error(`Preset: markers[${index}].position must be [x, y, z]`);
  }
  return {
    name: text(marker.name, 'marker name'),
    position: position.map((value, axis) => number(value, `markers[${index}].position[${axis}]`)),
  };
}

function toSettings(raw: unknown): WirePreset['settings'] {
  if (raw === undefined || raw === null) return undefined;
  const source = record(raw, 'settings');
  const settings: NonNullable<WirePreset['settings']> = {};
  for (const key of ['modelHeight', 'scrollLength', 'damping', 'parallax'] as const) {
    const value = maybeNumber(source[key], key);
    if (value !== undefined) settings[key] = value;
  }
  if (typeof source.bloom === 'boolean') settings.bloom = source.bloom;
  return Object.keys(settings).length > 0 ? settings : undefined;
}

