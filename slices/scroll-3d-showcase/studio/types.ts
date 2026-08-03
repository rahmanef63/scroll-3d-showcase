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
 *
 * `loadPreset` is the one exception, and it is opt-in. The library's JSON column
 * edits any model's preset, not just the open one, and the editor only ever
 * holds one — passing all of them in as props would ship every keyframe of every
 * row on every render to serve the one a person clicked.
 */
export interface ShowcaseStudioAdapter {
  /**
   * `missing` counts rows whose file the scan no longer finds; `updated` counts
   * files replaced under a name that already existed, which `added` cannot see
   * and which is the one thing a person who just swapped a .glb wants told.
   */
  syncModels(): Promise<{ added: number; total: number; missing?: number; updated?: number }>;
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
  /**
   * Renames a model for the picker without changing its id — the preset table
   * joins on that id and nothing cascades. Optional; the library shows the name
   * as read-only text when it is absent.
   */
  renameModel?(modelId: string, label: string): Promise<void>;
  /**
   * Drops a model's saved tuning, leaving the model itself alone. Optional: a
   * host that never orphans a preset has nothing to sweep up.
   */
  deletePreset?(modelId: string): Promise<void>;
  /**
   * Reads back one model's saved preset; null means it was never saved. The one
   * read on this interface — see the note above. Optional, and without it the
   * library's JSON column only offers the model that is already open.
   */
  loadPreset?(modelId: string): Promise<ShowcasePreset | null>;
}

/** Props of `<ShowcaseStudio>`, here rather than beside it so the root stays wiring. */
export interface ShowcaseStudioProps {
  models: ShowcaseModel[];
  modelId: string;
  preset: ShowcasePreset;
  adapter: ShowcaseStudioAdapter;
  /** Model the public page renders. Omit when the host has no such concept. */
  liveModelId?: string;
  /**
   * Section ids the host has rich blocks for. Omit and the COPY tab says nothing;
   * supply it and a section whose id has drifted off one gets flagged, because
   * the join is by id and the blocks otherwise vanish silently.
   */
  blockIds?: readonly string[];
  /** Whole-copy presets, one per character. Absent renders no chips. */
  contentPresets?: readonly ContentPreset[];
  onSelectModel: (id: string) => void;
  /**
   * Re-reads the host's props in place. The library writes rows the host loaded
   * server-side, and without this they stay stale until a navigation — which
   * would close the dialog mid-edit. Omit and the library simply does not
   * refresh; every write still lands.
   */
  onRefresh?: () => void;
}
