'use server';

import { updateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { getConvex } from '@/lib/convex-server';
import { SHOWCASE_TAG } from '@/lib/showcase-source';
import { STUDIO_COOKIE, isStudioUnlocked, matchesStudioToken } from '@/lib/studio-auth';
import { sanitizePreset } from './_lib/sanitize-preset';
import { scanPublicModels } from './_lib/scan-models';

const SESSION_SECONDS = 60 * 60 * 8;
const MODEL_ID = /^[a-z0-9-]{1,120}$/;

export async function unlock(formData: FormData): Promise<void> {
  const password = formData.get('password');
  if (typeof password !== 'string' || !matchesStudioToken(password)) {
    redirect('/studio?e=1');
  }

  const store = await cookies();
  store.set(STUDIO_COOKIE, password, {
    httpOnly: true,
    sameSite: 'lax',
    // Plain http is only ever local dev; a secure cookie there would never stick.
    secure: process.env.NODE_ENV === 'production',
    // Scoped to the one dynamic route, so the token is not attached to the
    // cached public page's requests.
    path: '/studio',
    maxAge: SESSION_SECONDS,
  });
  redirect('/studio');
}

export async function syncModels(): Promise<{
  added: number;
  total: number;
  missing: number;
}> {
  await requireUnlocked();
  const { convex, token } = requireBackend();
  const result = await convex.mutation(api.models.sync, { token, files: await scanPublicModels() });

  // SYNC can change what the public page renders without anyone pressing GO
  // LIVE: flagging a published model's file as missing makes `models.live`
  // skip it. Without this the page kept serving the vanished URL for a day.
  // Unconditional rather than `if (missing)` — SYNC is a rare, deliberate act,
  // and a condition here is one more thing that can be wrong.
  updateTag(SHOWCASE_TAG);
  return result;
}

/**
 * Points `/` at a different model. The id is checked against the shape SYNC
 * assigns before it goes anywhere; Convex then refuses one it has never seen.
 */
export async function setLiveModel(modelId: string): Promise<void> {
  await requireUnlocked();
  const { convex, token } = requireBackend();
  requireModelId(modelId);

  await convex.mutation(api.models.setLive, { token, modelId });
  updateTag(SHOWCASE_TAG);
}

/**
 * Drops a model row whose file is gone. Convex refuses one that is not flagged,
 * so this cannot be turned into a way to delete a working model.
 */
export async function forgetModel(modelId: string): Promise<void> {
  await requireUnlocked();
  const { convex, token } = requireBackend();
  requireModelId(modelId);

  await convex.mutation(api.models.forget, { token, modelId });
  updateTag(SHOWCASE_TAG);
}

/** `preset` is typed `unknown` on purpose: it arrives from the browser. */
export async function savePreset(modelId: string, preset: unknown): Promise<void> {
  await requireUnlocked();
  const { convex, token } = requireBackend();
  requireModelId(modelId);

  await convex.mutation(api.presets.save, { token, modelId, ...sanitizePreset(preset) });
  // The public route is cached until this fires.
  updateTag(SHOWCASE_TAG);
}

function requireModelId(modelId: string): void {
  if (typeof modelId !== 'string' || !MODEL_ID.test(modelId)) {
    throw new Error(`Unknown model id: ${String(modelId).slice(0, 40)}`);
  }
}

/**
 * A server action is a public endpoint: the client-side gate in the studio UI is
 * not a gate, so every action re-checks the cookie before touching anything.
 */
async function requireUnlocked(): Promise<void> {
  if (!(await isStudioUnlocked())) throw new Error('Studio is locked');
}

function requireBackend() {
  const convex = getConvex();
  if (!convex) throw new Error('NEXT_PUBLIC_CONVEX_URL is not set — this deploy has no backend');
  const token = process.env.STUDIO_TOKEN;
  if (!token) throw new Error('STUDIO_TOKEN is not set — studio writes are disabled');
  return { convex, token };
}
