import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  useStudioPlayback,
  type UseStudioPlaybackArgs,
} from '../studio/use-studio-playback';

/** jsdom ships no matchMedia at all, so the media hooks need one to read. */
const stubMedia = (reducedMotion: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reducedMotion && query.includes('reduced-motion'),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

/** Hand-driven frames: the real rAF would make the timing untestable. */
const stubFrames = () => {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(performance, 'now').mockReturnValue(0);
  return frames;
};

const mount = (args: Partial<UseStudioPlaybackArgs> = {}) =>
  renderHook(() =>
    useStudioPlayback({
      getProgress: () => 0,
      scrollToProgress: () => {},
      onStop: () => {},
      ...args,
    }),
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useStudioPlayback duration', () => {
  it('clamps the sweep into the range the transport advertises', () => {
    stubMedia(false);
    const { result } = mount();

    act(() => result.current.setDuration(999));
    expect(result.current.duration).toBe(60);

    act(() => result.current.setDuration(0.5));
    expect(result.current.duration).toBe(2);
  });

  it('keeps the last good duration when the number box is mid-edit', () => {
    stubMedia(false);
    const { result } = mount();

    // `Number('')` is 0 and `Number('-')` is NaN; neither should reach the loop.
    act(() => result.current.setDuration(Number.NaN));
    expect(result.current.duration).toBe(12);
  });
});

describe('useStudioPlayback frame loop', () => {
  it('clamps a backgrounded tab’s delta instead of jumping to the end', () => {
    stubMedia(false);
    const frames = stubFrames();
    const scrollTo = vi.fn();
    const { result } = mount({ scrollToProgress: scrollTo });

    act(() => result.current.setDuration(2));
    act(() => result.current.play());
    // Ten seconds since the last frame: five full sweeps if the delta were used raw.
    act(() => void frames.shift()?.(10_000));

    expect(scrollTo).toHaveBeenCalledWith(0.025, 'auto');
    expect(result.current.playing).toBe(true);
  });

  it('parks on the last frame and stops when loop is off', () => {
    stubMedia(false);
    const frames = stubFrames();
    const scrollTo = vi.fn();
    const { result } = mount({ scrollToProgress: scrollTo });

    act(() => result.current.setDuration(2));
    act(() => result.current.play());
    act(() => {
      // Runs until the loop stops re-registering, i.e. until it hits p >= 1.
      for (let i = 0; i < 80 && frames.length; i += 1) frames.shift()?.((i + 2) * 10_000);
    });

    expect(result.current.playing).toBe(false);
    expect(scrollTo).toHaveBeenLastCalledWith(1, 'auto');
  });

  it('reports the stop position exactly once', () => {
    stubMedia(false);
    const frames = stubFrames();
    const onStop = vi.fn();
    const { result } = mount({ getProgress: () => 0.42, onStop });

    act(() => result.current.play());
    act(() => void frames.shift()?.(16));
    act(() => result.current.pause());

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledWith(0.42);
  });
});

describe('useStudioPlayback availability', () => {
  it('refuses to run under prefers-reduced-motion', () => {
    stubMedia(true);
    const scrollTo = vi.fn();
    const { result } = mount({ scrollToProgress: scrollTo });

    expect(result.current.available).toBe(false);
    act(() => result.current.play());
    act(() => result.current.toggle());

    expect(result.current.playing).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
