'use client';

import { useState } from 'react';
import { fromPreset } from './draft-utils';
import { pickGlbFile, requireGlbFile } from './model-file';
import { downloadJson, fromPresetFile, pickJsonFile, toPresetFile } from './preset-file';
import { copyText, keyframesToSource } from './to-source';
import type { ShowcaseStudioAdapter } from './types';
import { useRunStatus } from './use-run-status';
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
  /**
   * Records a publish made somewhere else — the library has a PUBLISH chip per
   * row. One latch for both paths, or the LIVE badge, the disabled chip and the
   * delete guard name a different model than the one the site is serving.
   */
  markLive: (id: string) => void;
  sync: () => void;
  save: () => void;
  copy: () => void;
  /** Downloads the draft as JSON — the file `import` reads back. */
  exportJson: () => void;
  /** Loads a JSON file into the draft. Nothing is written until SAVE. */
  importJson: () => void;
  /** Undefined when the adapter cannot store files; the chrome hides the chip. */
  upload?: () => void;
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
  /** Where to go once a new model exists. */
  onUploaded: (modelId: string) => void;
}

/**
 * Settings the engine bakes in at build time. `scrollLength` is absent because it
 * is page height, which React re-renders live — the rest need a fresh scene.
 */
const REBUILD_KEYS = ['modelHeight', 'damping', 'parallax', 'bloom'] as const;

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
  onUploaded,
}: UseStudioActionsArgs): StudioActions {
  const { busy, status, run } = useRunStatus();
  const [sceneEpoch, setSceneEpoch] = useState(0);
  // Publishing is a server write the host's props do not learn about until the
  // next load, and a chip still reading "not live" right after you published
  // reads as a failed click. Latched here instead: once set it stays correct
  // across model switches, because that model really is the live one. Every
  // publish in the editor writes this one latch — a second one inside the
  // library would let the two paths disagree about what is live.
  const [published, setPublished] = useState('');

  // The showcase remounts exactly when this key changes, and reads draft.settings
  // on that same render — so capturing the two together is precisely "what the
  // running scene was built with", model swaps included.
  const sceneKey = `${modelId}:${sceneEpoch}`;
  const [applied, setApplied] = useState({ key: sceneKey, settings: draft.settings });
  if (applied.key !== sceneKey) setApplied({ key: sceneKey, settings: draft.settings });

  const needsApply = REBUILD_KEYS.some((key) => draft.settings[key] !== applied.settings[key]);

  const publish = adapter.setLiveModel;
  const drop = adapter.forgetModel;
  const store = adapter.uploadModel;

  return {
    busy,
    status,
    sceneEpoch,
    needsApply,
    liveId: published || liveModelId,
    markLive: setPublished,
    goLive: publish
      ? () =>
          void run('PUBLISHING', async () => {
            await publish(modelId);
            setPublished(modelId);
            return 'NOW LIVE';
          })
      : undefined,
    upload: store
      ? () =>
          void run('UPLOADING', async () => {
            const file = await pickGlbFile();
            if (!file) return 'UPLOAD CANCELLED';
            // Refused here, the bytes never leave the machine. The backend
            // repeats the same checks on what it actually received.
            await requireGlbFile(file);
            const modelId = await store(file);
            // Straight to the new model: an upload nobody navigates to looks
            // exactly like an upload that failed.
            onUploaded(modelId);
            return `UPLOADED ${(file.size / 1048576).toFixed(1)}MB`;
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
        const { added, total, missing = 0, updated = 0 } = await adapter.syncModels();
        // Both exceptions are called out rather than folded into the total: a
        // row whose file vanished is the one state that silently breaks a
        // publish, and a replaced file is invisible in `added` — swap a .glb
        // under the same name and "+0 NEW" is true, unhelpful, and reads exactly
        // like the scan never saw it.
        const swapped = updated > 0 ? ` / ${updated} REPLACED` : '';
        const gone = missing > 0 ? ` / ${missing} MISSING` : '';
        return `+${added} NEW${swapped} / ${total} TOTAL${gone}`;
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
    exportJson: () =>
      void run('EXPORTING', async () => {
        const preset = {
          keyframes: draft.keyframes,
          markers: draft.markers,
          settings: draft.settings,
          content: draft.content,
        };
        downloadJson(`${modelId || 'preset'}.json`, toPresetFile(modelId, preset));
        return 'EXPORTED JSON';
      }),
    importJson: () =>
      void run('IMPORTING', async () => {
        const text = await pickJsonFile();
        if (text === null) return 'IMPORT CANCELLED';
        const { modelId: from, preset } = fromPresetFile(text);
        // Into the draft, not the backend: a bad import is one undo away, and
        // nothing reaches the live site until SAVE.
        draft.restore({ ...fromPreset(preset), selected: 0 });
        return from && from !== modelId ? `IMPORTED ${from.toUpperCase()}` : 'IMPORTED JSON';
      }),
    // Only the epoch moves: refreshing the baseline falls out of `sceneKey`.
    applyScene: () => setSceneEpoch((epoch) => epoch + 1),
  };
}
