/**
 * Type guards for data arriving from a browser through a server action.
 *
 * Shared by every wire sanitiser here, and deliberately dumb: each one either
 * returns the narrowed value or throws with the field name in the message, so a
 * malformed save says which field rather than "invalid preset".
 */

/** Names and labels. Anything longer is a paste accident, not a label. */
export const MAX_TEXT = 64;
/** Kicker, heading, meta description — one line of prose each. */
export const MAX_LINE = 200;
/** A copy panel's paragraph. Past this it stops fitting the panel anyway. */
export const MAX_BODY = 2000;

export function record(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Preset: ${what} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function bounded(value: unknown, max: number, what: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Preset: ${what} must be an array`);
  if (value.length > max) throw new Error(`Preset: too many ${what} (${value.length} > ${max})`);
  return value;
}

export function number(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Preset: ${what} must be a finite number`);
  }
  return value;
}

export function maybeNumber(value: unknown, what: string): number | undefined {
  return value === undefined || value === null ? undefined : number(value, what);
}

/** Truncates rather than rejects: a long paste is clumsy, not hostile. */
export function text(value: unknown, what: string, max = MAX_TEXT): string {
  if (typeof value !== 'string') throw new Error(`Preset: ${what} must be a string`);
  return value.slice(0, max);
}
