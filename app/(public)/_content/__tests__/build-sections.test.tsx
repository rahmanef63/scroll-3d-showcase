import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ShowcaseContent } from '@/slices/scroll-3d-showcase';
import { CONTENT_PRESETS, DEFAULT_CONTENT } from '../copy';
import { EXTRAS, buildSections } from '../sections';

/**
 * Heading cases render, mapping cases do not.
 *
 * Rendering needs an id with no rich blocks behind it — the real ones reach for
 * the jump context — so these use `hd`, which `EXTRAS` has never heard of. That
 * is also the honest test of the join: an unknown id contributes text and
 * nothing else.
 */
const withHeading = (heading: string): ShowcaseContent => ({
  ...DEFAULT_CONTENT,
  sections: [{ ...DEFAULT_CONTENT.sections[0], id: 'hd', kicker: '', body: '', heading }],
});

const renderHeading = (heading: string) => {
  const [section] = buildSections(withHeading(heading));
  render(<div data-testid="panel">{section.content}</div>);
  return screen.getByTestId('panel');
};

describe('buildSections', () => {
  it('maps the saved copy onto the shape the slice consumes', () => {
    const [first] = buildSections(DEFAULT_CONTENT);
    const source = DEFAULT_CONTENT.sections[0];

    expect(first.id).toBe(source.id);
    expect(first.name).toBe(source.name);
    expect(first.progress).toBe(source.progress);
    // The wire carries two numbers; the slice wants the tuple its rig indexes.
    expect(first.fade).toEqual([source.fadeIn, source.fadeOut]);
    expect(first.align).toBe(source.align);
  });

  it('keeps every panel, in order', () => {
    expect(buildSections(DEFAULT_CONTENT).map((s) => s.id)).toEqual(
      DEFAULT_CONTENT.sections.map((s) => s.id),
    );
  });

  it('survives a showcase with no copy at all', () => {
    expect(buildSections({ ...DEFAULT_CONTENT, sections: [] })).toEqual([]);
  });

  it('splits a heading at `|` without losing a character', () => {
    const panel = renderHeading('HIT|MAN');
    expect(panel.textContent).toBe('HITMAN');
    // The outline is a span, not a second heading — one <h1> per page.
    expect(panel.querySelectorAll('h1')).toHaveLength(1);
    expect(panel.querySelector('span')?.textContent).toBe('MAN');
  });

  it('leaves a heading with no `|` as one run of text', () => {
    const panel = renderHeading('NO SPLIT HERE');
    expect(panel.textContent).toBe('NO SPLIT HERE');
    expect(panel.querySelector('span')).toBeNull();
  });

  it('keeps a newline in the heading — the titles render it with pre-line', () => {
    const panel = renderHeading('two\nlines');
    expect(panel.textContent).toBe('two\nlines');
    expect(panel.querySelector('h1')?.className).toContain('whitespace-pre-line');
  });

  it('renders nothing for a panel with no text and no blocks', () => {
    expect(renderHeading('').textContent).toBe('');
  });

  /**
   * The join is by id and nothing enforces it at runtime — renaming a section in
   * /studio drops its blocks, which is the documented outcome. This only catches
   * the version nobody would want: blocks written in the repo for an id that no
   * longer exists in the repo's own copy, silently rendering nowhere.
   */
  it('has no rich block orphaned from every preset that ships with it', () => {
    const ids = new Set(
      CONTENT_PRESETS.flatMap((preset) => preset.content.sections.map((s) => s.id)),
    );
    expect(Object.keys(EXTRAS).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('keeps the characters on separate ids, so neither inherits the other blocks', () => {
    const [first, ...rest] = CONTENT_PRESETS.map(
      (preset) => new Set(preset.content.sections.map((s) => s.id)),
    );
    for (const other of rest) {
      expect([...other].filter((id) => first.has(id))).toEqual([]);
    }
  });

  it('makes only the first panel an <h1>', () => {
    // Re-ided away from the real blocks again: `JumpButton` needs the jump
    // context, which only <Scroll3DShowcase> provides.
    const sections = buildSections({
      ...DEFAULT_CONTENT,
      sections: DEFAULT_CONTENT.sections.map((s, i) => ({ ...s, id: `x${i}` })),
    });
    render(<div data-testid="all">{sections.map((s, i) => <div key={i}>{s.content}</div>)}</div>);

    const all = screen.getByTestId('all');
    expect(all.querySelectorAll('h1')).toHaveLength(1);
    expect(all.querySelectorAll('h2')).toHaveLength(DEFAULT_CONTENT.sections.length - 1);
  });
});
