'use client';

import { useEffect, useRef } from 'react';
import { sampleKeyframes } from '../lib/camera-rig';
import { degToRad } from '../lib/math';
import type { CameraKeyframe } from '../types';
import { LABEL, SURFACE } from './studio-ui';

export interface PathMapProps {
  keyframes: readonly CameraKeyframe[];
  selected: number;
  getProgress: () => number;
  /** The caller seeks to that keyframe's `p`; this never selects on its own. */
  onSelect: (index: number) => void;
}

/** Centre and outer ring of the 132-unit viewBox. */
const C = 66;
const RING = 52;

/**
 * Top-down projection of `applyCameraFrame`: +X runs right, +Z runs down the
 * map, so the dot sits where the camera would be on a floor plan.
 */
const project = (scale: number, radius: number, azimuth: number) => {
  const az = degToRad(azimuth);
  return { x: C + scale * radius * Math.sin(az), y: C + scale * radius * Math.cos(az) };
};

const at = (point: { x: number; y: number }) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`;

/**
 * Radar of the camera path seen from above, with the model at the centre. Answers
 * the "where am I on the orbit" question that a list of numbers cannot.
 *
 * The needle is repainted by its own rAF through `setAttribute` — same reason as
 * the transport's readout. It reads the interpolated frame from `sampleKeyframes`
 * rather than the engine, so there is no plumbing to keep alive.
 */
export function PathMap({ keyframes, selected, getProgress, onSelect }: PathMapProps) {
  const needle = useRef<SVGLineElement>(null);
  const head = useRef<SVGCircleElement>(null);
  // Widest orbit fills the ring; the floor of 2 keeps a tight path from filling it.
  const scale = RING / Math.max(2, ...keyframes.map((frame) => frame.radius));
  const dots = keyframes.map((frame) => project(scale, frame.radius, frame.azimuth));

  const live = useRef({ keyframes, getProgress, scale });
  useEffect(() => {
    live.current = { keyframes, getProgress, scale };
  });

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const state = live.current;
      if (!state.keyframes.length) return;
      const frame = sampleKeyframes(state.keyframes, state.getProgress());
      const point = project(state.scale, frame.radius, frame.azimuth);
      needle.current?.setAttribute('x2', point.x.toFixed(1));
      needle.current?.setAttribute('y2', point.y.toFixed(1));
      head.current?.setAttribute('cx', point.x.toFixed(1));
      head.current?.setAttribute('cy', point.y.toFixed(1));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    // w-52 matches the rail above it, and only the right and top edges are drawn,
    // so the two read as one continuous left column rather than a floating box.
    <div className={`fixed bottom-16 left-0 z-10 h-33 w-52 border-r border-t ${SURFACE}`}>
      <svg viewBox="0 0 132 132" className="size-full">
        <circle cx={C} cy={C} r={RING} fill="none" stroke="var(--showcase-line)" />
        <circle cx={C} cy={C} r={RING / 2} fill="none" stroke="var(--showcase-line)" strokeOpacity={0.4} />
        <polyline
          points={dots.map(at).join(' ')}
          fill="none"
          stroke="var(--showcase-line)"
          strokeDasharray="2 3"
        />
        <circle cx={C} cy={C} r={1.5} fill="var(--showcase-muted)" />
        <line ref={needle} x1={C} y1={C} x2={C} y2={C} stroke="var(--showcase-primary)" strokeOpacity={0.7} />
        <circle ref={head} cx={C} cy={C} r={2} fill="var(--showcase-primary)" />

        {dots.map((dot, index) => (
          <g
            key={`${index}-${keyframes[index].label}`}
            role="button"
            tabIndex={0}
            aria-label={`KEY ${index + 1} ${keyframes[index].label}`}
            // Not FOCUS: its ring is a box-shadow, which browsers do not paint on
            // SVG children. The hit pad's stroke is the focus indicator instead.
            className="group cursor-pointer outline-none"
            onClick={() => onSelect(index)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              onSelect(index);
            }}
          >
            {/* Invisible pad: a 3-unit dot is a 6px target at this size. */}
            <circle
              cx={dot.x}
              cy={dot.y}
              r={8}
              fill="transparent"
              className="stroke-transparent group-focus-visible:stroke-showcase-warn"
            />
            <circle
              cx={dot.x}
              cy={dot.y}
              r={index === selected ? 4.5 : 3}
              fill={index === selected ? 'var(--showcase-primary)' : 'var(--showcase-bg)'}
              stroke="var(--showcase-primary)"
              style={
                index === selected
                  ? { filter: 'drop-shadow(0 0 4px var(--showcase-primary))' }
                  : undefined
              }
            />
          </g>
        ))}
      </svg>
      <span className={`pointer-events-none absolute left-1 top-1 ${LABEL}`}>PATH</span>
    </div>
  );
}
