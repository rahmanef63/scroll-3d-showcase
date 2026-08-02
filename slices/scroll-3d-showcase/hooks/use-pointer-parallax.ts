'use client';

import { useCallback, useEffect, useRef } from 'react';

export interface PointerParallax {
  /** Pointer position as -1 → 1 on each axis, centred on the viewport. */
  getPointer: () => { x: number; y: number };
}

/**
 * Feeds a small camera offset from pointer movement. Disabled on coarse
 * pointers, where there is no hover to track and the listener would only cost
 * battery.
 */
export function usePointerParallax(enabled: boolean): PointerParallax {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) {
      pointer.current = { x: 0, y: 0 };
      return;
    }
    const onMove = (event: PointerEvent) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth - 0.5) * 2,
        y: (event.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [enabled]);

  return { getPointer: useCallback(() => pointer.current, []) };
}
