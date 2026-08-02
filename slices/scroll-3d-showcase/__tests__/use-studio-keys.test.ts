import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStudioKeys, type StudioKeyActions } from '../studio/use-studio-keys';

const spies = (): StudioKeyActions => ({
  selectIndex: vi.fn(),
  prev: vi.fn(),
  next: vi.fn(),
  togglePlay: vi.fn(),
  focusSelected: vi.fn(),
  save: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  togglePreview: vi.fn(),
  closeSheet: vi.fn(),
});

const press = (key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  window.dispatchEvent(event);
  return event;
};

/** Focus something the browser would consider "the user is typing into it". */
const focus = (element: HTMLElement) => {
  document.body.append(element);
  element.focus();
  return element;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useStudioKeys map', () => {
  it('binds every documented shortcut', () => {
    const actions = spies();
    renderHook(() => useStudioKeys(actions));

    press('3');
    expect(actions.selectIndex).toHaveBeenCalledWith(2);

    press('ArrowLeft');
    press('ArrowRight');
    press(' ');
    press('f');
    press('s', { metaKey: true });
    press('p');
    press('Escape');

    expect(actions.prev).toHaveBeenCalledTimes(1);
    expect(actions.next).toHaveBeenCalledTimes(1);
    expect(actions.togglePlay).toHaveBeenCalledTimes(1);
    expect(actions.focusSelected).toHaveBeenCalledTimes(1);
    expect(actions.save).toHaveBeenCalledTimes(1);
    expect(actions.togglePreview).toHaveBeenCalledTimes(1);
    expect(actions.closeSheet).toHaveBeenCalledTimes(1);
  });

  it('leaves the fly keys alone — a held W belongs to the camera loop', () => {
    const actions = spies();
    renderHook(() => useStudioKeys(actions));

    for (const key of ['w', 'a', 's', 'd', 'q', 'e']) press(key);

    // Bare S used to save. It steers now, and SAVE moved to the shortcut every
    // other editor already uses.
    expect(actions.save).not.toHaveBeenCalled();
  });

  it('saves on the modifier, and ignores every other modified key', () => {
    const actions = spies();
    renderHook(() => useStudioKeys(actions));

    expect(press('s', { ctrlKey: true }).defaultPrevented).toBe(true);
    press('z', { ctrlKey: true });
    press('f', { metaKey: true });

    expect(actions.save).toHaveBeenCalledTimes(1);
    // Ctrl+Z is the browser's, and F-with-a-modifier is somebody else's.
    expect(actions.undo).not.toHaveBeenCalled();
    expect(actions.focusSelected).not.toHaveBeenCalled();
  });

  it('splits undo from redo on the same key', () => {
    const actions = spies();
    renderHook(() => useStudioKeys(actions));

    press('z');
    press('Z', { shiftKey: true });
    press('y');

    expect(actions.undo).toHaveBeenCalledTimes(1);
    expect(actions.redo).toHaveBeenCalledTimes(2);
  });

  it('prevents the browser default only where the studio owns the key', () => {
    renderHook(() => useStudioKeys(spies()));

    expect(press(' ').defaultPrevented).toBe(true);
    expect(press('ArrowLeft').defaultPrevented).toBe(true);
    expect(press('ArrowRight').defaultPrevented).toBe(true);
    // Save has a browser meaning worth leaving alone, and 1–9 has none to take.
    expect(press('s').defaultPrevented).toBe(false);
    expect(press('1').defaultPrevented).toBe(false);
  });
});

describe('useStudioKeys typing guard', () => {
  it('leaves every key to the field while a form control has focus', () => {
    const actions = spies();
    renderHook(() => useStudioKeys(actions));

    for (const element of [
      document.createElement('input'),
      document.createElement('textarea'),
      document.createElement('select'),
    ]) {
      focus(element);
      press('s');
      press(' ');
      press('1');
    }

    // Typing "s" into a label field must not fire a save.
    expect(actions.save).not.toHaveBeenCalled();
    expect(actions.togglePlay).not.toHaveBeenCalled();
    expect(actions.selectIndex).not.toHaveBeenCalled();
  });

  it('covers contenteditable, which is not a form control', () => {
    const actions = spies();
    renderHook(() => useStudioKeys(actions));

    const editable = document.createElement('div');
    editable.tabIndex = 0;
    // jsdom does not implement contenteditable, so the flag the guard reads is
    // defined here directly — the assertion is about our guard, not about jsdom.
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    focus(editable);

    press('s');
    expect(actions.save).not.toHaveBeenCalled();
  });

  it('resumes as soon as focus leaves the field', () => {
    const actions = spies();
    renderHook(() => useStudioKeys(actions));

    const field = focus(document.createElement('input'));
    press('s');
    field.blur();
    press('s', { metaKey: true });

    expect(actions.save).toHaveBeenCalledTimes(1);
  });
});
