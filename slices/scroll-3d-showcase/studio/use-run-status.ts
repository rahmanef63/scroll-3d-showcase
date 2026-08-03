'use client';

import { useEffect, useRef, useState } from 'react';

export interface RunStatus {
  busy: boolean;
  /** '' when idle. Auto-clears 2.5s after a terminal message. */
  status: string;
  /** Runs `task`, narrating it. Resolves whatever happened — it never throws. */
  run: (label: string, task: () => Promise<string>) => Promise<void>;
}

const CLEAR_MS = 2500;

/**
 * The one way a backend round-trip is narrated in this editor: busy while it
 * runs, its own terminal sentence when it lands, `FAILED: …` when it does not.
 *
 * Shared rather than copied so a second caller cannot invent a second dialect —
 * the chrome has exactly one status slot, and on a phone it is the only place a
 * failure is ever visible.
 */
export function useRunStatus(): RunStatus {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  // A save that resolves after the studio unmounts must not leave a timer behind.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  const run = async (label: string, task: () => Promise<string>) => {
    if (timer.current) clearTimeout(timer.current);
    setBusy(true);
    setStatus(`${label}…`);
    try {
      setStatus(await task());
    } catch (error) {
      setStatus(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
      // The chrome's status slot is transient: a stale "SAVED" sitting next to a
      // dirty dot reads as a lie, so it clears itself.
      timer.current = setTimeout(() => setStatus(''), CLEAR_MS);
    }
  };

  return { busy, status, run };
}
