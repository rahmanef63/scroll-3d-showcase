import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forget, live, setLive, sync, toModelId } from '@/convex/models';

/**
 * Host-side test for backend code: it lives under lib/ rather than convex/
 * because `npx convex deploy` bundles every module in convex/, and a file
 * importing vitest would not survive that.
 *
 * Convex keeps the raw handler on `_handler`, which is how a mutation is unit
 * tested without a deployment.
 */
interface ScannedFile {
  path: string;
  name: string;
  bytes: number;
}

type SyncArgs = { token: string; files: ScannedFile[] };
type SyncResult = { added: number; total: number; missing: number };

/** Convex keeps the raw handler on `_handler`; this is the only way in without a deployment. */
const handler = <A, R>(fn: unknown) =>
  (fn as { _handler: (ctx: unknown, args: A) => Promise<R> })._handler;

const runSync = handler<SyncArgs, SyncResult>(sync);
const runSetLive = handler<{ token: string; modelId: string }, null>(setLive);
const runLive = handler<Record<string, never>, { id: string; url: string } | null>(live);
const runForget = handler<{ token: string; modelId: string }, null>(forget);

const TOKEN = 'studio-secret';

interface Row {
  _id: string;
  modelId: string;
  name: string;
  url?: string;
  storageId?: string;
  bytes: number;
  live?: boolean;
  missing?: boolean;
}

/** Enough of `ctx.storage` for the uploaded-model paths. */
function fakeStorage(present = new Set<string>()) {
  const deleted: string[] = [];
  return {
    deleted,
    async getUrl(id: string) {
      return present.has(id) ? `https://files.example/${id}` : null;
    },
    async delete(id: string) {
      deleted.push(id);
      present.delete(id);
    },
  };
}

/** Just enough of `ctx.db` for the by_modelId upsert path. */
function fakeDb() {
  const rows: Row[] = [];
  let next = 0;

  return {
    rows,
    query() {
      return {
        withIndex(_index: string, build?: (q: { eq: (f: string, v: unknown) => unknown }) => unknown) {
          let matched = rows;
          if (build) {
            let field = '';
            let value: unknown;
            build({
              eq: (f, v) => {
                field = f;
                value = v;
                return {};
              },
            });
            matched = rows.filter((row) => (row as unknown as Record<string, unknown>)[field] === value);
          }
          return {
            unique: async () => matched[0] ?? null,
            take: async (limit: number) => matched.slice(0, limit),
          };
        },
      };
    },
    async insert(_table: string, doc: Omit<Row, '_id'>) {
      next += 1;
      const row = { _id: `row-${next}`, ...doc };
      rows.push(row);
      return row._id;
    },
    async patch(id: string, fields: Partial<Row>) {
      Object.assign(rows.find((row) => row._id === id)!, fields);
    },
    async delete(id: string) {
      rows.splice(rows.findIndex((row) => row._id === id), 1);
    },
  };
}

const file = (path: string, over: Partial<ScannedFile> = {}): ScannedFile => ({
  path,
  name: path.replace(/\.(glb|gltf)$/i, ''),
  bytes: 100,
  ...over,
});

const call = (db: ReturnType<typeof fakeDb>, files: ScannedFile[]) =>
  runSync({ db } as unknown, { token: TOKEN, files });

const publish = (db: ReturnType<typeof fakeDb>, modelId: string) =>
  runSetLive({ db } as unknown, { token: TOKEN, modelId });

const whatIsLive = (db: ReturnType<typeof fakeDb>) =>
  runLive({ db } as unknown, {} as Record<string, never>);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('toModelId', () => {
  it('slugs the path under public/ without its extension', () => {
    expect(toModelId('hitman.glb')).toBe('hitman');
    expect(toModelId('models/car.glb')).toBe('models-car');
  });

  it('normalises the shapes a filesystem actually produces', () => {
    expect(toModelId('/hitman.GLB')).toBe('hitman');
    expect(toModelId('models/Sports Car v2.gltf')).toBe('models-sports-car-v2');
    expect(toModelId('deep/nested/rig.glb')).toBe('deep-nested-rig');
  });
});

