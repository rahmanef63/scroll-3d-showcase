'use client';

import { cn } from '@/lib/utils';
import { modelOption } from './model-label';
import { Chip, INPUT } from './studio-ui';
import type { ShowcaseModel } from './types';

export interface ChromeModelProps {
  models: readonly ShowcaseModel[];
  modelId: string;
  busy: boolean;
  /** The selected model is the one the public page renders. */
  isLive: boolean;
  /** The selected model's file is gone from the host's scan. */
  missing: boolean;
  /** The selected model lives in the backend's storage, not in public/. */
  uploaded: boolean;
  onSelectModel: (id: string) => void;
  onGoLive?: () => void;
  onForget?: () => void;
}

/**
 * Which model, and whether it is the one the site is showing.
 *
 * One group because the three read as one sentence: this model, is it live, and
 * (only when broken) get rid of it.
 */
export function ChromeModel({
  models,
  modelId,
  busy,
  isLive,
  missing,
  uploaded,
  onSelectModel,
  onGoLive,
  onForget,
}: ChromeModelProps) {
  return (
    <>
      <select
    value={modelId}
    onChange={(event) => onSelectModel(event.target.value)}
    aria-label="Model"
    className={cn('max-w-24 shrink-0 lg:max-w-52', INPUT)}
  >
    {models.length === 0 && <option value="">— NO MODELS — PRESS SYNC</option>}
    {models.map((entry) => (
      <option key={entry.id} value={entry.id}>
        {modelOption(entry)}
      </option>
    ))}
  </select>

  {/* Sits beside the picker because it is a statement about that model, not
      an action on the draft — and disabled when it already holds, so the
      chip doubles as the answer to "which one is the site showing?". */}
  {onGoLive ? (
    <Chip
      // Convex refuses a missing model too; disabling here just means the
      // answer arrives before the round-trip instead of after it.
      disabled={busy || isLive || missing}
      active={isLive}
      onClick={onGoLive}
      title={
        missing
          ? 'This file is gone from public/ — it cannot be published'
          : isLive
            ? 'This model is on the public page'
            : 'Put this model on the public page'
      }
    >
      {missing ? 'NO FILE' : isLive ? 'LIVE' : 'GO LIVE'}
    </Chip>
  ) : null}

  {/* A scanned row is only forgettable once its file is already gone; an
      uploaded one always is, because deleting it is the only way to get its
      bytes back out of storage. */}
  {(missing || uploaded) && onForget ? (
    <Chip
      disabled={busy}
      onClick={onForget}
      title={
        uploaded
          ? 'Delete this model and its file. The saved preset stays behind.'
          : 'Drop this row. Its saved preset stays, and comes back if the file does.'
      }
      className="hover:text-showcase-accent"
    >
      FORGET
    </Chip>
  ) : null}
    </>
  );
}
