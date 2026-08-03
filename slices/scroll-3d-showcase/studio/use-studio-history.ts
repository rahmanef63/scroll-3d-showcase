'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudioDraft, StudioSnapshot } from './use-studio-draft';

export interface StudioHistoryApi {
  /** The SAME draft with every mutator wrapped. Pass THIS one down, never `base`. */
  draft: StudioDraft;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

/** Deep enough for a long session, short enough to stay a few hundred KB. */
const MAX_ENTRIES = 50;
/** One orbit drag fires ~60 patches; this collapses them into one entry. */
const COALESCE_MS = 280;

/**
 * Undo/redo over `useStudioDraft`, ported from framepilot's `state/editor/history.ts`.
 *
 * Entries are JSON snapshots rather than inverse operations: the draft is small
 * and re-sorts itself, so replaying an edit backwards would be far more code
 * than storing the whole thing.
 *
 * `resetKey` is the modelId — a model swap clears the stack.
 */
export function useStudioHistory(base: StudioDraft, resetKey: string): StudioHistoryApi {
  const stack = useRef({ entries: [] as string[], index: -1, busy: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [range, setRange] = useState({ index: -1, length: 0 });

  // Mutators run from timers, so they must read the latest committed draft, not
  // the one captured when the timer was armed.
  const latest = useRef(base);
  useEffect(() => {
    latest.current = base;
  });

  const sync = useCallback(() => {
    const { entries, index } = stack.current;
    setRange((previous) =>
      previous.index === index && previous.length === entries.length
        ? previous
        : { index, length: entries.length },
    );
  }, []);

  const commit = useCallback(() => {
    const history = stack.current;
    if (history.busy) return;
    const json = JSON.stringify(latest.current.snapshot());
    if (history.entries[history.index] === json) return;
    history.entries = history.entries.slice(0, history.index + 1);
    history.entries.push(json);
    if (history.entries.length > MAX_ENTRIES) history.entries.shift();
    history.index = history.entries.length - 1;
    sync();
  }, [sync]);

  // React state lands after this tick, so every commit is deferred: reading the
  // snapshot synchronously would record the state *before* the edit.
  const push = useCallback(
    (delay: number) => {
      if (timer.current) {
        clearTimeout(timer.current);
        // A structural edit on top of a pending drag: flush the drag first so it
        // stays its own undo step instead of being swallowed.
        if (delay === 0) commit();
      }
      timer.current = setTimeout(() => {
        timer.current = null;
        commit();
      }, delay);
    },
    [commit],
  );

  /** Lands a coalescing drag now, so the next undo steps over it, not through it. */
  const flush = useCallback(() => {
    if (!timer.current) return;
    clearTimeout(timer.current);
    timer.current = null;
    commit();
  }, [commit]);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  useEffect(() => {
    stack.current.entries = [];
    stack.current.index = -1;
    sync();
  }, [resetKey, sync]);

  // Seeds entry 0 with the loaded preset so the first undo returns to it. It runs
  // on every render while the draft is untouched, because the draft's own reset
  // effect only lands on the *next* render — seeding once would capture the
  // outgoing model's path.
  useEffect(() => {
    const history = stack.current;
    if (base.dirty || history.index > 0) return;
    const json = JSON.stringify(base.snapshot());
    if (history.entries[0] === json) return;
    history.entries = [json];
    history.index = 0;
    sync();
  });

  const restore = useCallback(
    (next: number) => {
      const history = stack.current;
      const json = history.entries[next];
      if (json === undefined) return;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      history.busy = true;
      latest.current.restore(JSON.parse(json) as StudioSnapshot);
      history.index = next;
      sync();
      // Released after the restore's own state write, so it records nothing.
      queueMicrotask(() => {
        history.busy = false;
      });
    },
    [sync],
  );

  /**
   * Every mutator does the same two things: run, then schedule a commit. The
   * only thing that differs is when — typing and dragging coalesce into one
   * entry per pause, structural edits get one entry each.
   */
  const step = <A extends unknown[]>(fn: (...args: A) => void, delay: number) =>
    (...args: A) => {
      fn(...args);
      push(delay);
    };

  return {
    draft: {
      ...base,
      patch: step(base.patch, COALESCE_MS),
      patchSettings: step(base.patchSettings, COALESCE_MS),
      patchContent: step(base.patchContent, COALESCE_MS),
      patchSection: step(base.patchSection, COALESCE_MS),
      addAt: step(base.addAt, 0),
      duplicate: step(base.duplicate, 0),
      remove: step(base.remove, 0),
      addMarker: step(base.addMarker, 0),
      renameMarker: step(base.renameMarker, 0),
      removeMarker: step(base.removeMarker, 0),
      setContent: step(base.setContent, 0),
      addSection: step(base.addSection, 0),
      removeSection: step(base.removeSection, 0),
      // Wholesale replacement — a JSON import. Wrapped like any other edit so
      // one undo puts the model's own preset back.
      restore: step(base.restore, 0),
    },
    canUndo: range.index > 0,
    canRedo: range.index >= 0 && range.index < range.length - 1,
    undo: () => {
      flush();
      restore(stack.current.index - 1);
    },
    redo: () => {
      flush();
      restore(stack.current.index + 1);
    },
  };
}
