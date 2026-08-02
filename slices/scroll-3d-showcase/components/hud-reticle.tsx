'use client';

import type { RefObject } from 'react';

export interface HudReticleProps {
  reticleRef: RefObject<HTMLDivElement | null>;
}

const CORNER_BASE = 'absolute h-4 w-4 border-showcase-primary opacity-80';

/**
 * Target lock that follows the point the camera is framing. Purely decorative,
 * so it is hidden from assistive tech and dropped on small screens where it
 * would sit on top of the copy.
 */
export function HudReticle({ reticleRef }: HudReticleProps) {
  return (
    <div
      ref={reticleRef}
      aria-hidden
      className="absolute left-0 top-0 hidden h-[190px] w-[190px] opacity-0 will-change-transform md:block"
    >
      <div className={`${CORNER_BASE} left-0 top-0 border-b-0 border-r-0 border-l border-t`} />
      <div className={`${CORNER_BASE} right-0 top-0 border-b-0 border-l-0 border-r border-t`} />
      <div className={`${CORNER_BASE} bottom-0 left-0 border-r-0 border-t-0 border-b border-l`} />
      <div className={`${CORNER_BASE} bottom-0 right-0 border-l-0 border-t-0 border-b border-r`} />
      <div className="absolute inset-[27%] animate-[showcase-spin_9s_linear_infinite] rounded-full border border-showcase-primary/20 border-t-showcase-primary/65 motion-reduce:animate-none" />
    </div>
  );
}
