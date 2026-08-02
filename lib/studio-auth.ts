import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/** httpOnly cookie holding the studio token; set by the `unlock` server action. */
export const STUDIO_COOKIE = 'studio';

/**
 * Compares against STUDIO_TOKEN in constant time. Both sides are hashed first so
 * the comparison length is fixed — `timingSafeEqual` throws on length mismatch,
 * and branching on length would leak the token's size.
 *
 * Fails CLOSED: an unset STUDIO_TOKEN disables the studio rather than opening it.
 */
export function matchesStudioToken(candidate: string | undefined): boolean {
  const expected = process.env.STUDIO_TOKEN;
  if (!expected || !candidate) return false;
  return timingSafeEqual(sha256(candidate), sha256(expected));
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

/** Reads the cookie. Server actions must re-check this — they are public endpoints. */
export async function isStudioUnlocked(): Promise<boolean> {
  const store = await cookies();
  return matchesStudioToken(store.get(STUDIO_COOKIE)?.value);
}
