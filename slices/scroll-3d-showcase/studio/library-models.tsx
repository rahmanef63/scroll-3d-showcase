'use client';

import { cn } from '@/lib/utils';
import { LibraryRow } from './library-row';
import { Chip, LABEL, TAP } from './studio-ui';
import type { ShowcaseModel } from './types';
import type { ModelActions } from './use-model-actions';

export interface LibraryModelsProps {
  models: readonly ShowcaseModel[];
  /** The model the editor holds. */
  openModelId: string;
  liveId: string;
  /** The row the JSON column is showing. */
  selectedId: string;
  /** The open model has unwritten edits — shown on its row, since switching drops them. */
  dirty: boolean;
  actions: ModelActions;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  /** Absent when the adapter cannot store files — no chip rather than a dead one. */
  onUpload?: () => void;
}

/**
 * Column one: every model the host knows about.
 *
 * Scrolls on its own so the JSON beside it keeps its height. `MAX_MODELS` caps
 * the list at 200, which is why nothing here is virtualised.
 */
export function LibraryModels({
  models,
  openModelId,
  liveId,
  selectedId,
  dirty,
  actions,
  onSelect,
  onOpen,
  onUpload,
}: LibraryModelsProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-showcase-line/60 px-2 py-1.5">
        <h3 className={cn(LABEL, 'text-showcase-primary')}>MODELS · {models.length}</h3>
        {onUpload ? (
          <Chip
            disabled={actions.busy}
            onClick={onUpload}
            title="Upload a .glb to the backend"
            className={cn('ml-auto', TAP)}
          >
            UPLOAD
          </Chip>
        ) : null}
      </header>

      {models.length === 0 ? (
        <p className={cn(LABEL, 'p-3 normal-case leading-relaxed')}>
          Nothing here yet. Drop a .glb into public/ and press SYNC in the toolbar, or upload one.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 touch-pan-y overflow-y-auto">
          {models.map((entry) => (
            // Keyed on the name too: the rename field holds local state, and a
            // remount is how it picks up a name the server just changed.
            <LibraryRow
              key={`${entry.id}:${entry.name}`}
              model={entry}
              isOpen={entry.id === openModelId}
              isLive={entry.id === liveId}
              isSelected={entry.id === selectedId}
              dirty={dirty && entry.id === openModelId}
              actions={actions}
              onSelect={() => onSelect(entry.id)}
              onOpen={() => onOpen(entry.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
