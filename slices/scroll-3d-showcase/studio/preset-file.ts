import type {
  AnchorMarker,
  CameraKeyframe,
  SceneSettings,
  ShowcaseContent,
  ShowcaseCopy,
} from '../types';
import { EMPTY_CONTENT, FALLBACK_KEYFRAME } from './draft-utils';
import { clampKeyframe } from './presets';
import type { ShowcasePreset } from './types';

/**
 * The studio's portable file: one model's camera path, markers, scene knobs and
 * every word, as JSON.
 *
 * It exists because a preset is tied to a model id, and swapping the .glb means
 * swapping ids — the tuning would otherwise be stranded on the old row. Export
 * before the swap, import after it, and the shots come back.
 *
 * `modelId` is written for provenance only; an import always lands on whatever
 * model is open, which is the entire point.
 */
export const PRESET_FILE_VERSION = 1;

/** Whatever comes off a disk is unknown; every reader below coerces rather than trusts. */
const rec = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

export function toPresetFile(modelId: string, preset: ShowcasePreset): string {
  const file = {
    version: PRESET_FILE_VERSION,
    modelId,
    keyframes: preset.keyframes,
    markers: preset.markers,
    settings: preset.settings ?? {},
    content: preset.content ?? EMPTY_CONTENT,
  };
  // Indented and newline-terminated: these files get committed under seed/ and
  // read in diffs, not just fed back into the editor.
  return `${JSON.stringify(file, null, 2)}\n`;
}

/**
 * Reads a file back. A missing field takes a default instead of failing the
 * whole import — the one thing that cannot be defaulted is the camera path,
 * because an empty one throws inside the rAF loop, which never re-arms.
 *
 * The server sanitiser still has the last word at SAVE; this only has to keep
 * the running scene alive.
 */
export function fromPresetFile(text: string): { modelId: string; preset: ShowcasePreset } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('not a JSON file');
  }

  const file = rec(parsed);
  // sampleKeyframes assumes sorted input and silently mis-segments without it.
  const keyframes = arr(file.keyframes).map(toKeyframe).sort((a, b) => a.p - b.p);
  if (keyframes.length === 0) throw new Error('no keyframes in this file');

  return {
    modelId: str(file.modelId),
    preset: {
      keyframes,
      markers: arr(file.markers).map(toMarker),
      settings: toSettings(file.settings),
      content: toContent(file.content),
    },
  };
}

const toKeyframe = (raw: unknown): CameraKeyframe => {
  const key = rec(raw);
  return clampKeyframe({
    p: num(key.p, 0),
    azimuth: num(key.azimuth, FALLBACK_KEYFRAME.azimuth),
    elevation: num(key.elevation, FALLBACK_KEYFRAME.elevation),
    radius: num(key.radius, FALLBACK_KEYFRAME.radius),
    targetX: num(key.targetX, 0),
    targetY: num(key.targetY, 0),
    targetZ: num(key.targetZ, 0),
    screenShiftX: num(key.screenShiftX, 0),
    fov: num(key.fov, FALLBACK_KEYFRAME.fov),
    label: str(key.label, 'KEY'),
  });
};

const toMarker = (raw: unknown): AnchorMarker => {
  const marker = rec(raw);
  const [x, y, z] = arr(marker.position);
  return { name: str(marker.name, 'MARKER'), position: [num(x, 0), num(y, 0), num(z, 0)] };
};

/** Absent keys stay absent: an unset knob means "whatever the slice defaults to". */
const toSettings = (raw: unknown): Partial<SceneSettings> => {
  const source = rec(raw);
  const settings: Partial<SceneSettings> = {};
  for (const key of ['modelHeight', 'scrollLength', 'damping', 'parallax'] as const) {
    if (typeof source[key] === 'number' && Number.isFinite(source[key])) {
      settings[key] = source[key] as number;
    }
  }
  if (typeof source.bloom === 'boolean') settings.bloom = source.bloom;
  return settings;
};

const toContent = (raw: unknown): ShowcaseContent => {
  const source = rec(raw);
  return {
    ...EMPTY_CONTENT,
    title: str(source.title),
    // Absent and empty differ: empty means "the boot screen uses the title".
    ...(typeof source.bootTitle === 'string' ? { bootTitle: source.bootTitle } : {}),
    brand: str(source.brand),
    description: str(source.description),
    sections: arr(source.sections).map(toCopy),
  };
};

const toCopy = (raw: unknown, index: number): ShowcaseCopy => {
  const copy = rec(raw);
  const progress = num(copy.progress, 0);
  return {
    // Ids are DOM ids and React keys, and they join the host's rich blocks.
    id: str(copy.id) || String(index + 1).padStart(2, '0'),
    name: str(copy.name, 'SECTION'),
    progress,
    // A window that excludes its own progress renders an invisible panel.
    fadeIn: num(copy.fadeIn, progress - 0.08),
    fadeOut: num(copy.fadeOut, progress + 0.08),
    align: copy.align === 'end' ? 'end' : 'start',
    kicker: str(copy.kicker),
    heading: str(copy.heading),
    body: str(copy.body),
  };
};

/* --------------------------------------------------------------- browser io */

export function downloadJson(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Resolves null when the picker is dismissed, so the caller can stop being busy. */
export function pickJsonFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      resolve(file ? file.text() : null);
    });
    // Without this a dismissed dialog would leave the studio spinning forever.
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
