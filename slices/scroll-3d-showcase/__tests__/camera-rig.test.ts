import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { activeSectionIndex, applyCameraFrame, sampleKeyframes } from '../lib/camera-rig';
import { DEFAULT_KEYFRAMES } from '../config/keyframes';
import type { CameraKeyframe } from '../types';

const keyframes: CameraKeyframe[] = [
  { p: 0, azimuth: 0, elevation: 0, radius: 4, targetY: 0, screenShiftX: 0, fov: 40, label: 'A' },
  { p: 1, azimuth: 180, elevation: 10, radius: 1, targetY: 1, screenShiftX: 0.5, fov: 30, label: 'B' },
];

describe('sampleKeyframes', () => {
  it('returns the endpoints exactly', () => {
    expect(sampleKeyframes(keyframes, 0)).toMatchObject({ azimuth: 0, radius: 4, label: 'A' });
    expect(sampleKeyframes(keyframes, 1)).toMatchObject({ azimuth: 180, radius: 1, label: 'B' });
  });

  it('clamps outside the timeline instead of extrapolating', () => {
    expect(sampleKeyframes(keyframes, -5).radius).toBe(4);
    expect(sampleKeyframes(keyframes, 5).radius).toBe(1);
  });

  it('eases rather than interpolating linearly', () => {
    // smootherstep(0.25) ≈ 0.1035, so the midpoint value lags a straight line.
    expect(sampleKeyframes(keyframes, 0.25).azimuth).toBeLessThan(45);
    expect(sampleKeyframes(keyframes, 0.5).azimuth).toBeCloseTo(90, 4);
  });

  it('swaps the label at the halfway point', () => {
    expect(sampleKeyframes(keyframes, 0.49).label).toBe('A');
    expect(sampleKeyframes(keyframes, 0.51).label).toBe('B');
  });

  it('throws on an empty timeline rather than returning junk', () => {
    expect(() => sampleKeyframes([], 0.5)).toThrow(/no keyframes/i);
  });
});

