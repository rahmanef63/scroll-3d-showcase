import { cacheLife, cacheTag } from 'next/cache';
import { DEFAULT_CONTENT, contentForModel } from '@/app/(public)/_content/copy';
import { api } from '@/convex/_generated/api';
import {
  DEFAULT_KEYFRAMES,
  DEFAULT_MARKERS,
  DEFAULT_SCENE_SETTINGS,
} from '@/slices/scroll-3d-showcase';
import type {
  AnchorMarker,
  CameraKeyframe,
  SceneSettings,
  ShowcaseContent,
} from '@/slices/scroll-3d-showcase';
import { getConvex } from './convex-server';

/** Studio saves invalidate the public page through this tag. */
export const SHOWCASE_TAG = 'showcase';

/**
 * The bundled asset, and the fallback when nothing has been published — no
 * backend, an unreachable one, or a `models` table where no row is marked live.
 * Deliberately not `models.list()[0]`: dropping a second .glb into `public/` and
 * pressing SYNC must never silently swap the site's hero. Publishing is an
 * explicit act (`LIVE` in the studio); this is what the site shows until then.
 *
 * The value is the ID RULE slug of `public/hitman.glb`.
 */
export const ACTIVE_MODEL_ID = 'hitman';
export const ACTIVE_MODEL_URL = '/hitman.glb';

/**
 * The wire carries marker positions as `number[]`; the mutation already rejects
 * anything that is not [x, y, z], so this only restores the tuple type. Shared
 * with /studio: if the two ends converted separately they could drift, and the
 * studio would silently edit a shape the public page cannot read.
 */
export function toMarkers(
  rows: readonly { name: string; position: number[] }[],
): AnchorMarker[] {
  return rows.map(({ name, position: [x, y, z] }) => ({ name, position: [x, y, z] as const }));
}

/**
 * Fills in content fields a saved row predates.
 *
 * A row written before `bootTitle` existed has no opinion about it, and should
 * get this deploy's default. A row that carries `bootTitle: ''` has an opinion —
 * "use the title" — and keeps it. The spread order is what draws that line:
 * present keys win, absent ones fall through, and `''` is present.
 *
 * Both readers go through here, so the editor and the page can never disagree
 * about what a missing field means.
 */
export function withContentDefaults(content: ShowcaseContent): ShowcaseContent {
  return { bootTitle: DEFAULT_CONTENT.bootTitle, ...content };
}

export interface ShowcaseSource {
  modelUrl: string;
  keyframes: readonly CameraKeyframe[];
  markers: readonly AnchorMarker[];
  settings: Partial<SceneSettings>;
  content: ShowcaseContent;
}

const DEFAULTS: ShowcaseSource = {
  modelUrl: ACTIVE_MODEL_URL,
  keyframes: DEFAULT_KEYFRAMES,
  markers: DEFAULT_MARKERS,
  settings: DEFAULT_SCENE_SETTINGS,
  content: DEFAULT_CONTENT,
};

/**
 * Camera path for the public page. Convex is strictly an upgrade over the slice
 * defaults: with no env vars, an unreachable backend or an unsaved preset the
 * site renders exactly what it rendered before Convex existed, which is how it
 * is deployed today.
 */
export async function loadShowcase(): Promise<ShowcaseSource> {
  'use cache';
  cacheLife('days');
  cacheTag(SHOWCASE_TAG);

  const convex = getConvex();
  if (!convex) return DEFAULTS;

  try {
    // getConvex() aborts a hanging fetch, so a dead backend lands in the catch
    // instead of stalling the prerender.
    const live = await convex.query(api.models.live, {});
    const modelId = live?.id ?? ACTIVE_MODEL_ID;
    // Two sequential round-trips, and that is fine: this runs at build time and
    // once per cache expiry, not per request.
    const preset = await convex.query(api.presets.get, { modelId });
    // Per model, so publishing a second .glb never inherits the first one's
    // title, description and boot line.
    const untuned = contentForModel(live);
    // An empty path would make sampleKeyframes throw inside the rAF callback,
    // which never re-arms. Both write paths reject it; this is the read-side belt.
    // A published model with no preset still renders — on the default camera
    // path, which is honest: the model is live, its shots are just untuned.
    if (!preset || preset.keyframes.length === 0) {
      return live ? { ...DEFAULTS, modelUrl: live.url, content: untuned } : DEFAULTS;
    }

    return {
      modelUrl: live?.url ?? ACTIVE_MODEL_URL,
      keyframes: preset.keyframes,
      markers: toMarkers(preset.markers),
      // A preset replaces the defaults wholesale; only a missing `settings`
      // block falls back, so the studio never has to re-save untouched knobs.
      settings: preset.settings ?? DEFAULT_SCENE_SETTINGS,
      // Same rule for copy, and it covers presets saved before the studio could
      // edit words at all: those rows have no `content` and keep this site's.
      content: preset.content ? withContentDefaults(preset.content) : untuned,
    };
  } catch {
    // A backend that is down, slow or misconfigured is not a reason to fail a
    // build or a request. The page's own entry governs how long these defaults
    // stick around; a studio save clears it through SHOWCASE_TAG.
    return DEFAULTS;
  }
}