describe('models.sync', () => {
  it('inserts on first sight and reports what it added', async () => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();

    const result = await call(db, [file('hitman.glb'), file('models/car.glb')]);
    expect(result).toEqual({ added: 2, updated: 0, total: 2, missing: 0 });
    expect(db.rows.map((row) => row.modelId)).toEqual(['hitman', 'models-car']);
    expect(db.rows.map((row) => row.url)).toEqual(['/hitman.glb', '/models/car.glb']);
  });

  it('never reassigns an id when the same file is re-synced', async () => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();
    await call(db, [file('hitman.glb')]);
    const original = { ...db.rows[0] };

    const result = await call(db, [file('hitman.glb', { name: 'Hitman v2', bytes: 999 })]);

    expect(result).toEqual({ added: 0, updated: 1, total: 1, missing: 0 });
    expect(db.rows).toHaveLength(1);
    // Same row, same id — a saved preset stays attached to its model.
    expect(db.rows[0]._id).toBe(original._id);
    expect(db.rows[0].modelId).toBe('hitman');
    expect(db.rows[0]).toMatchObject({ name: 'Hitman v2', bytes: 999 });
  });

  it('keeps rows for files that vanished from public/, but flags them', async () => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();
    await call(db, [file('hitman.glb'), file('models/car.glb')]);

    const result = await call(db, [file('hitman.glb')]);
    // Kept, so the id is never handed to a different file and the preset lives.
    expect(result).toEqual({ added: 0, updated: 0, total: 2, missing: 1 });
    expect(db.rows.map((row) => row.modelId)).toEqual(['hitman', 'models-car']);
    expect(db.rows.map((row) => Boolean(row.missing))).toEqual([false, true]);
  });

  it('clears the flag when the file comes back', async () => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();
    await call(db, [file('hitman.glb'), file('models/car.glb')]);
    await call(db, [file('hitman.glb')]);

    const result = await call(db, [file('hitman.glb'), file('models/car.glb')]);
    expect(result).toEqual({ added: 0, updated: 0, total: 2, missing: 0 });
    expect(db.rows.every((row) => !row.missing)).toBe(true);
  });
});

