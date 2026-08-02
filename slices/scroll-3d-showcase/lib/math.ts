export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Ken Perlin's smootherstep — zero 1st and 2nd derivatives at both ends. */
export const smootherstep = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

/** Where `v` sits between `a` and `b`, clamped to 0–1. Returns 0 when a === b. */
export const inverseLerp = (a: number, b: number, v: number): number =>
  b === a ? 0 : clamp((v - a) / (b - a), 0, 1);

export const degToRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Opacity of an element visible across `[start, end]`, easing in and out over
 * `feather` of scroll progress at each edge.
 */
export const fadeWindow = (
  progress: number,
  [start, end]: readonly [number, number],
  feather = 0.055,
): number =>
  smootherstep(inverseLerp(start, start + feather, progress)) *
  (1 - smootherstep(inverseLerp(end - feather, end, progress)));

/**
 * Frame-rate independent damping factor. `rate` is the fraction of the
 * remaining distance covered in one frame at 60fps.
 */
export const dampingFactor = (rate: number, deltaSeconds: number): number =>
  1 - Math.pow(1 - rate, deltaSeconds * 60);
