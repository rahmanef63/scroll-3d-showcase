import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EMPTY_CONTENT, nearestKeyframeIndex, type StudioSnapshot } from '../studio/draft-utils';
import { useStudioDraft } from '../studio/use-studio-draft';
import type { ShowcasePreset } from '../studio/types';
import type { CameraKeyframe } from '../types';

const key = (over: Partial<CameraKeyframe>): CameraKeyframe => ({
  p: 0, azimuth: 0, elevation: 0, radius: 3, targetY: 0, screenShiftX: 0, fov: 40, label: 'A',
  ...over,
});

const preset = (): ShowcasePreset => ({
  keyframes: [
    key({ p: 0, azimuth: 0, radius: 3, label: 'START' }),
    key({ p: 1, azimuth: 180, radius: 1, label: 'END' }),
  ],
  markers: [{ name: 'HEAD', position: [0, 0.7, 0] }],
});

const mount = (initial: ShowcasePreset = preset(), id = 'hitman') =>
  renderHook(({ modelId, source }) => useStudioDraft(modelId, source), {
    initialProps: { modelId: id, source: initial },
  });

describe('useStudioDraft keyframes', () => {
  it('opens on the given preset, clean and on the first stop', () => {
    const { result } = mount();
    expect(result.current.keyframes.map((k) => k.label)).toEqual(['START', 'END']);
    expect(result.current.selected).toBe(0);
    expect(result.current.current.label).toBe('START');
    expect(result.current.dirty).toBe(false);
  });

  it('adds a stop at the scroll position, sampled rather than blank', () => {
    const { result } = mount();
    act(() => result.current.addAt(0.5));

    expect(result.current.keyframes.map((k) => k.p)).toEqual([0, 0.5, 1]);
    // The midpoint of a 0→180 sweep, i.e. what the camera was actually showing.
    expect(result.current.current.azimuth).toBeCloseTo(90, 4);
    expect(result.current.selected).toBe(1);
    expect(result.current.dirty).toBe(true);
  });

  it('re-sorts on a `p` edit and keeps the selection on the moved stop', () => {
    const { result } = mount();
    act(() => result.current.addAt(0.5));
    act(() => result.current.patch({ p: 0.99 }));

    expect(result.current.keyframes.map((k) => k.p)).toEqual([0, 0.99, 1]);
    act(() => result.current.select(0));
    act(() => result.current.patch({ p: 0.995 }));
    expect(result.current.keyframes.map((k) => k.p)).toEqual([0.99, 0.995, 1]);
    expect(result.current.selected).toBe(1);
  });

  it('clamps a patch into the rig’s usable range', () => {
    const { result } = mount();
    act(() => result.current.patch({ p: 5, radius: 99, elevation: 200, fov: 1 }));

    expect(result.current.current).toMatchObject({ p: 1, radius: 12, elevation: 80, fov: 12 });
  });

  it('duplicates the selected stop just past it', () => {
    const { result } = mount();
    act(() => result.current.duplicate());

    expect(result.current.keyframes.map((k) => k.p)).toEqual([0, 0.02, 1]);
    expect(result.current.current.label).toBe('START');
  });

  it('removes a stop but never empties the timeline', () => {
    const { result } = mount();
    act(() => result.current.remove());
    expect(result.current.keyframes.map((k) => k.label)).toEqual(['END']);

    // sampleKeyframes throws on an empty array, from inside the rAF loop.
    act(() => result.current.remove());
    expect(result.current.keyframes).toHaveLength(1);
  });

  it('hands the engine a new array per edit, never a mutated one', () => {
    const { result } = mount();
    const first = result.current.keyframes;
    act(() => result.current.patch({ radius: 2 }));
    const second = result.current.keyframes;
    act(() => result.current.addAt(0.4));

    expect(second).not.toBe(first);
    expect(result.current.keyframes).not.toBe(second);
  });
});

describe('useStudioDraft markers', () => {
  it('uniquifies names, because the HUD keys on them', () => {
    const { result } = mount();
    act(() => result.current.addMarker('HEAD', [0, 0.1, 0]));
    act(() => result.current.addMarker('HEAD', [0, 0.2, 0]));

    expect(result.current.markers.map((m) => m.name)).toEqual(['HEAD', 'HEAD-2', 'HEAD-3']);
  });

  it('renames without colliding, and removes by index', () => {
    const { result } = mount();
    act(() => result.current.addMarker('BOOT', [0, -0.8, 0]));
    act(() => result.current.renameMarker(1, 'HEAD'));
    expect(result.current.markers.map((m) => m.name)).toEqual(['HEAD', 'HEAD-2']);

    act(() => result.current.removeMarker(0));
    expect(result.current.markers.map((m) => m.name)).toEqual(['HEAD-2']);
  });
});

