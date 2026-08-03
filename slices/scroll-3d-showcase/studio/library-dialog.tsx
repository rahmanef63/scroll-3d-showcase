'use client';

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SURFACE } from './studio-ui';

export interface LibraryDialogProps {
  /** Id of the heading inside, so the dialog announces what it is. */
  labelledBy: string;
  onClose: () => void;
  /** ⌘/Ctrl+S from anywhere inside. The studio's global one cannot reach here. */
  onSave: () => void;
  children: ReactNode;
}

/**
 * The modal shell, and nothing else.
 *
 * A native `<dialog>` because it lands in the browser's top layer, above every z
 * rung this editor uses — including the boot overlay at z-50, which would
 * otherwise paint over a hand-rolled panel during a model swap. It also brings
 * the focus trap and the inert background, neither of which exists anywhere else
 * in this codebase.
 *
 * One element for both breakpoints, switched in CSS rather than on
 * `layout.mobile`: that flag's server snapshot is always `false`, so a JS branch
 * would paint the centred modal on a phone and snap to a drawer on hydration.
 */
export function LibraryDialog({ labelledBy, onClose, onSave, children }: LibraryDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // Where the pointer went down. A `click` is dispatched at the nearest common
  // ancestor of press and release, and the backdrop's own pointer events target
  // the <dialog>, so selecting the last line of the textarea and letting go a few
  // pixels outside the panel arrives here indistinguishable from a backdrop
  // click — and takes every unsaved edit with it.
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // jsdom ships <dialog> with `open` and nothing else, so an unguarded
    // showModal() would throw on mount in every test that renders the studio.
    // The attribute path degrades to a plain panel, which is why the z-50 below
    // is not dead weight.
    if (typeof el.showModal === 'function') el.showModal();
    else el.setAttribute('open', '');
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    // A modal dialog makes the page inert for focus and pointers but not for the
    // studio's own `window` keydown listeners: without this, P toggles preview
    // behind the modal, Z undoes and WASD flies the camera. Not preventDefault,
    // so Escape still closes the dialog — it just stops also closing the mobile
    // inspector on the way past.
    event.stopPropagation();
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      onSave();
    }
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onKeyDown={onKeyDown}
      // Escape fires `cancel` first and closes the dialog on its own afterwards.
      // Refused, so the decision stays with the caller: it may have unsaved text
      // to ask about, and a dialog that has already left the top layer cannot ask
      // anything. It closes for real when `onClose` unmounts this element.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      // Clicking the backdrop targets the dialog itself; anything inside it is a
      // descendant and must not close. Straight to `onClose` rather than
      // `el.close()` because the caller unmounts this whole element in response,
      // which takes the dialog's own open state with it.
      onClick={(event) => {
        if (event.target === event.currentTarget && pressedBackdrop.current) onClose();
      }}
      className={cn(
        'fixed inset-x-0 bottom-0 top-auto z-50 m-0 h-[80dvh] max-h-none w-full max-w-none border-t p-0',
        'text-showcase-fg backdrop:bg-black/70',
        'lg:inset-0 lg:m-auto lg:h-[min(80dvh,44rem)] lg:w-[min(72rem,92vw)] lg:border',
        SURFACE,
      )}
    >
      {children}
    </dialog>
  );
}
