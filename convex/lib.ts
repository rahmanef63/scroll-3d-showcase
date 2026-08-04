/**
 * Single-admin authz. There is no user table: the host's server actions hold
 * STUDIO_TOKEN and pass it in, so the token never reaches the client bundle.
 * Reads stay public — only mutations call this.
 */
/**
 * Same comparison, as an answer rather than an exception.
 *
 * The studio asks this once when it opens: the host and this deployment hold
 * separate copies of the token, and when they drift the editor still unlocks —
 * the cookie is checked against the host's copy — while every write is refused
 * here. That failure arrives as a 500 on SAVE, after the tuning.
 */
export function studioTokenMatches(token: string): boolean {
  const expected = process.env.STUDIO_TOKEN;
  return Boolean(expected) && constantTimeEqual(token, expected as string);
}

export function requireStudioToken(token: string): void {
  const expected = process.env.STUDIO_TOKEN;
  // Unset means the studio is disabled, not open.
  if (!expected) throw new Error('STUDIO_TOKEN is not set on this deployment — studio writes are disabled');
  // These mutations are public Convex functions — anyone who knows the
  // deployment URL can call them with the Next app out of the loop, so the
  // compare runs in constant time rather than short-circuiting on the first
  // wrong byte.
  if (!constantTimeEqual(token, expected)) throw new Error('Unauthorized: bad studio token');
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

/** Guards the per-mutation write/document budget on inputs the host controls. */
export function requireAtMost(count: number, max: number, what: string): void {
  if (count > max) throw new Error(`Too many ${what}: ${count} (max ${max})`);
}
