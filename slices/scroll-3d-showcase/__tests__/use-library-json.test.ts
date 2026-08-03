import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fromPresetFile } from '../studio/preset-file';
import type { ShowcasePreset } from '../studio/types';
import { useLibraryJson } from '../studio/use-library-json';
import type { StudioDraft } from '../studio/use-studio-draft';

/**
 * The JSON column is a trust boundary: the text is typed by a person, and a
 * non-finite number reaches the camera as a blank canvas with no error, then
 * corrupts the undo entry on the way (history stringifies, and NaN serialises to
 * null). These assertions are what keeps the parse in front of the draft.
 */
const KEY = {
  p: 0.5, azimuth: 1, elevation: 0.2, radius: 4, targetX: 0, targetY: 1, targetZ: 0,
  screenShiftX: 0, fov: 36, label: 'MID',
};

const draftOf = (over: Partial<StudioDraft> = {}): StudioDraft =>
  ({
    keyframes: [{ ...KEY }],
    markers: [{ name: 'HEAD', position: [0, 1, 0] as const }],
    settings: { damping: 0.1 },
    content: { title: 'RAHMAN', brand: 'RR', description: '', sections: [] },
    dirty: false,
    ...over,
  }) as unknown as StudioDraft;

const args = (over: Partial<Parameters<typeof useLibraryJson>[0]> = {}) => ({
  modelId: 'hitman',
  openModelId: 'hitman',
  draft: draftOf(),
  ...over,
});

describe('useLibraryJson', () => {
  it('serialises the open model from the draft, not from what was saved', () => {
    const { result } = renderHook(() => useLibraryJson(args()));

    const { preset, modelId } = fromPresetFile(result.current.text);
    expect(modelId).toBe('hitman');
    expect(preset.keyframes[0].label).toBe('MID');
    expect(preset.content?.title).toBe('RAHMAN');
    expect(result.current.missing).toBe(false);
  });

  it('round-trips its own text back into a preset', () => {
    const { result } = renderHook(() => useLibraryJson(args()));

    let parsed: ShowcasePreset | null = null;
    act(() => {
      parsed = result.current.parse();
    });

    expect(parsed!.markers[0].position).toEqual([0, 1, 0]);
    expect(parsed!.settings?.damping).toBe(0.1);
    expect(result.current.error).toBe('');
  });

  it('reports a syntax error inline and hands back nothing', () => {
    const { result } = renderHook(() => useLibraryJson(args()));

    act(() => result.current.setText('{ not json'));
    let parsed: ShowcasePreset | null = null;
    act(() => {
      parsed = result.current.parse();
    });

    expect(parsed).toBeNull();
    expect(result.current.error).toMatch(/not a JSON file/i);
  });

  it('refuses a path with no keyframes, which would kill the render loop', () => {
    const { result } = renderHook(() => useLibraryJson(args()));

    act(() => result.current.setText(JSON.stringify({ keyframes: [], markers: [] })));
    let parsed: ShowcasePreset | null = null;
    act(() => {
      parsed = result.current.parse();
    });

    expect(parsed).toBeNull();
    expect(result.current.error).toMatch(/no keyframes/i);
  });

  it('drops a hand-typed NaN to a usable number rather than letting it through', () => {
    const { result } = renderHook(() => useLibraryJson(args()));

    act(() =>
      result.current.setText(
        JSON.stringify({ keyframes: [{ ...KEY, radius: 'twelve' }], markers: [] }),
      ),
    );
    let parsed: ShowcasePreset | null = null;
    act(() => {
      parsed = result.current.parse();
    });

    expect(Number.isFinite(parsed!.keyframes[0].radius)).toBe(true);
  });

  it('sorts the path, because the sampler assumes it is sorted', () => {
    const { result } = renderHook(() => useLibraryJson(args()));

    act(() =>
      result.current.setText(
        JSON.stringify({
          keyframes: [{ ...KEY, p: 0.9 }, { ...KEY, p: 0.1 }],
          markers: [],
        }),
      ),
    );
    let parsed: ShowcasePreset | null = null;
    act(() => {
      parsed = result.current.parse();
    });

    expect(parsed!.keyframes.map((keyframe) => keyframe.p)).toEqual([0.1, 0.9]);
  });

  it('re-reads the draft on reload, so a clamped value stops lying', () => {
    let draft = draftOf();
    const { result, rerender } = renderHook(() => useLibraryJson(args({ draft })));

    act(() => result.current.setText('{ typed over }'));
    draft = draftOf({ keyframes: [{ ...KEY, label: 'CLAMPED', radius: 12 }] });
    rerender();
    act(() => result.current.reload());

    expect(fromPresetFile(result.current.text).preset.keyframes[0].label).toBe('CLAMPED');
    expect(result.current.error).toBe('');
  });

  it('fills the field with the defaults without writing anything', () => {
    const loadPreset = vi.fn(async () => null);
    const { result } = renderHook(() => useLibraryJson(args({ loadPreset })));

    act(() => result.current.reset());

    expect(fromPresetFile(result.current.text).preset.keyframes.length).toBeGreaterThan(1);
    expect(loadPreset).not.toHaveBeenCalled();
  });

  /**
   * DEFAULTS resets the camera path. Emitting no `content` writes an empty block
   * instead, and SAVE on the live model then publishes a page with no wordmark,
   * no panels and an empty <title> — which the loader's `content ? … : untuned`
   * fallback cannot undo, because an empty block is still a block.
   */
  it('keeps the words when DEFAULTS resets the path', () => {
    const { result } = renderHook(() => useLibraryJson(args()));

    act(() => result.current.reset());

    expect(fromPresetFile(result.current.text).preset.content?.title).toBe('RAHMAN');
  });

  it('keeps the words that were typed into the box, not the draft’s', () => {
    const { result } = renderHook(() => useLibraryJson(args()));

    act(() =>
      result.current.setText(
        JSON.stringify({ keyframes: [KEY], markers: [], content: { title: 'TYPED' } }),
      ),
    );
    act(() => result.current.reset());

    expect(fromPresetFile(result.current.text).preset.content?.title).toBe('TYPED');
  });

  it('reports unsaved text, which closing the dialog would throw away', () => {
    const { result } = renderHook(() => useLibraryJson(args()));
    expect(result.current.dirty).toBe(false);

    act(() => result.current.setText('{ typed over }'));
    expect(result.current.dirty).toBe(true);

    act(() => result.current.reload());
    expect(result.current.dirty).toBe(false);
  });

  it('reads another model through the adapter, and says so when it is untuned', async () => {
    const loadPreset = vi.fn(async () => null);
    const { result } = renderHook(() =>
      useLibraryJson(args({ modelId: 'rahman-3d', loadPreset })),
    );

    await waitFor(() => expect(result.current.missing).toBe(true));
    expect(loadPreset).toHaveBeenCalledWith('rahman-3d');
    expect(result.current.text).toBe('');
  });
});
