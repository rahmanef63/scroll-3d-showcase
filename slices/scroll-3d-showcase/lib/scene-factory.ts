import {
  ACESFilmicToneMapping,
  AmbientLight,
  DirectionalLight,
  FogExp2,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ShowcaseLoadError } from './model-loader';
import type { ShowcaseThemeColors } from './theme-colors';

export interface ShowcaseStage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  /** Highest anisotropy this GPU supports, capped to something sane. */
  maxAnisotropy: number;
  resize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
}

export interface StageOptions {
  colors: ShowcaseThemeColors;
  /** Coarse-pointer / small viewport: skip antialiasing and cap the pixel ratio. */
  lowPower: boolean;
}

/**
 * Builds the renderer, scene, camera and lighting rig. Light colours come from
 * the theme so the neon rim matches the HUD without duplicating hex values.
 */
export function createStage(
  canvas: HTMLCanvasElement,
  { colors, lowPower }: StageOptions,
): ShowcaseStage {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: !lowPower,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    throw new ShowcaseLoadError('WEBGL_UNAVAILABLE', String(err));
  }

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;

  const scene = new Scene();
  scene.fog = new FogExp2(colors.background.getHex(), 0.09);

  const camera = new PerspectiveCamera(38, 1, 0.05, 100);
  camera.position.set(0, 0, 3.3);

  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.55;

  const lights = [
    directional(colors.key.getHex(), 2.1, [2.4, 3.2, 2.6]),
    directional(colors.fill.getHex(), 0.7, [-3, 1.2, 1.4]),
    directional(colors.rimPrimary.getHex(), 3.0, [-2.6, 1.6, -2.8]),
    directional(colors.rimAccent.getHex(), 2.2, [3.0, 0.4, -2.4]),
  ];
  lights.forEach((light) => scene.add(light));
  scene.add(new AmbientLight(colors.ambient.getHex(), 0.6));

  return {
    renderer,
    scene,
    camera,
    maxAnisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
    resize(width, height, pixelRatio) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
    },
    dispose() {
      lights.forEach((light) => light.dispose());
      environment.texture.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}

function directional(color: number, intensity: number, [x, y, z]: number[]): DirectionalLight {
  const light = new DirectionalLight(color, intensity);
  light.position.set(x, y, z);
  return light;
}
