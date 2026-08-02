'use client';

import { useCallback, useEffect, useRef } from 'react';
import { clamp } from '../lib/math';

export interface ScrollProgress {
  /** Current 0–1 position. Read inside the render loop, never during render. */
  getProgress: () => number;
  /** Smooth-scrolls the window so progress lands on `p`. */
  scrollToProgress: (p: number, behavior?: ScrollBehavior) => void;
}

/**
 * Tracks window scroll as a 0–1 value in a ref rather than state: the render
 * loop reads it 60 times a second and re-rendering React that often would
 * defeat the point.
 */
export function useScrollProgress(): ScrollProgress {
  const progress = useRef(0);

  const maxScroll = useCallback(
    () => Math.max(1, document.body.scrollHeight - window.innerHeight),
    [],
  );

  useEffect(() => {
    const read = () => {
      progress.current = clamp(window.scrollY / maxScroll(), 0, 1);
    };
    read();
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read);
    return () => {
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, [maxScroll]);

  const getProgress = useCallback(() => progress.current, []);

  const scrollToProgress = useCallback(
    (p: number, behavior: ScrollBehavior = 'smooth') => {
      window.scrollTo({ top: clamp(p, 0, 1) * maxScroll(), behavior });
    },
    [maxScroll],
  );

  return { getProgress, scrollToProgress };
}
