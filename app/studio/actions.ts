'use server';

import { updateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { SHOWCASE_TAG, toMarkers } from '@/lib/showcase-source';
import { STUDIO_COOKIE, matchesStudioToken } from '@/lib/studio-auth';
import type { ShowcasePreset } from '@/slices/scroll-3d-showcase/studio';
import { requireBackend, requireModelId, requireUnlocked } from './_lib/guards';
import { sanitizePreset } from './_lib/sanitize-preset';
import { scanPublicModels } from './_lib/scan-models';

const SESSION_SECONDS = 60 * 60 * 8;

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

/**
 * Hands the browser a one-shot URL to POST a file to. The studio token stays on
 * this side; the upload itself goes straight to the backend rather than through
 * this server, which has a body-size limit and no reason to hold the bytes.
 */
export async function createModelUpload(): Promise<string> {
  await requireUnlocked();
  const { convex, token } = requireBackend();
  return convex.mutation(api.uploads.generateUploadUrl, { token });
}

/**
 * Turns an uploaded file into a model row, or gets it deleted. Everything the
 * browser says here is a claim — the backend reads the bytes and decides.
 */
export async function registerModel(storageId: string, name: string): Promise<string> {
  await requireUnlocked();
  const { convex, token } = requireBackend();
  if (typeof storageId !== 'string' || !storageId) throw new Error('Missing upload id');
  if (typeof name !== 'string' || !name.trim()) throw new Error('Missing file name');

  const { id } = await convex.action(api.uploads.register, {
    token,
    storageId: storageId as Id<'_storage'>,
    name: name.trim().slice(0, 120),
  });
  // Nothing on the public page changes until someone publishes it, so no
  // updateTag here — that is GO LIVE's job.
  return id;
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

/**
 * Renames a model for the picker. Cosmetic-looking, but it is tagged: when the
 * live model has no saved copy, the public page derives its title, boot title
 * and meta description from the model's name, so a rename changes the browser
 * tab, the search result and the link preview — all cached for a day otherwise.
 */
export async function renameModel(modelId: string, label: string): Promise<void> {
  await requireUnlocked();
  const { convex, token } = requireBackend();
  requireModelId(modelId);
  if (typeof label !== 'string') throw new Error('Missing label');

  await convex.mutation(api.models.rename, { token, modelId, label });
  updateTag(SHOWCASE_TAG);
}

/**
 * Drops a model's saved tuning. The public page falls back to the slice defaults
 * when a preset is absent, so this visibly changes `/` — hence the tag.
 */
export async function deletePreset(modelId: string): Promise<void> {
  await requireUnlocked();
  const { convex, token } = requireBackend();
  requireModelId(modelId);

  await convex.mutation(api.presets.remove, { token, modelId });
  updateTag(SHOWCASE_TAG);
}

/**
 * Reads back one model's saved preset, for the library's JSON column.
 *
 * A read, so no tag. The content is returned exactly as stored rather than run
 * through the public page's defaults: this column edits the row itself, and a
 * defaulted field would be saved back as if someone had typed it.
 */
export async function loadPreset(modelId: string): Promise<ShowcasePreset | null> {
  await requireUnlocked();
  const { convex } = requireBackend();
  requireModelId(modelId);

  const saved = await convex.query(api.presets.get, { modelId });
  if (!saved) return null;
  return {
    keyframes: saved.keyframes,
    // Convex stores a marker position as a plain array; the slice wants a triple.
    markers: toMarkers(saved.markers),
    settings: saved.settings,
    content: saved.content,
  };
}
