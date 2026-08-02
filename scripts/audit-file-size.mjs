#!/usr/bin/env node
/**
 * audit:file-size — enforces the 200-line cap on source files.
 *
 * Exclusions match the rr doctrine: vendored shadcn primitives, generated
 * output, pure data exports and test files are measured but never fail the run.
 */
import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const MAX_LINES = 200;
const SCAN = ['app', 'components', 'hooks', 'lib', 'slices', 'utils', 'scripts'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.mjs', '.js', '.jsx']);

const EXCLUDED = [
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)_generated(\/|$)/,
  /(^|\/)components\/ui\//,
  /(^|\/)lib\/content\//,
  /\.(test|spec)\.[jt]sx?$/,
  /(^|\/)seed\.ts$/,
];

const isExcluded = (relative) => EXCLUDED.some((pattern) => pattern.test(relative));

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (EXTENSIONS.has(path.extname(entry.name))) yield full;
  }
}

const offenders = [];
let checked = 0;

for (const dir of SCAN) {
  for await (const file of walk(path.join(ROOT, dir))) {
    const relative = path.relative(ROOT, file).split(path.sep).join('/');
    if (isExcluded(relative)) continue;
    checked += 1;
    const lines = readFileSync(file, 'utf8').split('\n').length;
    if (lines > MAX_LINES) offenders.push({ relative, lines });
  }
}

if (offenders.length === 0) {
  console.log(`audit:file-size — ${checked} files checked, all within ${MAX_LINES} lines.`);
  process.exit(0);
}

console.error(`audit:file-size — ${offenders.length} file(s) over ${MAX_LINES} lines:`);
for (const { relative, lines } of offenders.sort((a, b) => b.lines - a.lines)) {
  console.error(`  ${lines.toString().padStart(4)}  ${relative}`);
}
process.exit(1);
