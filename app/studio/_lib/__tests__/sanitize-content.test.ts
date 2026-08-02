import { describe, expect, it } from 'vitest';
import { DEFAULT_CONTENT } from '@/app/(public)/_content/copy';
import { sanitizePreset } from '../sanitize-preset';

const keyframe = {
  p: 0,
  azimuth: 0,
  elevation: 0,
  radius: 3,
  targetY: 0,
  screenShiftX: 0,
  fov: 40,
  label: 'A',
};

const section = () => ({ ...DEFAULT_CONTENT.sections[0] });
const wrap = (content: unknown) => ({ keyframes: [keyframe], markers: [], content });

describe('sanitizePreset — content', () => {
  it('passes this site’s own copy through unchanged', () => {
    const { content } = sanitizePreset(wrap(DEFAULT_CONTENT));
    expect(content).toEqual(DEFAULT_CONTENT);
  });

  it('treats a missing block as "this deploy has no copy", not an error', () => {
    expect(sanitizePreset({ keyframes: [keyframe], markers: [] }).content).toBeUndefined();
  });

  it('keeps a showcase with zero panels — the scene alone is a valid page', () => {
    const { content } = sanitizePreset(
      wrap({ title: 'T', brand: 'B', description: '', sections: [] }),
    );
    expect(content?.sections).toEqual([]);
  });

  it('drops keys the wire contract does not have', () => {
    const { content } = sanitizePreset(
      wrap({ ...DEFAULT_CONTENT, sections: [{ ...section(), evil: '<script>' }] }),
    );
    expect(content?.sections[0]).not.toHaveProperty('evil');
  });

  it('rejects an id that is not a slug — it becomes a DOM id and a React key', () => {
    for (const id of ['a b', '#01', '', 'a/b']) {
      expect(() => sanitizePreset(wrap({ ...DEFAULT_CONTENT, sections: [{ ...section(), id }] })))
        .toThrow(/alphanumeric|must be a string/);
    }
  });

  it('rejects an align outside the two the layout knows', () => {
    expect(() =>
      sanitizePreset(wrap({ ...DEFAULT_CONTENT, sections: [{ ...section(), align: 'middle' }] })),
    ).toThrow(/align/);
  });

  it('rejects non-finite timings rather than letting NaN reach the fade window', () => {
    expect(() =>
      sanitizePreset(wrap({ ...DEFAULT_CONTENT, sections: [{ ...section(), fadeIn: 'soon' }] })),
    ).toThrow(/finite number/);
  });

  it('caps the section count', () => {
    const sections = Array.from({ length: 25 }, (_, index) => ({
      ...section(),
      id: `s${index}`,
    }));
    expect(() => sanitizePreset(wrap({ ...DEFAULT_CONTENT, sections }))).toThrow(/too many/);
  });

  it('truncates prose instead of rejecting a long paste', () => {
    const { content } = sanitizePreset(
      wrap({ ...DEFAULT_CONTENT, sections: [{ ...section(), body: 'x'.repeat(5000) }] }),
    );
    expect(content?.sections[0].body).toHaveLength(2000);
  });

  it('gives a heading more room than a label — 64 chars would cut most of them', () => {
    const heading = 'H'.repeat(150);
    const { content } = sanitizePreset(
      wrap({ ...DEFAULT_CONTENT, sections: [{ ...section(), heading }] }),
    );
    expect(content?.sections[0].heading).toBe(heading);
  });
});
