import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PathMap } from '../studio/path-map';
import type { CameraKeyframe } from '../types';

const key = (over: Partial<CameraKeyframe>): CameraKeyframe => ({
  p: 0, azimuth: 0, elevation: 0, radius: 4, targetY: 0, screenShiftX: 0, fov: 40, label: 'A',
  ...over,
});

const draw = (keyframes: CameraKeyframe[], selected = 0, onSelect = vi.fn()) => {
  const { container } = render(
    <PathMap
      keyframes={keyframes}
      selected={selected}
      getProgress={() => 0}
      onSelect={onSelect}
    />,
  );
  const groups = [...container.querySelectorAll('g[role="button"]')];
  // Each dot is an invisible hit pad followed by the visible circle.
  const dots = groups.map((group) => {
    const circles = group.querySelectorAll('circle');
    return circles[circles.length - 1];
  });
  return { groups, dots, onSelect };
};

const at = (dot: Element) => ({
  x: Number(dot.getAttribute('cx')),
  y: Number(dot.getAttribute('cy')),
});

describe('PathMap projection', () => {
  it('puts a keyframe where applyCameraFrame would put the camera on a floor plan', () => {
    const { dots } = draw([
      key({ p: 0, azimuth: 0 }),
      key({ p: 0.5, azimuth: 90 }),
      key({ p: 1, azimuth: 180 }),
    ]);

    // radius 4 is the widest orbit, so every dot lands on the 52-unit ring
    // around the centre at (66,66). +X runs right, +Z runs down the map.
    expect(at(dots[0]).x).toBeCloseTo(66, 3);
    expect(at(dots[0]).y).toBeCloseTo(118, 3);

    expect(at(dots[1]).x).toBeCloseTo(118, 3);
    expect(at(dots[1]).y).toBeCloseTo(66, 3);

    expect(at(dots[2]).x).toBeCloseTo(66, 3);
    expect(at(dots[2]).y).toBeCloseTo(14, 3);
  });

  it('holds a tight path off the ring rather than rescaling it to fill', () => {
    const { dots } = draw([key({ p: 0, radius: 0.5 }), key({ p: 1, radius: 0.5 })]);

    // The floor of 2 on the scale divisor is what keeps a 0.5m orbit reading as
    // a close one; filling the ring would make every path look identical.
    expect(at(dots[0]).y).toBeCloseTo(79, 3);
  });

  it('marks the selected keyframe with the larger dot', () => {
    const { dots } = draw([key({ p: 0 }), key({ p: 1, azimuth: 90 })], 1);

    expect(dots[0].getAttribute('r')).toBe('3');
    expect(dots[1].getAttribute('r')).toBe('4.5');
  });
});

describe('PathMap selection', () => {
  it('reports the index and leaves selecting to the caller', () => {
    const { groups, onSelect } = draw([key({ p: 0 }), key({ p: 1, azimuth: 90 })]);

    fireEvent.click(groups[1]);
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('is reachable from the keyboard', () => {
    const { groups, onSelect } = draw([key({ p: 0 }), key({ p: 1, azimuth: 90 })]);

    fireEvent.keyDown(groups[1], { key: 'Enter' });
    fireEvent.keyDown(groups[0], { key: ' ' });

    expect(onSelect).toHaveBeenNthCalledWith(1, 1);
    expect(onSelect).toHaveBeenNthCalledWith(2, 0);
  });
});
