import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toModelId } from '@/convex/models';
import {
  DEFAULT_KEYFRAMES,
  DEFAULT_MARKERS,
  DEFAULT_SCENE_SETTINGS,
} from '@/slices/scroll-3d-showcase';
import { ACTIVE_MODEL_ID, ACTIVE_MODEL_URL, withContentDefaults } from '@/lib/showcase-source';
import { DEFAULT_CONTENT, contentForModel } from '@/app/(public)/_content/copy';

const probe = vi.hoisted(() => ({
  query: vi.fn(),
  constructed: 0,
}));

/** `use cache` is a no-op outside a Next request scope; these two are not. */
vi.mock('next/cache', () => ({ cacheLife: () => {}, cacheTag: () => {} }));

vi.mock('convex/browser', () => ({
  ConvexHttpClient: class {
    constructor() {
      probe.constructed += 1;
    }
    query = probe.query;
  },
}));

/**
 * `getConvex()` memoises per process, so every case re-imports the module graph
 * from scratch rather than trying to un-cache the client.
 */
async function load(url?: string) {
  vi.resetModules();
  if (url) vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', url);
  else delete process.env.NEXT_PUBLIC_CONVEX_URL;
  const { loadShowcase } = await import('@/lib/showcase-source');
  return loadShowcase();
}

// Compared by value, not identity: `vi.resetModules()` hands the re-imported
// graph its own copy of the slice constants.
const expectDefaults = (source: Awaited<ReturnType<typeof load>>) => {
  expect(source.modelUrl).toBe('/hitman.glb');
  expect(source.keyframes).toEqual(DEFAULT_KEYFRAMES);
  expect(source.markers).toEqual(DEFAULT_MARKERS);
  expect(source.settings).toEqual(DEFAULT_SCENE_SETTINGS);
};

beforeEach(() => {
  probe.query.mockReset();
  probe.constructed = 0;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('the active model constant', () => {
  it('is the id models.sync would assign to the bundled asset', () => {
    // Drift here is silent and total: the studio would edit one row while the
    // public page reads another, so saving would look like it did nothing.
    expect(toModelId(ACTIVE_MODEL_URL.slice(1))).toBe(ACTIVE_MODEL_ID);
  });
});

describe('loadShowcase with no backend', () => {
  it('returns the slice defaults — this is how the site is deployed today', async () => {
    expectDefaults(await load());
  });

  it('never constructs a client, so a missing URL costs nothing', async () => {
    await load();
    expect(probe.constructed).toBe(0);
    expect(probe.query).not.toHaveBeenCalled();
  });
});

const SAVED_PRESET = {
  keyframes: [
    { p: 0, azimuth: 5, elevation: 0, radius: 2, targetY: 0, screenShiftX: 0, fov: 40, label: 'SAVED' },
  ],
  markers: [{ name: 'SAVED', position: [1, 2, 3] }],
  settings: { scrollLength: 3.5 },
};

/** `loadShowcase` asks which model is live, then asks for that model's preset. */
const answer = (live: unknown, preset: unknown) =>
  probe.query.mockResolvedValueOnce(live).mockResolvedValueOnce(preset);

describe('loadShowcase with a backend', () => {
  it('falls back when the deployment is unreachable', async () => {
    probe.query.mockRejectedValue(new Error('fetch failed'));
    expectDefaults(await load('https://example.convex.cloud'));
    expect(probe.query).toHaveBeenCalledTimes(1);
  });

  it('falls back when the model has no saved preset', async () => {
    probe.query.mockResolvedValue(null);
    expectDefaults(await load('https://example.convex.cloud'));
  });

  it('reads the saved preset for the active model', async () => {
    answer(null, SAVED_PRESET);

    const source = await load('https://example.convex.cloud');
    expect(source.keyframes.map((k) => k.label)).toEqual(['SAVED']);
    // The wire carries number[]; the page needs a fixed triple.
    expect(source.markers).toEqual([{ name: 'SAVED', position: [1, 2, 3] }]);
    expect(source.settings).toEqual({ scrollLength: 3.5 });

    // Nothing published, so it reads the bundled asset's preset.
    const [, args] = probe.query.mock.calls[1];
    expect(args).toEqual({ modelId: 'hitman' });
    expect(source.modelUrl).toBe(ACTIVE_MODEL_URL);
  });

  it('follows the published model instead of the bundled one', async () => {
    answer({ id: 'car', name: 'car', url: '/car.glb', bytes: 10 }, SAVED_PRESET);

    const source = await load('https://example.convex.cloud');
    expect(probe.query.mock.calls[1][1]).toEqual({ modelId: 'car' });
    expect(source.modelUrl).toBe('/car.glb');
  });

  it('still shows a published model that has no preset, on the default path', async () => {
    // Otherwise publishing a model nobody has tuned yet would silently keep
    // serving the old one — the write would look like it did nothing.
    answer({ id: 'car', name: 'car', url: '/car.glb', bytes: 10 }, null);

    const source = await load('https://example.convex.cloud');
    expect(source.modelUrl).toBe('/car.glb');
    expect(source.keyframes).toEqual(DEFAULT_KEYFRAMES);
    // And on its own words: the tab, the search result and the boot screen
    // used to read HITMAN for every model but the two written by hand.
    expect(source.content.title).toBe('CAR');
  });

  it('gives a published model its own words when its preset has no copy', async () => {
    answer({ id: 'car', name: 'car', url: '/car.glb', bytes: 10 }, SAVED_PRESET);

    const source = await load('https://example.convex.cloud');
    expect(source.content.title).toBe('CAR');
    expect(source.content.description).not.toBe(DEFAULT_CONTENT.description);
  });
});

describe('contentForModel', () => {
  it('keeps the hand-written copy for a model that has some', () => {
    expect(contentForModel({ id: 'hitman', name: 'hitman' })).toBe(DEFAULT_CONTENT);
  });

  it('names an unknown file after itself, not after the first character', () => {
    const content = contentForModel({ id: 'models-vintage-car', name: 'models/vintage-car' });
    expect(content.title).toBe('VINTAGE CAR');
    expect(content.bootTitle).toBe('VINTAGE CAR');
    expect(content.description).not.toBe(DEFAULT_CONTENT.description);
  });

  it('falls back to the id when the name is nothing but separators', () => {
    expect(contentForModel({ id: 'a-b', name: '---' }).title).toBe('A B');
  });

  it('is the default copy when nothing is published', () => {
    expect(contentForModel(null)).toBe(DEFAULT_CONTENT);
  });
});

describe('withContentDefaults', () => {
  it('fills a field a saved row predates', () => {
    const saved = { title: 'T', brand: 'B', description: '', sections: [] };
    expect(withContentDefaults(saved).bootTitle).toBe(DEFAULT_CONTENT.bootTitle);
  });

  it('keeps an explicit empty string — that is an opinion, not an absence', () => {
    const saved = { title: 'T', bootTitle: '', brand: 'B', description: '', sections: [] };
    expect(withContentDefaults(saved).bootTitle).toBe('');
  });

  it('never overwrites a value someone typed', () => {
    const saved = { title: 'T', bootTitle: 'MINE', brand: 'B', description: '', sections: [] };
    expect(withContentDefaults(saved).bootTitle).toBe('MINE');
  });
});
