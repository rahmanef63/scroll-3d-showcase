import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import { contentValidator, keyframeValidator, markerValidator, settingsValidator } from './schema';

/**
 * Writes one model's preset from a JSON file — byte-for-byte the file /studio's
 * EXPORT button produces, so the seeds under `seed/` are re-exportable and any
 * tuning session can become a new seed.
 *
 *   npx convex run seed:preset "$(cat seed/rahman-3d.json)"
 *   npx convex run seed:preset --prod "$(cat seed/rahman-3d.json)"
 *
 * `internalMutation`, so `npx convex run` authenticates as the deployment admin
 * and STUDIO_TOKEN never travels on a command line or into a shell history.
 * That also means the public HTTP surface is unchanged: this cannot be called
 * from a browser at all.
 *
 * It does NOT create the `models` row — SYNC in the studio owns that, from the
 * host's scan of public/. The id is derived from the filename either way, so
 * seeding first and syncing after lands on the same row.
 */
export const preset = internalMutation({
  args: {
    /** Present in an exported file; accepted and ignored while there is one version. */
    version: v.optional(v.number()),
    modelId: v.string(),
    keyframes: v.array(keyframeValidator),
    markers: v.array(markerValidator),
    settings: v.optional(settingsValidator),
    content: v.optional(contentValidator),
    /** A seed never silently replaces tuning someone did by hand. */
    force: v.optional(v.boolean()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Same two guards as `presets.save`: an empty path throws inside the rAF
    // loop, and a short marker position renders as NaN in the rig.
    if (args.keyframes.length === 0) throw new Error('A preset needs at least one keyframe');
    if (args.markers.some((marker) => marker.position.length !== 3)) {
      throw new Error('Marker position must be [x, y, z]');
    }

    const existing = await ctx.db
      .query('presets')
      .withIndex('by_modelId', (q) => q.eq('modelId', args.modelId))
      .unique();

    const fields = {
      keyframes: args.keyframes,
      markers: args.markers,
      settings: args.settings,
      content: args.content,
      updatedAt: Date.now(),
    };

    if (!existing) {
      await ctx.db.insert('presets', { modelId: args.modelId, ...fields });
      return `INSERTED ${args.modelId}`;
    }
    if (!args.force) {
      return `SKIPPED ${args.modelId} — a preset already exists. Re-run with "force": true to overwrite.`;
    }
    await ctx.db.patch(existing._id, fields);
    return `UPDATED ${args.modelId}`;
  },
});
