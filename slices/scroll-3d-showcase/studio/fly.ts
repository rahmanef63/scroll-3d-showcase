import type { CameraKeyframe } from '../types';

/**
 * Keyboard navigation for an orbit rig.
 *
 * framepilot flies a free camera — WASD translates its position and its target
 * together. This rig has no position: a keyframe is `{azimuth, elevation,
 * radius}` on a sphere around the subject, and the whole point is that the
 * subject stays framed. So the same six keys drive the three spherical axes
 * instead, which is the closest honest mapping:
 *
 *   W / S   dolly in / out       (radius)
 *   A / D   orbit left / right   (azimuth)
 *   Q / E   duck / rise          (elevation)
 *   Shift   about 3x faster
 *
 * Pure, and separate from the hook, so the rates can be checked without a DOM.
 */
export const FLY_KEYS = ['w', 'a', 's', 'd', 'q', 'e'] as const;

/** Degrees per second. */
const AZIMUTH_RATE = 55;
const ELEVATION_RATE = 40;
/**
 * Radius moves multiplicatively: a fixed metres-per-second would crawl at the
 * 3.6m wide shot and overshoot the whole subject at the 0.42m close-up.
 */
const DOLLY_RATE = 0.85;
const BOOST = 3;

export type FlyPatch = Partial<Pick<CameraKeyframe, 'azimuth' | 'elevation' | 'radius'>>;

/**
 * What one animation frame of held keys does to a keyframe, or null if nothing
 * is held. `dt` is seconds; the caller clamps it so a backgrounded tab does not
 * come back and swing the camera by a whole second's worth.
 */
export function flyStep(
  keyframe: CameraKeyframe,
  keys: ReadonlySet<string>,
  dt: number,
  fast: boolean,
): FlyPatch | null {
  const orbit = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
  const rise = (keys.has('e') ? 1 : 0) - (keys.has('q') ? 1 : 0);
  const dolly = (keys.has('s') ? 1 : 0) - (keys.has('w') ? 1 : 0);
  if (!orbit && !rise && !dolly) return null;

  const boost = fast ? BOOST : 1;
  const patch: FlyPatch = {};
  if (orbit) patch.azimuth = keyframe.azimuth + orbit * AZIMUTH_RATE * boost * dt;
  if (rise) patch.elevation = keyframe.elevation + rise * ELEVATION_RATE * boost * dt;
  // clampKeyframe holds the floor and ceiling; this only has to stay positive.
  if (dolly) patch.radius = keyframe.radius * Math.exp(dolly * DOLLY_RATE * boost * dt);
  return patch;
}