describe('useStudioDraft lifecycle', () => {
  it('clears the dirty flag once the host has saved', () => {
    const { result } = mount();
    act(() => result.current.patch({ radius: 2 }));
    expect(result.current.dirty).toBe(true);

    act(() => result.current.markSaved());
    expect(result.current.dirty).toBe(false);
  });

  it('resets on a model swap but survives a fresh preset object for the same model', () => {
    const { result, rerender } = mount();
    act(() => result.current.patch({ radius: 2 }));

    // A server-rendered host hands over a new object every render; that alone
    // must not wipe an in-progress edit.
    rerender({ modelId: 'hitman', source: preset() });
    expect(result.current.current.radius).toBe(2);
    expect(result.current.dirty).toBe(true);

    const other: ShowcasePreset = { keyframes: [key({ p: 0, label: 'OTHER' })], markers: [] };
    rerender({ modelId: 'other', source: other });
    expect(result.current.keyframes.map((k) => k.label)).toEqual(['OTHER']);
    expect(result.current.selected).toBe(0);
    expect(result.current.dirty).toBe(false);
  });

  it('falls back to a usable stop when a preset arrives with no keyframes', () => {
    const { result } = mount({ keyframes: [], markers: [] });
    expect(result.current.keyframes).toHaveLength(1);
    expect(result.current.current.radius).toBeGreaterThan(0);
  });
});

describe('useStudioDraft settings', () => {
  it('merges a settings patch instead of replacing the object', () => {
    const { result } = mount();
    act(() => result.current.patchSettings({ damping: 0.2 }));
    act(() => result.current.patchSettings({ bloom: false }));

    // Partial by design: an unset key means "whatever the slice defaults to",
    // so saving a preset never bakes in defaults the author never chose.
    expect(result.current.settings).toEqual({ damping: 0.2, bloom: false });
    expect(result.current.dirty).toBe(true);
  });
});

describe('useStudioDraft snapshots', () => {
  it('round-trips path, markers, settings and selection', () => {
    const { result } = mount();
    act(() => result.current.addAt(0.5));
    act(() => result.current.addMarker('BOOT', [0, -0.8, 0]));
    act(() => result.current.patchSettings({ damping: 0.3 }));

    // Through JSON, the way the history stack stores it.
    const saved = JSON.parse(JSON.stringify(result.current.snapshot())) as StudioSnapshot;

    act(() => result.current.patch({ radius: 1.25 }));
    act(() => result.current.remove());
    act(() => result.current.removeMarker(1));
    act(() => result.current.patchSettings({ damping: 0.01 }));

    act(() => result.current.restore(saved));
    expect(result.current.keyframes.map((k) => k.p)).toEqual([0, 0.5, 1]);
    expect(result.current.markers.map((m) => m.name)).toEqual(['HEAD', 'BOOT']);
    expect(result.current.settings.damping).toBe(0.3);
    expect(result.current.selected).toBe(1);
    // A restore is an edit like any other — the host still has it to save.
    expect(result.current.dirty).toBe(true);
  });

  it('clamps a restored selection to the snapshot’s own list', () => {
    const { result } = mount();
    const saved: StudioSnapshot = {
      keyframes: [key({ p: 0, label: 'ONLY' })],
      markers: [],
      settings: {},
      content: EMPTY_CONTENT,
      selected: 7,
    };

    act(() => result.current.restore(saved));
    expect(result.current.selected).toBe(0);
    expect(result.current.current.label).toBe('ONLY');
  });
});

describe('nearestKeyframeIndex', () => {
  const list = [key({ p: 0 }), key({ p: 0.4 }), key({ p: 1 })];

  it('finds the stop closest to the playhead', () => {
    expect(nearestKeyframeIndex(list, 0)).toBe(0);
    expect(nearestKeyframeIndex(list, 0.39)).toBe(1);
    expect(nearestKeyframeIndex(list, 0.71)).toBe(2);
    expect(nearestKeyframeIndex(list, 1)).toBe(2);
  });

  it('keeps the earlier stop on an exact tie, so a seek never flickers', () => {
    expect(nearestKeyframeIndex(list, 0.2)).toBe(0);
  });
});
