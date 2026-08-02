import { Object3D, PerspectiveCamera, Scene } from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CameraKeyframe, FrameState, SceneSettings } from '../types';

const probe = vi.hoisted(() => ({
  stages: 0,
  loads: 0,
  frame: null as ((now: number) => void) | null,
  camera: null as { position: { length: () => number } } | null,
}));

/** Everything that needs a GPU is stubbed; the camera and the frame loop are real. */
vi.mock('../lib/scene-factory', () => ({
  createStage: () => {
    probe.stages += 1;
    const camera = new PerspectiveCamera(38, 1.6, 0.05, 100);
    probe.camera = camera;
    return {
      renderer: {
        domElement: { clientWidth: 1280, clientHeight: 800 },
        setAnimationLoop: (cb: ((now: number) => void) | null) => {
          probe.frame = cb;
        },
        render: () => {},
      },
      scene: new Scene(),
      camera,
      maxAnisotropy: 4,
      resize: () => {},
      dispose: () => {},
    };
  },
}));

vi.mock('../lib/stage-decor', () => ({
  createStageDecor: () => ({ update: () => {}, dispose: () => {} }),
}));

vi.mock('../lib/model-loader', () => ({
  loadShowcaseModel: async () => {
    probe.loads += 1;
    return new Object3D();
  },
  ShowcaseLoadError: class extends Error {},
}));

vi.mock('../lib/post-processing', () => ({ createBloomPipeline: async () => null }));

const { createShowcaseEngine } = await import('../lib/showcase-engine');

const SETTINGS: SceneSettings = {
  modelHeight: 1.8,
  scrollLength: 7.6,
  damping: 0.075,
  // Zero parallax + reducedMotion pins the camera to the keyframe exactly, so a
  // radius assertion measures the path and not the idle sway.
  parallax: 0,
  bloom: false,
};

const key = (over: Partial<CameraKeyframe>): CameraKeyframe => ({
  p: 0, azimuth: 0, elevation: 0, radius: 3, targetY: 0, screenShiftX: 0, fov: 40, label: 'A',
  ...over,
});

/** Constant radius across the pair, so any scroll position samples it exactly. */
const path = (radius: number, label: string): CameraKeyframe[] => [
  key({ p: 0, radius, label }),
  key({ p: 1, radius, label }),
];

const WIDE = path(3, 'WIDE');
const TIGHT = path(0.5, 'TIGHT');

const MARKERS = [
  { name: 'HEAD', position: [0, 0.7, 0] as const },
  { name: 'FEET', position: [0, -0.7, 0] as const },
];

function boot(keyframes: CameraKeyframe[] = WIDE) {
  const engine = createShowcaseEngine({
    canvas: document.createElement('canvas'),
    modelUrl: '/model.glb',
    settings: SETTINGS,
    keyframes,
    markers: MARKERS,
    sections: [],
    compact: false,
    reducedMotion: true,
  });
  const states: FrameState[] = [];
  return { engine, states };
}

/** One animation frame. `start` seeds `previous`, so any later timestamp works. */
const tick = () => probe.frame?.(performance.now() + 16);

beforeEach(() => {
  probe.stages = 0;
  probe.loads = 0;
  probe.frame = null;
  probe.camera = null;
});

describe('engine.setKeyframes', () => {
  it('retunes the running shot without rebuilding the scene', async () => {
    const { engine, states } = boot();
    await engine.load();
    engine.start({
      getScroll: () => 0.5,
      getPointer: () => ({ x: 0, y: 0 }),
      onFrame: (state) => states.push(state),
    });

    tick();
    expect(states.at(-1)?.label).toBe('WIDE');
    expect(probe.camera?.position.length()).toBeCloseTo(3, 5);

    engine.setKeyframes(TIGHT);
    tick();
    expect(states.at(-1)?.label).toBe('TIGHT');
    expect(probe.camera?.position.length()).toBeCloseTo(0.5, 5);

    // The whole point of the seam: an editor drags a keyframe and the GPU work
    // and the model download are both untouched.
    expect(probe.stages).toBe(1);
    expect(probe.loads).toBe(1);
  });

  it('takes effect before the next frame rather than on the next load', async () => {
    const { engine, states } = boot();
    await engine.load();
    engine.start({
      getScroll: () => 0,
      getPointer: () => ({ x: 0, y: 0 }),
      onFrame: (state) => states.push(state),
    });

    engine.setKeyframes(TIGHT);
    tick();
    expect(states).toHaveLength(1);
    expect(states[0].label).toBe('TIGHT');
  });
});

describe('engine.setMarkers', () => {
  it('swaps the projected anchor set live', async () => {
    const { engine, states } = boot();
    await engine.load();
    engine.start({
      getScroll: () => 0.5,
      getPointer: () => ({ x: 0, y: 0 }),
      onFrame: (state) => states.push(state),
    });

    tick();
    expect(states.at(-1)?.markers).toHaveLength(2);

    engine.setMarkers([]);
    tick();
    expect(states.at(-1)?.markers).toHaveLength(0);

    engine.setMarkers([{ name: 'ONLY', position: [0, 0, 0] }]);
    tick();
    expect(states.at(-1)?.markers).toHaveLength(1);
    expect(probe.loads).toBe(1);
  });
});
