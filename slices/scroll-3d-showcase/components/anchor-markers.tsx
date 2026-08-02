'use client';

import type { RefObject } from 'react';
import type { AnchorMarker } from '../types';

export interface AnchorMarkersProps {
  markers: readonly AnchorMarker[];
  markerRefs: RefObject<(HTMLElement | null)[]>;
}

/**
 * HUD tags pinned to points on the model. Positions and visibility are written
 * by the render loop; this component only declares the markup.
 */
export function AnchorMarkers({ markers, markerRefs }: AnchorMarkersProps) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {markers.map((marker, index) => (
        <div
          key={marker.name}
          ref={(node) => {
            if (markerRefs.current) markerRefs.current[index] = node;
          }}
          className="group absolute left-0 top-0 flex items-center gap-2 font-mono text-[9px] tracking-[0.16em] text-showcase-primary opacity-0 will-change-transform [&.is-hot]:text-showcase-warn"
        >
          <span className="block size-[7px] rotate-45 border border-showcase-primary shadow-[0_0_10px_var(--showcase-primary)] group-[.is-hot]:border-showcase-warn" />
          <span className="block h-px w-[26px] bg-linear-to-r from-showcase-primary to-transparent group-[.is-hot]:from-showcase-warn" />
          {marker.name}
        </div>
      ))}
    </div>
  );
}
