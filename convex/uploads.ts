import { v } from 'convex/values';
import { internal } from './_generated/api';
import { action, internalMutation, mutation } from './_generated/server';
import { requireStudioToken } from './lib';
import { MAX_MODELS, toModelId } from './shape';

/**
 * Hard ceiling on an uploaded model.
 *
 * Storage is cheap; serving is not. Every visitor downloads this file in full,
 * so the cap is really a bandwidth budget: 16 MB is a raw generator export with
 * room to spare, and anything above it is a file that should have been
 * compressed before it was uploaded. The guide says so too.
 */
export const MAX_UPLOAD_BYTES = 16 * 1024 * 1024;

/** 'glTF' as a little-endian uint32 — the first four bytes of every .glb. */
const GLB_MAGIC = 0x46546c67;

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    requireStudioToken(args.token);
    return ctx.storage.generateUploadUrl();
  },
});

/**
 * Turns an uploaded blob into a model row, or deletes it.
 *
 * An action rather than a mutation because this is the only place the bytes can
 * actually be read: a browser sets whatever content type it likes, a file
 * extension is a naming convention, and neither says anything about what was
 * uploaded. The first twelve bytes do. A file that fails any check is deleted
 * here and now — it is never listed, never served, and never sits in storage
 * costing anything.
 */
export const register = action({
  args: { token: v.string(), storageId: v.id('_storage'), name: v.string() },
  returns: v.object({ id: v.string(), bytes: v.number() }),
  handler: async (ctx, args) => {
    requireStudioToken(args.token);

    const blob = await ctx.storage.get(args.storageId);
    if (!blob) throw new Error('That upload is gone — try again');

    try {
      // The whole blob, not `blob.slice(0, 12)`: this runtime's sliced blobs
      // report the original length and hand back a shorter buffer, which throws
      // a RangeError before any of the checks below get to run. The cap above is
      // what keeps reading it bounded.
      const bytes = new Uint8Array(await blob.arrayBuffer());
      requireGlb(blob.size, bytes.subarray(0, 12));
    } catch (error) {
      await ctx.storage.delete(args.storageId);
      throw error;
    }

    const id: string = await ctx.runMutation(internal.uploads.insert, {
      storageId: args.storageId,
      name: args.name,
      bytes: blob.size,
    });
    return { id, bytes: blob.size };
  },
});

/** Everything the bytes themselves have to answer for. Exported for its test. */
export function requireGlb(size: number, head: Uint8Array): void {
  if (size > MAX_UPLOAD_BYTES) {
    const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;
    throw new Error(`Model is ${mb(size)} — the limit is ${mb(MAX_UPLOAD_BYTES)}. Compress it first.`);
  }
  // 12 bytes is the whole glB header: magic, version, total length.
  if (head.byteLength < 12) throw new Error('That file is too short to be a .glb');

  const header = new DataView(head.buffer, head.byteOffset, head.byteLength);
  if (header.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error('That is not a .glb — a glTF binary starts with "glTF"');
  }
  const version = header.getUint32(4, true);
  if (version !== 2) throw new Error(`glTF version ${version} — the loader reads version 2`);
  // The header's own length field disagreeing with the file is a truncated
  // upload, which fails deep inside the parser with nothing useful to say.
  if (header.getUint32(8, true) !== size) {
    throw new Error('That .glb is truncated — the upload did not finish');
  }
}

/**
 * Writes the row. Internal: the checks above are the door, and a public
 * mutation here would be a way around them.
 */
export const insert = internalMutation({
  args: { storageId: v.id('_storage'), name: v.string(), bytes: v.number() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const rows = await ctx.db.query('models').withIndex('by_modelId').take(MAX_MODELS);
    if (rows.length >= MAX_MODELS) {
      await ctx.storage.delete(args.storageId);
      throw new Error(`Too many models: ${rows.length} (max ${MAX_MODELS})`);
    }

    const name = args.name.replace(/\.(glb|gltf)$/i, '').slice(0, 80) || 'model';
    const taken = new Set(rows.map((row) => row.modelId));
    // Ids are permanent and a preset hangs off each one, so an upload that
    // happens to share a name with an existing model gets its own id rather
    // than inheriting that model's camera path.
    const base = toModelId(name) || 'model';
    let modelId = base;
    for (let suffix = 2; taken.has(modelId); suffix += 1) modelId = `${base}-${suffix}`;

    await ctx.db.insert('models', {
      modelId,
      name,
      storageId: args.storageId,
      bytes: args.bytes,
      missing: false,
    });
    return modelId;
  },
});