describe('publishing', () => {
  it('publishes one model and unpublishes the rest', async () => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();
    await call(db, [file('hitman.glb'), file('models/car.glb')]);

    await publish(db, 'hitman');
    expect(await whatIsLive(db)).toMatchObject({ id: 'hitman' });

    await publish(db, 'models-car');
    expect(await whatIsLive(db)).toMatchObject({ id: 'models-car' });
    // Exactly one, always — two live rows would make the page's choice arbitrary.
    expect(db.rows.filter((row) => row.live)).toHaveLength(1);
  });

  it('serves nothing published rather than a URL that 404s', async () => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();
    await call(db, [file('hitman.glb'), file('models/car.glb')]);
    await publish(db, 'models-car');

    // The file goes away underneath a live model.
    await call(db, [file('hitman.glb')]);

    // The row keeps its flag, but the page falls back to the bundled asset
    // instead of loading a model that is not there.
    expect(db.rows.find((row) => row.modelId === 'models-car')?.live).toBe(true);
    expect(await whatIsLive(db)).toBeNull();
  });

  it('refuses to publish a model whose file is gone', async () => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();
    await call(db, [file('hitman.glb'), file('models/car.glb')]);
    await call(db, [file('hitman.glb')]);

    await expect(publish(db, 'models-car')).rejects.toThrow(/missing/i);
  });

  it('refuses an id that was never synced', async () => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();
    await call(db, [file('hitman.glb')]);

    await expect(publish(db, 'ghost')).rejects.toThrow(/unknown model/i);
  });

  it('forgets any row, including one whose file is still there', async () => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();
    await call(db, [file('hitman.glb'), file('models/car.glb')]);

    await runForget({ db } as unknown, { token: TOKEN, modelId: 'models-car' });
    expect(db.rows.map((row) => row.modelId)).toEqual(['hitman']);
  });

  it('lets SYNC bring a deleted-but-present row straight back', async () => {
    // The honest limit of deleting a scanned row, and why the confirm says so:
    // sync upserts by id, so the file in public/ re-creates it on the next scan.
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();
    await call(db, [file('hitman.glb'), file('models/car.glb')]);
    await runForget({ db } as unknown, { token: TOKEN, modelId: 'models-car' });

    await call(db, [file('hitman.glb'), file('models/car.glb')]);
    expect(db.rows.map((row) => row.modelId).sort()).toEqual(['hitman', 'models-car']);
  });

  it('refuses the live one — that would drop the site to the bundled asset', async () => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();
    await call(db, [file('hitman.glb'), file('models/car.glb')]);
    await publish(db, 'models-car');

    await expect(runForget({ db } as unknown, { token: TOKEN, modelId: 'models-car' }))
      .rejects.toThrow(/publish another model/i);
    expect(db.rows).toHaveLength(2);
  });

  it('lets a forgotten path come back with the same id', async () => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();
    await call(db, [file('hitman.glb'), file('models/car.glb')]);
    await call(db, [file('hitman.glb')]);
    await runForget({ db } as unknown, { token: TOKEN, modelId: 'models-car' });

    // Same path, so the same id — which is why the preset is left behind.
    const result = await call(db, [file('hitman.glb'), file('models/car.glb')]);
    expect(result).toEqual({ added: 1, updated: 0, total: 2, missing: 0 });
    expect(db.rows.map((row) => row.modelId)).toContain('models-car');
  });

  it('rejects a bad token before touching a row', async () => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();
    await call(db, [file('hitman.glb')]);

    await expect(
      runSetLive({ db } as unknown, { token: 'wrong', modelId: 'hitman' }),
    ).rejects.toThrow(/unauthorized/i);
    expect(db.rows.some((row) => row.live)).toBe(false);
  });

  it('encodes a URL that would otherwise break the fetch', async () => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();
    await call(db, [file('models/Sports Car.glb')]);

    expect(db.rows[0].url).toBe('/models/Sports%20Car.glb');
    expect(db.rows[0].modelId).toBe('models-sports-car');
  });

  it('rejects a bad token, and an unset one, rather than writing', async () => {
    const db = fakeDb();
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    await expect(
      runSync({ db } as unknown, { token: 'wrong', files: [file('hitman.glb')] }),
    ).rejects.toThrow(/unauthorized/i);

    vi.stubEnv('STUDIO_TOKEN', '');
    await expect(call(db, [file('hitman.glb')])).rejects.toThrow(/not set/i);
    expect(db.rows).toHaveLength(0);
  });
});

/* ------------------------------------------------------------ uploaded rows */

const uploaded = (modelId: string, storageId: string, over: Partial<Row> = {}): Row => ({
  _id: `up-${modelId}`,
  modelId,
  name: modelId,
  storageId,
  bytes: 1024,
  ...over,
});

