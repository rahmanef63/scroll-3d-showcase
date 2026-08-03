import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { remove, save } from '@/convex/presets';

/**
 * Host-side test for backend code, for the reason spelled out in
 * model-sync.test.ts: `npx convex deploy` bundles every module under convex/,
 * and a file importing vitest would not survive that.
 */
const handler = <A, R>(fn: unknown) =>
  (fn as { _handler: (ctx: unknown, args: A) => Promise<R> })._handler;

interface Keyframe {
  p: number;
  azimuth: number;
  elevation: number;
  radius: number;
  targetY: number;
  screenShiftX: number;
  fov: number;
  label: string;
}

interface SaveArgs {
  token: string;
  modelId: string;
  keyframes: Keyframe[];
  markers: { name: string; position: number[] }[];
}

const runSave = handler<SaveArgs, null>(save);
const runRemove = handler<{ token: string; modelId: string }, null>(remove);

const TOKEN = 'studio-secret';

interface Row {
  _id: string;
  modelId: string;
  keyframes: Keyframe[];
  markers: { name: string; position: number[] }[];
  updatedAt: number;
}

/** Copied rather than shared, exactly like the other backend test files. */
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

const KEY: Keyframe = {
  p: 0, azimuth: 0, elevation: 0, radius: 3, targetY: 0, screenShiftX: 0, fov: 36, label: 'KEY',
};

const seed = (db: ReturnType<typeof fakeDb>, modelId: string) =>
  runSave({ db } as unknown, { token: TOKEN, modelId, keyframes: [KEY], markers: [] });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('presets.remove', () => {
  beforeEach(() => {
    vi.stubEnv('STUDIO_TOKEN', TOKEN);
  });

  it('drops the row it was aimed at, and only that one', async () => {
    const db = fakeDb();
    await seed(db, 'hitman');
    await seed(db, 'rahman-3d');

    await runRemove({ db } as unknown, { token: TOKEN, modelId: 'hitman' });

    expect(db.rows.map((row) => row.modelId)).toEqual(['rahman-3d']);
  });

  it('is a no-op for a model nobody ever tuned', async () => {
    // Saying "unknown" here would make "clear this" fail on exactly the rows it
    // is aimed at — the orphans forget() leaves behind on purpose.
    const db = fakeDb();
    await expect(
      runRemove({ db } as unknown, { token: TOKEN, modelId: 'ghost' }),
    ).resolves.toBeNull();
    expect(db.rows).toHaveLength(0);
  });

  it('rejects a bad token, and an unset one, rather than deleting', async () => {
    const db = fakeDb();
    await seed(db, 'hitman');

    await expect(
      runRemove({ db } as unknown, { token: 'wrong', modelId: 'hitman' }),
    ).rejects.toThrow(/unauthorized/i);

    vi.stubEnv('STUDIO_TOKEN', '');
    await expect(
      runRemove({ db } as unknown, { token: TOKEN, modelId: 'hitman' }),
    ).rejects.toThrow(/not set/i);

    expect(db.rows).toHaveLength(1);
  });
});
