import { describe, expect, it } from 'vitest';
import {
  clamp,
  dampingFactor,
  fadeWindow,
  inverseLerp,
  lerp,
  smootherstep,
} from '../lib/math';

describe('clamp', () => {
  it('holds values inside the range', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(-3, 0, 1)).toBe(0);
    expect(clamp(9, 0, 1)).toBe(1);
  });
});

describe('smootherstep', () => {
  it('pins the endpoints and stays monotonic', () => {
    expect(smootherstep(0)).toBe(0);
    expect(smootherstep(1)).toBe(1);
    expect(smootherstep(0.5)).toBeCloseTo(0.5, 5);
    expect(smootherstep(0.3)).toBeLessThan(smootherstep(0.7));
  });
});

describe('inverseLerp', () => {
  it('returns 0 for a zero-width range instead of dividing by zero', () => {
    expect(inverseLerp(4, 4, 4)).toBe(0);
  });

  it('clamps outside the range', () => {
    expect(inverseLerp(0, 10, 15)).toBe(1);
    expect(inverseLerp(0, 10, -5)).toBe(0);
    expect(inverseLerp(0, 10, 2.5)).toBe(0.25);
  });
});

describe('lerp', () => {
  it('interpolates and extrapolates linearly', () => {
    expect(lerp(0, 10, 0.25)).toBe(2.5);
    expect(lerp(-10, 10, 0.5)).toBe(0);
  });
});

describe('fadeWindow', () => {
  const window = [0.2, 0.6] as const;

  it('is fully hidden outside the window', () => {
    expect(fadeWindow(0.0, window)).toBe(0);
    expect(fadeWindow(0.9, window)).toBe(0);
  });

  it('is fully visible in the middle', () => {
    expect(fadeWindow(0.4, window)).toBeCloseTo(1, 5);
  });

  it('eases at both edges', () => {
    const rising = fadeWindow(0.23, window);
    const falling = fadeWindow(0.57, window);
    expect(rising).toBeGreaterThan(0);
    expect(rising).toBeLessThan(1);
    expect(falling).toBeGreaterThan(0);
    expect(falling).toBeLessThan(1);
  });
});

describe('dampingFactor', () => {
  it('matches the raw rate at exactly 60fps', () => {
    expect(dampingFactor(0.075, 1 / 60)).toBeCloseTo(0.075, 6);
  });

  it('covers more ground over a longer frame', () => {
    expect(dampingFactor(0.075, 1 / 30)).toBeGreaterThan(dampingFactor(0.075, 1 / 60));
  });

  it('never overshoots', () => {
    expect(dampingFactor(0.075, 1)).toBeLessThanOrEqual(1);
  });
});
