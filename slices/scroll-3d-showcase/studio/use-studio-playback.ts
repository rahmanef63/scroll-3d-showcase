'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMediaFlags } from '../hooks/use-media-flags';
import { clamp } from '../lib/math';

export interface StudioPlayback {
  playing: boolean;
  loop: boolean;
  /** Seconds for a full 0 → 1 sweep. */
  duration: number;
  /** false under prefers-reduced-motion — the play button renders disabled. */
  available: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setLoop: (loop: boolean) => void;
  setDuration: (seconds: number) => void;
}

export interface UseStudioPlaybackArgs {
  getProgress: () => number;
  scrollToProgress: (p: number, behavior?: ScrollBehavior) => void;
  /** Fires exactly once per stop, with the p it stopped on. */
  onStop: (p: number) => void;
}

/** Marks a control that changes playback rather than the playhead. */
export const CONTROL_ATTRIBUTE = 'data-playback-control';

const DEFAULT_DURATION = 12;
const MIN_DURATION = 2;
const MAX_DURATION = 60;

/**
 * Plays the camera path by driving the *real* page scroll, so what plays is
 * exactly what a visitor sees — no second timeline to keep in sync.
 *
 * Playback is the only writer while it runs: the scrubber, the rail and the
 * orbit surface all stop it on their first pointer event, so nothing ever
 * fights the engine's damping from two directions.
 */
export function useStudioPlayback({
  getProgress,
  scrollToProgress,
  onStop,
}: UseStudioPlaybackArgs): StudioPlayback {
  const { reducedMotion } = useMediaFlags();
  const available = !reducedMotion;
  const [running, setRunning] = useState(false);
  // Derived, not an effect: turning reduced-motion on mid-take stops the loop on
  // the same render instead of one cascade later.
  const playing = running && available;
  const [loop, setLoopState] = useState(false);
  const [duration, setDurationState] = useState(DEFAULT_DURATION);

  // The loop reads these live rather than snapshotting them at play(): framepilot
  // freezes them when the run starts, so its LOOP toggle never lands mid-take.
  const live = useRef({ loop, duration, getProgress, scrollToProgress, onStop });
  useEffect(() => {
    live.current = { loop, duration, getProgress, scrollToProgress, onStop };
  });

  const pause = useCallback(() => setRunning(false), []);
  const play = useCallback(() => setRunning(available), [available]);
  const toggle = useCallback(
    () => setRunning((current) => (current ? false : available)),
    [available],
  );

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let p = live.current.getProgress();
    // Parked at the end: a second press replays rather than doing nothing.
    if (p >= 0.999) p = 0;

    const step = (now: number) => {
      // Clamped so a backgrounded tab resumes instead of jumping to the end.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      p += dt / live.current.duration;
      if (p >= 1) {
        if (!live.current.loop) {
          live.current.scrollToProgress(1, 'auto');
          setRunning(false);
          return;
        }
        p = 0;
      }
      live.current.scrollToProgress(p, 'auto');
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    // One guard covers every input surface — orbit, scrubber, rail, panel — except
    // the transport's own play/loop/duration controls: their pointerdown would
    // stop the take a frame before their click asked to change it.
    const stop = (event: Event) => {
      if ((event.target as Element | null)?.closest?.(`[${CONTROL_ATTRIBUTE}]`)) return;
      setRunning(false);
    };
    window.addEventListener('pointerdown', stop, true);
    window.addEventListener('wheel', stop, { capture: true, passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointerdown', stop, true);
      window.removeEventListener('wheel', stop, true);
      live.current.onStop(live.current.getProgress());
    };
  }, [playing]);

  return {
    playing,
    loop,
    duration,
    available,
    play,
    pause,
    toggle,
    setLoop: setLoopState,
    setDuration: useCallback(
      (seconds: number) =>
        setDurationState((previous) =>
          Number.isFinite(seconds) ? clamp(seconds, MIN_DURATION, MAX_DURATION) : previous,
        ),
      [],
    ),
  };
}
