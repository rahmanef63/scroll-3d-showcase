import type { ConvexHttpClient } from 'convex/browser';
import { getConvex } from '@/lib/convex-server';
import { isStudioUnlocked } from '@/lib/studio-auth';

/** The shape SYNC assigns. Anything else never reached the backend legitimately. */
const MODEL_ID = /^[a-z0-9-]{1,120}$/;

/**
 * The gate every studio server action opens with, in its own module so the
 * actions file stays a list of writes.
 *
 * Not a `'use server'` module on purpose: that directive restricts a file to
 * async exports, and two of these three are plain functions.
 */

/**
 * A server action is a public endpoint: the client-side gate in the studio UI is
 * not a gate, so every action re-checks the cookie before touching anything.
 */
export async function requireUnlocked(): Promise<void> {
  if (!(await isStudioUnlocked())) throw new Error('Studio is locked');
}

export function requireBackend(): { convex: ConvexHttpClient; token: string } {
  const convex = getConvex();
  if (!convex) throw new Error('NEXT_PUBLIC_CONVEX_URL is not set — this deploy has no backend');
  const token = process.env.STUDIO_TOKEN;
  if (!token) throw new Error('STUDIO_TOKEN is not set — studio writes are disabled');
  return { convex, token };
}

export function requireModelId(modelId: string): void {
  if (typeof modelId !== 'string' || !MODEL_ID.test(modelId)) {
    throw new Error(`Unknown model id: ${String(modelId).slice(0, 40)}`);
  }
}
