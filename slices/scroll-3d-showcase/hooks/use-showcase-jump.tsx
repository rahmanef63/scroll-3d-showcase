'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

export interface ShowcaseJumpApi {
  /** Scrolls so the timeline lands on `progress` (0–1). */
  jumpTo: (progress: number) => void;
  /** Scrolls to a section by its id. No-op if the id is unknown. */
  jumpToSection: (id: string) => void;
}

const ShowcaseJumpContext = createContext<ShowcaseJumpApi | null>(null);

export function ShowcaseJumpProvider({
  jumpTo,
  sections,
  children,
}: {
  jumpTo: (progress: number) => void;
  sections: readonly { id: string; progress: number }[];
  children: ReactNode;
}) {
  const value = useMemo<ShowcaseJumpApi>(
    () => ({
      jumpTo,
      jumpToSection: (id) => {
        const target = sections.find((section) => section.id === id);
        if (target) jumpTo(target.progress);
      },
    }),
    [jumpTo, sections],
  );

  return (
    <ShowcaseJumpContext.Provider value={value}>{children}</ShowcaseJumpContext.Provider>
  );
}

/**
 * Lets consumer-owned panel copy drive the camera — a "see my work" button can
 * move the timeline without the consumer reaching into slice internals.
 * Throws outside the provider so a misplaced call fails loudly in development.
 */
export function useShowcaseJump(): ShowcaseJumpApi {
  const context = useContext(ShowcaseJumpContext);
  if (!context) {
    throw new Error('useShowcaseJump must be called inside <Scroll3DShowcase>');
  }
  return context;
}
