'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Chip, FOCUS, INPUT, LABEL, ROW, TAP, VALUE } from './studio-ui';
import { modelSize, modelSource } from './model-label';
import type { ShowcaseModel } from './types';
import type { ModelActions } from './use-model-actions';

export interface LibraryRowProps {
  model: ShowcaseModel;
  /** The model the editor currently holds. */
  isOpen: boolean;
  isLive: boolean;
  /** The row whose preset the JSON column is showing. */
  isSelected: boolean;
  /** The open model has edits that are not written yet. */
  dirty: boolean;
  actions: ModelActions;
  onSelect: () => void;
  onOpen: () => void;
}

/**
 * One model, with everything that can be done to it.
 *
 * DELETE only appears for a row that can actually be deleted — a file still
 * sitting in public/ comes straight back on the next SYNC, and in the window
 * before that its id can be handed to a different file. A button that undoes
 * itself is worse than a sentence saying why there is no button.
 */
export function LibraryRow({
  model,
  isOpen,
  isLive,
  isSelected,
  dirty,
  actions,
  onSelect,
  onOpen,
}: LibraryRowProps) {
  const [label, setLabel] = useState(model.name);
  // No confirm primitive exists in this editor and a dialog inside a dialog is
  // absurd, so the chip asks the question itself and the second click answers.
  const [armed, setArmed] = useState(false);

  const { busy, publish, rename, remove } = actions;
  const source = modelSource(model);
  const deletable = Boolean(model.missing || model.uploaded);
  const liveBlocked = isLive && !model.missing;

  return (
    <li className={cn('border-b border-showcase-line/40 p-2', isSelected && 'bg-showcase-line/25')}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        className={cn(ROW, 'w-full', TAP, FOCUS, 'text-left')}
      >
        <span className="min-w-0 truncate font-mono text-[11px] text-showcase-fg">
          {model.name}
        </span>
        <span className={cn(VALUE, 'flex shrink-0 items-center gap-1.5')}>
          {isLive ? <span>LIVE</span> : null}
          {modelSize(model) ? <span>{modelSize(model)}</span> : null}
          {/* Where the bytes live, spelled out rather than iconified: it is the
              difference between a row this studio can delete and one only a
              commit can, and the DELETE chip below is missing on half of them
              because of it. */}
          <span
            className={cn(
              'border px-1 py-px text-[8px] tracking-[0.16em]',
              source === 'CLOUD' && 'border-showcase-primary text-showcase-primary',
              source === 'PUBLIC/' && 'border-showcase-line text-showcase-muted',
              source === 'MISSING' && 'border-showcase-accent text-showcase-accent',
            )}
          >
            {source}
          </span>
        </span>
      </button>

      {/* The id, not the name, is what a preset is filed under and what the URL
          carries — a renamed row would otherwise lose its way back to the file. */}
      <p className={cn(LABEL, 'truncate lowercase tracking-normal')}>
        {model.id}
        {isOpen ? <span className="ml-1 text-showcase-primary">· OPEN{dirty ? ' ●' : ''}</span> : null}
      </p>

      {/* TAP on every control below: this drawer is the mobile surface, and a
          24px chip 4px from a destructive one is a delete waiting to happen. */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <Chip
          disabled={busy || isOpen}
          onClick={onOpen}
          active={isOpen}
          className={TAP}
          title="Edit this model"
        >
          OPEN
        </Chip>
        {publish ? (
          <Chip
            disabled={busy || isLive || Boolean(model.missing)}
            active={isLive}
            onClick={() => publish(model.id)}
            className={TAP}
            title={
              model.missing
                ? 'This file is gone from public/ — it cannot be published'
                : 'Put this model on the public page'
            }
          >
            {model.missing ? 'NO FILE' : isLive ? 'LIVE' : 'PUBLISH'}
          </Chip>
        ) : null}

        {rename ? (
          <>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              aria-label={`Name for ${model.id}`}
              placeholder={model.id}
              className={cn('w-28 shrink-0', TAP, INPUT)}
            />
            <Chip
              disabled={busy || label === model.name}
              onClick={() => rename(model.id, label)}
              className={TAP}
              title="Rename for the picker. Empty puts the scanned name back."
            >
              SET
            </Chip>
          </>
        ) : null}

        {remove ? (
          <Chip
            disabled={busy || liveBlocked}
            onClick={() => (armed ? remove(model.id) : setArmed(true))}
            title={
              liveBlocked
                ? 'Publish another model before deleting the live one'
                : deletable
                  ? 'Delete this row. An uploaded file goes with it; the saved preset stays.'
                  : 'Delete this row. The file stays in public/, so the next SYNC brings it back.'
            }
            // Pushed to the far end of the strip, away from SET: the two sat 4px
            // apart, and one is a delete.
            className={cn(TAP, 'ml-auto hover:text-showcase-accent')}
          >
            {/* The second press says what it is about to be worth. Deleting a
                scanned row is real but temporary — SYNC upserts by id — and
                finding that out afterwards is how a button loses trust. */}
            {armed ? (deletable ? 'SURE?' : 'BACK ON SYNC?') : 'DELETE'}
          </Chip>
        ) : null}
      </div>
    </li>
  );
}
