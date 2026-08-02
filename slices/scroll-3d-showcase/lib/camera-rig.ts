import type { PerspectiveCamera, Vector3 } from 'three';
import type { CameraFrame, CameraKeyframe } from '../types';
import { degToRad, inverseLerp, lerp, smootherstep } from './math';

/**
 * Interpolates the camera path at scroll position `p`. Keyframes must be sorted
 * by `p`; positions outside the first/last key clamp to that key.
 */
export function sampleKeyframes(
  keyframes: readonly CameraKeyframe[],
  p: number,
): CameraFrame {
  if (keyframes.length === 0) throw new Error('sampleKeyframes: no keyframes given');

  const last = keyframes[keyframes.length - 1];
  if (keyframes.length === 1 || p >= last.p) return toFrame(last);
  if (p <= keyframes[0].p) return toFrame(keyframes[0]);

  let from = keyframes[0];
  let to = keyframes[1];
  for (let i = 0; i < keyframes.length - 1; i += 1) {
    if (p >= keyframes[i].p && p <= keyframes[i + 1].p) {
      from = keyframes[i];
      to = keyframes[i + 1];
      break;
    }
  }

  const t = smootherstep(inverseLerp(from.p, to.p, p));
  return {
    azimuth: lerp(from.azimuth, to.azimuth, t),
    elevation: lerp(from.elevation, to.elevation, t),
    radius: lerp(from.radius, to.radius, t),
    targetY: lerp(from.targetY, to.targetY, t),
    targetX: lerp(from.targetX ?? 0, to.targetX ?? 0, t),
    targetZ: lerp(from.targetZ ?? 0, to.targetZ ?? 0, t),
    screenShiftX: lerp(from.screenShiftX, to.screenShiftX, t),
    fov: lerp(from.fov, to.fov, t),
    // Swap the readout at the midpoint rather than blending nonsense text.
    label: t < 0.5 ? from.label : to.label,
  };
}

const toFrame = ({ p: _p, ...frame }: CameraKeyframe): CameraFrame => frame;

export interface RigOffsets {
  /** Extra orbit in degrees from pointer parallax. */
  azimuthOffset?: number;
  elevationOffset?: number;
  /** Multiplies `radius` — used to pull back on narrow viewports. */
  radiusScale?: number;
  /** Lifts the model up the screen, as a fraction of half-height. Mobile layout. */
  verticalLift?: number;
  /** Set to 0 to disable the sideways offset, e.g. when copy stacks below. */
  screenShiftScale?: number;
}

/**
 * Places the camera on a sphere around the look-at point and writes the result
 * into `camera` and `target`. Both are mutated in place — this runs every frame.
 */
export function applyCameraFrame(
  camera: PerspectiveCamera,
  frame: CameraFrame,
  target: Vector3,
  offsets: RigOffsets = {},
): void {
  const {
    azimuthOffset = 0,
    elevationOffset = 0,
    radiusScale = 1,
    verticalLift = 0,
    screenShiftScale = 1,
  } = offsets;

  const azimuth = degToRad(frame.azimuth + azimuthOffset);
  const elevation = degToRad(frame.elevation + elevationOffset);
  const radius = frame.radius * radiusScale;

  // Half the visible extent at the look-at distance, so shifts read the same
  // at every zoom level and aspect ratio.
  const halfHeight = radius * Math.tan(degToRad(frame.fov) / 2);
  const halfWidth = halfHeight * camera.aspect;
  const shiftX = frame.screenShiftX * screenShiftScale * halfWidth;
  const liftY = verticalLift * halfHeight;

  // Moving the look-at point against the camera's right vector pushes the
  // model the opposite way on screen. The targetX/targetZ offsets are applied
  // first, so the shift still reads as "slide the subject sideways" even when
  // the subject is a detail off the model's centre line.
  target.set(
    (frame.targetX ?? 0) - Math.cos(azimuth) * shiftX,
    frame.targetY - liftY,
    (frame.targetZ ?? 0) + Math.sin(azimuth) * shiftX,
  );

  camera.position.set(
    target.x + radius * Math.sin(azimuth) * Math.cos(elevation),
    target.y + radius * Math.sin(elevation),
    target.z + radius * Math.cos(azimuth) * Math.cos(elevation),
  );
  camera.lookAt(target);

  if (Math.abs(camera.fov - frame.fov) > 0.01) {
    camera.fov = frame.fov;
    camera.updateProjectionMatrix();
  }

  // The renderer refreshes these during render(), which happens *after* the HUD
  // projects its anchors. Without this the reticle and markers trail the camera
  // by a frame — invisible at 60fps, glaring the moment the frame rate drops.
  camera.updateMatrixWorld();
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
}

/** Index of the last section whose fade window has started at `progress`. */
export function activeSectionIndex(
  sections: readonly { fade: readonly [number, number] }[],
  progress: number,
): number {
  let index = 0;
  sections.forEach((section, i) => {
    if (progress >= section.fade[0]) index = i;
  });
  return index;
}
