import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudioLibrary } from '../studio/studio-library';
import type { StudioLibraryProps } from '../studio/studio-library';
import type { ShowcaseModel, ShowcasePreset, ShowcaseStudioAdapter } from '../studio/types';
import type { StudioDraft } from '../studio/use-studio-draft';

/**
 * jsdom implements <dialog> with `open` and nothing else — no showModal, no
 * close, no top layer. So the modal behaviour itself (Esc, backdrop, focus trap)
 * is verified by hand in a browser; what is asserted here is everything that
 * still works in the degraded path, above all the keyboard containment.
 */
const MODELS: ShowcaseModel[] = [
  { id: 'hitman', name: 'hitman', url: '/hitman.glb', bytes: 2097152 },
  { id: 'portrait', name: 'portrait', url: '', bytes: 1048576, uploaded: true },
  { id: 'ghost', name: 'ghost', url: '', bytes: 0, missing: true },
];

const draft = {
  keyframes: [
    { p: 0, azimuth: 0, elevation: 0, radius: 3, targetX: 0, targetY: 0, targetZ: 0,
      screenShiftX: 0, fov: 36, label: 'KEY' },
  ],
  markers: [],
  settings: {},
  content: { title: 'RAHMAN', brand: 'RR', description: '', sections: [] },
  dirty: false,
  restore: vi.fn(),
  markSaved: vi.fn(),
} as unknown as StudioDraft;

const SAVED: ShowcasePreset = {
  keyframes: [
    { p: 0, azimuth: 1, elevation: 0, radius: 4, targetX: 0, targetY: 0, targetZ: 0,
      screenShiftX: 0, fov: 36, label: 'SAVED' },
  ],
  markers: [],
};

const mount = (adapter: ShowcaseStudioAdapter, over: Partial<StudioLibraryProps> = {}) =>
  render(
    <StudioLibrary
      onClose={vi.fn()}
      models={MODELS}
      modelId="hitman"
      liveId="hitman"
      draft={draft}
      adapter={adapter}
      onSelectModel={vi.fn()}
      {...over}
    />,
  );

