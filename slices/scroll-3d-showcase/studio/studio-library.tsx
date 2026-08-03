'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { fromPreset } from './draft-utils';
import { LibraryDialog } from './library-dialog';
import { LibraryJson } from './library-json';
import { LibraryModels } from './library-models';
import { Chip, FOCUS, LABEL, TAP } from './studio-ui';
import type { ShowcaseModel, ShowcaseStudioAdapter } from './types';
import { useLibraryJson } from './use-library-json';
import { useModelActions } from './use-model-actions';
import type { StudioDraft } from './use-studio-draft';

export interface StudioLibraryProps {
  /**
   * No `open` prop: the composition root mounts this only while the library is
   * open. A permanently mounted dialog would read every selected row's preset
   * through the adapter before anyone had asked to see one.
   */
  onClose: () => void;
  models: readonly ShowcaseModel[];
  /** The model the editor holds. */
  modelId: string;
  liveId: string;
  draft: StudioDraft;
  adapter: ShowcaseStudioAdapter;
  onSelectModel: (id: string) => void;
  onUpload?: () => void;
  onRefresh?: () => void;
  /** Hands the studio's one live latch the row this dialog just published. */
  onPublished?: (id: string) => void;
}

const PANES = ['models', 'json'] as const;

/**
 * The model library: every model on the left, that model's whole preset as JSON
 * on the right, and full CRUD from inside it.
 *
 * Both columns show at once on a desktop. Below `lg` it is one pane at a time,
 * and picking a row moves to the JSON — two 300px columns beside each other on a
 * 390px screen give neither one enough room for a preset.
 */
export function StudioLibrary({
  onClose,
  models,
  modelId,
  liveId,
  draft,
  adapter,
  onSelectModel,
  onUpload,
  onRefresh,
  onPublished,
}: StudioLibraryProps) {
  const titleId = useId();
  const [selectedId, setSelectedId] = useState(modelId);
  const [pane, setPane] = useState<(typeof PANES)[number]>('models');
  // Closing unmounts this whole tree, and for any row but the open one the typed
  // JSON lives nowhere else — no draft behind it, nothing written until SAVE. So
  // an edited box asks first, the same two-click way every other destructive
  // chip in here does.
  const [closeArmed, setCloseArmed] = useState(false);

  // Declared before the actions so a delete can invalidate this column.
  const json = useLibraryJson({
    modelId: selectedId,
    openModelId: modelId,
    draft,
    loadPreset: adapter.loadPreset,
  });
  const actions = useModelActions({
    adapter, modelId, draft, onSelectModel, onRefresh, onPublished,
    onPresetRemoved: json.reload,
  });

  // Disarmed the moment there is nothing left to lose — RELOAD, or a row switch,
  // which drops the override. A question left standing after its reason is gone
  // is how a confirm turns into a click people learn to double-tap through.
  if (closeArmed && !json.dirty) setCloseArmed(false);
  const requestClose = () => {
    if (json.dirty && !closeArmed) return setCloseArmed(true);
    onClose();
  };

  const applyJson = () => {
    const preset = json.parse();
    if (!preset) return;
    // Into the draft, so a bad paste is one undo away. Then re-read: the parser
    // clamps as it goes, and a radius of 99 that silently became 12 would leave
    // the box still saying 99.
    draft.restore({ ...fromPreset(preset), selected: 0 });
    json.reload();
  };
  const saveJson = () => {
    const preset = json.parse();
    if (preset) actions.savePreset(selectedId, preset);
  };

  return (
    <LibraryDialog labelledBy={titleId} onClose={requestClose} onSave={saveJson}>
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center gap-2 border-b border-showcase-line/60 px-2 py-1.5">
          <h2 id={titleId} className={cn(LABEL, 'text-showcase-primary')}>
            LIBRARY
          </h2>
          {/* Same slot the chrome uses for the same reason: on a phone it is
              the only place a failed write is ever visible. */}
          <span className={cn(LABEL, 'min-w-0 flex-1 truncate')}>{actions.status}</span>
          <Chip
            onClick={requestClose}
            title={
              closeArmed
                ? 'Closing throws away the text in the JSON box'
                : 'Close the library (Esc)'
            }
            className={cn(TAP, closeArmed && 'text-showcase-accent')}
          >
            {closeArmed ? 'SURE? DROP EDITS' : 'CLOSE'}
          </Chip>
        </header>

        <div role="tablist" aria-label="Library pane" className="flex shrink-0 lg:hidden">
          {PANES.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={pane === id}
              onClick={() => setPane(id)}
              className={cn(
                'flex-1 border-b uppercase',
                LABEL,
                TAP,
                FOCUS,
                pane === id
                  ? 'border-showcase-primary text-showcase-primary'
                  : 'border-showcase-line/60',
              )}
            >
              {id}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[18rem_1fr]">
          <div
            className={cn(
              'min-h-0 border-showcase-line/60 lg:block lg:h-full lg:border-r',
              pane === 'models' ? 'block h-full' : 'hidden',
            )}
          >
            <LibraryModels
              models={models}
              openModelId={modelId}
              liveId={liveId}
              selectedId={selectedId}
              dirty={draft.dirty}
              actions={actions}
              onSelect={(id) => {
                setSelectedId(id);
                setPane('json');
              }}
              onOpen={onSelectModel}
              onUpload={onUpload}
            />
          </div>
          <div
            className={cn(
              'min-h-0 lg:block lg:h-full',
              pane === 'json' ? 'block h-full' : 'hidden',
            )}
          >
            <LibraryJson
              modelId={selectedId}
              isOpenModel={selectedId === modelId}
              json={json}
              actions={actions}
              onApply={applyJson}
              onSave={saveJson}
            />
          </div>
        </div>
      </div>
    </LibraryDialog>
  );
}
