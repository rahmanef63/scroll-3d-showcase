'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { ShowcaseLoadError } from '../lib/load-error';
import type { ShowcaseEngine } from '../lib/showcase-engine';
import type {
  AnchorMarker,
  CameraKeyframe,
  FrameState,
  SceneSettings,
  ShowcaseError,
  ShowcaseSection,
} from '../types';

export type EngineStatus = 'loading' | 'ready' | 'error';

export interface UseShowcaseEngineArgs {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  modelUrl: string;
  settings: SceneSettings;
  keyframes: readonly CameraKeyframe[];
  markers: readonly AnchorMarker[];
  sections: readonly ShowcaseSection[];
  compact: boolean;
  reducedMotion: boolean;
  getScroll: () => number;
  getPointer: () => { x: number; y: number };
  /** Called every animation frame. Keep it imperative — do not setState in here. */
  onFrame: (state: FrameState) => void;
  onError?: (error: ShowcaseError) => void;
}

export interface UseShowcaseEngineResult {
  status: EngineStatus;
  error: ShowcaseError | null;
  /** Download progress, 0–1, for the boot overlay. */
  loadFraction: number;
}

/**
 * Owns the engine lifecycle for one canvas: build, load the model, run the
 * loop, and tear everything down on unmount.
 *
 * The asset download lives here rather than in a component so the mutation-ish
 * work stays in a slice-local hook and components stay declarative.
 */
export function useShowcaseEngine(args: UseShowcaseEngineArgs): UseShowcaseEngineResult {
  const [status, setStatus] = useState<EngineStatus>('loading');
  const [error, setError] = useState<ShowcaseError | null>(null);
  const [loadFraction, setLoadFraction] = useState(0);

  // Latest props for the callbacks the engine holds across its whole lifetime.
  // Synced in an effect rather than during render: writing a ref while
  // rendering is unsafe under concurrent React, and this effect is declared
  // first so the value is fresh before any effect below reads it.
  const latest = useRef(args);
  useEffect(() => {
    latest.current = args;
  });

  const engineRef = useRef<ShowcaseEngine | null>(null);
  const { canvasRef, modelUrl } = args;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let active: ShowcaseEngine | null = null;
    let observer: ResizeObserver | null = null;
    let cancelled = false;

    const onVisibility = () => {
      if (!active) return;
      if (document.hidden) active.stop();
      else if (!cancelled) run(active);
    };

    void build();

    return () => {
      cancelled = true;
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      active?.dispose();
      if (engineRef.current === active) engineRef.current = null;
    };

    /**
     * three, the GLTF loader and the whole scene graph arrive here rather than
     * in the page's first load: they are ~700 KB that nothing can use until
     * this effect runs, and the HUD and the copy are server-rendered HTML that
     * should paint without waiting for them. The <link rel="preload"> the host
     * puts in the document means the model download does not wait for it either.
     */
    async function build() {
      let engine: ShowcaseEngine;
      try {
        const { createShowcaseEngine } = await import('../lib/showcase-engine');
        if (cancelled) return;
        engine = createShowcaseEngine({
          canvas: canvas!,
          modelUrl,
          settings: latest.current.settings,
          keyframes: latest.current.keyframes,
          markers: latest.current.markers,
          sections: latest.current.sections,
          compact: latest.current.compact,
          reducedMotion: latest.current.reducedMotion,
        });
      } catch (err) {
        report(err);
        return;
      }

      // Unmounted while the chunk was in flight: the cleanup above already ran
      // and never saw this engine, so it disposes itself.
      if (cancelled) {
        engine.dispose();
        return;
      }

      active = engine;
      engineRef.current = engine;
      engine.resize();
      observer = new ResizeObserver(() => engine.resize());
      observer.observe(canvas!);
      document.addEventListener('visibilitychange', onVisibility);

      try {
        await engine.load((fraction) => {
          if (!cancelled) setLoadFraction(fraction);
        });
      } catch (err) {
        report(err);
        return;
      }
      if (cancelled) return;

      setStatus('ready');
      setLoadFraction(1);
      run(engine);
    }

    function run(engine: ShowcaseEngine) {
      engine.start({
        getScroll: () => latest.current.getScroll(),
        getPointer: () => latest.current.getPointer(),
        onFrame: (state) => latest.current.onFrame(state),
      });
    }

    function report(err: unknown) {
      const showcaseError: ShowcaseError =
        err instanceof ShowcaseLoadError
          ? { code: err.code, detail: err.message }
          : { code: 'MODEL_FETCH_FAILED', detail: String(err) };
      console.error('[scroll-3d-showcase:engine]', showcaseError.code, err);
      if (cancelled) return;
      setError(showcaseError);
      setStatus('error');
      latest.current.onError?.(showcaseError);
    }
    // Rebuilding the whole scene is only correct when the model itself changes;
    // layout and motion changes go through setFlags below.
  }, [canvasRef, modelUrl]);

  const { compact, reducedMotion } = args;
  useEffect(() => {
    engineRef.current?.setFlags({ compact, reducedMotion });
  }, [compact, reducedMotion]);

  // Camera-path edits are pushed straight into the running loop. Callers must
  // hand over a new array per edit — mutating in place never fires this.
  const { keyframes, markers } = args;
  useEffect(() => {
    engineRef.current?.setKeyframes(keyframes);
  }, [keyframes]);

  useEffect(() => {
    engineRef.current?.setMarkers(markers);
  }, [markers]);

  return { status, error, loadFraction };
}
