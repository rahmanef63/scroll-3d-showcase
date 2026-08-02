'use client';

import { useCallback, useMemo, useRef } from 'react';
import { DEFAULT_SCENE_SETTINGS } from '../config/keyframes';
import { useScrollProgress } from '../hooks/use-scroll-progress';
import { clamp } from '../lib/math';
import { nearestKeyframeIndex } from './draft-utils';
import { panelBodies } from './panel-bodies';
import { PathMap } from './path-map';
import { StudioChrome } from './studio-chrome';
import { StudioPanel } from './studio-panel';
import { StudioRail } from './studio-rail';
import { StudioStage } from './studio-stage';
import { StudioTransport } from './studio-transport';
import type {
  ContentPreset,
  ShowcaseModel,
  ShowcasePreset,
  ShowcaseStudioAdapter,
} from './types';
import { useOrbitDrag } from './use-orbit-drag';
import { useStudioActions } from './use-studio-actions';
import { useStudioDraft } from './use-studio-draft';
import { useStudioFly } from './use-studio-fly';
import { useStudioHistory } from './use-studio-history';
import { useStudioKeys } from './use-studio-keys';
import { useStudioLayout } from './use-studio-layout';
import { useStudioPlayback } from './use-studio-playback';

export interface ShowcaseStudioProps {
  models: ShowcaseModel[];
  modelId: string;
  preset: ShowcasePreset;
  adapter: ShowcaseStudioAdapter;
  /** Model the public page renders. Omit when the host has no such concept. */
  liveModelId?: string;
  /**
   * Section ids the host has rich blocks for. Omit and the COPY tab says nothing;
   * supply it and a section whose id has drifted off one gets flagged, because
   * the join is by id and the blocks otherwise vanish silently.
   */
  blockIds?: readonly string[];
  /** Whole-copy presets, one per character. Absent renders no chips. */
  contentPresets?: readonly ContentPreset[];
  onSelectModel: (id: string) => void;
}

/**
 * Camera-path editor rendered on top of a live <Scroll3DShowcase>. It owns the
 * showcase so every edit flows straight into the running scene as new arrays;
 * persistence is entirely the host's, through `adapter`.
 *
 * The page scroll is the one playhead: rail, transport, map and keyboard all go
 * through `seek`, which scrolls *and* re-selects. Selection is therefore always
 * the keyframe nearest what is on screen, so an orbit drag can never quietly
 * edit a frame nobody is looking at.
 */
