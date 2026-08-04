import { Suspense } from 'react';
import type { Metadata } from 'next';
import { DEFAULT_CONTENT, contentForModel } from '@/app/(public)/_content/copy';
import { api } from '@/convex/_generated/api';
import { getConvex } from '@/lib/convex-server';
import {
  ACTIVE_MODEL_ID,
  ACTIVE_MODEL_URL,
  toMarkers,
  withContentDefaults,
} from '@/lib/showcase-source';
import { isStudioUnlocked } from '@/lib/studio-auth';
import {
  DEFAULT_KEYFRAMES,
  DEFAULT_MARKERS,
  DEFAULT_SCENE_SETTINGS,
} from '@/slices/scroll-3d-showcase';
import type { ShowcaseModel, ShowcasePreset } from '@/slices/scroll-3d-showcase/studio';
import { Frame, StudioBoot } from './_components/studio-boot';
import { StudioShell } from './_components/studio-shell';
import { UnlockForm } from './_components/unlock-form';
import {
  createModelUpload,
  deletePreset,
  forgetModel,
  loadPreset,
  registerModel,
  renameModel,
  savePreset,
  setLiveModel,
  syncModels,
} from './actions';

export const metadata: Metadata = {
  title: 'Studio — scroll-3d-showcase',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ model?: string; e?: string }>;

/**
 * Why the editor cannot be trusted to write. '' means it can — anything else is
 * shown as a standing notice, because a studio that silently degrades looks
 * identical to one that works until the first save fails.
 */
type Degraded = '' | 'unset' | 'unreachable' | 'token';

/**
 * Bundled asset, so the studio opens even with zero env vars set. Id and URL
 * come from the public page's constants: editing a different id than `/` reads
 * would look like saving works while the live site never changes.
 */
const FALLBACK_MODEL: ShowcaseModel = {
  id: ACTIVE_MODEL_ID,
  name: ACTIVE_MODEL_ID,
  url: ACTIVE_MODEL_URL,
  bytes: 0,
};

const FALLBACK_PRESET: ShowcasePreset = {
  keyframes: [...DEFAULT_KEYFRAMES],
  markers: [...DEFAULT_MARKERS],
  settings: DEFAULT_SCENE_SETTINGS,
  content: DEFAULT_CONTENT,
};

/** No backend means nothing is published, so the studio shows no LIVE badge. */
const FALLBACK = {
  models: [FALLBACK_MODEL],
  modelId: FALLBACK_MODEL.id,
  preset: FALLBACK_PRESET,
  liveModelId: '',
  degraded: '' as Degraded,
};

/**
 * The one dynamic route on an otherwise fully cached site. The cookie and the
 * Convex reads live inside the Suspense boundary so the shell still prerenders
 * under cacheComponents — no `export const dynamic` needed.
 */
export default function StudioPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<StudioBoot />}>
      <StudioGate searchParams={searchParams} />
    </Suspense>
  );
}

async function StudioGate({ searchParams }: { searchParams: SearchParams }) {
  const { model, e } = await searchParams;

  if (!(await isStudioUnlocked())) {
    return (
      <Frame>
        <UnlockForm failed={e === '1'} disabled={e === 'off'} />
      </Frame>
    );
  }

  const { models, modelId, preset, liveModelId, degraded } = await loadStudio(model);
  return (
    <StudioShell
      models={models}
      modelId={modelId}
      preset={preset}
      liveModelId={liveModelId}
      degraded={degraded}
      adapter={{
        syncModels,
        savePreset,
        setLiveModel,
        forgetModel,
        renameModel,
        deletePreset,
        loadPreset,
      }}
      upload={{ createUrl: createModelUpload, register: registerModel }}
    />
  );
}

/**
 * Uncached on purpose: the editor must see what it just saved. Any Convex
 * failure degrades to the bundled model plus the slice defaults rather than
 * erroring the route.
 */
async function loadStudio(model: string | undefined) {
  const convex = getConvex();
  if (!convex) return { ...FALLBACK, degraded: 'unset' as Degraded };

  try {
    // Asked alongside the rows rather than on the first write: the host and the
    // deployment hold separate copies of the token and nothing keeps them in
    // step, so this is the one check that turns a 500 into a sentence.
    const token = process.env.STUDIO_TOKEN ?? '';
    const [models, live, accepted] = await Promise.all([
      convex.query(api.models.list, {}),
      convex.query(api.models.live, {}),
      convex.query(api.studio.tokenAccepted, { token }),
    ]);
    if (models.length === 0) return FALLBACK;

    // Default to the model `/` actually renders, not the alphabetically first
    // row: editing a different id than the public page reads looks like saving
    // works while the live site never changes.
    const modelId = pickModelId(models, model, live?.id);
    const saved = await convex.query(api.presets.get, { modelId });
    // What a visitor would read if this model went live untouched — the editor
    // opens on that, so the words follow the picker instead of every model
    // opening on the first character's copy.
    const untuned = contentForModel(models.find((entry) => entry.id === modelId));
    return {
      models,
      modelId,
      preset: saved ? toPreset(saved, untuned) : { ...FALLBACK_PRESET, content: untuned },
      liveModelId: live?.id ?? '',
      degraded: (accepted ? '' : 'token') as Degraded,
    };
  } catch {
    // Down, misconfigured or slow. Either way every write from here will fail,
    // and the editor should say so before someone tunes a path for ten minutes.
    return { ...FALLBACK, degraded: 'unreachable' as Degraded };
  }
}

function pickModelId(
  models: ShowcaseModel[],
  requested: string | undefined,
  liveId: string | undefined,
): string {
  const has = (id: string | undefined) => models.some((entry) => entry.id === id);
  if (has(requested)) return requested!;
  // Published model first, then the bundled fallback the site shows when
  // nothing is published — both are "what a visitor sees right now".
  if (has(liveId)) return liveId!;
  return has(ACTIVE_MODEL_ID) ? ACTIVE_MODEL_ID : models[0].id;
}

/** Convex stores marker positions as a plain array; the slice wants a fixed triple. */
function toPreset(
  saved: {
    keyframes: ShowcasePreset['keyframes'];
    markers: { name: string; position: number[] }[];
    settings?: ShowcasePreset['settings'];
    content?: ShowcasePreset['content'];
  },
  untuned: ShowcasePreset['content'],
): ShowcasePreset {
  return {
    keyframes: saved.keyframes,
    markers: toMarkers(saved.markers),
    settings: saved.settings,
    // A row saved before the studio could edit words has no copy at all; opening
    // it on an empty editor and saving would blank the live site. The same helper
    // the public page uses, so the editor shows exactly what a visitor gets.
    content: saved.content ? withContentDefaults(saved.content) : untuned,
  };
}

