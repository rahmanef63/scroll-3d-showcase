import { describe, expect, it } from 'vitest';
import { DEFAULT_KEYFRAMES, DEFAULT_MARKERS, DEFAULT_SCENE_SETTINGS } from '../config/keyframes';
import { fromPresetFile, toPresetFile } from '../studio/preset-file';
import type { ShowcasePreset } from '../studio/types';

const PRESET: ShowcasePreset = {
  keyframes: DEFAULT_KEYFRAMES.map((keyframe) => ({ ...keyframe })),
  markers: DEFAULT_MARKERS.map((marker) => ({ ...marker })),
  settings: { ...DEFAULT_SCENE_SETTINGS },
  content: {
    title: 'RAHMAN',
    bootTitle: '',
    brand: 'SELF PORTRAIT',
    description: 'A description.',
    sections: [
      {
        id: 'r1', name: 'Intro', progress: 0, fadeIn: -0.12, fadeOut: 0.26,
        align: 'start', kicker: 'k', heading: 'RAH|MAN', body: 'b',
      },
    ],
  },
};

describe('the preset file', () => {
  it('round-trips everything the editor holds', () => {
    const { modelId, preset } = fromPresetFile(toPresetFile('rahman-3d', PRESET));
    expect(modelId).toBe('rahman-3d');
    expect(preset).toEqual(PRESET);
  });

  it('keeps an explicit empty bootTitle, which means "use the title"', () => {
    const { preset } = fromPresetFile(toPresetFile('m', PRESET));
    expect(preset.content?.bootTitle).toBe('');
  });

  it('leaves an unset scene knob unset, so the slice default still applies', () => {
    const { preset } = fromPresetFile(
      toPresetFile('m', { ...PRESET, settings: { scrollLength: 4 } }),
    );
    expect(preset.settings).toEqual({ scrollLength: 4 });
  });

  it('refuses a file with no camera path', () => {
    // An empty path throws inside the rAF callback, which never re-arms — the
    // scene would be dead until a reload, with no error anyone can see.
    expect(() => fromPresetFile('{"keyframes":[]}')).toThrow(/no keyframes/i);
    expect(() => fromPresetFile('not json at all')).toThrow(/json/i);
  });

  it('survives a file that is the right shape and wrong in every field', () => {
    const { preset } = fromPresetFile(
      JSON.stringify({
        keyframes: [{ p: 'x', radius: null, fov: NaN }, { p: 0.5 }],
        markers: [{ position: [1] }, 'nonsense'],
        settings: { damping: 'fast', bloom: 'yes' },
        content: { sections: [{ align: 'sideways' }] },
      }),
    );

    expect(preset.keyframes).toHaveLength(2);
    expect(preset.keyframes.every((k) => Object.values(k).every((v) => v !== null))).toBe(true);
    expect(preset.keyframes.map((k) => k.p)).toEqual([0, 0.5]);
    // A short position renders as NaN in the rig; the missing axes read as 0.
    expect(preset.markers[0].position).toEqual([1, 0, 0]);
    expect(preset.settings).toEqual({});
    expect(preset.content?.sections[0].align).toBe('start');
  });

  it('sorts the path, because the sampler assumes it is sorted', () => {
    const { preset } = fromPresetFile(
      JSON.stringify({ keyframes: [{ p: 0.8, label: 'B' }, { p: 0.2, label: 'A' }] }),
    );
    expect(preset.keyframes.map((k) => k.label)).toEqual(['A', 'B']);
  });
});
