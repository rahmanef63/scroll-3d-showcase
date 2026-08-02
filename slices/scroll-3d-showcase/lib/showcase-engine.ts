import { Vector3, type Object3D } from 'three';
import type {
  AnchorMarker,
  CameraKeyframe,
  FrameState,
  SceneSettings,
  ShowcaseSection,
} from '../types';
import { updateFrame, type FrameContext } from './frame-loop';
import { loadShowcaseModel } from './model-loader';
import { createBloomPipeline, type PostPipeline } from './post-processing';
import { createStage } from './scene-factory';
import { createStageDecor } from './stage-decor';
import { readThemeColors } from './theme-colors';

export interface EngineConfig {
  canvas: HTMLCanvasElement;
  modelUrl: string;
  settings: SceneSettings;
  keyframes: readonly CameraKeyframe[];
  markers: readonly AnchorMarker[];
  sections: readonly ShowcaseSection[];
  compact: boolean;
  reducedMotion: boolean;
}

export interface EngineCallbacks {
  getScroll: () => number;
  getPointer: () => { x: number; y: number };
  onFrame: (state: FrameState) => void;
}

export interface ShowcaseEngine {
  load: (onProgress?: (fraction: number) => void) => Promise<void>;
  start: (callbacks: EngineCallbacks) => void;
  stop: () => void;
  resize: () => void;
  /**
   * Applies layout/motion changes without rebuilding the scene — an orientation
   * change should not re-download the model. Antialiasing is fixed at creation.
   */
  setFlags: (flags: { compact?: boolean; reducedMotion?: boolean }) => void;
  /**
   * Live camera-path edits. The frame loop re-reads both arrays every frame, so
   * swapping them retunes the shot without touching the GPU — an editor can drag
   * a keyframe without re-downloading the model.
   */
  setKeyframes: (keyframes: readonly CameraKeyframe[]) => void;
  setMarkers: (markers: readonly AnchorMarker[]) => void;
  dispose: () => void;
}

const maxPixelRatio = (compact: boolean) =>
  Math.min(typeof devicePixelRatio === 'undefined' ? 1 : devicePixelRatio, compact ? 1.6 : 2);

export function createShowcaseEngine(config: EngineConfig): ShowcaseEngine {
  const colors = readThemeColors();
  const stage = createStage(config.canvas, { colors, lowPower: config.compact });
  const decor = createStageDecor(stage.scene, colors, -config.settings.modelHeight / 2);

  let model: Object3D | null = null;
  let post: PostPipeline | null = null;
  let startedAt = 0;
  let previous = 0;

  const context: FrameContext = {
    stage,
    decor,
    target: new Vector3(),
    keyframes: config.keyframes,
    markers: config.markers,
    sections: config.sections,
    settings: config.settings,
    compact: config.compact,
    reducedMotion: config.reducedMotion,
    smoothed: { progress: 0, pointerX: 0, pointerY: 0 },
  };

  const resize = () => {
    const { clientWidth, clientHeight } = config.canvas;
    if (clientWidth === 0 || clientHeight === 0) return;
    const ratio = maxPixelRatio(context.compact);
    stage.resize(clientWidth, clientHeight, ratio);
    post?.resize(clientWidth, clientHeight, ratio);
  };

  return {
    async load(onProgress) {
      model = await loadShowcaseModel(config.modelUrl, config.settings.modelHeight, {
        onProgress,
        maxAnisotropy: stage.maxAnisotropy,
      });
      stage.scene.add(model);
      post = await createBloomPipeline(stage, config.settings.bloom && !config.compact);
      resize();
    },

    start(callbacks) {
      context.smoothed.progress = callbacks.getScroll();
      startedAt = performance.now();
      previous = startedAt;

      stage.renderer.setAnimationLoop((now) => {
        const deltaSeconds = Math.min(0.05, (now - previous) / 1000);
        previous = now;

        const state = updateFrame(
          context,
          { scroll: callbacks.getScroll(), pointer: callbacks.getPointer() },
          deltaSeconds,
          (now - startedAt) / 1000,
        );

        if (post) post.render();
        else stage.renderer.render(stage.scene, stage.camera);

        callbacks.onFrame(state);
      });
    },

    stop() {
      stage.renderer.setAnimationLoop(null);
    },

    resize,

    setFlags({ compact, reducedMotion }) {
      if (compact !== undefined) context.compact = compact;
      if (reducedMotion !== undefined) context.reducedMotion = reducedMotion;
      resize();
    },

    setKeyframes(keyframes) {
      context.keyframes = keyframes;
    },

    setMarkers(markers) {
      context.markers = markers;
    },

    dispose() {
      stage.renderer.setAnimationLoop(null);
      post?.dispose();
      decor.dispose();
      if (model) {
        stage.scene.remove(model);
        disposeTree(model);
      }
      stage.dispose();
    },
  };
}

/** Releases every geometry, material and texture the loaded model owns. */
function disposeTree(root: Object3D): void {
  root.traverse((node) => {
    const mesh = node as Object3D & {
      geometry?: { dispose: () => void };
      material?: unknown;
    };
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material || typeof material !== 'object') continue;
      const typed = material as { dispose?: () => void; map?: { dispose: () => void } };
      typed.map?.dispose();
      typed.dispose?.();
    }
  });
}
