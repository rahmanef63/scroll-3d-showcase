import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * Mirrors `CameraKeyframe` in the slice. The slice stays backend-agnostic, so
 * the shape is duplicated here on purpose — this file is the wire contract.
 */
export const keyframeValidator = v.object({
  p: v.number(),
  azimuth: v.number(),
  elevation: v.number(),
  radius: v.number(),
  targetX: v.optional(v.number()),
  targetY: v.number(),
  targetZ: v.optional(v.number()),
  screenShiftX: v.number(),
  fov: v.number(),
  label: v.string(),
});

/** `position` is [x, y, z]; length is checked in the mutation, not the validator. */
export const markerValidator = v.object({
  name: v.string(),
  position: v.array(v.number()),
});

/** Partial: the studio only saves the knobs it actually changed. */
export const settingsValidator = v.object({
  modelHeight: v.optional(v.number()),
  scrollLength: v.optional(v.number()),
  damping: v.optional(v.number()),
  parallax: v.optional(v.number()),
  bloom: v.optional(v.boolean()),
});

/**
 * One copy panel. `fade` is two fields rather than an array so there is no
 * length to validate by hand, unlike `markerValidator.position`.
 */
export const copyValidator = v.object({
  id: v.string(),
  name: v.string(),
  progress: v.number(),
  fadeIn: v.number(),
  fadeOut: v.number(),
  align: v.union(v.literal('start'), v.literal('end')),
  kicker: v.string(),
  heading: v.string(),
  body: v.string(),
});

/** Everything about the showcase that is words. Optional on the row: presets saved before 0.7.0 have none. */
export const contentValidator = v.object({
  title: v.string(),
  /** Optional: presets saved before 0.9.0 have none, and fall back to `title`. */
  bootTitle: v.optional(v.string()),
  brand: v.string(),
  description: v.string(),
  sections: v.array(copyValidator),
});

export default defineSchema({
  models: defineTable({
    /** Slug of the path under public/, assigned once and never reassigned. */
    modelId: v.string(),
    name: v.string(),
    /**
     * Path under public/ for a file the host scanned. Absent on an uploaded
     * model, whose URL is resolved from `storageId` at read time — storage URLs
     * are the deployment's to hand out, not ours to cache in a row.
     */
    url: v.optional(v.string()),
    /** Set only on a model uploaded through /studio. Exactly one of the two. */
    storageId: v.optional(v.id('_storage')),
    bytes: v.number(),
    /**
     * The one model `/` renders. At most one row carries it — `models.setLive`
     * clears the others in the same mutation. Unset on every row means "nothing
     * has been published", and the host falls back to its bundled asset.
     */
    live: v.optional(v.boolean()),
    /**
     * The file is gone from the host's scan. Rows are flagged rather than
     * deleted so an id is never reassigned and a tuned preset survives a file
     * being moved out and back. A flagged row cannot be published, and stops
     * being served if it already was.
     */
    missing: v.optional(v.boolean()),
  }).index('by_modelId', ['modelId']),

  presets: defineTable({
    modelId: v.string(),
    keyframes: v.array(keyframeValidator),
    markers: v.array(markerValidator),
    settings: v.optional(settingsValidator),
    content: v.optional(contentValidator),
    updatedAt: v.number(),
  }).index('by_modelId', ['modelId']),
});
