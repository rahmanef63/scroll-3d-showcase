'use client';

// Collecting panel nodes into a shared array is the point of this ref: the rAF
// loop fades them without re-rendering. The rule reads that write as mutation.
/* eslint-disable react-hooks/immutability */

import type { ReactNode, RefObject } from 'react';
import type { ShowcaseSection } from '../types';

export interface SectionPanelProps {
  section: ShowcaseSection;
  index: number;
  panelRefs: RefObject<(HTMLElement | null)[]>;
}

/**
 * One scroll-linked copy panel. Mobile-first: copy stacks at the bottom over a
 * vertical scrim, and only from `md` up does it move to one side so the model
 * can sit opposite it.
 */
export function SectionPanel({ section, index, panelRefs }: SectionPanelProps): ReactNode {
  const alignEnd = section.align === 'end';

  return (
    <section
      id={section.id}
      ref={(node) => {
        if (panelRefs.current) panelRefs.current[index] = node;
      }}
      className={[
        'invisible absolute inset-0 flex items-end justify-center px-(--showcase-pad) pb-[calc(var(--showcase-pad)+54px)] text-center opacity-0 will-change-[opacity,transform]',
        'md:items-center md:px-[calc(var(--showcase-pad)+var(--showcase-inset)+58px)] md:pb-0',
        alignEnd ? 'md:justify-end md:text-right' : 'md:justify-start md:text-left',
      ].join(' ')}
    >
      <div
        aria-hidden
        className={[
          'pointer-events-none absolute inset-0 bg-linear-to-t from-showcase-bg/97 via-showcase-bg/90 to-transparent',
          alignEnd
            ? 'md:bg-linear-to-l md:from-showcase-bg/90 md:via-showcase-bg/60 md:to-transparent'
            : 'md:bg-linear-to-r md:from-showcase-bg/90 md:via-showcase-bg/60 md:to-transparent',
        ].join(' ')}
      />
      <div className="relative z-10 w-full max-w-full md:max-w-[min(620px,46vw)]">
        {section.content}
      </div>
    </section>
  );
}
