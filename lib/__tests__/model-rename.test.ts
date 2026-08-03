import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rename, sync } from '@/convex/models';
import { toModel } from '@/convex/shape';

/**
 * Host-side test for backend code, for the reason spelled out in
 * model-sync.test.ts: `npx convex deploy` bundles every module under convex/,
 * and a file importing vitest would not survive that.
 */
const handler = <A, R>(fn: unknown) =>
  (fn as { _handler: (ctx: unknown, args: A) => Promise<R> })._handler;

const runRename = handler<{ token: string; modelId: string; label: string }, null>(rename);
const runSync = handler<
  { token: string; files: { path: string; name: string; bytes: number }[] },
  { added: number; total: number; missing: number }
>(sync);

const TOKEN = 'studio-secret';

interface Row {
  _id: string;
  modelId: string;
  name: string;
  label?: string;
  url?: string;
  storageId?: string;
  bytes: number;
  live?: boolean;
  missing?: boolean;
}

/** Copied rather than shared, exactly like the second backend test file. */
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
  };
}

const file = (path: string) => ({ path, name: path.replace(/\.glb$/, ''), bytes: 100 });

const seed = (db: ReturnType<typeof fakeDb>) =>
  runSync({ db } as unknown, { token: TOKEN, files: [file('hitman.glb')] });

const renameIt = (db: ReturnType<typeof fakeDb>, modelId: string, label: string) =>
  runRename({ db } as unknown, { token: TOKEN, modelId, label });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('models.rename', () => {
  beforeEach(() => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
  });

  it('writes the label and leaves the identity alone', async () => {
    const db = fakeDb();
    await seed(db);

    await renameIt(db, 'hitman', 'Agent 47');

    expect(db.rows[0].label).toBe('Agent 47');
    // The id is what the presets table joins on, and nothing cascades.
    expect(db.rows[0].modelId).toBe('hitman');
    // `name` still says what the scan saw, which is what keeps nested files apart.
    expect(db.rows[0].name).toBe('hitman');
  });

  it('survives a SYNC, which is the whole reason it is not written to name', async () => {
    const db = fakeDb();
    await seed(db);
    await renameIt(db, 'hitman', 'Agent 47');

    await seed(db);

    expect(db.rows[0].label).toBe('Agent 47');
  });

  it('trims, and caps a pasted path rather than storing it whole', async () => {
    const db = fakeDb();
    await seed(db);

    await renameIt(db, 'hitman', `  ${'x'.repeat(200)}  `);

    expect(db.rows[0].label).toHaveLength(80);
  });

  it('clears the override when the label is emptied', async () => {
    const db = fakeDb();
    await seed(db);
    await renameIt(db, 'hitman', 'Agent 47');

    await renameIt(db, 'hitman', '   ');

    expect(db.rows[0].label).toBeUndefined();
  });

  it('refuses an id that was never synced', async () => {
    const db = fakeDb();
    await seed(db);

    await expect(renameIt(db, 'ghost', 'Nobody')).rejects.toThrow(/unknown model/i);
  });

  it('rejects a bad token, and an unset one, rather than writing', async () => {
    const db = fakeDb();
    await seed(db);

    await expect(
      runRename({ db } as unknown, { token: 'wrong', modelId: 'hitman', label: 'Agent 47' }),
    ).rejects.toThrow(/unauthorized/i);

    vi.stubEnv('STUDIO_TOKEN', '');
    await expect(renameIt(db, 'hitman', 'Agent 47')).rejects.toThrow(/not set/i);
    expect(db.rows[0].label).toBeUndefined();
  });
});

describe('toModel', () => {
  const storage = { async getUrl() { return null; } };

  it('prefers the studio label over what the scan called the file', async () => {
    const model = await toModel({ storage }, {
      modelId: 'hitman',
      name: 'models/hitman',
      label: 'Agent 47',
      url: '/models/hitman.glb',
      bytes: 100,
    });
    expect(model.name).toBe('Agent 47');
  });

  it('falls back to the scanned name when nothing was renamed', async () => {
    const model = await toModel({ storage }, {
      modelId: 'hitman',
      name: 'models/hitman',
      url: '/models/hitman.glb',
      bytes: 100,
    });
    expect(model.name).toBe('models/hitman');
  });
});