describe('DEFAULT_KEYFRAMES', () => {
  it('is sorted by scroll position', () => {
    const positions = DEFAULT_KEYFRAMES.map((k) => k.p);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('sweeps exactly one full turn', () => {
    const first = DEFAULT_KEYFRAMES[0].azimuth;
    const last = DEFAULT_KEYFRAMES[DEFAULT_KEYFRAMES.length - 1].azimuth;
    expect(last - first).toBe(360);
  });
});

describe('applyCameraFrame', () => {
  const camera = () => {
    const cam = new PerspectiveCamera(40, 16 / 9, 0.1, 100);
    return cam;
  };

  it('places the camera at `radius` from the look-at point', () => {
    const cam = camera();
    const target = new Vector3();
    const frame = sampleKeyframes(keyframes, 0);
    applyCameraFrame(cam, frame, target);
    expect(cam.position.distanceTo(target)).toBeCloseTo(4, 5);
  });

  it('pushes the model the opposite way to the look-at shift', () => {
    const cam = camera();
    const target = new Vector3();
    applyCameraFrame(cam, { ...sampleKeyframes(keyframes, 0), screenShiftX: 0.5 }, target);
    // azimuth 0 → camera right is +X, so a positive shift moves the target -X.
    expect(target.x).toBeLessThan(0);
  });

  it('honours screenShiftScale: 0 for the stacked mobile layout', () => {
    const cam = camera();
    const target = new Vector3();
    applyCameraFrame(
      cam,
      { ...sampleKeyframes(keyframes, 0), screenShiftX: 0.5 },
      target,
      { screenShiftScale: 0 },
    );
    expect(target.x).toBeCloseTo(0, 6);
  });

  it('syncs the projection when the fov changes', () => {
    const cam = camera();
    applyCameraFrame(cam, sampleKeyframes(keyframes, 1), new Vector3());
    expect(cam.fov).toBeCloseTo(30, 5);
  });

  it('leaves matrixWorldInverse in sync so HUD anchors project against this frame', () => {
    const cam = camera();
    applyCameraFrame(cam, sampleKeyframes(keyframes, 0.42), new Vector3());

    const expected = cam.matrixWorld.clone().invert();
    expect(cam.matrixWorldInverse.elements).toEqual(expected.elements);

    // A world point on the look-at axis must land where the camera is pointing,
    // not where it pointed last frame.
    const projected = new Vector3(0, 0, 0).project(cam);
    expect(Number.isFinite(projected.x)).toBe(true);
    expect(Math.abs(projected.x)).toBeLessThan(1);
  });
});

describe('activeSectionIndex', () => {
  const sections = [
    { fade: [-0.1, 0.2] as const },
    { fade: [0.2, 0.5] as const },
    { fade: [0.5, 1.1] as const },
  ];

  it('reports the last section whose window has opened', () => {
    expect(activeSectionIndex(sections, 0)).toBe(0);
    expect(activeSectionIndex(sections, 0.3)).toBe(1);
    expect(activeSectionIndex(sections, 0.99)).toBe(2);
  });
});

describe('off-axis look-at targets', () => {
  const axial: CameraKeyframe = {
    p: 0, azimuth: 0, elevation: 0, radius: 1, targetY: 0, screenShiftX: 0, fov: 40, label: 'AXIAL',
  };

  it('defaults targetX/targetZ to 0 when a keyframe omits them', () => {
    const frame = sampleKeyframes([axial], 0);
    const cam = new PerspectiveCamera(40, 16 / 9, 0.1, 100);
    const target = new Vector3(9, 9, 9);
    applyCameraFrame(cam, frame, target);
    expect(target.x).toBeCloseTo(0, 6);
    expect(target.z).toBeCloseTo(0, 6);
  });

  it('aims at a feature off the centre line', () => {
    const cam = new PerspectiveCamera(40, 16 / 9, 0.1, 100);
    const target = new Vector3();
    applyCameraFrame(cam, { ...sampleKeyframes([axial], 0), targetX: -0.24, targetZ: 0.14 }, target);
    expect(target.x).toBeCloseTo(-0.24, 6);
    expect(target.z).toBeCloseTo(0.14, 6);
  });

  it('keeps the camera `radius` away from an off-axis target', () => {
    const cam = new PerspectiveCamera(40, 16 / 9, 0.1, 100);
    const target = new Vector3();
    const frame = { ...sampleKeyframes([axial], 0), azimuth: 252, elevation: -10, targetX: -0.24, targetZ: 0.14 };
    applyCameraFrame(cam, frame, target);
    expect(cam.position.distanceTo(target)).toBeCloseTo(frame.radius, 5);
  });

  it('interpolates the lateral offsets across a segment', () => {
    const pair: CameraKeyframe[] = [
      { ...axial, p: 0, targetX: 0, targetZ: 0 },
      { ...axial, p: 1, targetX: -0.4, targetZ: 0.2, label: 'OFFSET' },
    ];
    const mid = sampleKeyframes(pair, 0.5);
    expect(mid.targetX).toBeCloseTo(-0.2, 6);
    expect(mid.targetZ).toBeCloseTo(0.1, 6);
  });

  it('still applies the screen shift on top of a lateral target', () => {
    const cam = new PerspectiveCamera(40, 16 / 9, 0.1, 100);
    const plain = new Vector3();
    const shifted = new Vector3();
    const frame = { ...sampleKeyframes([axial], 0), targetX: -0.24 };
    applyCameraFrame(cam, frame, plain);
    applyCameraFrame(cam, { ...frame, screenShiftX: 0.5 }, shifted);
    // azimuth 0 -> camera right is +X, so a positive shift drags the target -X.
    expect(shifted.x).toBeLessThan(plain.x);
  });
});

describe('DEFAULT_KEYFRAMES detail stops', () => {
  it('names the four highlighted details', () => {
    const labels = DEFAULT_KEYFRAMES.map((k) => k.label);
    expect(labels).toEqual(
      expect.arrayContaining(['SHADES', 'SUIT', 'SIDEARM', 'SHOES']),
    );
  });

  it('only aims off-centre where a detail actually sits off-centre', () => {
    const offAxis = DEFAULT_KEYFRAMES.filter((k) => (k.targetX ?? 0) !== 0);
    expect(offAxis.map((k) => k.label)).toEqual(['SIDEARM']);
  });

  it('opens and closes on the same wide framing', () => {
    const first = DEFAULT_KEYFRAMES[0];
    const last = DEFAULT_KEYFRAMES[DEFAULT_KEYFRAMES.length - 1];
    expect(first.label).toBe('FULL BODY');
    expect(last.label).toBe('FULL BODY');
    expect(Math.abs(first.radius - last.radius)).toBeLessThan(0.5);
  });
});
