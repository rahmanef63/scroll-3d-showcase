'use client';

import { cn } from '@/lib/utils';
import { ChromeModel } from './chrome-model';
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
  canUndo: boolean;
  canRedo: boolean;
  layout: StudioLayout;
  /** True when the selected model is the one the public page renders. */
  isLive: boolean;
  /** Selected model's file is gone from the host's scan. */
  missing: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSync: () => void;
  onSave: () => void;
  onCopy: () => void;
  /** Absent when the adapter cannot publish — the chip is not rendered at all. */
  onGoLive?: () => void;
  /** Absent when the adapter cannot forget. Only shown for a missing model. */
  onForget?: () => void;
}

const LEGEND =
  'WASD/QE FLY · SHIFT FAST · 1–9 KEY · ←→ STEP · SPACE PLAY · F FOCUS · ⌘S SAVE · Z UNDO · P PREVIEW';
const GLYPH = 'px-2 text-[13px] leading-none tracking-normal';

/** Top bar: identity, model, the three backend actions, history, dirty state. */
export function StudioChrome({
  models,
  modelId,
  onSelectModel,
  dirty,
  busy,
  status,
  canUndo,
  canRedo,
  layout,
  isLive,
  missing,
  onUndo,
  onRedo,
  onSync,
  onSave,
  onCopy,
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
        onSelectModel={onSelectModel} onGoLive={onGoLive} onForget={onForget}
      />

      <Chip disabled={busy} onClick={onSync} title="Rescan public/ for .glb files">
        SYNC
      </Chip>
      <Chip disabled={busy || !dirty} onClick={onSave} title="Save preset (S)">
        SAVE
      </Chip>
      <Chip
        disabled={busy}
        onClick={onCopy}
        title="Paste over DEFAULT_KEYFRAMES in config/keyframes.ts"
      >
        <span className="lg:hidden">TS</span>
        <span className="hidden lg:inline">COPY TS</span>
      </Chip>

      {/* A hairline arrow at the bar's 9px reads as an empty box, so these two
          opt out of LABEL's size — they are the only glyph-only chips. */}
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

      <span className="ml-auto flex min-w-0 items-center gap-2 lg:ml-0 lg:shrink-0">
        {/* Feedback slot, never the legend's: a failed save must be visible on a
            phone too, where the legend is not rendered at all. */}
        {status ? <span className="truncate text-showcase-fg">{status}</span> : null}
        <span className={cn('shrink-0', dirty ? 'text-showcase-warn' : 'text-showcase-muted')}>
          {dirty ? '●' : '○'}
          <span className="hidden lg:inline">{dirty ? ' UNSAVED' : ' SAVED'}</span>
        </span>
      </span>

      {/* SYNC and SAVE are network round-trips with no progress to report. The
          status slot says what is running; this says it is still running, which
          on a slow link is the difference between "working" and "broken". */}
      {busy ? (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 block h-px overflow-hidden bg-showcase-line"
        >
          <span className="absolute inset-y-0 left-0 block w-1/5 animate-[showcase-sweep_1.1s_ease-in-out_infinite] bg-showcase-primary motion-reduce:animate-none" />
        </span>
      ) : null}
    </header>
  );
}
