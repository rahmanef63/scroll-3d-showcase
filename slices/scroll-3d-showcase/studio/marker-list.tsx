'use client';

import { cn } from '@/lib/utils';
import type { AnchorMarker } from '../types';
import { Chip, Group, INPUT, TAP, VALUE } from './studio-ui';

export interface MarkerListProps {
  markers: readonly AnchorMarker[];
  /** Look-at point of the selected keyframe — where a new marker lands. */
  lookAt: readonly [number, number, number];
  onAdd: (name: string, position: readonly [number, number, number]) => void;
  onRename: (index: number, name: string) => void;
  onRemove: (index: number) => void;
}

/** MARKERS tab. Rows are two lines: at 280px a name and an xyz triple never share one. */
export function MarkerList({ markers, lookAt, onAdd, onRename, onRemove }: MarkerListProps) {
  return (
    <Group title={`MARKERS ${markers.length}`}>
      <Chip
        onClick={() => onAdd('MARKER', lookAt)}
        title="Pin a tag at the current look-at point"
        className={TAP}
      >
        + AT LOOK-AT
      </Chip>

      <ul className="mt-1.5 flex flex-col gap-1.5">
        {markers.map((marker, index) => (
          <li key={index} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <input
                value={marker.name}
                aria-label={`Marker ${index + 1} name`}
                onChange={(event) => onRename(index, event.target.value)}
                className={cn('w-full uppercase tracking-[0.1em]', INPUT)}
              />
              <Chip onClick={() => onRemove(index)} title="Delete marker" className={TAP}>
                ×
              </Chip>
            </div>
            {/* Display-only: markers are placed from the look-at point, not typed. */}
            <span className={cn(VALUE, 'text-[9px] text-showcase-muted')}>
              {marker.position.map((value) => value.toFixed(2)).join(' ')}
            </span>
          </li>
        ))}
      </ul>
    </Group>
  );
}
