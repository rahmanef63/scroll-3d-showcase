'use client';

import { cn } from '@/lib/utils';
import { ChromeFiles } from './chrome-files';
import { ChromeModel } from './chrome-model';
import { ChromeStatus } from './chrome-status';
import { ASPECTS } from './presets';
import { BAR, Chip, INPUT, LABEL, SURFACE } from './studio-ui';
import type { ShowcaseModel } from './types';
import type { StudioLayout } from './use-studio-layout';

export interface StudioChromeProps {
  models: readonly ShowcaseModel[];
  modelId: string;
  onSelectModel: (id: string) => void;
  dirty: boolean;
  busy: boolean;
  /** Transient action feedback, '' when idle. NEVER overwrites the legend — separate slot. */
  status: string;
  /** `status` is a failure: it stays until read, and says so in the accent tone. */
  failed?: boolean;
  /** Clears a read failure. */
  onDismiss?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  layout: StudioLayout;
  /** True when the selected model is the one the public page renders. */
  isLive: boolean;
  /** Selected model's file is gone from the host's scan. */
  missing: boolean;
  /** Selected model lives in storage rather than in public/. */
  uploaded: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSync: () => void;
  /** Absent when the adapter cannot store files — no chip rather than a dead one. */
  onUpload?: () => void;
  onSave: () => void;
  onCopy: () => void;
  /** Downloads the draft as JSON. */
  onExport: () => void;
  /** Loads a JSON file into the draft — survives a model swap. */
  onImport: () => void;
  /** Absent when the adapter cannot publish — the chip is not rendered at all. */
  onGoLive?: () => void;
  /** Absent when the adapter cannot forget. Only shown for a missing model. */
  onForget?: () => void;
}

const LEGEND =
  'WASD/QE FLY · SHIFT FAST · 1–9 KEY · ←→ STEP · SPACE PLAY · F FOCUS · ⌘S SAVE · Z UNDO · P PREVIEW';
const GLYPH = 'px-2 text-[13px] leading-none tracking-normal';

/** Top bar: identity, model, the backend actions, history, dirty state. */
export function StudioChrome({
  models,
  modelId,
  onSelectModel,
  dirty,
  busy,
  status,
  failed,
  onDismiss,
  canUndo,
  canRedo,
  layout,
  isLive,
  missing,
  uploaded,
  onUndo,
  onRedo,
  onSync,
  onUpload,
  onSave,
  onCopy,
  onExport,
  onImport,
  onGoLive,
  onForget,
}: StudioChromeProps) {
  // Preview is what a visitor gets: everything goes, except a way back that a
  // screenshot will not catch but a mouse or Tab still finds.
  if (layout.preview) {
    return (
      <Chip
        onClick={layout.togglePreview}
        title="Back to the editor (P)"
        className="fixed right-1 top-1 z-30 opacity-0 focus-visible:opacity-100 hover:opacity-100"
      >
        EDIT
      </Chip>
    );
  }

  return (
    // overflow-x-auto is the safety net: SYNC and the model picker are the whole
    // point of the studio, so they stay reachable on a phone even if a long model
    // name pushes the bar past the viewport.
    <header className={cn('fixed inset-x-0 top-0 z-30 h-9 overflow-x-auto border-b', SURFACE, BAR)}>
      <span className="hidden shrink-0 text-showcase-primary lg:inline">STUDIO</span>

      <ChromeModel
        models={models} modelId={modelId} busy={busy} isLive={isLive} missing={missing}
        uploaded={uploaded} onSelectModel={onSelectModel} onGoLive={onGoLive} onForget={onForget}
      />

      <Chip disabled={busy} onClick={onSync} title="Rescan public/ for .glb files">
        SYNC
      </Chip>
      {/* The other way a model arrives: no repo, no rebuild, no deploy. */}
      {onUpload ? (
        <Chip disabled={busy} onClick={onUpload} title="Upload a .glb to the backend">
          <span className="lg:hidden">UP</span>
          <span className="hidden lg:inline">UPLOAD</span>
        </Chip>
      ) : null}
      <Chip disabled={busy || !dirty} onClick={onSave} title="Save preset (S)">
        SAVE
      </Chip>
      <ChromeFiles busy={busy} onCopy={onCopy} onExport={onExport} onImport={onImport} />

      {/* Same family as the three above — where a preset lives and how it gets
          edited — and the only place a rename or a delete has room to explain
          itself. A <select> cannot hold buttons, so it could not go beside the
          picker even if the bar had the width. */}
      <Chip
        onClick={layout.toggleLibrary}
        active={layout.library}
        title="Browse every model and edit its preset as JSON"
      >
        <span className="lg:hidden">LIB</span>
        <span className="hidden lg:inline">LIBRARY</span>
      </Chip>

      {/* A hairline arrow at 9px reads as an empty box, so these two opt out of
          LABEL's size — the only glyph-only chips in the bar. */}
      <Chip disabled={!canUndo} onClick={onUndo} title="Undo (Z)" className={GLYPH}>
        ↶
      </Chip>
      <Chip disabled={!canRedo} onClick={onRedo} title="Redo (SHIFT+Z)" className={GLYPH}>
        ↷
      </Chip>

      {/* The framed viewport's shape. `screenShiftX` is a fraction of the
          camera's half-width, so a shot only reads correctly at the aspect it
          will be seen at — this is the control that makes the preview true. */}
      <select
        value={layout.aspect}
        onChange={(event) => layout.setAspect(event.target.value as typeof layout.aspect)}
        aria-label="Viewport aspect"
        className={cn('hidden shrink-0 lg:inline', INPUT)}
      >
        {ASPECTS.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.label}
          </option>
        ))}
      </select>

      <Chip
        onClick={layout.togglePanel}
        active={!layout.panelCollapsed}
        title="Show or hide the panel"
        className="hidden lg:inline-flex"
      >
        PANEL
      </Chip>
      <Chip onClick={layout.togglePreview} title="See it as a visitor does (P)">
        PREVIEW
      </Chip>

      <span className={cn(LABEL, 'hidden min-w-0 flex-1 truncate text-center lg:block')}>
        {LEGEND}
      </span>

      <ChromeStatus
        busy={busy} status={status} failed={failed} dirty={dirty} onDismiss={onDismiss}
      />
    </header>
  );
}
