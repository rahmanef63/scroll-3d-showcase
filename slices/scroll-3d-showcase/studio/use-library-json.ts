'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_KEYFRAMES,
  DEFAULT_MARKERS,
  DEFAULT_SCENE_SETTINGS,
} from '../config/keyframes';
import type { ShowcaseContent } from '../types';
import { fromPresetFile, toPresetFile } from './preset-file';
import type { ShowcasePreset } from './types';
import type { StudioDraft } from './use-studio-draft';

export interface LibraryJsonState {
  text: string;
  /** Parse or read failure, shown under the field. '' once the text parses again. */
  error: string;
  loading: boolean;
  /** This row has no saved preset at all — nothing was ever written for it. */
  missing: boolean;
  /**
   * The box holds typed text rather than the source. Closing the dialog unmounts
   * this hook and takes it with it, and for any row but the open one there is no
   * draft underneath to recover it from — so the caller asks first.
   */
  dirty: boolean;
  setText: (text: string) => void;
  /** null on a parse failure, having set `error`; nothing leaves the browser. */
  parse: () => ShowcasePreset | null;
  /** Drops local edits and shows the source again. */
  reload: () => void;
  /** Fills the field with the slice defaults. Writes nothing. */
  reset: () => void;
}

export interface UseLibraryJsonArgs {
  /** The row the library has selected — what the text is for. */
  modelId: string;
  /** The model the editor holds, whose draft is the live source of truth. */
  openModelId: string;
  draft: StudioDraft;
  loadPreset?: (modelId: string) => Promise<ShowcasePreset | null>;
}

interface Loaded {
  key: string;
  text: string;
  error: string;
  missing: boolean;
}

/**
 * The copy currently in the box, so DEFAULTS can put it back.
 *
 * DEFAULTS resets the camera path; leaving `content` off the file it writes
 * would serialise as an empty block, and SAVE would then publish a page with no
 * wordmark, no panels and an empty <title>. The loader's `content ? … : untuned`
 * fallback cannot undo that, because an empty block is still a block.
 *
 * Undefined when the text does not parse — there is nothing to keep then, and
 * the caller falls back to the draft.
 */
const contentOf = (text: string): ShowcaseContent | undefined => {
  try {
    return fromPresetFile(text).preset.content;
  } catch {
    return undefined;
  }
};

/**
 * The JSON column's text, in the studio's own export format.
 *
 * The open model is *derived* from the draft rather than copied into state: an
 * unsaved SHOT-tab edit would otherwise vanish the moment someone applied what
 * this column shows, and re-reading after an APPLY is then just dropping the
 * local override — which is what makes a clamped value visible instead of the
 * number that was typed.
 *
 * Any other row is read through the adapter, because the editor only ever holds
 * one model's state.
 */
export function useLibraryJson({
  modelId,
  openModelId,
  draft,
  loadPreset,
}: UseLibraryJsonArgs): LibraryJsonState {
  const isOpen = Boolean(modelId) && modelId === openModelId;
  const [epoch, setEpoch] = useState(0);
  // The typed override. null means "show the source" — every reload is this
  // going back to null rather than a copy being refreshed.
  const [edited, setEdited] = useState<string | null>(null);
  const [parseError, setParseError] = useState('');
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  const key = `${modelId}:${epoch}`;
  // Reset during render, not in an effect: an effect would paint the previous
  // row's JSON for one frame under the newly selected row's heading.
  const [shown, setShown] = useState(key);
  if (shown !== key) {
    setShown(key);
    setEdited(null);
    setParseError('');
  }

  const { keyframes, markers, settings, content } = draft;
  const source = useMemo(() => {
    if (!modelId) return '';
    if (isOpen) return toPresetFile(modelId, { keyframes, markers, settings, content });
    return loaded?.key === key ? loaded.text : '';
  }, [modelId, isOpen, keyframes, markers, settings, content, loaded, key]);

  useEffect(() => {
    if (isOpen || !modelId || !loadPreset) return;
    const at = `${modelId}:${epoch}`;
    // A second row clicked while the first is still in flight would otherwise
    // land its text on top of the newer one.
    let cancelled = false;
    loadPreset(modelId)
      .then((preset) => {
        if (cancelled) return;
        setLoaded({
          key: at,
          text: preset ? toPresetFile(modelId, preset) : '',
          error: '',
          missing: !preset,
        });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        const message = cause instanceof Error ? cause.message : String(cause);
        setLoaded({ key: at, text: '', error: message, missing: false });
      });
    return () => {
      cancelled = true;
    };
  }, [modelId, isOpen, loadPreset, epoch]);

  const settled = loaded?.key === key;
  const parse = useCallback((): ShowcasePreset | null => {
    try {
      // The coercing reader, not JSON.parse: a NaN written by hand reaches the
      // camera as a blank canvas and corrupts the undo entry on the way, and an
      // unsorted path silently mis-segments. This is where both are stopped.
      const { preset } = fromPresetFile(edited ?? source);
      setParseError('');
      return preset;
    } catch (cause) {
      setParseError(cause instanceof Error ? cause.message : String(cause));
      return null;
    }
  }, [edited, source]);

  return {
    text: edited ?? source,
    error: parseError || (settled ? loaded.error : ''),
    loading: Boolean(modelId) && !isOpen && Boolean(loadPreset) && !settled,
    missing: !isOpen && Boolean(modelId) && (settled ? loaded.missing : !loadPreset),
    dirty: edited !== null,
    setText: useCallback((next: string) => {
      setEdited(next);
      setParseError('');
    }, []),
    parse,
    reload: useCallback(() => {
      setEdited(null);
      setParseError('');
      setEpoch((value) => value + 1);
    }, []),
    reset: useCallback(() => {
      setParseError('');
      setEdited((current) =>
        toPresetFile(modelId, {
          keyframes: DEFAULT_KEYFRAMES.map((keyframe) => ({ ...keyframe })),
          markers: DEFAULT_MARKERS.map((marker) => ({ ...marker })),
          settings: { ...DEFAULT_SCENE_SETTINGS },
          // The words are not part of "the slice defaults": the slice ships
          // none, and this button must not be a two-click way to blank a live
          // page. Whatever copy is on screen stays on screen.
          content: contentOf(current ?? source) ?? (isOpen ? content : undefined),
        }),
      );
    }, [modelId, source, isOpen, content]),
  };
}
