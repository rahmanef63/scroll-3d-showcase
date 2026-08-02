import type { CameraKeyframe } from '../types';

const FIELDS = [
  'p', 'azimuth', 'elevation', 'radius', 'targetX', 'targetY', 'targetZ',
  'screenShiftX', 'fov',
] as const;

/** Copied verbatim from config/keyframes.ts so the pasted block still lines up. */
const HEADING =
  '  // p     azimuth  elev  radius  targetX  targetY  targetZ  shiftX  fov  label';

/**
 * Renders the draft as the aligned `DEFAULT_KEYFRAMES` literal, ready to paste
 * over the const in config/keyframes.ts — that is how a tuned preset gets baked
 * back into source and travels with the slice instead of living in a database.
 */
export function keyframesToSource(keyframes: readonly CameraKeyframe[]): string {
  // Padding goes after the comma, the way the shipped table is written.
  const cells = keyframes.map((keyframe) =>
    FIELDS.map((field) => `${field}: ${keyframe[field] ?? 0},`),
  );
  const widths = FIELDS.map(
    (_, column) => Math.max(...cells.map((row) => row[column].length)) + 1,
  );
  const rows = cells.map((row, index) => {
    const pairs = row.map((cell, column) => cell.padEnd(widths[column])).join('');
    return `  { ${pairs}label: '${keyframes[index].label}' },`;
  });

  return [
    'export const DEFAULT_KEYFRAMES: readonly CameraKeyframe[] = [',
    HEADING,
    ...rows,
    '] as const;',
  ].join('\n');
}

/** Clipboard write with the execCommand fallback for non-secure contexts. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  }
}
