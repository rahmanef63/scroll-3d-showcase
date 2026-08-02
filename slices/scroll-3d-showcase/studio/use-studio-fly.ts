'use client';

import { useEffect, useRef } from 'react';
import type { CameraKeyframe } from '../types';
import { FLY_KEYS, flyStep, type FlyPatch } from './fly';

export interface UseStudioFlyArgs {
  /** The keyframe being edited, read fresh every frame. */
  current: CameraKeyframe;
  onPatch: (values: FlyPatch) => void;
  /** Held keys stop a running playback, same as a drag does. */
  onStart: () => void;
}

/** Focus is inside a form control, so the key belongs to it, not to the camera. */
const typing = (): boolean => {
  const target = document.activeElement as HTMLElement | null;
  return (
    !!target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable)
  );
};

/**
 * A tab that was backgrounded hands back one enormous dt, and uncapped that is a
 * camera flung across the orbit on the first frame back.
 *
 * 0.25s, not 0.1: a frame that slow is a stutter, not a background tab, and
 * capping it means the camera silently travels less than the key was held for.
 * A machine dropping to 4fps under a heavy scene is exactly when you least want
 * the controls to also feel wrong. The worst a real background return can now
 * swing is a quarter-second of travel.
 */
const MAX_DT = 0.25;

/**
 * Held-key camera navigation, driven by its own rAF rather than by keydown
 * repeat — auto-repeat is throttled by the OS and starts after a delay, which
 * makes a camera feel broken.
 *
 * The loop only runs while a key is down, so an idle studio costs nothing. Each
 * frame patches the draft, exactly as an orbit drag does; the history stack
 * coalesces the run into one undo entry.
 */
export function useStudioFly({ current, onPatch, onStart }: UseStudioFlyArgs): void {
  const latest = useRef({ current, onPatch, onStart });
  useEffect(() => {
    latest.current = { current, onPatch, onStart };
  });

  useEffect(() => {
    const held = new Set<string>();
    let raf = 0;
    let last = 0;

    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(MAX_DT, (now - last) / 1000);
      last = now;
      const state = latest.current;
      const patch = flyStep(state.current, held, dt, held.has('shift'));
      if (patch) state.onPatch(patch);
      else stop();
    };

    const start = () => {
      if (raf) return;
      latest.current.onStart();
      // Seeded from the first frame, not from `performance.now()` here: the gap
      // between keydown and the next paint would count as travelled time.
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const down = (event: KeyboardEvent) => {
      if (typing()) return;
      const key = event.key.toLowerCase();
      if (key === 'shift') {
        held.add(key);
        return;
      }
      if (!(FLY_KEYS as readonly string[]).includes(key)) return;
      // Left alone, `s` would also save and `d` would bookmark in some browsers.
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      held.add(key);
      start();
    };

    const up = (event: KeyboardEvent) => {
      held.delete(event.key.toLowerCase());
    };

    // A key held while the window loses focus never fires keyup, and the camera
    // would drift forever the moment focus came back.
    const clear = () => {
      held.clear();
      stop();
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      stop();
    };
  }, []);
}
