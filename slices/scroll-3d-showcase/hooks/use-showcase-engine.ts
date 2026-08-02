'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { createShowcaseEngine, type ShowcaseEngine } from '../lib/showcase-engine';
import { ShowcaseLoadError } from '../lib/model-loader';
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

    let engine: ShowcaseEngine | null = null;
    let cancelled = false;

    try {
      engine = createShowcaseEngine({
        canvas,
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

    const active = engine;
    engineRef.current = active;
    active.resize();

    active
      .load((fraction) => {
        if (!cancelled) setLoadFraction(fraction);
      })
      .then(() => {
        if (cancelled) return;
        setStatus('ready');
        setLoadFraction(1);
        active.start({
          getScroll: () => latest.current.getScroll(),
          getPointer: () => latest.current.getPointer(),
          onFrame: (state) => latest.current.onFrame(state),
        });
      })
      .catch(report);

    const observer = new ResizeObserver(() => active.resize());
    observer.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) active.stop();
      else if (!cancelled && !document.hidden) {
        active.start({
          getScroll: () => latest.current.getScroll(),
          getPointer: () => latest.current.getPointer(),
          onFrame: (state) => latest.current.onFrame(state),
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      active.dispose();
      if (engineRef.current === active) engineRef.current = null;
    };

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
