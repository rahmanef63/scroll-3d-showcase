'use client';

import type { AnchorMarker, CameraKeyframe } from '../types';
import { FieldSlider } from './field-slider';
import { ANGLE_PRESETS, KEYFRAME_RANGES, LENS_PRESETS } from './presets';
import { Chip, TextField } from './studio-ui';

export interface KeyframeFieldsProps {
  keyframe: CameraKeyframe;
  markers: readonly AnchorMarker[];
  onPatch: (values: Partial<CameraKeyframe>) => void;
}

/** Slider order top to bottom: when on the path, where the camera is, what it sees. */
const SHOT_FIELDS: readonly (readonly [keyof typeof KEYFRAME_RANGES, string])[] = [
  ['p', 'P'],
  ['azimuth', 'AZIMUTH'],
  ['elevation', 'ELEVATION'],
  ['radius', 'RADIUS'],
  ['targetX', 'TARGET X'],
  ['targetY', 'TARGET Y'],
  ['targetZ', 'TARGET Z'],
  ['screenShiftX', 'SHIFT X'],
  ['fov', 'FOV'],
];

/** SHOT tab: live editors for the selected keyframe. Every tick reaches the scene. */
export function KeyframeFields({ keyframe, markers, onPatch }: KeyframeFieldsProps) {
  return (
    <div className="flex flex-col gap-2">
      <TextField label="LABEL" value={keyframe.label} onChange={(label) => onPatch({ label })} />

      <div className="flex flex-col gap-1.5">
        {SHOT_FIELDS.map(([key, label]) => (
          <FieldSlider
            key={key}
            label={label}
            {...KEYFRAME_RANGES[key]}
            value={keyframe[key] ?? 0}
            // A computed key widens to `string`; SHOT_FIELDS is what keeps it honest.
            onInput={(value) => onPatch({ [key]: value } as Partial<CameraKeyframe>)}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        {LENS_PRESETS.map((lens) => (
          <Chip
            key={lens.label}
            active={Math.abs(keyframe.fov - lens.fov) < 0.05}
            onClick={() => onPatch({ fov: lens.fov })}
          >
            {lens.label}
          </Chip>
        ))}
      </div>

      {/* Angle and aim presets are partial edits by design — they leave every
          other field alone, so a tuned shot keeps its framing. */}
      <div className="flex flex-wrap gap-1">
        {ANGLE_PRESETS.map((angle) => (
          <Chip
            key={angle.label}
            active={Math.abs(keyframe.elevation - angle.elevation) < 0.5}
            onClick={() => onPatch({ elevation: angle.elevation })}
          >
            {angle.label}
          </Chip>
        ))}
      </div>

      {markers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {markers.map((marker) => (
            <Chip
              key={marker.name}
              title="Aim the look-at point at this marker"
              onClick={() =>
                onPatch({
                  targetX: marker.position[0],
                  targetY: marker.position[1],
                  targetZ: marker.position[2],
                })
              }
            >
              ◎ {marker.name}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
