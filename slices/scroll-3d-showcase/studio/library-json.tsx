'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { Chip, INPUT, LABEL, TAP } from './studio-ui';
import type { LibraryJsonState } from './use-library-json';
import type { ModelActions } from './use-model-actions';

export interface LibraryJsonProps {
  /** The row this text belongs to. Every write here targets it, not the open model. */
  modelId: string;
  /** This row is the one the editor holds, so APPLY has somewhere to land. */
  isOpenModel: boolean;
  json: LibraryJsonState;
  actions: ModelActions;
  /** Parses first; a failure renders inline and nothing happens. */
  onApply: () => void;
  /** Owned by the dialog so ⌘S can reach it from anywhere inside. */
  onSave: () => void;
}

/**
 * Column two: one model's whole preset as the file EXPORT writes.
 *
 * Deliberately the same bytes as EXPORT / IMPORT / seed — a leaner shape here
 * would fork the format into text you can copy out of this box but not feed to
 * `convex run seed:preset`. The `modelId` inside the JSON is provenance only.
 */
export function LibraryJson({
  modelId,
  isOpenModel,
  json,
  actions,
  onApply,
  onSave,
}: LibraryJsonProps) {
  const fieldId = useId();
  // The armed *id*, never a flag: this component stays mounted while column one
  // switches rows, so a boolean would carry a confirm asked about one model onto
  // the next one — and on a phone picking a row lands you straight back on this
  // pane, one tap from a delete nobody agreed to.
  const [armed, setArmed] = useState('');
  const { busy, removePreset } = actions;

  if (!modelId) {
    return <p className={cn(LABEL, 'p-3 normal-case')}>Pick a model to see its preset.</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5 p-2">
      <label htmlFor={fieldId} className={cn(LABEL, 'shrink-0')}>
        PRESET JSON · <span className="lowercase tracking-normal">{modelId}</span>
        <span className="ml-1 normal-case opacity-60">
          {json.loading
            ? 'loading…'
            : json.missing
              ? 'never saved — edit and SAVE to create it'
              : 'writes to this model, whatever the modelId field says'}
        </span>
      </label>

      <textarea
        id={fieldId}
        value={json.text}
        spellCheck={false}
        onChange={(event) => json.setText(event.target.value)}
        className={cn('min-h-0 w-full flex-1 resize-none leading-relaxed', INPUT)}
      />

      {/* The parser coerces almost everything; what it refuses is a path that
          would throw inside the render loop, which never re-arms. */}
      {json.error ? (
        <p className={cn(LABEL, 'shrink-0 normal-case text-showcase-accent')}>{json.error}</p>
      ) : null}

      <p className={cn(LABEL, 'shrink-0 normal-case opacity-60')}>
        Scene knobs (modelHeight, damping, parallax, bloom) need the SCENE tab&apos;s APPLY to
        rebuild — this box changes the numbers, not the running scene.
      </p>

      <div className="flex shrink-0 flex-wrap items-center gap-1">
        <Chip
          disabled={busy || !isOpenModel || json.loading}
          onClick={onApply}
          className={TAP}
          title={
            isOpenModel
              ? 'Load this into the editor. Nothing is written until SAVE.'
              : 'OPEN this model first — the editor holds one model at a time'
          }
        >
          APPLY
        </Chip>
        <Chip
          disabled={busy || json.loading}
          onClick={onSave}
          className={TAP}
          title="Write this preset to the backend (⌘S)"
        >
          SAVE
        </Chip>
        <Chip
          disabled={busy}
          onClick={json.reload}
          className={TAP}
          title="Throw away these edits and re-read"
        >
          RELOAD
        </Chip>
        <Chip
          disabled={busy}
          onClick={json.reset}
          className={TAP}
          title="Fill the box with the slice defaults. Writes nothing."
        >
          DEFAULTS
        </Chip>
        {removePreset ? (
          <Chip
            // Also dead while the row is still being read: `missing` is false
            // during a load, so without this a preset can be deleted before its
            // JSON has even reached the screen.
            disabled={busy || json.loading || json.missing}
            onClick={() => {
              if (armed !== modelId) return setArmed(modelId);
              setArmed('');
              removePreset(modelId);
            }}
            title="Delete the saved tuning. The page falls back to the defaults."
            className={cn(TAP, 'ml-auto hover:text-showcase-accent')}
          >
            {armed === modelId ? 'SURE? THE PAGE GOES UNTUNED' : 'DELETE PRESET'}
          </Chip>
        ) : null}
      </div>
    </div>
  );
}
