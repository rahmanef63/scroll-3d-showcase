'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Chip, FOCUS, INPUT, LABEL, ROW, TAP, VALUE } from './studio-ui';
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

const badge = (model: ShowcaseModel): string => {
  if (model.missing) return 'MISSING';
  if (model.bytes <= 0) return '';
  return `${(model.bytes / 1048576).toFixed(1)}MB${model.uploaded ? ' ↑' : ''}`;
};

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
        <span className={cn(VALUE, 'shrink-0')}>
          {isLive ? 'LIVE · ' : ''}
          {badge(model)}
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

        {remove && deletable ? (
          <Chip
            disabled={busy || liveBlocked}
            onClick={() => (armed ? remove(model.id) : setArmed(true))}
            title={
              liveBlocked
                ? 'Publish another model before deleting the live one'
                : 'Delete this row. Its saved preset stays behind.'
            }
            // Pushed to the far end of the strip, away from SET: the two sat 4px
            // apart, and one is a delete.
            className={cn(TAP, 'ml-auto hover:text-showcase-accent')}
          >
            {armed ? 'SURE?' : 'DELETE'}
          </Chip>
        ) : null}
        {remove && !deletable ? (
          <span className={cn(LABEL, 'shrink-0 opacity-70')}>IN public/ — DELETE THE FILE, THEN SYNC</span>
        ) : null}
      </div>
    </li>
  );
}
