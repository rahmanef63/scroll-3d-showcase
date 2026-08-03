import type {
  AnchorMarker,
  CameraKeyframe,
  SceneSettings,
  ShowcaseContent,
} from '../types';

/** One GLB the host found. `id` is a slug of its path under public/. */
export interface ShowcaseModel {
  id: string;
  name: string;
  url: string;
  bytes: number;
  /**
   * Uploaded through the studio rather than found on the host's disk. It has no
   * file anyone can replace, so deleting the row is the only way to remove it.
   */
  uploaded?: boolean;
  /**
   * The file is gone. The row survives so its id is never reassigned and its
   * preset is not lost, but it cannot be published — the editor says so rather
   * than letting you point a live site at a 404.
   */
  missing?: boolean;
}

/**
 * A named set of words the host can offer as a one-click load — one per
 * character, brand or language. Host-owned, like the copy itself.
 */
export interface ContentPreset {
  id: string;
  label: string;
  content: ShowcaseContent;
}

/** Everything the studio edits for a single model. */
export interface ShowcasePreset {
  keyframes: CameraKeyframe[];
  markers: AnchorMarker[];
  settings?: Partial<SceneSettings>;
  /** Absent means the host never supplied any copy; the editor starts empty. */
  content?: ShowcaseContent;
}

/**
 * The studio's only route to a backend, so the slice stays backend-agnostic.
 * Reads are deliberately absent: the host loads models and the preset in a
 * server component and passes them in as props.
 */
export interface ShowcaseStudioAdapter {
  /** `missing` counts rows whose file the scan no longer finds. */
  syncModels(): Promise<{ added: number; total: number; missing?: number }>;
  savePreset(modelId: string, preset: ShowcasePreset): Promise<void>;
  /**
   * Points the public page at this model. Optional: a host that only ever shows
   * one asset has nothing to publish, and the `LIVE` chip is hidden when it is
   * absent rather than rendered as a button that does nothing.
   */
  setLiveModel?(modelId: string): Promise<void>;
  /**
   * Drops a model whose file is gone, or an uploaded one along with its bytes.
   * Optional; a host with neither case hides the chip entirely.
   */
  forgetModel?(modelId: string): Promise<void>;
  /**
   * Stores a .glb the visitor picked and returns the new model's id. Optional:
   * a host with no writable storage simply has no UPLOAD chip, and models keep
   * arriving through the filesystem scan.
   */
  uploadModel?(file: File): Promise<string>;
}
