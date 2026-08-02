'use client';

import { useId, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The studio's whole class vocabulary. Every chrome file imports from here and
 * never declares a variant of its own, so four builders cannot drift apart.
 */
export const LABEL = 'font-mono text-[9px] uppercase tracking-[0.16em] text-showcase-muted';
/**
 * The spin buttons are stripped because they are never used here — the range
 * beside every box is the coarse control — and Chromium reserves their width
 * even while they are hidden, which clipped the last digit of "-0.24" / "0.075".
 */
export const INPUT =
  'border border-showcase-line bg-showcase-bg/70 px-1.5 py-0.5 font-mono text-[10px] text-showcase-fg outline-none focus:border-showcase-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
/** Any number that moves at runtime. `tabular-nums` stops the digits jittering. */
export const VALUE = 'font-mono text-[10px] tabular-nums text-showcase-primary';
/** Overlay slab. The caller adds the border side it needs (`border-l`, `border-t`…). */
export const SURFACE = 'border-showcase-line bg-showcase-bg/88 backdrop-blur-sm';
export const BAR = 'flex items-center gap-2 px-2 font-mono text-[9px] uppercase tracking-[0.18em]';
export const ROW = 'flex items-center justify-between gap-2';
/** For bare interactive elements — `Chip` already carries its own ring. */
export const FOCUS = 'outline-none focus-visible:ring-1 focus-visible:ring-showcase-primary';
/** 44px tap target below `lg`, zero cost on desktop. */
export const TAP = 'min-h-11 lg:min-h-0';

/** Small squared-off action, matching the HUD's rail buttons. */
export function Chip({
  children,
  onClick,
  active,
  disabled,
  title,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  /** Merged last, so callers add `TAP`/`flex-1` without forking the component. */
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'h-6 shrink-0 rounded-none border px-2',
        LABEL,
        'hover:bg-showcase-line/40 hover:text-showcase-primary',
        active ? 'border-showcase-primary text-showcase-primary' : 'border-showcase-line',
        className,
      )}
    >
      {children}
    </Button>
  );
}

export function Group({
  title,
  right,
  children,
}: {
  title: string;
  /** Trailing control on the heading row — the rail's `+`, the SCENE tab's `APPLY`. */
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border border-showcase-line/70 p-2">
      <header className={cn('mb-1.5', ROW)}>
        <h2 className={cn(LABEL, 'text-showcase-primary')}>{title}</h2>
        {right}
      </header>
      {children}
    </section>
  );
}

export function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={cn(ROW, LABEL)}>
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn('w-32', INPUT)}
      />
    </label>
  );
}

/**
 * Label above, full-width control below — for prose, which at 256px has no room
 * left beside its own label. `rows > 1` makes it a textarea; same component
 * either way, because the only difference is the tag.
 */
export function StackField({
  label,
  value,
  hint,
  rows = 1,
  onChange,
}: {
  label: string;
  value: string;
  /** Syntax the field understands, shown under the label rather than in a tooltip. */
  hint?: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const props = {
    id,
    value,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    className: cn('w-full', INPUT),
  };
  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor={id} className={LABEL}>
        {label}
        {hint ? <span className="ml-1 normal-case opacity-60">{hint}</span> : null}
      </label>
      {rows > 1 ? <textarea rows={rows} {...props} /> : <input {...props} />}
    </div>
  );
}
