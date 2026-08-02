import { Vector3, type PerspectiveCamera } from 'three';

export interface ScreenProjection {
  x: number;
  y: number;
  /** How square-on the anchor faces the camera, -1 (behind) → 1 (head on). */
  facing: number;
  /** False when the point is behind the camera or outside the safe margin. */
  onScreen: boolean;
}

const scratch = new Vector3();

/**
 * Projects a point in model space to CSS pixels.
 *
 * `facing` assumes anchors sit on the front of the model (+Z), which lets HUD
 * tags disappear as the camera orbits behind it instead of floating over the
 * model's back.
 */
export function projectToScreen(
  point: readonly [number, number, number],
  camera: PerspectiveCamera,
  viewport: { width: number; height: number },
  margin = 0.9,
): ScreenProjection {
  scratch.set(point[0], point[1], point[2]);
  const facing = camera.position.clone().sub(scratch).normalize().z;
  const ndc = scratch.project(camera);

  return {
    x: (ndc.x * 0.5 + 0.5) * viewport.width,
    y: (-ndc.y * 0.5 + 0.5) * viewport.height,
    facing,
    onScreen: ndc.z < 1 && Math.abs(ndc.x) < margin && Math.abs(ndc.y) < margin,
  };
}
