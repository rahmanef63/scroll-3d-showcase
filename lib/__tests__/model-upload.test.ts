import { describe, expect, it } from 'vitest';
import { MAX_UPLOAD_BYTES, insert, requireGlb } from '@/convex/uploads';

/**
 * The upload path is the one place a stranger's bytes reach this deployment, and
 * every byte that gets past these checks is served to every visitor afterwards.
 * So the checks are tested against what a wrong file actually looks like, not
 * against a mocked "invalid".
 */

/** A real glB header: 'glTF', version, total length. */
function header(over: { magic?: number; version?: number; length?: number } = {}): Uint8Array {
  const bytes = new Uint8Array(12);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, over.magic ?? 0x46546c67, true);
  view.setUint32(4, over.version ?? 2, true);
  view.setUint32(8, over.length ?? 1024, true);
  return bytes;
}

describe('requireGlb', () => {
  it('passes a well-formed glB', () => {
    expect(() => requireGlb(1024, header())).not.toThrow();
  });

  it('refuses anything over the bandwidth cap', () => {
    // Storage is cheap and serving is not: this file would be downloaded in
    // full by every visitor, forever.
    expect(() => requireGlb(MAX_UPLOAD_BYTES + 1, header({ length: MAX_UPLOAD_BYTES + 1 })))
      .toThrow(/limit/i);
  });

  it('refuses a file that is not a glB, whatever it is named', () => {
    // A PNG renamed to .glb — the extension said yes, the bytes say no.
    const png = new Uint8Array(12);
    new DataView(png.buffer).setUint32(0, 0x89504e47, false);
    expect(() => requireGlb(12, png)).toThrow(/not a \.glb/i);
  });

  it('refuses glTF 1, which the loader cannot read', () => {
    expect(() => requireGlb(1024, header({ version: 1 }))).toThrow(/version 1/);
  });

  it('refuses a truncated upload', () => {
    // The header claims 1024 bytes and 900 arrived: the parser would fail deep
    // inside three with nothing anyone can act on.
    expect(() => requireGlb(900, header({ length: 1024 }))).toThrow(/truncated/i);
  });

  it('reads a header that is a view into a larger buffer', () => {
    // A sliced blob can hand back exactly this, and a DataView over the whole
    // buffer would then read twelve bytes that are not the header.
    const padded = new Uint8Array(64);
    padded.set(header(), 20);
    expect(() => requireGlb(1024, padded.subarray(20, 32))).not.toThrow();
  });

  it('refuses a file too short to have a header at all', () => {
    expect(() => requireGlb(4, new Uint8Array(4))).toThrow(/too short/i);
  });
});

const handler = <A, R>(fn: unknown) =>
  (fn as { _handler: (ctx: unknown, args: A) => Promise<R> })._handler;

const runInsert = handler<{ storageId: string; name: string; bytes: number }, string>(insert);

function fakeCtx(existing: string[] = []) {
  const rows = existing.map((modelId, index) => ({ _id: `row-${index}`, modelId }));
  const deleted: string[] = [];
  return {
    deleted,
    rows,
    db: {
      query: () => ({ withIndex: () => ({ take: async () => rows }) }),
      insert: async (_table: string, doc: { modelId: string }) => {
        rows.push({ _id: `row-${rows.length}`, modelId: doc.modelId });
        return doc.modelId;
      },
    },
    storage: { delete: async (id: string) => void deleted.push(id) },
  };
}

describe('uploads.insert', () => {
  it('names the row after the file, minus its extension', async () => {
    const ctx = fakeCtx();
    const id = await runInsert(ctx, { storageId: 's1', name: 'Vintage Car.glb', bytes: 10 });
    expect(id).toBe('vintage-car');
  });

  it('never reuses an id that already belongs to another model', async () => {
    // Ids are permanent and a preset hangs off each one — reusing this id would
    // hand the upload someone else's camera path.
    const ctx = fakeCtx(['car', 'car-2']);
    expect(await runInsert(ctx, { storageId: 's1', name: 'car.glb', bytes: 10 })).toBe('car-3');
  });

  it('falls back to a name when the file name slugs to nothing', async () => {
    const ctx = fakeCtx();
    expect(await runInsert(ctx, { storageId: 's1', name: '---.glb', bytes: 10 })).toBe('model');
  });
});
