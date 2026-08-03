import { describe, expect, it } from 'vitest';
import { stepToward } from '../hooks/use-count-up';

/**
 * The boot percentage is a claim about how many bytes have arrived. The easing
 * exists to make it readable, not to make it optimistic — so the properties
 * worth pinning are the ones that keep it honest.
 */
describe('stepToward', () => {
  it('closes part of the gap each frame', () => {
    const next = stepToward(0, 1, 1);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
  });

  it('never runs past the bytes that actually arrived', () => {
    let value = 0;
    for (let i = 0; i < 500; i += 1) value = stepToward(value, 0.4, 1);
    expect(value).toBe(0.4);
  });

  it('never counts backwards when the target drops', () => {
    // A remount hands over a fresh target; the number takes it whole rather
    // than ticking down, which would read as the download losing ground.
    expect(stepToward(0.8, 0.2, 1)).toBe(0.2);
  });

  it('covers more ground on a slow frame than a fast one', () => {
    expect(stepToward(0, 1, 3)).toBeGreaterThan(stepToward(0, 1, 1));
  });

  it('arrives, rather than approaching forever', () => {
    let value = 0;
    let frames = 0;
    while (value < 1 && frames < 1000) {
      value = stepToward(value, 1, 1);
      frames += 1;
    }
    expect(value).toBe(1);
    // Roughly a third of a second at 60fps: long enough to read as counting.
    expect(frames).toBeLessThan(60);
  });
});
