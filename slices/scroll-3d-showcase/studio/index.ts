/**
 * Editor surface, deliberately a SECOND entry point.
 *
 * The runtime barrel (`../index.ts`) is imported by the public page. Re-exporting
 * `ShowcaseStudio` from there put the whole editor — fields, sliders, history,
 * playback, path map — in the chunk every visitor downloads, because a value
 * re-export keeps the module graph alive whether or not anyone calls it. It hid
 * well: the editor landed inside the same chunk as three.js, so the route table
 * never showed it. Only grepping the emitted chunk for `AT LOOK-AT` did.
 *
 * So: import from `@/slices/scroll-3d-showcase` to render a showcase, and from
 * `@/slices/scroll-3d-showcase/studio` to edit one. Only the second costs the
 * editor's weight, and only on the route that mounts it.
 */

export { ShowcaseStudio } from './showcase-studio';
export { createMockStudioAdapter } from './mock-adapter';
export type {
  ContentPreset,
  ShowcaseModel,
  ShowcasePreset,
  ShowcaseStudioAdapter,
  ShowcaseStudioProps,
} from './types';