describe('a model uploaded through the studio', () => {
  beforeEach(() => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
  });

  it('survives a SYNC that never sees it', async () => {
    // It was never in public/ and never will be. Flagging it here would take the
    // site's hero down on the first SYNC after an upload.
    const db = fakeDb();
    db.rows.push(uploaded('portrait', 'file-1'));
    await call(db, [file('hitman.glb')]);

    expect(db.rows.find((row) => row.modelId === 'portrait')?.missing).toBeFalsy();
  });

  it('is not counted among the missing', async () => {
    const db = fakeDb();
    db.rows.push(uploaded('portrait', 'file-1'));
    const result = await call(db, [file('hitman.glb')]);
    expect(result.missing).toBe(0);
  });

  it('resolves its URL from storage at read time', async () => {
    const db = fakeDb();
    const storage = fakeStorage(new Set(['file-1']));
    db.rows.push(uploaded('portrait', 'file-1', { live: true }));

    const live = await runLive({ db, storage } as unknown, {} as Record<string, never>);
    expect(live).toMatchObject({ id: 'portrait', url: 'https://files.example/file-1' });
  });

  it('is not served once its file is gone from storage', async () => {
    // Same rule as a scanned file that left public/: the bundled asset is a
    // worse page than the one that was published, and a 404 is worse than both.
    const db = fakeDb();
    db.rows.push(uploaded('portrait', 'file-1', { live: true }));
    const live = await runLive({ db, storage: fakeStorage() } as unknown, {} as Record<string, never>);
    expect(live).toBeNull();
  });

  it('takes its bytes with it when forgotten', async () => {
    const db = fakeDb();
    const storage = fakeStorage(new Set(['file-1']));
    db.rows.push(uploaded('portrait', 'file-1'));

    await runForget({ db, storage } as unknown, { token: TOKEN, modelId: 'portrait' });
    expect(storage.deleted).toEqual(['file-1']);
    expect(db.rows).toHaveLength(0);
  });

  it('cannot be deleted while it is the live model', async () => {
    const db = fakeDb();
    const storage = fakeStorage(new Set(['file-1']));
    db.rows.push(uploaded('portrait', 'file-1', { live: true }));

    await expect(
      runForget({ db, storage } as unknown, { token: TOKEN, modelId: 'portrait' }),
    ).rejects.toThrow(/publish another model/i);
    expect(storage.deleted).toEqual([]);
  });
});

/* ------------------------------------------------- a file swapped in place */

describe('replacing a .glb under the same name', () => {
  beforeEach(() => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
  });

  it('is reported, because `added` cannot see it', async () => {
    // The whole reason this count exists: swap a model, press SYNC, and
    // "+0 NEW" is true and reads exactly like the scan never found the file.
    const db = fakeDb();
    await call(db, [file('rahman-3d.glb', { bytes: 3524492 })]);

    const result = await call(db, [file('rahman-3d.glb', { bytes: 1838500 })]);
    expect(result).toMatchObject({ added: 0, updated: 1, total: 1 });
  });

  it('is not reported when nothing about the file changed', async () => {
    const db = fakeDb();
    await call(db, [file('rahman-3d.glb', { bytes: 3524492 })]);

    expect(await call(db, [file('rahman-3d.glb', { bytes: 3524492 })])).toMatchObject({ updated: 0 });
  });

  it('hands the browser a URL it has not cached', async () => {
    // public/ paths are permanent and cached for an hour plus a week of
    // stale-while-revalidate, so without the size on the URL a swapped model
    // keeps serving the geometry every visitor already has.
    const db = fakeDb();
    const storage = fakeStorage();
    await call(db, [file('rahman-3d.glb', { bytes: 3524492 })]);
    await publish(db, 'rahman-3d');

    const before = await runLive({ db, storage } as unknown, {} as Record<string, never>);
    await call(db, [file('rahman-3d.glb', { bytes: 1838500 })]);
    const after = await runLive({ db, storage } as unknown, {} as Record<string, never>);

    expect(before?.url).toBe('/rahman-3d.glb?v=3524492');
    expect(after?.url).toBe('/rahman-3d.glb?v=1838500');
  });

  it('leaves an uploaded model\'s URL alone — a new upload is already a new id', async () => {
    const db = fakeDb();
    const storage = fakeStorage(new Set(['file-1']));
    db.rows.push(uploaded('portrait', 'file-1', { live: true }));

    const live = await runLive({ db, storage } as unknown, {} as Record<string, never>);
    expect(live?.url).toBe('https://files.example/file-1');
  });
});
