import { Color } from 'three';

/**
 * The WebGL scene reads its colours from the same CSS custom properties the
 * HUD uses, so the theme stays a single source of truth instead of hex
 * literals drifting between the stylesheet and the lighting rig.
 *
 * TODO(rr): confirm — these are slice-scoped tokens (`--showcase-*`). In a
 * project that has the tones SSOT wired up they should resolve through it
 * rather than being declared per slice.
 */
export interface ShowcaseThemeColors {
  background: Color;
  key: Color;
  fill: Color;
  rimPrimary: Color;
  rimAccent: Color;
  ambient: Color;
  grid: Color;
  gridSubdued: Color;
}

const FALLBACKS: Record<keyof ShowcaseThemeColors, string> = {
  background: '#04060c',
  key: '#ffffff',
  fill: '#88b6ff',
  rimPrimary: '#4fe3ff',
  rimAccent: '#ff3d9a',
  ambient: '#2b3c5a',
  grid: '#4fe3ff',
  gridSubdued: '#18304a',
};

const TOKENS: Record<keyof ShowcaseThemeColors, string> = {
  background: '--showcase-bg',
  key: '--showcase-key',
  fill: '--showcase-fill',
  rimPrimary: '--showcase-primary',
  rimAccent: '--showcase-accent',
  ambient: '--showcase-ambient',
  grid: '--showcase-grid',
  gridSubdued: '--showcase-grid-subdued',
};

/**
 * Reads the resolved token values off `element` (defaults to the document
 * root). Falls back to the shipped palette when a token is absent, so the
 * slice still renders in a host that has not themed it.
 */
export function readThemeColors(element?: Element | null): ShowcaseThemeColors {
  const root =
    element ?? (typeof document === 'undefined' ? null : document.documentElement);
  const styles = root ? getComputedStyle(root) : null;

  const resolve = (name: keyof ShowcaseThemeColors): Color => {
    const raw = styles?.getPropertyValue(TOKENS[name]).trim();
    if (!raw) return new Color(FALLBACKS[name]);
    try {
      return new Color(raw);
    } catch {
      return new Color(FALLBACKS[name]);
    }
  };

  return {
    background: resolve('background'),
    key: resolve('key'),
    fill: resolve('fill'),
    rimPrimary: resolve('rimPrimary'),
    rimAccent: resolve('rimAccent'),
    ambient: resolve('ambient'),
    grid: resolve('grid'),
    gridSubdued: resolve('gridSubdued'),
  };
}
