'use client';

import { useEffect, useRef } from 'react';
import { sampleKeyframes } from '../lib/camera-rig';
import { clamp } from '../lib/math';
import type { CameraKeyframe } from '../types';
import { focalLength } from './presets';
import { BAR, FOCUS, INPUT, LABEL, SURFACE, TAP, VALUE } from './studio-ui';
import { CONTROL_ATTRIBUTE, type StudioPlayback } from './use-studio-playback';

export interface StudioTransportProps {
  keyframes: readonly CameraKeyframe[];
  selected: number;
  playback: StudioPlayback;
  mobile: boolean;
  getProgress: () => number;
  /** Scrubber, prev and next all route through here: the caller owns selection. */
  onSeek: (p: number) => void;
}

/** Readout captions. Values are written imperatively, never through React. */
const CELLS = ['P', 'AZ', 'EL', 'R', 'FOV', 'LENS', 'SHOT'] as const;

const BUTTON = `h-7 shrink-0 border border-showcase-line px-2 ${LABEL} ${TAP} ${FOCUS} hover:border-showcase-primary hover:text-showcase-primary disabled:opacity-40`;
const ON = 'border-showcase-primary text-showcase-primary';

/** Tells the playback head-guard this control tunes the take, not the playhead. */
const CONTROL = { [CONTROL_ATTRIBUTE]: '' };

/**
 * Bottom transport: keyframe stepping, playback, the scroll scrubber and a live
 * readout of the interpolated camera.
 *
 * The scrubber is uncontrolled and the readout is plain DOM text, both painted
 * by one rAF from `getProgress()`. Holding the playhead in React state would
 * re-render the whole studio 60 times a second *and* desync from the scroll the
 * engine actually reads.
 */
export function StudioTransport({
  keyframes,
  selected,
  playback,
  mobile,
  getProgress,
  onSeek,
}: StudioTransportProps) {
  const range = useRef<HTMLInputElement>(null);
  const cells = useRef<(HTMLElement | null)[]>([]);

  // The loop below is registered once, so it must not close over either.
  const live = useRef({ keyframes, getProgress });
  useEffect(() => {
    live.current = { keyframes, getProgress };
  });

  useEffect(() => {
    let raf = 0;
    const write = (node: HTMLElement | null, text: string) => {
      if (node && node.textContent !== text) node.textContent = text;
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const { keyframes: list, getProgress: read } = live.current;
      if (!list.length) return;
      const p = read();
      const input = range.current;
      // Never fight the user's own drag.
      if (input && document.activeElement !== input) input.value = String(p);
      const frame = sampleKeyframes(list, p);
      [
        p.toFixed(3),
        `${Math.round(frame.azimuth)}°`,
        `${Math.round(frame.elevation)}°`,
        frame.radius.toFixed(2),
        `${Math.round(frame.fov)}°`,
        `${Math.round(focalLength(frame.fov))}MM`,
        frame.label,
      ].forEach((value, index) => write(cells.current[index], value));
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const step = (direction: number) => {
    const next = keyframes[clamp(selected + direction, 0, keyframes.length - 1)];
    if (next) onSeek(next.p);
  };

  return (
    <div
      className={`border-t ${SURFACE} ${BAR} ${
        mobile ? 'h-12 shrink-0' : 'fixed inset-x-0 bottom-0 z-20 h-14'
      }`}
    >
      <button type="button" title="PREVIOUS KEY" className={BUTTON} onClick={() => step(-1)}>
        |◀
      </button>
      <button
        {...CONTROL}
        type="button"
        title={playback.available ? 'PLAY / PAUSE' : 'DISABLED BY REDUCED MOTION'}
        aria-pressed={playback.playing}
        disabled={!playback.available}
        className={`${BUTTON} ${playback.playing ? ON : ''}`}
        onClick={playback.toggle}
      >
        {playback.playing ? '■' : '▶'}
      </button>
      <button type="button" title="NEXT KEY" className={BUTTON} onClick={() => step(1)}>
        ▶|
      </button>

      {!mobile && (
        <>
          <button
            {...CONTROL}
            type="button"
            title="LOOP THE SWEEP"
            aria-pressed={playback.loop}
            className={`${BUTTON} ${playback.loop ? ON : ''}`}
            onClick={() => playback.setLoop(!playback.loop)}
          >
            LOOP
          </button>
          <label {...CONTROL} className={`flex shrink-0 items-center gap-1 ${LABEL}`}>
            <input
              type="number"
              min={2}
              max={60}
              value={playback.duration}
              onChange={(event) => playback.setDuration(Number(event.target.value))}
              className={`w-12 text-right ${INPUT}`}
            />
            S
          </label>
        </>
      )}

      <input
        ref={range}
        type="range"
        min={0}
        max={1}
        step={0.001}
        defaultValue={0}
        aria-label="SCROLL POSITION"
        onInput={(event) => onSeek(Number((event.target as HTMLInputElement).value))}
        className={`min-w-0 flex-1 accent-showcase-primary ${TAP}`}
      />

      <div className="flex shrink-0 items-center gap-2">
        {CELLS.map((name, index) =>
          mobile && index > 0 ? null : (
            <span key={name} className="flex items-center gap-1">
              <span className={LABEL}>{name}</span>
              <b
                ref={(node) => {
                  cells.current[index] = node;
                }}
                className={VALUE}
              >
                —
              </b>
            </span>
          ),
        )}
      </div>
    </div>
  );
}
