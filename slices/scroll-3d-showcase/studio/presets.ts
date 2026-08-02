import { clamp, degToRad } from '../lib/math';
import type { CameraKeyframe } from '../types';

/**
 * Limits for this slice's normalised model (height 1.8, authored radii
 * 0.42–3.6). Elevation stops well short of ±90: `lookAt` with up = +Y gimbals
 * near the pole and `screenShiftX` amplifies the wobble.
 *
 * `azimuth` is deliberately absent — the default path is a monotonic 360° sweep
 * (-20 → 340), so wrapping it into 0–360 would turn one leg into a backspin.
 */
export const clampKeyframe = (keyframe: CameraKeyframe): CameraKeyframe => ({
  ...keyframe,
  p: clamp(keyframe.p, 0, 1),
  elevation: clamp(keyframe.elevation, -80, 80),
  radius: clamp(keyframe.radius, 0.15, 12),
  fov: clamp(keyframe.fov, 12, 100),
});

/** 35mm-equivalent focal length. 12mm = half-height of a 36×24 frame. */
export const focalLength = (fov: number): number => 12 / Math.tan(degToRad(fov) / 2);

const fovFromFocal = (mm: number): number =>
  Math.round(((2 * Math.atan(12 / mm) * 180) / Math.PI) * 10) / 10;

/** One-click lenses. The hand-tuned default path already sits near a 35mm. */
export const LENS_PRESETS = [24, 35, 50, 85].map((mm) => ({
  label: `${mm}MM`,
  fov: fovFromFocal(mm),
}));

/** Elevation-only presets: they never touch azimuth, radius or fov. */
export const ANGLE_PRESETS = [
  { label: 'EYE', elevation: 0 },
  { label: 'HIGH', elevation: 35 },
  { label: 'LOW', elevation: -25 },
  { label: 'BIRD', elevation: 80 },
  { label: 'WORM', elevation: -55 },
] as const;

/**
 * Slider bounds and readouts for the SHOT tab.
 *
 * `elevation` runs to ±89 while `clampKeyframe` stops at ±80 on purpose: the
 * clamp is the authority, the slider just must not stop short of it.
 */
export const KEYFRAME_RANGES = {
  p: { min: 0, max: 1, step: 0.001, format: (v: number) => v.toFixed(3) },
  azimuth: { min: -180, max: 360, step: 1, format: (v: number) => `${Math.round(v)}°` },
  elevation: { min: -89, max: 89, step: 1, format: (v: number) => `${Math.round(v)}°` },
  radius: { min: 0.15, max: 8, step: 0.01, format: (v: number) => `${v.toFixed(2)}m` },
  targetX: { min: -1.5, max: 1.5, step: 0.01, format: (v: number) => v.toFixed(2) },
  targetY: { min: -1.5, max: 1.5, step: 0.01, format: (v: number) => v.toFixed(2) },
  targetZ: { min: -1.5, max: 1.5, step: 0.01, format: (v: number) => v.toFixed(2) },
  screenShiftX: { min: -1, max: 1, step: 0.01, format: (v: number) => v.toFixed(2) },
  fov: {
    min: 14,
    max: 80,
    step: 1,
    format: (v: number) => `${Math.round(v)}° · ${Math.round(focalLength(v))}mm`,
  },
} as const;

/**
 * Slider bounds for the COPY tab. `fadeIn` starts below 0 and `fadeOut` runs
 * past 1 on purpose: the first and last panels are authored already on screen
 * and still leaving, which needs windows outside the scroll range.
 */
export const COPY_RANGES = {
  progress: { min: 0, max: 1, step: 0.001, format: (v: number) => v.toFixed(3) },
  fadeIn: { min: -0.4, max: 1, step: 0.01, format: (v: number) => v.toFixed(2) },
  fadeOut: { min: 0, max: 1.4, step: 0.01, format: (v: number) => v.toFixed(2) },
} as const;

/**
 * Output shapes the editor can frame to.
 *
 * `fit` is not "no ratio" so much as "whatever the editor window leaves" — the
 * old behaviour, kept because it is the largest preview and sometimes that is
 * what you want. The rest are the shapes a visitor actually arrives on.
 */
export const ASPECTS = [
  { id: 'fit', label: 'FIT', ratio: null },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '21:9', label: '21:9', ratio: 21 / 9 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
] as const;

export type AspectId = (typeof ASPECTS)[number]['id'];

/** Slider bounds and readouts for the SCENE tab. */
export const SCENE_RANGES = {
  modelHeight: { min: 0.5, max: 4, step: 0.1, format: (v: number) => `${v.toFixed(1)}m` },
  scrollLength: { min: 2, max: 16, step: 0.1, format: (v: number) => `${v.toFixed(1)}×vh` },
  damping: { min: 0.01, max: 0.4, step: 0.005, format: (v: number) => v.toFixed(3) },
  parallax: { min: 0, max: 0.5, step: 0.01, format: (v: number) => v.toFixed(2) },
} as const;
