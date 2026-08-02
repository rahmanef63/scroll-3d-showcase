/**
 * Runtime surface of the scroll-3d-showcase slice — what a visitor's page needs.
 *
 * Everything a consumer touches goes through a barrel; nothing outside the slice
 * should reach into `lib/`, `hooks/` or `components/` directly. There are two of
 * them, and the split is load-bearing rather than cosmetic: the editor lives at
 * `./studio`, because a value re-export keeps a module graph alive whether or
 * not anyone calls it. With the editor listed here, `/` shipped the fields,
 * sliders, history and path map to every visitor of a page that only renders
 * the scene — measured at 34 KB raw, folded into the same chunk as three.js so
 * nothing in the build output made it visible.
 */

export { Scroll3DShowcase } from './components/scroll-3d-showcase';
export type { Scroll3DShowcaseProps } from './components/scroll-3d-showcase';

export {
  DEFAULT_KEYFRAMES,
  DEFAULT_MARKERS,
  DEFAULT_SCENE_SETTINGS,
} from './config/keyframes';
export { DEFAULT_HUD_LABELS } from './config/labels';
export { useShowcaseJump } from './hooks/use-showcase-jump';
export type { ShowcaseJumpApi } from './hooks/use-showcase-jump';

export type {
  AnchorMarker,
  CameraFrame,
  CameraKeyframe,
  FrameState,
  HudLabels,
  SceneSettings,
  ShowcaseContent,
  ShowcaseCopy,
  ShowcaseError,
  ShowcaseErrorCode,
  ShowcaseSection,
} from './types';
