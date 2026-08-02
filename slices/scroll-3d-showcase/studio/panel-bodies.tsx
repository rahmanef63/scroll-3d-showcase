'use client';

import type { ReactNode } from 'react';
import { ContentFields } from './content-fields';
import { KeyframeFields } from './keyframe-fields';
import { MarkerList } from './marker-list';
import { SceneFields } from './scene-fields';
import type { StudioActions } from './use-studio-actions';
import type { ContentPreset } from './types';
import type { StudioDraft } from './use-studio-draft';
import type { StudioTab } from './use-studio-layout';

export interface PanelBodiesArgs {
  draft: StudioDraft;
  actions: StudioActions;
  /** Where a new copy panel lands. */
  getProgress: () => number;
  /** Section ids the host has rich blocks for; undefined disables the check. */
  blockIds?: readonly string[];
  /** Whole-copy presets the host offers, one per character. */
  contentPresets?: readonly ContentPreset[];
}

/**
 * The four inspector tabs, wired to the draft.
 *
 * A plain function rather than a component: these are slots handed to
 * `StudioPanel`, which renders exactly one of them. Keeping them out of the
 * composition root leaves that file what it claims to be — wiring.
 */
export function panelBodies({
  draft,
  actions,
  getProgress,
  blockIds,
  contentPresets,
}: PanelBodiesArgs): Record<StudioTab, ReactNode> {
  const lookAt = [
    draft.current.targetX ?? 0,
    draft.current.targetY,
    draft.current.targetZ ?? 0,
  ] as const;

  return {
    shot: (
      <KeyframeFields keyframe={draft.current} markers={draft.markers} onPatch={draft.patch} />
    ),
    copy: (
      <ContentFields
        content={draft.content}
        getProgress={getProgress}
        blockIds={blockIds}
        presets={contentPresets}
        onLoadPreset={draft.setContent}
        onPatch={draft.patchContent}
        onPatchSection={draft.patchSection}
        onAdd={draft.addSection}
        onRemove={draft.removeSection}
      />
    ),
    markers: (
      <MarkerList
        markers={draft.markers}
        lookAt={lookAt}
        onAdd={draft.addMarker}
        onRename={draft.renameMarker}
        onRemove={draft.removeMarker}
      />
    ),
    scene: (
      <SceneFields
        settings={draft.settings}
        onPatch={draft.patchSettings}
        onApply={actions.applyScene}
        needsApply={actions.needsApply}
      />
    ),
  };
}
