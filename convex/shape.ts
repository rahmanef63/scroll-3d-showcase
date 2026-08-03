import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';

/** public/ holds a handful of .glb files; this caps reads, writes and payload. */
export const MAX_MODELS = 200;

export const modelValidator = v.object({
  id: v.string(),
  name: v.string(),
  url: v.string(),
  bytes: v.number(),
  /** Uploaded through /studio rather than scanned out of public/. */
  uploaded: v.boolean(),
  /** File no longer in the host's scan, or a storage id with nothing behind it. */
  missing: v.boolean(),
});

/**
 * ID RULE: slug of the path under public/ without its extension.
 * 'hitman.glb' -> 'hitman', 'models/car.glb' -> 'models-car'.
 */
export function toModelId(path: string): string {
  return path
    .replace(/^\/+/, '')
    .replace(/\.(glb|gltf)$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Files live under public/, which Next serves from the site root. */
export function toUrl(path: string): string {
  return encodeURI(`/${path.replace(/^\/+/, '')}`);
}

interface ModelRow {
  modelId: string;
  name: string;
  /** Studio rename. Wins over `name`, which every SYNC overwrites. */
  label?: string;
  url?: string;
  storageId?: Id<'_storage'>;
  bytes: number;
  live?: boolean;
  missing?: boolean;
}

/**
 * Replacing a .glb in public/ keeps its path, and that path is cached hard: a
 * model swapped under the same filename goes on serving the bytes every browser
 * already has, for an hour and then a week of stale-while-revalidate. The size
 * is the cheapest thing that always changes with the file, so it rides along as
 * a query and a SYNC is what publishes the new one.
 *
 * Uploads need none of this — a new upload is a new storage id and therefore a
 * new URL.
 */
const versioned = (url: string, bytes: number) => (url && bytes ? `${url}?v=${bytes}` : url);

/**
 * Resolves the row to something a browser can fetch.
 *
 * An uploaded model has no URL of its own — the deployment mints one per read,
 * and a row that cached it would go stale the day that changes. A storage id
 * whose file is gone resolves to null, which is the same situation as a scanned
 * file that left public/: reported as missing rather than served as a 404.
 *
 * It is also the one place `label` beats `name`. Reading `row.name` anywhere
 * else shows the scan's path and quietly ignores a rename.
 */
export async function toModel(ctx: { storage: { getUrl: (id: Id<'_storage'>) => Promise<string | null> } }, row: ModelRow) {
  const url = row.storageId
    ? await ctx.storage.getUrl(row.storageId)
    : versioned(row.url ?? '', row.bytes);
  return {
    id: row.modelId,
    name: row.label ?? row.name,
    url: url ?? '',
    bytes: row.bytes,
    uploaded: Boolean(row.storageId),
    missing: Boolean(row.missing) || !url,
  };
}
