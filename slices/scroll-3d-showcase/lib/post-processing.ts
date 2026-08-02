import { Vector2 } from 'three';
import type { ShowcaseStage } from './scene-factory';

export interface PostPipeline {
  render(): void;
  resize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
}

/**
 * Bloom, loaded on demand so the postprocessing chunk never lands in the
 * initial bundle. Returns `null` when bloom is off, the device is low-power, or
 * the chunk fails to load — callers fall back to a plain renderer pass, which
 * looks slightly flatter but is never broken.
 */
export async function createBloomPipeline(
  stage: ShowcaseStage,
  enabled: boolean,
): Promise<PostPipeline | null> {
  if (!enabled) return null;

  try {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] =
      await Promise.all([
        import('three/examples/jsm/postprocessing/EffectComposer.js'),
        import('three/examples/jsm/postprocessing/RenderPass.js'),
        import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
        import('three/examples/jsm/postprocessing/OutputPass.js'),
      ]);

    const composer = new EffectComposer(stage.renderer);
    composer.addPass(new RenderPass(stage.scene, stage.camera));
    // Low strength + high threshold: only the rim highlights bloom, so the
    // photoscanned skin and fabric keep their detail.
    composer.addPass(new UnrealBloomPass(new Vector2(1, 1), 0.4, 0.75, 0.84));
    composer.addPass(new OutputPass());

    return {
      render: () => composer.render(),
      resize: (width, height, pixelRatio) => {
        composer.setPixelRatio(pixelRatio);
        composer.setSize(width, height);
      },
      dispose: () => composer.dispose(),
    };
  } catch (err) {
    console.error('[scroll-3d-showcase:bloom]', err);
    return null;
  }
}
