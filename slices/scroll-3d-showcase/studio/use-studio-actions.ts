'use client';

import { useEffect, useRef, useState } from 'react';
import { copyText, keyframesToSource } from './to-source';
import type { ShowcaseStudioAdapter } from './types';
import type { StudioDraft } from './use-studio-draft';

export interface StudioActions {
  busy: boolean;
  /** '' when idle. Auto-clears 2.5s after a terminal message. */
  status: string;
  /** Part of the <Scroll3DShowcase> key. */
  sceneEpoch: number;
  needsApply: boolean;
  /** Model the public page renders, '' when nothing is published. */
  liveId: string;
  sync: () => void;
  save: () => void;
  copy: () => void;
  applyScene: () => void;
  /** Undefined when the adapter cannot publish; the chrome hides the chip then. */
  goLive?: () => void;
  /** Undefined when the adapter cannot forget. Navigates away on success. */
  forget?: () => void;
}

export interface UseStudioActionsArgs {
  adapter: ShowcaseStudioAdapter;
  modelId: string;
  draft: StudioDraft;
  /** What the host said was live when the page rendered. */
  liveModelId: string;
  /** Where to go once the current model no longer exists. */
  onForgotten: () => void;
}

/**
 * Settings the engine bakes in at build time. `scrollLength` is absent because it
 * is page height, which React re-renders live — the rest need a fresh scene.
 */
const REBUILD_KEYS = ['modelHeight', 'damping', 'parallax', 'bloom'] as const;

const CLEAR_MS = 2500;

/**
 * The studio's three backend-facing actions plus the scene-rebuild latch, kept
 * out of the composition root so it stays a wiring file.
 */
export function useStudioActions({
  adapter,
  modelId,
  draft,
  liveModelId,
  onForgotten,
}: UseStudioActionsArgs): StudioActions {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [sceneEpoch, setSceneEpoch] = useState(0);
  // Publishing is a server write the host's props do not learn about until the
  // next load, and a chip still reading "not live" right after you published
  // reads as a failed click. Latched here instead: once set it stays correct
  // across model switches, because that model really is the live one.
  const [published, setPublished] = useState('');

  // The showcase remounts exactly when this key changes, and reads draft.settings
  // on that same render — so capturing the two together is precisely "what the
  // running scene was built with", model swaps included.
  const sceneKey = `${modelId}:${sceneEpoch}`;
  const [applied, setApplied] = useState({ key: sceneKey, settings: draft.settings });
  if (applied.key !== sceneKey) setApplied({ key: sceneKey, settings: draft.settings });

  const needsApply = REBUILD_KEYS.some((key) => draft.settings[key] !== applied.settings[key]);

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

  const publish = adapter.setLiveModel;
  const drop = adapter.forgetModel;

  return {
    busy,
    status,
    sceneEpoch,
    needsApply,
    liveId: published || liveModelId,
    goLive: publish
      ? () =>
          void run('PUBLISHING', async () => {
            await publish(modelId);
            setPublished(modelId);
            return 'NOW LIVE';
          })
      : undefined,
    forget: drop
      ? () =>
          void run('FORGETTING', async () => {
            await drop(modelId);
            // The model this editor is pointed at is gone; staying on it would
            // show a picker entry that no longer exists.
            onForgotten();
            return 'FORGOTTEN';
          })
      : undefined,
    sync: () =>
      void run('SYNCING', async () => {
        const { added, total, missing = 0 } = await adapter.syncModels();
        // Missing is called out rather than folded into the total: a row whose
        // file vanished is the one state that silently breaks a publish.
        const gone = missing > 0 ? ` / ${missing} MISSING` : '';
        return `+${added} NEW / ${total} TOTAL${gone}`;
      }),
    save: () =>
      void run('SAVING', async () => {
        await adapter.savePreset(modelId, {
          keyframes: draft.keyframes,
          markers: draft.markers,
          settings: draft.settings,
          content: draft.content,
        });
        draft.markSaved();
        return 'SAVED';
      }),
    copy: () =>
      void run('COPYING', async () =>
        (await copyText(keyframesToSource(draft.keyframes)))
          ? 'COPIED TS TABLE'
          : 'CLIPBOARD BLOCKED',
      ),
    // Only the epoch moves: refreshing the baseline falls out of `sceneKey`.
    applyScene: () => setSceneEpoch((epoch) => epoch + 1),
  };
}