export function ShowcaseStudio({
  models,
  modelId,
  preset,
  adapter,
  liveModelId = '',
  blockIds,
  contentPresets,
  onSelectModel,
}: ShowcaseStudioProps) {
  const layout = useStudioLayout();
  const base = useStudioDraft(modelId, preset);
  const history = useStudioHistory(base, modelId);
  const draft = history.draft;
  const { getProgress, scrollToProgress } = useScrollProgress();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const model = models.find((entry) => entry.id === modelId);

  const seekSelect = useCallback(
    (p: number) => draft.select(nearestKeyframeIndex(draft.keyframes, p)),
    [draft],
  );

  // 'auto' rather than 'smooth': queued smooth scrolls fight a scrubber drag.
  const seek = useCallback(
    (p: number) => {
      const at = clamp(p, 0, 1);
      scrollToProgress(at, 'auto');
      seekSelect(at);
    },
    [scrollToProgress, seekSelect],
  );

  const playback = useStudioPlayback({ getProgress, scrollToProgress, onStop: seekSelect });
  // Forgetting deletes the row this editor points at, so it has to leave. Any
  // other model will do — the server re-picks when it re-renders.
  const elsewhere = () => onSelectModel(models.find((e) => e.id !== modelId)?.id ?? '');
  const actions = useStudioActions({ adapter, modelId, draft, liveModelId, onForgotten: elsewhere });
  const step = (delta: number) =>
    seek(draft.keyframes[clamp(draft.selected + delta, 0, draft.keyframes.length - 1)].p);

  // Restoring a snapshot under a running rAF would fight it for the scroll.
  const undo = () => { playback.pause(); history.undo(); };
  const redo = () => { playback.pause(); history.redo(); };

  useStudioKeys({
    selectIndex: (index) => {
      if (draft.keyframes[index]) seek(draft.keyframes[index].p);
    },
    prev: () => step(-1),
    next: () => step(1),
    togglePlay: playback.toggle,
    focusSelected: () => seek(draft.current.p),
    save: actions.save,
    undo,
    redo,
    togglePreview: layout.togglePreview,
    closeSheet: layout.closeSheet,
  });

  // Same contract as the orbit drag: snap the page onto the selected key first,
  // or the keys would edit one frame while the screen shows another.
  const snap = () => {
    playback.pause();
    if (Math.abs(getProgress() - draft.current.p) > 0.004) scrollToProgress(draft.current.p, 'auto');
  };
  useStudioFly({ current: draft.current, onPatch: draft.patch, onStart: snap });

  useOrbitDrag(surfaceRef, {
    onOrbit: (azimuth, elevation) => {
      // Snap the page onto the selected key first: dragging while the playhead
      // sits between keys would edit one frame while showing another.
      const { p, azimuth: az, elevation: el } = draft.current;
      if (Math.abs(getProgress() - p) > 0.004) scrollToProgress(p, 'auto');
      draft.patch({ azimuth: az + azimuth, elevation: el + elevation });
    },
    onDolly: (factor) => draft.patch({ radius: draft.current.radius * factor }),
  });

  // Bound once: the same element is the desktop bottom bar and the first row of
  // the mobile stack, so it must never be two components with two rAF loops.
  const transport = (
    <StudioTransport
      keyframes={draft.keyframes} selected={draft.selected} playback={playback}
      mobile={layout.mobile} getProgress={getProgress} onSeek={seek}
    />
  );

  // The HUD is the live preview for the two site-wide strings: type into COPY
  // and the wordmark behind the chrome updates as you go.
  const { title, bootTitle, brand } = draft.content;
  const labels = useMemo(() => ({ brand }), [brand]);

  const scrollLength = draft.settings.scrollLength ?? DEFAULT_SCENE_SETTINGS.scrollLength;

  return (
    <>
      <StudioStage
        layout={layout} model={model} sceneKey={`${modelId}:${actions.sceneEpoch}`}
        title={title || model?.name || ''} bootTitle={bootTitle} labels={labels}
        keyframes={draft.keyframes} markers={draft.markers} settings={draft.settings}
        scrollLength={scrollLength} surfaceRef={surfaceRef}
      />

      {/* Always mounted: in solo it renders only its own hidden way back. */}
      <StudioChrome
        models={models} modelId={modelId} layout={layout} dirty={draft.dirty}
        busy={actions.busy} status={actions.status}
        canUndo={history.canUndo} canRedo={history.canRedo}
        isLive={actions.liveId === modelId} missing={Boolean(model?.missing)}
        onGoLive={actions.goLive} onForget={actions.forget}
        onSelectModel={onSelectModel} onUndo={undo} onRedo={redo}
        onSync={actions.sync} onSave={actions.save} onCopy={actions.copy}
      />

      {!layout.preview && (
        <>
          <StudioRail
            keyframes={draft.keyframes} selected={draft.selected} mobile={layout.mobile}
            onSeek={seek} onAdd={() => draft.addAt(getProgress())}
            onDuplicate={draft.duplicate} onRemove={draft.remove}
          />

          {!layout.mobile && (
            <PathMap
              keyframes={draft.keyframes} selected={draft.selected} getProgress={getProgress}
              onSelect={(index) => seek(draft.keyframes[index].p)}
            />
          )}
          {!layout.mobile && transport}

          <StudioPanel
            layout={layout}
            transport={layout.mobile ? transport : null}
            bodies={panelBodies({ draft, actions, getProgress, blockIds, contentPresets })}
          />
        </>
      )}
    </>
  );
}
