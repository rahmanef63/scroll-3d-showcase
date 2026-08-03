'use client';

import type { ShowcaseStudioAdapter } from '@/slices/scroll-3d-showcase/studio';

/** What `requireUnlocked` throws. Matched on, so the two must not drift apart. */
const LOCKED = /studio is locked/i;

/**
 * Wraps every adapter call so an expired session ends up at the lock screen.
 *
 * The cookie lasts eight hours and nothing tells the editor when it goes. After
 * that each action throws the same sentence into the status slot and the editor
 * carries on looking alive — dirty dot, undo stack, a camera path being tuned
 * against a backend that will refuse to store it. `onLocked` re-runs the server
 * component, which finds no cookie and renders the unlock form instead.
 *
 * The error is re-thrown either way: the status slot still says what happened,
 * and the refresh lands a moment later.
 */
export function reauthOnLock(
  adapter: ShowcaseStudioAdapter,
  onLocked: () => void,
): ShowcaseStudioAdapter {
  const guard = <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        if (error instanceof Error && LOCKED.test(error.message)) onLocked();
        throw error;
      }
    };

  // Rebuilt key by key rather than spread-and-patch: an adapter member added
  // later would otherwise silently skip the guard.
  const guarded: ShowcaseStudioAdapter = {
    syncModels: guard(adapter.syncModels),
    savePreset: guard(adapter.savePreset),
  };
  if (adapter.setLiveModel) guarded.setLiveModel = guard(adapter.setLiveModel);
  if (adapter.forgetModel) guarded.forgetModel = guard(adapter.forgetModel);
  if (adapter.renameModel) guarded.renameModel = guard(adapter.renameModel);
  if (adapter.deletePreset) guarded.deletePreset = guard(adapter.deletePreset);
  if (adapter.loadPreset) guarded.loadPreset = guard(adapter.loadPreset);
  if (adapter.uploadModel) guarded.uploadModel = guard(adapter.uploadModel);
  return guarded;
}

const REASONS = {
  unset: {
    head: 'NO BACKEND',
    body: 'NEXT_PUBLIC_CONVEX_URL is not set on this deploy. The editor is running on the bundled model and the slice defaults — every save will fail.',
  },
  unreachable: {
    head: 'BACKEND UNREACHABLE',
    body: 'The deployment did not answer, so this is the bundled model and the slice defaults rather than your rows. Nothing here can be saved until it does.',
  },
} as const;

/**
 * Says out loud that the editor is running on defaults.
 *
 * Without it a degraded studio is pixel-identical to a working one: the same
 * chrome, the same model, the same tabs — and the first sign of trouble is a
 * failed save after ten minutes of tuning. Sits above the chrome rather than in
 * the status slot because it is a standing condition, not an event.
 */
export function OfflineNotice({ reason }: { reason: 'unset' | 'unreachable' }) {
  const { head, body } = REASONS[reason];
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-9 z-40 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-showcase-accent/60 bg-showcase-bg/95 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-showcase-accent backdrop-blur-sm"
    >
      <span className="font-bold">{head}</span>
      <span className="min-w-0 normal-case tracking-normal text-showcase-muted">{body}</span>
    </div>
  );
}
