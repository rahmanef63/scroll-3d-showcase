'use client';

import { cn } from '@/lib/utils';
import type { CameraKeyframe } from '../types';
import { Chip, FOCUS, LABEL, SURFACE } from './studio-ui';

export interface StudioRailProps {
  keyframes: readonly CameraKeyframe[];
  selected: number;
  mobile: boolean;
  /** Row click. HOST scrolls the page AND re-selects — never call draft.select here. */
  onSeek: (p: number) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

const ADD_HINT = 'Capture the camera at the current scroll position';
const number = (index: number) => String(index + 1).padStart(2, '0');

/**
 * The keyframe list, promoted out of the panel into its own column: it is the
 * one thing you navigate with, so it must never scroll away under the fields.
 */
export function StudioRail({
  keyframes,
  selected,
  mobile,
  onSeek,
  onAdd,
  onDuplicate,
  onRemove,
}: StudioRailProps) {
  const edit = (size: string) => (
    <>
      <Chip onClick={onDuplicate} title="Duplicate the selected key" className={size}>
        DUP
      </Chip>
      <Chip
        onClick={onRemove}
        disabled={keyframes.length < 2}
        title="Delete the selected key"
        className={cn(size, 'hover:text-showcase-accent')}
      >
        DEL
      </Chip>
    </>
  );

  if (mobile) {
    return (
      <nav
        aria-label="Keyframes"
        className={cn(
          'fixed inset-x-0 top-9 z-20 flex h-9 items-center gap-1 overflow-x-auto overflow-y-hidden border-b px-2',
          SURFACE,
        )}
      >
        {keyframes.map((keyframe, index) => (
          <Chip
            key={index}
            active={index === selected}
            onClick={() => onSeek(keyframe.p)}
            title={keyframe.label}
            className="h-7"
          >
            {/* The strip is the only place a phone can see which stop it is on —
                the desktop readout and the SHOT tab are both absent or closed. */}
            {index === selected ? `${number(index)} · ${keyframe.label}` : number(index)}
          </Chip>
        ))}
        <span className="h-5 w-px shrink-0 bg-showcase-line" />
        <Chip onClick={onAdd} title={ADD_HINT} className="h-7">
          +
        </Chip>
        {edit('h-7')}
      </nav>
    );
  }

  return (
    // w-52, not w-44: any narrower and the column ends mid-way through the
    // showcase HUD's own status line, leaving a sliced "…INE" beside it.
    <aside
      aria-label="Keyframes"
      className={cn('fixed bottom-50 left-0 top-9 z-20 flex w-52 flex-col border-r', SURFACE)}
    >
      {/* DUP/DEL live here, not on the selected row: in the row they cost the
          label two thirds of its width, and they act on the selection either way. */}
      <div
        className={cn(
          'flex h-7 shrink-0 items-center justify-between gap-1 border-b border-showcase-line/60 px-2',
          LABEL,
        )}
      >
        <span className="text-showcase-primary">KEYS {keyframes.length}</span>
        <span className="flex gap-0.5">
          <Chip onClick={onAdd} title={ADD_HINT} className="h-5 px-1.5">
            +
          </Chip>
          {edit('h-5 px-1')}
        </span>
      </div>

      <ol className="min-h-0 flex-1 overflow-y-auto">
        {keyframes.map((keyframe, index) => {
          const active = index === selected;
          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => onSeek(keyframe.p)}
                className={cn(
                  'flex w-full min-w-0 items-center gap-2 px-2 py-1 text-left font-mono text-[10px] tracking-[0.1em]',
                  FOCUS,
                  active
                    ? 'bg-showcase-line/40 text-showcase-primary'
                    : 'text-showcase-muted hover:text-showcase-fg',
                )}
              >
                <span className="w-5 shrink-0 opacity-60">{number(index)}</span>
                <span className="w-10 shrink-0 tabular-nums">{keyframe.p.toFixed(3)}</span>
                <span className="truncate">{keyframe.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
