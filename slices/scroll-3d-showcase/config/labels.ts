import type { HudLabels } from '../types';

/**
 * HUD chrome copy. These are defaults, not hardcoded strings — every consumer
 * can replace them wholesale through the `labels` prop, including translations.
 * Section and panel copy is never defined here; it comes from `sections`.
 */
export const DEFAULT_HUD_LABELS: HudLabels = {
  systemStatus: 'SYS ONLINE',
  brand: 'PROFILE',
  sectionPrefix: 'SEC',
  targetPrefix: 'TARGET',
  scrollHint: 'SCROLL',
  meterCaption: 'SCAN',
  bootStages: ['INITIALIZING', 'LOADING GEOMETRY', 'BUILDING MATERIALS', 'CALIBRATING CAMERA'],
  errors: {
    FILE_PROTOCOL: 'This page is open over file:// — the browser blocks reading the 3D model. Serve it over http instead.',
    MODEL_FETCH_FAILED: 'The 3D model could not be downloaded. Check that the file exists at the given path.',
    MODEL_PARSE_FAILED: 'The 3D model downloaded but could not be read. The file may be corrupt.',
    WEBGL_UNAVAILABLE: 'This browser or device has WebGL disabled, so the 3D scene cannot start.',
  },
};
