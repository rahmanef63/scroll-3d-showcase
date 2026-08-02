import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

/** Matches the `files` argument of the Convex `models.sync` mutation. */
export interface ScannedModel {
  /** Relative to public/, no leading slash — Convex derives the id and URL from it. */
  path: string;
  name: string;
  bytes: number;
}

/**
 * This reads the deployed image's public/ directory. On Docker that tree is
 * baked at build time and copied to /app/public next to server.js, so a sync
 * registers the models that shipped with this image — it never uploads. That is
 * exactly what "static site, synced assets" means here: drop a .glb in public/,
 * rebuild, hit sync.
 */
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const MAX_DEPTH = 3;
const MAX_FILES = 200;
const MODEL_EXTENSION = /\.(glb|gltf)$/i;

export async function scanPublicModels(): Promise<ScannedModel[]> {
  const found = await walk(PUBLIC_DIR, 0);
  // Stable order keeps the studio picker from reshuffling between syncs.
  found.sort((a, b) => a.path.localeCompare(b.path));
  return found.slice(0, MAX_FILES);
}

async function walk(dir: string, depth: number): Promise<ScannedModel[]> {
  if (depth > MAX_DEPTH) return [];

  const entries = await readdir(dir, { withFileTypes: true });
  const models: ScannedModel[] = [];

  for (const entry of entries) {
    // Dotfiles are never assets, and a stray node_modules under public/ would
    // blow the walk budget for nothing.
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    // readdir does not follow links, so this is the symlink-escape guard: a link
    // pointing outside public/ is skipped rather than resolved.
    if (entry.isSymbolicLink()) continue;

    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      models.push(...(await walk(full, depth + 1)));
      continue;
    }
    if (!entry.isFile() || !MODEL_EXTENSION.test(entry.name)) continue;

    const info = await stat(full);
    const relative = path.relative(PUBLIC_DIR, full).split(path.sep).join('/');
    models.push({
      path: relative,
      // Shown in the studio picker; the path keeps nested files distinguishable.
      name: relative.replace(MODEL_EXTENSION, ''),
      bytes: info.size,
    });
  }

  return models;
}
