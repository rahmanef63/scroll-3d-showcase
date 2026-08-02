import { afterEach, describe, expect, it, vi } from 'vitest';
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
const runLive = handler<Record<string, never>, { id: string } | null>(live);
const runForget = handler<{ token: string; modelId: string }, null>(forget);

const TOKEN = 'studio-secret';

interface Row {
  _id: string;
  modelId: string;
  name: string;
  url: string;
  bytes: number;
  live?: boolean;
  missing?: boolean;
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
    expect(result).toEqual({ added: 2, total: 2, missing: 0 });
    expect(db.rows.map((row) => row.modelId)).toEqual(['hitman', 'models-car']);
    expect(db.rows.map((row) => row.url)).toEqual(['/hitman.glb', '/models/car.glb']);
  });

  it('never reassigns an id when the same file is re-synced', async () => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();
    await call(db, [file('hitman.glb')]);
    const original = { ...db.rows[0] };

    const result = await call(db, [file('hitman.glb', { name: 'Hitman v2', bytes: 999 })]);

    expect(result).toEqual({ added: 0, total: 1, missing: 0 });
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
    expect(result).toEqual({ added: 0, total: 2, missing: 1 });
    expect(db.rows.map((row) => row.modelId)).toEqual(['hitman', 'models-car']);
    expect(db.rows.map((row) => Boolean(row.missing))).toEqual([false, true]);
  });

  it('clears the flag when the file comes back', async () => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();
    await call(db, [file('hitman.glb'), file('models/car.glb')]);
    await call(db, [file('hitman.glb')]);

    const result = await call(db, [file('hitman.glb'), file('models/car.glb')]);
    expect(result).toEqual({ added: 0, total: 2, missing: 0 });
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

  it('forgets a flagged row, and only a flagged row', async () => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();
    await call(db, [file('hitman.glb'), file('models/car.glb')]);

    // Present: refusing here is what stops FORGET becoming a delete button.
    await expect(runForget({ db } as unknown, { token: TOKEN, modelId: 'models-car' }))
      .rejects.toThrow(/file is gone/i);

    await call(db, [file('hitman.glb')]);
    await runForget({ db } as unknown, { token: TOKEN, modelId: 'models-car' });
    expect(db.rows.map((row) => row.modelId)).toEqual(['hitman']);
  });

  it('lets a forgotten path come back with the same id', async () => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
    const db = fakeDb();
    await call(db, [file('hitman.glb'), file('models/car.glb')]);
    await call(db, [file('hitman.glb')]);
    await runForget({ db } as unknown, { token: TOKEN, modelId: 'models-car' });

    // Same path, so the same id — which is why the preset is left behind.
    const result = await call(db, [file('hitman.glb'), file('models/car.glb')]);
    expect(result).toEqual({ added: 1, total: 2, missing: 0 });
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
