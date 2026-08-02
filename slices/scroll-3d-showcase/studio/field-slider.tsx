'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/utils';
import { INPUT, LABEL, ROW, VALUE } from './studio-ui';

export interface FieldSliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  /** Right-aligned live readout. Default `String(value)`. */
  format?: (value: number) => string;
  /** Every input tick from the range, and the number box on change. */
  onInput: (value: number) => void;
}

/**
 * Ported from framepilot's Slider. The range is uncontrolled and repaints its
 * own `<output>`, so a drag retunes the live scene at pointer rate without
 * re-rendering the tree that owns the running canvas.
 */
export function FieldSlider({
  label,
  min,
  max,
  step = 1,
  value,
  format = (input: number) => String(input),
  onInput,
}: FieldSliderProps) {
  const id = useId();
  const rangeRef = useRef<HTMLInputElement>(null);
  const outRef = useRef<HTMLOutputElement>(null);

  const paint = useCallback(
    (next: number) => {
      if (outRef.current) outRef.current.textContent = format(next);
    },
    [format],
  );

  // Reflect outside edits (presets, undo, orbit drag) into the DOM, but never
  // while the range has focus — that would fight the drag mid-gesture.
  useEffect(() => {
    const el = rangeRef.current;
    if (el && document.activeElement !== el) el.value = String(value);
    paint(value);
  }, [value, paint]);

  return (
    <div className="flex flex-col gap-0.5">
      <div className={ROW}>
        <label htmlFor={id} className={LABEL}>
          {label}
        </label>
        <output htmlFor={id} ref={outRef} className={VALUE}>
          {format(value)}
        </output>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          ref={rangeRef}
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          defaultValue={value}
          onInput={(event) => {
            const next = Number(event.currentTarget.value);
            paint(next);
            onInput(next);
          }}
          className="h-4 flex-1 accent-showcase-primary"
        />
        {/* Controlled, so an unparseable intermediate ("-", "") snaps back
            rather than writing NaN into the scene. */}
        <input
          type="number"
          aria-label={`${label} value`}
          step={step}
          value={Math.round(value * 1000) / 1000}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onInput(next);
          }}
          className={cn('w-16 text-right', INPUT)}
        />
      </div>
    </div>
  );
}
