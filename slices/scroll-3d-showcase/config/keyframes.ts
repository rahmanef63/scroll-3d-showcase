import type { AnchorMarker, CameraKeyframe, SceneSettings } from '../types';

/**
 * Default camera path: one full 360° orbit from -20° to 340°, stopping on four
 * details on the way down — shades, suit, sidearm, shoes — and pulling back to
 * a full body at both ends. Consumers override via the `keyframes` prop; see
 * the README for the tuning workflow (press `d` in the browser).
 *
 * `targetY` assumes the normalised model space the loader produces: the model
 * is scaled to `modelHeight` and centred on the origin, so the top of the head
 * sits near +0.9 and the soles near -0.9.
 *
 * `targetX` / `targetZ` aim at features off the model's centre line. The
 * sidearm stop needs them — the pistol hangs at roughly x -0.24, z +0.14, so a
 * purely axial look-at would leave it out of frame at that radius. Both default
 * to 0; they are written out here so the table stays readable in diffs.
 *
 * `screenShiftX` pushes the model sideways so the copy column stays clear. Keep
 * its sign opposite the paired section's `align`, or the text lands on the model.
 */
export const DEFAULT_KEYFRAMES: readonly CameraKeyframe[] = [
  // p     azimuth  elev  radius  targetX  targetY  targetZ  shiftX  fov  label
  { p: 0.0,  azimuth: -20, elevation:   2, radius: 3.3,  targetX:  0,    targetY:  0.02,  targetZ:  0,    screenShiftX:  0.42, fov: 38, label: 'FULL BODY' },
  { p: 0.18, azimuth:  38, elevation:   1, radius: 0.42, targetX:  0,    targetY:  0.765, targetZ:  0.1,  screenShiftX:  0.38, fov: 34, label: 'SHADES' },
  { p: 0.42, azimuth: 198, elevation:   4, radius: 0.85, targetX:  0,    targetY:  0.52,  targetZ: -0.04, screenShiftX: -0.4,  fov: 36, label: 'SUIT' },
  { p: 0.64, azimuth: 252, elevation: -10, radius: 0.68, targetX: -0.24, targetY: -0.17,  targetZ:  0.14, screenShiftX:  0.72, fov: 36, label: 'SIDEARM' },
  { p: 0.85, azimuth: 312, elevation: -16, radius: 0.6,  targetX:  0,    targetY: -0.78,  targetZ:  0.03, screenShiftX: -0.38, fov: 36, label: 'SHOES' },
  { p: 1.0,  azimuth: 340, elevation:   4, radius: 3.6,  targetX:  0,    targetY:  0.02,  targetZ:  0,    screenShiftX: -0.45, fov: 38, label: 'FULL BODY' },
] as const;

/**
 * HUD tags pinned to the model, one per detail stop. Positions were measured
 * off an orthographic render of the normalised model, so they line up with the
 * keyframe targets above.
 */
export const DEFAULT_MARKERS: readonly AnchorMarker[] = [
  { name: 'SHADES', position: [0, 0.77, 0.13] },
  { name: 'SUIT', position: [-0.2, 0.55, 0.1] },
  { name: 'SIDEARM', position: [-0.25, -0.17, 0.15] },
  { name: 'SHOES', position: [0, -0.8, 0.14] },
] as const;

export const DEFAULT_SCENE_SETTINGS: SceneSettings = {
  modelHeight: 1.8,
  scrollLength: 7.6,
  damping: 0.075,
  parallax: 0.1,
  bloom: true,
};

/** Ground rings and grid fade out as the camera closes in, so they never cut across copy. */
export const GROUND_FADE_RANGE = { near: 1.05, span: 1.25 } as const;

/** Markers within this much of the current look-at height render in the warn tone. */
export const MARKER_HOT_DISTANCE = 0.24;
