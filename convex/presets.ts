import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireAtMost, requireStudioToken } from './lib';
import { contentValidator, keyframeValidator, markerValidator, settingsValidator } from './schema';

/** One camera path is a handful of stops; the caps only stop runaway payloads. */
const MAX_KEYFRAMES = 64;
const MAX_MARKERS = 64;
const MAX_SECTIONS = 24;

const presetValidator = v.object({
  keyframes: v.array(keyframeValidator),
  markers: v.array(markerValidator),
  settings: v.optional(settingsValidator),
  content: v.optional(contentValidator),
});

/** Null means "never saved" — the host falls back to the slice defaults. */
export const get = query({
  args: { modelId: v.string() },
  returns: v.union(presetValidator, v.null()),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('presets')
      .withIndex('by_modelId', (q) => q.eq('modelId', args.modelId))
      .unique();
    if (!row) return null;
    return {
      keyframes: row.keyframes,
      markers: row.markers,
      settings: row.settings,
      content: row.content,
    };
  },
});

/** One row per modelId: upsert through the index rather than appending versions. */
export const save = mutation({
  args: {
    token: v.string(),
    modelId: v.string(),
    keyframes: v.array(keyframeValidator),
    markers: v.array(markerValidator),
    settings: v.optional(settingsValidator),
    content: v.optional(contentValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireStudioToken(args.token);
    // sampleKeyframes throws on an empty path, inside the rAF callback, which
    // never re-arms — an empty save would blank the site until the cache expires.
    if (args.keyframes.length === 0) throw new Error('A preset needs at least one keyframe');
    requireAtMost(args.keyframes.length, MAX_KEYFRAMES, 'keyframes');
    requireAtMost(args.markers.length, MAX_MARKERS, 'markers');
    requireAtMost(args.content?.sections.length ?? 0, MAX_SECTIONS, 'sections');
    // A short position renders as NaN in the rig, so reject it at the door.
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
    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert('presets', { modelId: args.modelId, ...fields });
    }
    return null;
  },
});
