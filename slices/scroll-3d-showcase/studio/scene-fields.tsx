'use client';

import { DEFAULT_SCENE_SETTINGS } from '../config/keyframes';
import type { SceneSettings } from '../types';
import { FieldSlider } from './field-slider';
import { SCENE_RANGES } from './presets';
import { Chip, Group, LABEL, TAP } from './studio-ui';

export interface SceneFieldsProps {
  settings: Partial<SceneSettings>;
  onPatch: (values: Partial<SceneSettings>) => void;
  /** Rebuilds the scene so modelHeight/damping/parallax/bloom take effect. */
  onApply: () => void;
  /** True when a rebuild-requiring value changed since the last apply. */
  needsApply: boolean;
}

/**
 * Only `scrollLength` retunes live — the engine's build effect depends on
 * [canvasRef, modelUrl] alone, so the rest need a fresh scene. The labels say
 * so rather than pretending otherwise.
 */
const SCENE_FIELDS: readonly (readonly [keyof typeof SCENE_RANGES, string])[] = [
  ['modelHeight', 'MODEL HEIGHT · REBUILD'],
  ['scrollLength', 'SCROLL LENGTH · LIVE'],
  ['damping', 'DAMPING · REBUILD'],
  ['parallax', 'PARALLAX · REBUILD'],
];

/** SCENE tab: engine settings that were not editable at all before 0.6.0. */
export function SceneFields({ settings, onPatch, onApply, needsApply }: SceneFieldsProps) {
  const value = { ...DEFAULT_SCENE_SETTINGS, ...settings };

  return (
    <Group
      title="SCENE"
      right={
        <Chip onClick={onApply} disabled={!needsApply} title="Rebuild the scene" active={needsApply}>
          APPLY
        </Chip>
      }
    >
      <div className="flex flex-col gap-1.5">
        {SCENE_FIELDS.map(([key, label]) => (
          <FieldSlider
            key={key}
            label={label}
            {...SCENE_RANGES[key]}
            value={value[key]}
            // A computed key widens to `string`; SCENE_FIELDS is what keeps it honest.
            onInput={(next) => onPatch({ [key]: next } as Partial<SceneSettings>)}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Chip
          active={value.bloom}
          onClick={() => onPatch({ bloom: !value.bloom })}
          title="Bloom pass · rebuild"
          className={TAP}
        >
          BLOOM {value.bloom ? 'ON' : 'OFF'}
        </Chip>
      </div>

      <p className={`mt-2 ${LABEL} normal-case tracking-normal`}>
        REBUILD fields land on APPLY, which drops the canvas and reloads the model.
      </p>
    </Group>
  );
}
