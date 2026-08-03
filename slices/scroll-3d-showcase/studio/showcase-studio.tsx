'use client';

import { useCallback, useMemo, useRef } from 'react';
import { DEFAULT_SCENE_SETTINGS } from '../config/keyframes';
import { useScrollProgress } from '../hooks/use-scroll-progress';
import { clamp } from '../lib/math';
import { nearestKeyframeIndex } from './draft-utils';
import { panelBodies } from './panel-bodies';
import { PathMap } from './path-map';
import { StudioChrome } from './studio-chrome';
import { StudioLibrary } from './studio-library';
import { StudioPanel } from './studio-panel';
import { StudioRail } from './studio-rail';
import { StudioStage } from './studio-stage';
import { StudioTransport } from './studio-transport';
import type { ShowcaseStudioProps } from './types';
import { useOrbitDrag } from './use-orbit-drag';
import { useStudioActions } from './use-studio-actions';
import { useStudioDraft } from './use-studio-draft';
import { useStudioFly } from './use-studio-fly';
import { useStudioHistory } from './use-studio-history';
import { useStudioKeys } from './use-studio-keys';
import { useStudioLayout } from './use-studio-layout';
import { useStudioPlayback } from './use-studio-playback';

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
  onRefresh,
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
  const actions = useStudioActions({
    adapter, modelId, draft, liveModelId, onUploaded: onSelectModel,
    // Forgetting deletes the row this editor points at, so it has to leave.
    onForgotten: () => onSelectModel(models.find((e) => e.id !== modelId)?.id ?? ''),
  });
  const step = (d: number) => seek(draft.keyframes[clamp(draft.selected + d, 0, draft.keyframes.length - 1)].p);

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

  // Same contract as the orbit drag: snap onto the selected key first, or the
  // keys edit one frame while the screen shows another.
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

  // The HUD previews the site-wide strings: type into COPY and the wordmark
  // behind the chrome updates as you go.
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
        uploaded={Boolean(model?.uploaded)} onGoLive={actions.goLive} onForget={actions.forget}
        onSelectModel={onSelectModel} onUndo={undo} onRedo={redo}
        onSync={actions.sync} onUpload={actions.upload} onSave={actions.save} onCopy={actions.copy}
        onExport={actions.exportJson} onImport={actions.importJson}
      />

      {/* A sibling of the stage, never inside it: the viewport frame sets
          `transform: translateZ(0)` and would become the containing block of
          anything `fixed` underneath it, trapping the dialog in the letterbox. */}
      {layout.library && (
        <StudioLibrary
          onClose={layout.closeLibrary} models={models} modelId={modelId}
          liveId={actions.liveId} draft={draft} adapter={adapter}
          onSelectModel={onSelectModel} onUpload={actions.upload} onRefresh={onRefresh}
          onPublished={actions.markLive}
        />
      )}

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
