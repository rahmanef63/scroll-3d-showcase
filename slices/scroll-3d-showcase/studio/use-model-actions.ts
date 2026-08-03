'use client';

import type { ShowcasePreset, ShowcaseStudioAdapter } from './types';
import { useRunStatus } from './use-run-status';
import type { StudioDraft } from './use-studio-draft';

export interface ModelActions {
  busy: boolean;
  /** '' when idle. Same slot, same wording and same 2.5s clear as the chrome's. */
  status: string;
  /** Undefined when the adapter cannot publish — the row shows no chip then. */
  publish?: (id: string) => void;
  /** Writes the picker label only. Undefined when the adapter cannot rename. */
  rename?: (id: string, label: string) => void;
  /** Drops the model row. Undefined when the adapter cannot forget. */
  remove?: (id: string) => void;
  savePreset: (id: string, preset: ShowcasePreset) => void;
  /** Drops the saved tuning, keeping the model. Undefined when unsupported. */
  removePreset?: (id: string) => void;
}

export interface UseModelActionsArgs {
  adapter: ShowcaseStudioAdapter;
  /** The model the editor currently holds — the one whose draft is on screen. */
  modelId: string;
  draft: StudioDraft;
  onSelectModel: (id: string) => void;
  onRefresh?: () => void;
  /**
   * Tells the rest of the studio which row is live now. The chrome's GO LIVE
   * latches that answer, and without this the latch keeps naming whatever the
   * chrome published last — so the LIVE badge, the disabled PUBLISH chip and the
   * guard that refuses to delete the live row would all point at the wrong model
   * while the public page serves a different one.
   */
  onPublished?: (id: string) => void;
  /**
   * The JSON column caches one row's text and only RELOAD invalidates it, so a
   * deleted preset would stay in the box — with SAVE ready to put it straight
   * back and DELETE PRESET still live on a row that no longer has one.
   */
  onPresetRemoved?: () => void;
}

/**
 * The library's writes, aimed at any row rather than the open one.
 *
 * Every one of them goes through the same `run` the chrome's actions use, so a
 * failure inside the dialog reads exactly like a failure outside it, and two
 * writes cannot overlap into one confused status line.
 */
export function useModelActions({
  adapter,
  modelId,
  draft,
  onSelectModel,
  onRefresh,
  onPublished,
  onPresetRemoved,
}: UseModelActionsArgs): ModelActions {
  const { busy, status, run } = useRunStatus();

  const publish = adapter.setLiveModel;
  const drop = adapter.forgetModel;
  const relabel = adapter.renameModel;
  const dropPreset = adapter.deletePreset;

  return {
    busy,
    status,
    publish: publish
      ? (id) =>
          void run('PUBLISHING', async () => {
            await publish(id);
            // Two readers have to be told, and both of them lie without it: the
            // studio's own live latch, which the chrome's GO LIVE also writes,
            // and the host's `models`, loaded server-side and never re-read in
            // the browser. Otherwise the row keeps saying it is not live.
            onPublished?.(id);
            onRefresh?.();
            return `NOW LIVE: ${id.toUpperCase()}`;
          })
      : undefined,
    rename: relabel
      ? (id, label) =>
          void run('RENAMING', async () => {
            await relabel(id, label);
            onRefresh?.();
            return label.trim() ? `RENAMED ${id.toUpperCase()}` : 'NAME RESET';
          })
      : undefined,
    remove: drop
      ? (id) =>
          void run('DELETING', async () => {
            await drop(id);
            // Deleting the row the editor points at leaves it editing something
            // that no longer exists. An empty id is the host's "pick for me",
            // which lands on whatever the site is actually showing.
            if (id === modelId) onSelectModel('');
            else onRefresh?.();
            return `DELETED ${id.toUpperCase()}`;
          })
      : undefined,
    savePreset: (id, preset) =>
      void run('SAVING', async () => {
        await adapter.savePreset(id, preset);
        // Saving the open model's own preset from here is still a save: leaving
        // the dirty dot lit afterwards would read as the write having failed.
        if (id === modelId) draft.markSaved();
        return `SAVED ${id.toUpperCase()}`;
      }),
    removePreset: dropPreset
      ? (id) =>
          void run('CLEARING', async () => {
            await dropPreset(id);
            // Only now, after the mutation landed: re-reading first would put
            // the row that is about to be deleted straight back in the box.
            onPresetRemoved?.();
            // The editor still holds the tuning the backend just lost. Restoring
            // the state it already has changes nothing but the dirty flag — the
            // inverse of the markSaved() above — so the chrome stops reporting a
            // preset that is gone, and its SAVE chip (disabled while clean) is
            // there to put it back.
            if (id === modelId) draft.restore(draft.snapshot());
            onRefresh?.();
            return `PRESET DELETED: ${id.toUpperCase()}`;
          })
      : undefined,
  };
}
