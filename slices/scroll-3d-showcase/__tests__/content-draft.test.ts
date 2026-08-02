import { describe, expect, it } from 'vitest';
import {
  EMPTY_CONTENT,
  addSectionAt,
  patchSectionAt,
  removeSectionAt,
} from '../studio/draft-utils';
import type { ShowcaseContent } from '../types';

const content = (): ShowcaseContent => ({
  title: 'HITMAN',
  brand: 'DEMO',
  description: '',
  sections: [
    { id: '01', name: 'Intro', progress: 0, fadeIn: -0.1, fadeOut: 0.26,
      align: 'start', kicker: 'k', heading: 'H', body: 'b' },
    { id: '02', name: 'Works', progress: 0.6, fadeIn: 0.5, fadeOut: 0.7,
      align: 'end', kicker: '', heading: '', body: '' },
  ],
});

describe('copy reducers', () => {
  it('patches one section and leaves the rest identical by reference', () => {
    const before = content();
    const after = patchSectionAt(before, 1, { body: 'edited' });

    expect(after.sections[1].body).toBe('edited');
    expect(after.sections[1].name).toBe('Works');
    expect(after.sections[0]).toBe(before.sections[0]);
    // The engine and the history stack both compare by identity.
    expect(after).not.toBe(before);
    expect(before.sections[1].body).toBe('');
  });

  it('adds a panel whose fade window contains its own progress', () => {
    const { sections } = addSectionAt(content(), 0.4);
    const added = sections[2];

    expect(added.progress).toBe(0.4);
    expect(added.fadeIn).toBeLessThan(added.progress);
    expect(added.fadeOut).toBeGreaterThan(added.progress);
  });

  it('never reuses an id — ids are DOM ids and React keys', () => {
    let next = content();
    for (let i = 0; i < 5; i += 1) next = addSectionAt(next, 0.5);

    const ids = next.sections.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('alternates the side new panels sit on, so two in a row do not stack', () => {
    const first = addSectionAt(EMPTY_CONTENT, 0.2);
    expect(first.sections[0].align).toBe('start');
    expect(addSectionAt(first, 0.4).sections[1].align).toBe('end');
  });

  it('removes by index without disturbing the others', () => {
    const after = removeSectionAt(content(), 0);
    expect(after.sections.map((section) => section.id)).toEqual(['02']);
  });
});
