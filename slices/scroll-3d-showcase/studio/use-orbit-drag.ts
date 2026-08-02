'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { clamp } from '../lib/math';

export interface OrbitDragHandlers {
  /** Both deltas are in degrees, to be added to the edited keyframe. */
  onOrbit: (azimuth: number, elevation: number) => void;
  /** Multiplier for the edited keyframe's radius. */
  onDolly: (factor: number) => void;
}

/** Sensitivities lifted from framepilot's viewport: they feel right at these radii. */
const AZIMUTH_PER_PX = 0.35;
const ELEVATION_PER_PX = 0.3;

/**
 * Turns drag and wheel on `ref` into orbit and dolly deltas.
 *
 * Wheel is a native listener because React registers `wheel` passively at the
 * root, where preventDefault is a no-op — and without it the page would scroll
 * as well as the camera dollying.
 */
export function useOrbitDrag(
  ref: RefObject<HTMLElement | null>,
  handlers: OrbitDragHandlers,
): void {
  // Synced in an effect, not during render: the listeners below are registered
  // once and read whatever the last commit left here.
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let previous: { x: number; y: number } | null = null;

    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      previous = { x: event.clientX, y: event.clientY };
      node.setPointerCapture(event.pointerId);
    };

    const move = (event: PointerEvent) => {
      if (!previous) return;
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      previous = { x: event.clientX, y: event.clientY };
      // Per-move deltas rather than drag-origin deltas: no accumulation drift.
      // Signs read as "grab the subject"; drag down raises the camera.
      latest.current.onOrbit(-dx * AZIMUTH_PER_PX, dy * ELEVATION_PER_PX);
    };

    const up = (event: PointerEvent) => {
      previous = null;
      if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
    };

    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      // Line/page-mode wheels report ~3 per notch instead of ~100, and exp()
      // keeps the factor positive when a trackpad fling sends a huge delta.
      const delta = event.deltaMode === 0 ? event.deltaY : event.deltaY * 33;
      latest.current.onDolly(clamp(Math.exp(delta * 0.001), 0.8, 1.25));
    };

    node.addEventListener('pointerdown', down);
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    node.addEventListener('wheel', wheel, { passive: false });
    return () => {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', up);
      node.removeEventListener('wheel', wheel);
    };
  }, [ref]);
}
