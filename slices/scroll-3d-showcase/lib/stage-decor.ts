import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  GridHelper,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  SRGBColorSpace,
  type Scene,
} from 'three';
import { GROUND_FADE_RANGE } from '../config/keyframes';
import { clamp } from './math';
import type { ShowcaseThemeColors } from './theme-colors';

export interface StageDecor {
  /** Fades the ground treatment out as the camera closes in, and spins the rings. */
  update(cameraRadius: number, elapsedSeconds: number, deltaSeconds: number): void;
  dispose(): void;
}

/**
 * The scanner ring, grid and contact shadow under the model. Everything here
 * fades with camera distance: seen edge-on from a close low angle the rings
 * would otherwise read as straight neon lines slicing across the copy.
 */
export function createStageDecor(
  scene: Scene,
  colors: ShowcaseThemeColors,
  floorY: number,
): StageDecor {
  const grid = new GridHelper(26, 52, colors.grid.getHex(), colors.gridSubdued.getHex());
  const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
  gridMaterials.forEach((material) => {
    material.transparent = true;
    material.opacity = 0.16;
    material.depthWrite = false;
  });
  grid.position.y = floorY - 0.002;
  scene.add(grid);

  const rings = [
    ring(scene, floorY, 0.62, 0.636, 96, colors.grid.getHex(), 0.4),
    ring(scene, floorY, 0.8, 0.807, 96, colors.rimAccent.getHex(), 0.28),
    ring(scene, floorY, 0.46, 0.463, 4, colors.grid.getHex(), 0.5),
  ];
  const spin = [0.35, -0.22, 0.9];

  const shadowTexture = createShadowTexture();
  const shadow = new Mesh(
    new PlaneGeometry(1.5, 1.5),
    new MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = floorY + 0.006;
  scene.add(shadow);

  return {
    update(cameraRadius, elapsedSeconds, deltaSeconds) {
      const fade = clamp(
        (cameraRadius - GROUND_FADE_RANGE.near) / GROUND_FADE_RANGE.span,
        0,
        1,
      );
      rings.forEach((mesh, i) => {
        mesh.rotation.z += deltaSeconds * spin[i];
      });
      rings[0].material.opacity = (0.3 + Math.sin(elapsedSeconds * 1.2) * 0.12) * fade;
      rings[1].material.opacity = 0.28 * fade;
      rings[2].material.opacity = 0.5 * fade;
      gridMaterials.forEach((material) => {
        material.opacity = 0.16 * fade;
      });
      shadow.material.opacity = 0.85 * (0.35 + fade * 0.65);
    },
    dispose() {
      [...rings, shadow].forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
        scene.remove(mesh);
      });
      shadowTexture.dispose();
      grid.geometry.dispose();
      gridMaterials.forEach((material) => material.dispose());
      scene.remove(grid);
    },
  };
}

function ring(
  scene: Scene,
  floorY: number,
  inner: number,
  outer: number,
  segments: number,
  color: number,
  opacity: number,
): Mesh<RingGeometry, MeshBasicMaterial> {
  const mesh = new Mesh(
    new RingGeometry(inner, outer, segments),
    new MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: DoubleSide,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = floorY + 0.004;
  scene.add(mesh);
  return mesh;
}

/** Soft radial gradient standing in for a contact shadow — far cheaper than a shadow map. */
function createShadowTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2, size / 2, 0, size / 2, size / 2, size / 2,
    );
    gradient.addColorStop(0, 'rgba(0,0,0,.75)');
    gradient.addColorStop(0.55, 'rgba(0,0,0,.22)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
