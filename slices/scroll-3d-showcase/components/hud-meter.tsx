'use client';

import type { RefObject } from 'react';

export interface HudMeterProps {
  caption: string;
  fillRef: RefObject<HTMLDivElement | null>;
  valueRef: RefObject<HTMLElement | null>;
}

/** Vertical scroll readout on the right edge. Hidden below `md` to keep phones clean. */
export function HudMeter({ caption, fillRef, valueRef }: HudMeterProps) {
  return (
    <div className="absolute right-(--showcase-pad) top-1/2 hidden -translate-y-1/2 flex-col items-center gap-2.5 font-mono text-[9px] tracking-[0.2em] text-showcase-muted md:flex">
      <span ref={valueRef} className="text-showcase-primary">
        000
      </span>
      <div className="relative h-[clamp(110px,28vh,240px)] w-0.5 overflow-hidden bg-showcase-muted/20">
        <div
          ref={fillRef}
          className="absolute left-0 top-0 h-0 w-full bg-linear-to-b from-showcase-primary to-showcase-accent shadow-[0_0_12px_var(--showcase-primary)]"
        />
      </div>
      <span>{caption}</span>
    </div>
  );
}
