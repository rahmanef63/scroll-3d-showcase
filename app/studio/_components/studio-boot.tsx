import type { ReactNode } from 'react';

/** Centred slab for everything the studio route shows that is not the editor. */
export function Frame({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      {children}
    </main>
  );
}

/**
 * Shown while the cookie check and the two Convex reads are in flight, and again
 * on every model switch. The bar sweeps rather than fills: none of that work
 * reports a fraction, and a fake percentage is worse than an honest pulse.
 */
export function StudioBoot() {
  return (
    <Frame>
      <div
        role="status"
        aria-label="Loading the studio"
        className="relative h-0.5 w-[min(300px,62vw)] overflow-hidden bg-showcase-line"
      >
        <span className="absolute inset-y-0 left-0 w-1/5 animate-[showcase-sweep_1.1s_ease-in-out_infinite] bg-showcase-primary shadow-[0_0_14px_var(--showcase-primary)] motion-reduce:animate-none" />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-showcase-muted">
        Loading the studio…
      </p>
    </Frame>
  );
}