const adapterOf = (over: Partial<ShowcaseStudioAdapter> = {}): ShowcaseStudioAdapter => ({
  async syncModels() {
    return { added: 0, total: MODELS.length };
  },
  async savePreset() {},
  ...over,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('StudioLibrary', () => {
  it('names itself, so a screen reader announces what opened', () => {
    mount(adapterOf());
    expect(screen.getByRole('dialog')).toHaveAccessibleName('LIBRARY');
  });

  it('swallows the studio shortcuts instead of letting them drive the scene', () => {
    // A modal dialog makes the page inert for focus and pointers, but not for a
    // `window` keydown listener — which is what the studio's whole keyboard map
    // is. Without stopPropagation, P toggles preview behind the open dialog.
    const heard: string[] = [];
    const listener = (event: KeyboardEvent) => heard.push(event.key);
    window.addEventListener('keydown', listener);
    try {
      mount(adapterOf());
      fireEvent.keyDown(screen.getByRole('button', { name: 'CLOSE' }), { key: 'p' });
      fireEvent.keyDown(screen.getByRole('button', { name: 'CLOSE' }), { key: 'z' });
      expect(heard).toEqual([]);
    } finally {
      window.removeEventListener('keydown', listener);
    }
  });

  it('leaves the JSON field its own keys', () => {
    const heard: string[] = [];
    const listener = (event: KeyboardEvent) => heard.push(event.key);
    window.addEventListener('keydown', listener);
    try {
      mount(adapterOf());
      fireEvent.keyDown(screen.getByLabelText(/PRESET JSON/), { key: 'f' });
      fireEvent.keyDown(screen.getByLabelText(/PRESET JSON/), { key: ' ' });
      expect(heard).toEqual([]);
    } finally {
      window.removeEventListener('keydown', listener);
    }
  });

  it('saves the selected model on ⌘S, which the global handler can no longer reach', () => {
    const savePreset = vi.fn(async () => {});
    mount(adapterOf({ savePreset }));

    fireEvent.keyDown(screen.getByLabelText(/PRESET JSON/), { key: 's', metaKey: true });

    expect(savePreset).toHaveBeenCalledWith('hitman', expect.objectContaining({ keyframes: expect.any(Array) }));
  });

  it('offers DELETE only where the backend would allow it', () => {
    mount(adapterOf({ forgetModel: async () => {} }));

    // Two rows can go: the upload and the row whose file already vanished.
    expect(screen.getAllByRole('button', { name: 'DELETE' })).toHaveLength(2);
    // The one still sitting in public/ gets the reason instead of a button that
    // would undo itself on the next SYNC.
    expect(screen.getAllByText(/DELETE THE FILE, THEN SYNC/)).toHaveLength(1);
  });

  it('asks once before deleting, because nothing else here does', () => {
    const forgetModel = vi.fn(async () => {});
    mount(adapterOf({ forgetModel }));

    fireEvent.click(screen.getAllByRole('button', { name: 'DELETE' })[0]);
    expect(forgetModel).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'SURE?' })).toBeTruthy();
  });

  it('renames through the label, never through the id', async () => {
    const renameModel = vi.fn(async () => {});
    mount(adapterOf({ renameModel }));

    const field = screen.getByLabelText('Name for hitman');
    fireEvent.change(field, { target: { value: 'Agent 47' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'SET' })[0]);

    expect(renameModel).toHaveBeenCalledWith('hitman', 'Agent 47');
  });

  it('hides what the adapter cannot do rather than rendering a dead button', () => {
    mount(adapterOf());
    expect(screen.queryByRole('button', { name: 'SET' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'DELETE' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'DELETE PRESET' })).toBeNull();
  });

  /**
   * The chrome latches which model is live, because the host's props are loaded
   * server-side and nothing in the browser re-reads them. Publishing from in here
   * has to write that same latch, or the LIVE badge, the disabled PUBLISH chip
   * and the guard that refuses to delete the live row all keep naming the model
   * the chrome published last while the site serves a different one.
   */
  it('tells the studio which row it just published', async () => {
    const onPublished = vi.fn();
    mount(adapterOf({ setLiveModel: async () => {} }), { onPublished });

    fireEvent.click(screen.getByRole('button', { name: 'PUBLISH' }));

    await waitFor(() => expect(onPublished).toHaveBeenCalledWith('portrait'));
  });

  /**
   * This component stays mounted while column one changes rows, so a boolean
   * confirm would carry the question asked about one model onto the next — and on
   * a phone, selecting a row lands you back on this pane, one tap from it.
   */
  it('forgets a delete confirm when another row is selected', async () => {
    const deletePreset = vi.fn(async () => {});
    mount(adapterOf({ deletePreset, loadPreset: async () => SAVED }));

    fireEvent.click(screen.getByRole('button', { name: /portrait/ }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'DELETE PRESET' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'DELETE PRESET' }));
    expect(screen.getByRole('button', { name: /SURE\?/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /ghost/ }));

    expect(screen.getByRole('button', { name: 'DELETE PRESET' })).toBeTruthy();
    expect(deletePreset).not.toHaveBeenCalled();
  });

  it('asks before dropping text that lives nowhere else', () => {
    const onClose = vi.fn();
    mount(adapterOf(), { onClose });

    fireEvent.change(screen.getByLabelText(/PRESET JSON/), { target: { value: '{ typed }' } });
    fireEvent.click(screen.getByRole('button', { name: 'CLOSE' }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'SURE? DROP EDITS' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on the first click when nothing was typed', () => {
    const onClose = vi.fn();
    mount(adapterOf(), { onClose });

    fireEvent.click(screen.getByRole('button', { name: 'CLOSE' }));

    expect(onClose).toHaveBeenCalled();
  });
});
