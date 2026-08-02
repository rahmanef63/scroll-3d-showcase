import { describe, expect, it } from 'vitest';
import { flyStep } from '../studio/fly';
import type { CameraKeyframe } from '../types';

const key = (over: Partial<CameraKeyframe> = {}): CameraKeyframe => ({
  p: 0, azimuth: 0, elevation: 0, radius: 2, targetY: 0,
  screenShiftX: 0, fov: 40, label: 'A', ...over,
});

const held = (...keys: string[]) => new Set(keys);

describe('flyStep', () => {
  it('does nothing when nothing is held', () => {
    expect(flyStep(key(), held(), 0.016, false)).toBeNull();
    expect(flyStep(key(), held('shift'), 0.016, true)).toBeNull();
  });

  it('maps A/D to azimuth and Q/E to elevation', () => {
    expect(flyStep(key(), held('d'), 1, false)!.azimuth).toBeGreaterThan(0);
    expect(flyStep(key(), held('a'), 1, false)!.azimuth).toBeLessThan(0);
    expect(flyStep(key(), held('e'), 1, false)!.elevation).toBeGreaterThan(0);
    expect(flyStep(key(), held('q'), 1, false)!.elevation).toBeLessThan(0);
  });

  it('cancels opposing keys instead of fighting', () => {
    expect(flyStep(key(), held('a', 'd'), 1, false)).toBeNull();
    expect(flyStep(key(), held('w', 's'), 1, false)).toBeNull();
  });

  it('dollies multiplicatively, so it feels the same near and far', () => {
    const near = flyStep(key({ radius: 0.4 }), held('w'), 0.1, false)!.radius!;
    const far = flyStep(key({ radius: 4 }), held('w'), 0.1, false)!.radius!;
    // Same proportion of the distance travelled, not the same metres.
    expect(near / 0.4).toBeCloseTo(far / 4, 6);
    expect(near).toBeLessThan(0.4);
  });

  it('never lets radius reach or cross zero, however long the key is held', () => {
    let radius = 2;
    for (let i = 0; i < 600; i += 1) {
      radius = flyStep(key({ radius }), held('w'), 0.1, true)!.radius!;
    }
    expect(radius).toBeGreaterThan(0);
  });

  it('scales with dt, so a slow frame does not travel less', () => {
    const one = flyStep(key(), held('d'), 0.1, false)!.azimuth!;
    const two = flyStep(key(), held('d'), 0.2, false)!.azimuth!;
    expect(two).toBeCloseTo(one * 2, 6);
  });

  it('boosts on shift', () => {
    const plain = flyStep(key(), held('d'), 0.1, false)!.azimuth!;
    const fast = flyStep(key(), held('d'), 0.1, true)!.azimuth!;
    expect(fast).toBeGreaterThan(plain * 2);
  });

  it('patches only the axes that moved', () => {
    expect(Object.keys(flyStep(key(), held('d'), 0.1, false)!)).toEqual(['azimuth']);
  });
});
