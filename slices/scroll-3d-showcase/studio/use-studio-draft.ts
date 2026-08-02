'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sampleKeyframes } from '../lib/camera-rig';
import { clamp } from '../lib/math';
import type {
  AnchorMarker,
  CameraKeyframe,
  SceneSettings,
  ShowcaseContent,
  ShowcaseCopy,
} from '../types';
import {
  FALLBACK_KEYFRAME,
  addSectionAt,
  copyContent,
  fromPreset,
  patchSectionAt,
  removeSectionAt,
  renameMarkerAt,
  uniqueMarkerName,
  type StudioSnapshot,
} from './draft-utils';
import { clampKeyframe } from './presets';
import type { ShowcasePreset } from './types';

export interface StudioDraft {
  keyframes: CameraKeyframe[];
  markers: AnchorMarker[];
  /** Engine settings. Partial: an unset key means "whatever the slice defaults to". */
  settings: Partial<SceneSettings>;
  /** Title, brand, description and the copy of every section. */
  content: ShowcaseContent;
  /** Index into `keyframes`; always valid, because the list never empties. */
  selected: number;
  current: CameraKeyframe;
  dirty: boolean;
  select: (index: number) => void;
  /** Patches the selected keyframe and re-sorts by `p`. */
  patch: (values: Partial<CameraKeyframe>) => void;
  patchSettings: (values: Partial<SceneSettings>) => void;
  addAt: (p: number) => void;
  duplicate: () => void;
  remove: () => void;
  addMarker: (name: string, position: readonly [number, number, number]) => void;
  renameMarker: (index: number, name: string) => void;
  removeMarker: (index: number) => void;
  /** Title, brand, description — everything on `content` that is not a section. */
  patchContent: (values: Partial<Omit<ShowcaseContent, 'sections'>>) => void;
  /** Swaps every word at once — the host's character presets go through here. */
  setContent: (content: ShowcaseContent) => void;
  patchSection: (index: number, values: Partial<ShowcaseCopy>) => void;
  /** Adds a panel at scroll position `p`, with a fade window around it. */
  addSection: (p: number) => void;
  removeSection: (index: number) => void;
  markSaved: () => void;
  snapshot: () => StudioSnapshot;
  restore: (snapshot: StudioSnapshot) => void;
}

export type { StudioSnapshot } from './draft-utils';

/**
 * Editable copy of one model's preset. Every mutation produces new arrays: the
 * engine's live-update effects key off array identity, so in-place edits would
 * silently never reach the running scene.
 */
export function useStudioDraft(modelId: string, preset: ShowcasePreset): StudioDraft {
  const [state, setState] = useState(() => fromPreset(preset));
  const [selected, setSelected] = useState(0);
  const [dirty, setDirty] = useState(false);

  // Synced in an effect, not during render, and declared before the reset below
  // so a model swap reads the preset that arrived with it.
  const latest = useRef(preset);
  useEffect(() => {
    latest.current = preset;
  });

  // Keyed on modelId rather than preset identity: a server-rendered host hands
  // over a fresh object on every render, which would wipe the draft mid-edit.
  useEffect(() => {
    setState(fromPreset(latest.current));
    setSelected(0);
    setDirty(false);
  }, [modelId]);

  const write = useCallback((keyframes: CameraKeyframe[], keep: CameraKeyframe) => {
    // sampleKeyframes assumes sorted input and silently mis-segments without it.
    keyframes.sort((a, b) => a.p - b.p);
    setState((previous) => ({ ...previous, keyframes }));
    setSelected(keyframes.indexOf(keep));
    setDirty(true);
  }, []);

  const patch = useCallback(
    (values: Partial<CameraKeyframe>) => {
      const target = state.keyframes[selected];
      if (!target) return;
      const next = clampKeyframe({ ...target, ...values });
      write(
        state.keyframes.map((keyframe, index) => (index === selected ? next : keyframe)),
        next,
      );
    },
    [state.keyframes, selected, write],
  );

  const addAt = useCallback(
    (p: number) => {
      // Capture what the camera is actually showing at `p`, not a blank key.
      const at = clamp(p, 0, 1);
      const next: CameraKeyframe = { ...sampleKeyframes(state.keyframes, at), p: at };
      write([...state.keyframes, next], next);
    },
    [state.keyframes, write],
  );

  const duplicate = useCallback(() => {
    const target = state.keyframes[selected];
    if (!target) return;
    const next = clampKeyframe({ ...target, p: target.p + 0.02 });
    write([...state.keyframes, next], next);
  }, [state.keyframes, selected, write]);

  const remove = useCallback(() => {
    // sampleKeyframes throws on an empty array, from inside the rAF loop.
    if (state.keyframes.length < 2) return;
    const keyframes = state.keyframes.filter((_, index) => index !== selected);
    setState((previous) => ({ ...previous, keyframes }));
    setSelected(Math.min(selected, keyframes.length - 1));
    setDirty(true);
  }, [state.keyframes, selected]);

  const patchSettings = useCallback((values: Partial<SceneSettings>) => {
    setState((previous) => ({ ...previous, settings: { ...previous.settings, ...values } }));
    setDirty(true);
  }, []);

  const editMarkers = useCallback(
    (edit: (markers: AnchorMarker[]) => AnchorMarker[]) => {
      setState((previous) => ({ ...previous, markers: edit(previous.markers) }));
      setDirty(true);
    },
    [],
  );

  const editContent = useCallback((edit: (content: ShowcaseContent) => ShowcaseContent) => {
    setState((previous) => ({ ...previous, content: edit(previous.content) }));
    setDirty(true);
  }, []);

  const restore = useCallback(({ selected: at, ...next }: StudioSnapshot) => {
    // One write, so the engine sees a single coherent state rather than a path
    // from one snapshot briefly paired with the settings of another.
    setState(next);
    setSelected(clamp(at, 0, Math.max(0, next.keyframes.length - 1)));
    setDirty(true);
  }, []);

  return {
    keyframes: state.keyframes,
    markers: state.markers,
    settings: state.settings,
    content: state.content,
    selected,
    current: state.keyframes[selected] ?? state.keyframes[0] ?? FALLBACK_KEYFRAME,
    dirty,
    select: setSelected,
    patch,
    patchSettings,
    addAt,
    duplicate,
    remove,
    // Inline rather than memoised: the history wrapper rebuilds every one of
    // these on each render anyway, so a stable identity here buys nothing.
    addMarker: (name, position) =>
      editMarkers((markers) => [...markers, { name: uniqueMarkerName(name, markers), position }]),
    renameMarker: (index, name) => editMarkers((markers) => renameMarkerAt(markers, index, name)),
    removeMarker: (index) => editMarkers((markers) => markers.filter((_, at) => at !== index)),
    patchContent: (values) => editContent((content) => ({ ...content, ...values })),
    setContent: (next) => editContent(() => copyContent(next)),
    patchSection: (index, values) => editContent((content) => patchSectionAt(content, index, values)),
    addSection: (p) => editContent((content) => addSectionAt(content, clamp(p, 0, 1))),
    removeSection: (index) => editContent((content) => removeSectionAt(content, index)),
    markSaved: useCallback(() => setDirty(false), []),
    // Live references, not copies: the only caller stringifies immediately, and
    // every mutator here replaces arrays rather than editing them in place.
    snapshot: () => ({
      keyframes: state.keyframes,
      markers: state.markers,
      settings: state.settings,
      content: state.content,
      selected,
    }),
    restore,
  };
}
