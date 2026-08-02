'use client';

import type { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import type { ShowcaseSection } from '../types';

export interface HudRailProps {
  sections: readonly ShowcaseSection[];
  nodeRefs: RefObject<(HTMLElement | null)[]>;
  onJump: (progress: number) => void;
}

/**
 * Level-select style rail. Real buttons, so keyboard users can jump between
 * sections without scrolling through the whole timeline.
 */
export function HudRail({ sections, nodeRefs, onJump }: HudRailProps) {
  return (
    <nav
      aria-label="Sections"
      className="pointer-events-auto absolute left-(--showcase-pad) top-1/2 hidden -translate-y-1/2 flex-col gap-[clamp(16px,3.4vh,34px)] md:flex"
    >
      {sections.map((section, index) => (
        <Button
          key={section.id}
          ref={(node) => {
            if (nodeRefs.current) nodeRefs.current[index] = node;
          }}
          variant="ghost"
          onClick={() => onJump(section.progress)}
          className="group h-auto justify-start gap-2.5 rounded-none bg-transparent p-0 font-mono text-[10px] uppercase tracking-[0.16em] text-showcase-muted hover:bg-transparent hover:text-showcase-primary [&.is-active]:text-showcase-primary"
        >
          <span className="block size-[9px] shrink-0 rotate-45 border border-showcase-muted/55 transition-colors group-[.is-active]:border-showcase-primary group-[.is-active]:bg-showcase-primary group-[.is-active]:shadow-[0_0_12px_var(--showcase-primary)]" />
          <span className="whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-70 group-[.is-active]:opacity-100">
            {section.id} — {section.name}
          </span>
        </Button>
      ))}
    </nav>
  );
}
