'use client';

import type { HudLabels, ShowcaseError } from '../types';
import type { EngineStatus } from '../hooks/use-showcase-engine';

export interface BootOverlayProps {
  status: EngineStatus;
  loadFraction: number;
  error: ShowcaseError | null;
  labels: HudLabels;
  title: string;
}

/**
 * Boot screen and failure state. A blocking load failure is not a toast — the
 * page has nothing else to show — so the reason is rendered in place, mapped
 * from the error code to copy the consumer supplied.
 */
export function BootOverlay({ status, loadFraction, error, labels, title }: BootOverlayProps) {
  const stage =
    labels.bootStages[
      Math.min(labels.bootStages.length - 1, Math.floor(loadFraction * labels.bootStages.length))
    ];
  const percent = Math.round(loadFraction * 100);
  /** The transport has reported at least one byte, so a fraction means something. */
  const started = loadFraction > 0;

  return (
    <div
      role={status === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      data-state={status}
      // Inert as a layer, live as text. An error state never clears itself, and
      // this sits at z-50 over everything — including an editor's toolbar, where
      // a dead model would otherwise lock you out of picking a different one.
      // The children opt back in so the message stays selectable.
      className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-showcase-bg px-6 text-center transition-[opacity,visibility] duration-700 data-[state=ready]:invisible data-[state=ready]:opacity-0"
    >
      <p className="pointer-events-auto font-display text-[clamp(30px,7vw,64px)] font-bold uppercase tracking-[0.22em] text-transparent [-webkit-text-stroke:1px_var(--showcase-primary)]">
        {title}
      </p>

      {status === 'error' ? (
        <p className="pointer-events-auto max-w-[min(560px,86vw)] font-mono text-[10px] leading-loose tracking-[0.08em] text-showcase-accent">
          {labels.errors[error?.code ?? 'MODEL_FETCH_FAILED']}
        </p>
      ) : (
        <>
          {/*
            Two bars, because there are two waits with nothing in common.

            Until the first progress event lands there is no fraction to show —
            the request is still in the air — and a 0%-wide bar under a static
            word reads as a page that has given up. That stretch sweeps. Once
            the download reports bytes it fills for real, with the number beside
            it, and never goes back.
          */}
          <div
            role="progressbar"
            aria-valuenow={started ? percent : undefined}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-busy={!started}
            className="relative h-1 w-[min(300px,62vw)] overflow-hidden bg-showcase-muted/20"
          >
            <div
              style={started ? { width: `${percent}%` } : undefined}
              className={
                started
                  ? 'absolute inset-y-0 left-0 bg-showcase-primary shadow-[0_0_14px_var(--showcase-primary)] transition-[width] duration-200'
                  : 'absolute inset-y-0 left-0 w-1/5 animate-[showcase-sweep_1.1s_ease-in-out_infinite] bg-showcase-primary shadow-[0_0_14px_var(--showcase-primary)] motion-reduce:animate-none'
              }
            />
          </div>
          <p className="pointer-events-auto flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-[0.24em] text-showcase-muted">
            {stage}
            {/*
              Always present, so the readout never appears mid-load and shifts
              the line. `--` rather than `00` before the first byte: nothing has
              been measured yet, and a percentage that sits at zero reads as
              stuck where a placeholder reads as waiting.
            */}
            <span className="text-[13px] font-bold tabular-nums text-showcase-primary">
              {started ? String(percent).padStart(2, '0') : '--'}%
            </span>
          </p>
        </>
      )}
    </div>
  );
}
