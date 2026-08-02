import { describe, expect, it } from 'vitest';
import * as barrel from '../index';
import * as studio from '../studio/index';
import sliceJson from '../slice.json';
import manifest from '../slice.manifest.json';

/**
 * The barrel is the contract consumers depend on. Anything removed or renamed
 * here is a breaking change, so it gets asserted rather than assumed.
 */
describe('slice barrel', () => {
  const expected = [
    'Scroll3DShowcase',
    'useShowcaseJump',
    'DEFAULT_KEYFRAMES',
    'DEFAULT_MARKERS',
    'DEFAULT_SCENE_SETTINGS',
    'DEFAULT_HUD_LABELS',
  ] as const;

  it.each(expected)('exports %s', (name) => {
    expect(barrel).toHaveProperty(name);
  });

  it('exports nothing beyond the declared surface', () => {
    expect(Object.keys(barrel).sort()).toEqual([...expected].sort());
  });

  /**
   * The split is the whole reason `/` is not carrying the editor. A value
   * re-export keeps the module graph alive whether or not anyone calls it, so
   * one convenience line here costs every visitor the editor's weight.
   */
  it('keeps the editor out of the runtime barrel', () => {
    expect(barrel).not.toHaveProperty('ShowcaseStudio');
    expect(barrel).not.toHaveProperty('createMockStudioAdapter');
  });
});

describe('studio barrel', () => {
  it('is where the editor surface lives', () => {
    expect(Object.keys(studio).sort()).toEqual(['ShowcaseStudio', 'createMockStudioAdapter']);
  });

  it('ships defaults that satisfy the documented shape', () => {
    expect(barrel.DEFAULT_KEYFRAMES.length).toBeGreaterThan(1);
    expect(barrel.DEFAULT_SCENE_SETTINGS.modelHeight).toBeGreaterThan(0);
    expect(barrel.DEFAULT_HUD_LABELS.bootStages.length).toBeGreaterThan(0);
    expect(Object.keys(barrel.DEFAULT_HUD_LABELS.errors).sort()).toEqual([
      'FILE_PROTOCOL',
      'MODEL_FETCH_FAILED',
      'MODEL_PARSE_FAILED',
      'WEBGL_UNAVAILABLE',
    ]);
  });
});

describe('slice metadata', () => {
  it('keeps slice.json and slice.manifest.json on the same version', () => {
    expect(sliceJson.version).toBe(manifest.version);
  });

  it('declares every runtime export against the entry it actually lives in', () => {
    const modules: Record<string, object> = {
      'index.ts': barrel,
      'studio/index.ts': studio,
    };
    for (const entry of sliceJson.contract.exports) {
      expect(modules[entry.entry], `unknown entry ${entry.entry}`).toBeDefined();
      expect(modules[entry.entry]).toHaveProperty(entry.name);
    }
  });

  it('lists both entries in the manifest', () => {
    expect(manifest.files).toEqual(expect.arrayContaining(['index.ts', 'studio/index.ts']));
  });

  it('lists the barrel and both metadata files in the manifest', () => {
    expect(manifest.files).toEqual(
      expect.arrayContaining(['index.ts', 'slice.json', 'slice.manifest.json']),
    );
  });
});
