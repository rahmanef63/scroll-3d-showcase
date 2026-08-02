import type { ReactNode } from 'react';

/**
 * Shared building blocks for the copy panels. Extracted the moment a second
 * panel needed them rather than waiting for a third copy to appear.
 */

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 flex items-center justify-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.34em] text-showcase-primary md:justify-[inherit]">
      <span aria-hidden className="h-px w-[26px] bg-showcase-primary opacity-70" />
      {children}
    </p>
  );
}

/**
 * `whitespace-pre-line` on both titles: headings arrive as editable strings, so
 * a line break has to be a character someone can type rather than a `<br />`
 * only a developer can add.
 */
export function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 whitespace-pre-line text-[clamp(24px,7.6vw,34px)] font-bold uppercase leading-none tracking-tight md:text-[clamp(26px,3.8vw,48px)]">
      {children}
    </h2>
  );
}

export function HeroTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="mb-5 whitespace-pre-line text-[clamp(42px,15vw,70px)] font-bold uppercase leading-[0.88] tracking-tight [text-shadow:0_0_60px_rgb(79_227_255/0.3)] md:text-[clamp(44px,7.4vw,112px)]">
      {children}
    </h1>
  );
}

/** Outlined half of the wordmark — pure decoration, so it carries no semantics. */
export function TitleOutline({ children }: { children: ReactNode }) {
  return (
    <span className="text-transparent [-webkit-text-stroke:1px_var(--showcase-primary)]">
      {children}
    </span>
  );
}

export function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="mx-auto max-w-[42ch] text-[13px] leading-[1.75] text-showcase-muted md:mx-0 md:text-[clamp(13px,1.3vw,15.5px)]">
      {children}
    </p>
  );
}
