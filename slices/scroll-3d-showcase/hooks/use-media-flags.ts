'use client';

import { useSyncExternalStore } from 'react';

/** Copy stacks below the model and the camera pulls back at this width or under. */
const COMPACT_QUERY = '(max-width: 900px), (pointer: coarse)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(query: string) {
  return (onChange: () => void) => {
    if (typeof window === 'undefined') return () => {};
    const list = window.matchMedia(query);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  };
}

/**
 * SSR-safe media query. The server snapshot is always `false`, which means the
 * first paint assumes the desktop layout; the client corrects it before the
 * engine starts, so no 3D work is thrown away.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export interface MediaFlags {
  compact: boolean;
  reducedMotion: boolean;
}

export function useMediaFlags(): MediaFlags {
  return {
    compact: useMediaQuery(COMPACT_QUERY),
    reducedMotion: useMediaQuery(REDUCED_MOTION_QUERY),
  };
}
