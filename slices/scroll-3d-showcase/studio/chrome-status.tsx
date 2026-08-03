'use client';

import { cn } from '@/lib/utils';
import { FOCUS } from './studio-ui';

export interface ChromeStatusProps {
  busy: boolean;
  /** '' when idle. */
  status: string;
  /** `status` is a failure rather than a receipt. */
  failed?: boolean;
  dirty: boolean;
  onDismiss?: () => void;
}

/**
 * What the editor is doing and whether the draft is saved.
 *
 * The right-hand end of the chrome, and on a phone the only place any of this is
 * ever visible — the shortcut legend beside it is hidden below `lg`.
 */
export function ChromeStatus({ busy, status, failed, dirty, onDismiss }: ChromeStatusProps) {
  return (
    <>
      <span className="ml-auto flex min-w-0 items-center gap-2 lg:ml-0 lg:shrink-0">
        {/* A failure is a button because it outlives its action: it waits to be
            read rather than expiring, so the person who read it needs a way to
            put it away. A success is a plain span — it clears itself. */}
        {status ? (
          failed ? (
            <button
              type="button"
              onClick={onDismiss}
              title="Dismiss"
              className={cn('truncate text-left text-showcase-accent', FOCUS)}
            >
              {status} ✕
            </button>
          ) : (
            <span className="truncate text-showcase-fg">{status}</span>
          )
        ) : null}
        <span className={cn('shrink-0', dirty ? 'text-showcase-warn' : 'text-showcase-muted')}>
          {dirty ? '●' : '○'}
          <span className="hidden lg:inline">{dirty ? ' UNSAVED' : ' SAVED'}</span>
        </span>
      </span>

      {/* The backend actions are round-trips with no progress to report. The
          status slot says what is running; this says it still is — on a slow
          link that is the difference between "working" and "broken". */}
      {busy ? (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 block h-px overflow-hidden bg-showcase-line"
        >
          <span className="absolute inset-y-0 left-0 block w-1/5 animate-[showcase-sweep_1.1s_ease-in-out_infinite] bg-showcase-primary motion-reduce:animate-none" />
        </span>
      ) : null}
    </>
  );
}
