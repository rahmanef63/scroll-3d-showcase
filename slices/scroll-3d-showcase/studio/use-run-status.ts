'use client';

import { useEffect, useRef, useState } from 'react';

export interface RunStatus {
  busy: boolean;
  /** '' when idle. A success clears itself; a failure stays until the next run. */
  status: string;
  /** True while `status` is holding a failure, so the chrome can colour it. */
  failed: boolean;
  /** Runs `task`, narrating it. Resolves whatever happened — it never throws. */
  run: (label: string, task: () => Promise<string>) => Promise<void>;
  /** Clears a failure the reader has finished with. */
  dismiss: () => void;
}

const CLEAR_MS = 2500;

/**
 * The one way a backend round-trip is narrated in this editor: busy while it
 * runs, its own terminal sentence when it lands, `FAILED: …` when it does not.
 *
 * Shared rather than copied so a second caller cannot invent a second dialect —
 * the chrome has exactly one status slot, and on a phone it is the only place a
 * failure is ever visible.
 *
 * Success and failure expire differently on purpose. A stale "SAVED" sitting
 * next to a dirty dot reads as a lie, so it goes. A failure is the opposite: it
 * is often the only sentence explaining why nothing happened, it is unreadable
 * in two and a half seconds, and once gone there is nothing left to read — so it
 * stays until the next action replaces it or the reader dismisses it.
 */
export function useRunStatus(): RunStatus {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);

  // A save that resolves after the studio unmounts must not leave a timer behind.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  const run = async (label: string, task: () => Promise<string>) => {
    if (timer.current) clearTimeout(timer.current);
    setBusy(true);
    setFailed(false);
    setStatus(`${label}…`);
    let broke = false;
    try {
      setStatus(await task());
    } catch (error) {
      broke = true;
      setFailed(true);
      setStatus(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
      if (!broke) timer.current = setTimeout(() => setStatus(''), CLEAR_MS);
    }
  };

  return {
    busy,
    status,
    failed,
    run,
    dismiss: () => {
      setStatus('');
      setFailed(false);
    },
  };
}
