import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShowcasePreset } from '../studio/types';
import { useStudioDraft } from '../studio/use-studio-draft';
import { useStudioHistory } from '../studio/use-studio-history';
import type { CameraKeyframe } from '../types';

const key = (over: Partial<CameraKeyframe>): CameraKeyframe => ({
  p: 0, azimuth: 0, elevation: 0, radius: 3, targetY: 0, screenShiftX: 0, fov: 40, label: 'A',
  ...over,
});

const preset = (): ShowcasePreset => ({
  keyframes: [key({ p: 0, label: 'START' }), key({ p: 1, azimuth: 180, label: 'END' })],
  markers: [],
  settings: { damping: 0.075 },
});

/** The pairing the studio actually ships: history wrapping a real draft. */
const mount = () =>
  renderHook(
    ({ modelId, source }: { modelId: string; source: ShowcasePreset }) =>
      useStudioHistory(useStudioDraft(modelId, source), modelId),
    { initialProps: { modelId: 'hitman', source: preset() } },
  );

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useStudioHistory coalescing', () => {
  it('collapses a burst of patches into one undo step', () => {
    const { result } = mount();
    act(() => result.current.draft.patch({ radius: 2 }));
    act(() => result.current.draft.patch({ radius: 2.5 }));
    act(() => void vi.advanceTimersByTime(300));

    expect(result.current.draft.current.radius).toBe(2.5);
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.draft.current.radius).toBe(3);
    // The whole drag, not just its last tick: the second patch re-armed the
    // timer instead of pushing a second entry.
    expect(result.current.canUndo).toBe(false);

    act(() => result.current.redo());
    expect(result.current.draft.current.radius).toBe(2.5);
  });

  it('holds a patch back until the coalescing window closes', () => {
    const { result } = mount();
    act(() => result.current.draft.patch({ radius: 2 }));
    act(() => void vi.advanceTimersByTime(1));

    expect(result.current.canUndo).toBe(false);
  });

  it('lands a structural edit on its own step, without waiting out the window', () => {
    const { result } = mount();
    act(() => result.current.draft.duplicate());
    act(() => void vi.advanceTimersByTime(1));

    expect(result.current.canUndo).toBe(true);
  });

  it('undoes a drag that is still inside its coalescing window', () => {
    const { result } = mount();
    act(() => result.current.draft.patch({ radius: 2 }));
    // No timer advance: pressing undo mid-drag must revert the drag rather than
    // silently doing nothing, so undo flushes the pending entry first.
    act(() => result.current.undo());

    expect(result.current.draft.current.radius).toBe(3);
  });
});

describe('useStudioHistory scope', () => {
  it('carries scene settings through the stack', () => {
    const { result } = mount();
    act(() => result.current.draft.patchSettings({ damping: 0.2 }));
    act(() => void vi.advanceTimersByTime(300));
    expect(result.current.draft.settings.damping).toBe(0.2);

    act(() => result.current.undo());
    expect(result.current.draft.settings.damping).toBe(0.075);
  });

  it('seeds the loaded preset, so the first undo returns to it', () => {
    const { result } = mount();
    act(() => result.current.draft.addAt(0.5));
    act(() => void vi.advanceTimersByTime(1));

    act(() => result.current.undo());
    expect(result.current.draft.keyframes.map((frame) => frame.label)).toEqual(['START', 'END']);
  });

  it('clears the stack on a model swap', () => {
    const { result, rerender } = mount();
    act(() => result.current.draft.patch({ radius: 2 }));
    act(() => void vi.advanceTimersByTime(300));
    expect(result.current.canUndo).toBe(true);

    rerender({
      modelId: 'other',
      source: { keyframes: [key({ label: 'OTHER' })], markers: [] },
    });
    // Undoing into the previous model's path would edit a scene that is gone.
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
