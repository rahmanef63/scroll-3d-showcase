'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * How much of the remaining distance is covered per 16ms frame. 0.12 crosses a
 * gap in roughly a third of a second — long enough to read as counting, short
 * enough that the number is never far behind the truth.
 */
const EASE = 0.12;
/** Below this the animation has nothing left to say; snap and stop the loop. */
const SNAP = 0.0015;

/**
 * One frame of the approach. Pure and exported so the easing can be tested
 * without a rAF clock — `dt` is in frames, not milliseconds, so a slow frame
 * covers proportionally more ground instead of stalling the count.
 */
export function stepToward(value: number, target: number, dt: number): number {
  // Never past the target: this number is a download percentage, and a count
  // that runs ahead of the bytes is a lie with a progress bar around it.
  if (target <= value) return target;
  const next = value + (target - value) * Math.min(1, EASE * dt);
  return target - next < SNAP ? target : next;
}

/**
 * Follows `target` instead of jumping to it.
 *
 * Download progress arrives in chunks — a 3 MB model reports maybe a dozen
 * times — so a percentage bound straight to it lurches: 0, 0, 17, 17, 44. This
 * walks the gap, which is what makes the boot screen read as a machine working
 * rather than a widget stuttering.
 *
 * Reduced motion gets the raw value: the whole point of the animation is the
 * motion, and there is nothing to preserve once it is off.
 */
export function useCountUp(target: number, reducedMotion = false): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    // Refs only in here. Every branch that used to setState now falls out of
    // `shown` below instead: a state write in an effect body schedules a second
    // render for a value the first one could already have computed.
    if (reducedMotion || current.current > target) current.current = target;
    if (reducedMotion || current.current >= target) return;

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(4, (now - last) / 16.67);
      last = now;
      current.current = stepToward(current.current, target, dt);
      setValue(current.current);
      if (current.current < target) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reducedMotion]);

  // Clamped rather than stored: a target below what is on screen is a remount
  // with a fresh model, and easing down would read as the download losing
  // ground. Reduced motion takes the raw number, animation being the only thing
  // this hook has to offer.
  return reducedMotion ? target : Math.min(value, target);
}
