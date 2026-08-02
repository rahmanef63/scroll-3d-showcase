'use client';

import { useEffect, useRef } from 'react';

export interface StudioKeyActions {
  /** 0-based; the caller clamps to the list length. */
  selectIndex: (index: number) => void;
  prev: () => void;
  next: () => void;
  togglePlay: () => void;
  focusSelected: () => void;
  save: () => void;
  undo: () => void;
  redo: () => void;
  togglePreview: () => void;
  closeSheet: () => void;
}

/** Focus is inside a form control, so the key belongs to it, not to the studio. */
const typing = (): boolean => {
  const target = document.activeElement as HTMLElement | null;
  return (
    !!target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable)
  );
};

/**
 * The studio's whole keyboard map, lifted from framepilot's `EditorState`
 * shortcut block. One `window` listener: every other component stays passive so
 * there is exactly one place to look when a key does the wrong thing.
 *
 * Only Space and the arrows are prevented — everything else leaves the browser's
 * own shortcuts alone.
 */
export function useStudioKeys(actions: StudioKeyActions): void {
  // Registered once; reads whatever the last commit left here.
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (typing()) return;
      const act = latest.current;
      const key = event.key.toLowerCase();

      // W/A/S/D/Q/E belong to the fly loop, which reads held keys on its own rAF.
      if (event.ctrlKey || event.metaKey) {
        if (key !== 's') return;
        event.preventDefault();
        return act.save();
      }

      if (key >= '1' && key <= '9') {
        act.selectIndex(Number(key) - 1);
        return;
      }

      switch (key) {
        case 'arrowleft':
          event.preventDefault();
          return act.prev();
        case 'arrowright':
          event.preventDefault();
          return act.next();
        case ' ':
          event.preventDefault();
          return act.togglePlay();
        case 'f':
          return act.focusSelected();
        case 'z':
          return event.shiftKey ? act.redo() : act.undo();
        case 'y':
          return act.redo();
        case 'p':
          return act.togglePreview();
        case 'escape':
          return act.closeSheet();
        default:
          return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
