import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireAtMost, requireStudioToken } from './lib';
import { MAX_MODELS, modelValidator, toModel, toModelId, toUrl } from './shape';

// Re-exported because the ID RULE is what the host's constants are checked
// against, and that check imports from here.
export { toModelId };

export const list = query({
  args: {},
  returns: v.array(modelValidator),
  handler: async (ctx) => {
    const rows = await ctx.db.query('models').withIndex('by_modelId').take(MAX_MODELS);
    return Promise.all(rows.map((row) => toModel(ctx, row)));
  },
});

/**
 * The model `/` renders, or null when nothing has been published yet.
 *
 * A scan of the table rather than its own index: `public/` holds a handful of
 * files, and one flag on the row it belongs to beats a second table that can
 * fall out of sync with it.
 */
export const live = query({
  args: {},
  returns: v.union(modelValidator, v.null()),
  handler: async (ctx) => {
    const rows = await ctx.db.query('models').withIndex('by_modelId').take(MAX_MODELS);
    // A published model whose file vanished would serve the page a 404 URL and a
    // permanently blank canvas. Falling back to the host's bundled asset is the
    // one degradation a visitor can actually use.
    const row = rows.find((entry) => entry.live && !entry.missing);
    if (!row) return null;
    const model = await toModel(ctx, row);
    // A published upload whose file was deleted out from under it lands here.
    return model.missing ? null : model;
  },
});

/** Publishes one model and unpublishes the rest, in one transaction. */
export const setLive = mutation({
  args: { token: v.string(), modelId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireStudioToken(args.token);
    const rows = await ctx.db.query('models').withIndex('by_modelId').take(MAX_MODELS);
    const target = rows.find((row) => row.modelId === args.modelId);
    // Publishing an id that was never synced would leave the site pointing at a
    // URL nobody has checked exists.
    if (!target) throw new Error(`Unknown model: ${args.modelId.slice(0, 40)}`);
    // And publishing one whose file is gone is the same mistake with a receipt.
    if (target.missing) throw new Error(`Model file is missing: ${target.url}`);

    for (const row of rows) {
      const next = row._id === target._id;
      if (Boolean(row.live) !== next) await ctx.db.patch(row._id, { live: next });
    }
    return null;
  },
});

/**
 * Drops a row whose file is gone, for good.
 *
 * Only a flagged row: deleting a live one would be a way to un-publish by
 * accident, and deleting a present one would let its id be reassigned to a
 * different file on the next scan. The **preset is left behind** on purpose —
 * if the same path ever comes back it gets the same id, and its tuning with it.
 */
export const forget = mutation({
  args: { token: v.string(), modelId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireStudioToken(args.token);
    const row = await ctx.db
      .query('models')
      .withIndex('by_modelId', (q) => q.eq('modelId', args.modelId))
      .unique();
    if (!row) throw new Error(`Unknown model: ${args.modelId.slice(0, 40)}`);
    // An upload has no file in public/ to go missing, so this is the only way to
    // delete one — and the only way its bytes ever leave storage.
    if (!row.missing && !row.storageId) {
      throw new Error('Only a model whose file is gone can be forgotten');
    }
    if (row.live && !row.missing) {
      throw new Error('Publish another model before deleting the live one');
    }

    if (row.storageId) await ctx.storage.delete(row.storageId);
    await ctx.db.delete(row._id);
    return null;
  },
});

/**
 * Upsert from the host's fs scan of public/. Ids are assigned on first sight and
 * never reassigned; rows for files that vanished are kept and flagged rather than
 * deleted — a missing model is a mistake to fix, not a reason to drop its saved
 * preset, and deleting would let the id be handed to a different file later.
 */
export const sync = mutation({
  args: {
    token: v.string(),
    files: v.array(
      v.object({
        path: v.string(),
        name: v.string(),
        bytes: v.number(),
      }),
    ),
  },
  returns: v.object({ added: v.number(), total: v.number(), missing: v.number() }),
  handler: async (ctx, args) => {
    requireStudioToken(args.token);
    requireAtMost(args.files.length, MAX_MODELS, 'model files');

    let added = 0;
    const seen = new Set<string>();
    for (const file of args.files) {
      const modelId = toModelId(file.path);
      if (!modelId) continue;
      seen.add(modelId);

      const existing = await ctx.db
        .query('models')
        .withIndex('by_modelId', (q) => q.eq('modelId', modelId))
        .unique();

      // A file that came back clears its own flag, so moving one out and in is
      // a round trip rather than a one-way door.
      const fields = { name: file.name, url: toUrl(file.path), bytes: file.bytes, missing: false };
      if (existing) {
        await ctx.db.patch(existing._id, fields);
      } else {
        await ctx.db.insert('models', { modelId, ...fields });
        added += 1;
      }
    }

    const rows = await ctx.db.query('models').withIndex('by_modelId').take(MAX_MODELS);
    let missing = 0;
    for (const row of rows) {
      // An uploaded model was never in the scan and never will be. Flagging it
      // here would delete the site's hero on the first SYNC after an upload.
      if (row.storageId) continue;
      const gone = !seen.has(row.modelId);
      if (gone) missing += 1;
      if (Boolean(row.missing) !== gone) await ctx.db.patch(row._id, { missing: gone });
    }

    return { added, total: rows.length, missing };
  },
});
