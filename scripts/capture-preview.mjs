#!/usr/bin/env node
/**
 * capture-preview — drives a real browser down the page and keeps what it saw.
 *
 *   bun run capture                      # against http://localhost:3000
 *   bun run capture https://scroll-3d.rahmanef.com
 *
 * Produces three files in public/, all of them the actual scene rather than a
 * mockup of it:
 *
 *   og.jpg       1200×630, the share card
 *   preview.gif  the scroll, as a loop
 *   thumb.webp   1600×840, gallery size
 *
 * A WebGL page cannot be screenshotted headlessly by default — the GPU flags
 * below hand Chromium a software rasteriser, which is slow and pixel-correct.
 */
import { execFile } from 'node:child_process';
import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const run = promisify(execFile);

const URL = process.argv[2] ?? 'http://localhost:3000';
const OUT = path.join(process.cwd(), 'public');
const WORK = path.join(process.cwd(), '.next', 'capture');

/** Gallery size, and what every frame is shot at. */
const WIDE = { width: 1600, height: 840 };
/** Open Graph's shape. Shot rather than cropped, so the framing is composed. */
const CARD = { width: 1200, height: 630 };

const FRAMES = 24;
/** Damping is 0.075 per frame; the camera needs about this long to arrive. */
const SETTLE_MS = 850;
/** Scroll position for the share card: past the intro, into the first close-up. */
const CARD_AT = 0.16;

const GPU = [
  '--use-gl=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
];

async function main() {
  await rm(WORK, { recursive: true, force: true });
  await mkdir(WORK, { recursive: true });

  const browser = await chromium.launch({ args: GPU });
  try {
    await shootFrames(browser);
    await shootCard(browser);
  } finally {
    await browser.close();
  }

  await toGif();
  await toThumb();
  console.log(`\nWrote ${['og.jpg', 'preview.gif', 'thumb.webp'].map((f) => `public/${f}`).join(', ')}`);
}

/** One page load, scrolled to `FRAMES` positions, a PNG at each. */
async function shootFrames(browser) {
  const page = await open(browser, WIDE);
  for (let i = 0; i < FRAMES; i += 1) {
    await seek(page, i / (FRAMES - 1));
    await page.screenshot({ path: path.join(WORK, String(i).padStart(3, '0') + '.png') });
    process.stdout.write(`\rframe ${i + 1}/${FRAMES}`);
  }
  await page.close();
}

async function shootCard(browser) {
  const page = await open(browser, CARD);
  await seek(page, CARD_AT);
  // Through a PNG and out as a JPEG: the scene is photographic, and a lossless
  // share card is half a megabyte for nothing a scraper will ever notice.
  const raw = path.join(WORK, 'card.png');
  await page.screenshot({ path: raw });
  await page.close();
  await ffmpeg(['-i', raw, '-q:v', '3', path.join(OUT, 'og.jpg')]);
}

/**
 * Loads the page and waits for the boot overlay to say it is done — the one
 * honest signal that the model has downloaded, parsed and rendered a frame.
 * `networkidle` would fire while the canvas was still black.
 */
async function open(browser, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-state="ready"]', { timeout: 120_000 });
  // The overlay fades over 700ms, and the first frames after it are the model
  // settling into the opening shot.
  await page.waitForTimeout(1500);
  return page;
}

/** Scrolls to a fraction of the page and lets the camera catch up. */
async function seek(page, fraction) {
  await page.evaluate((f) => {
    window.scrollTo({ top: (document.body.scrollHeight - window.innerHeight) * f, behavior: 'instant' });
  }, fraction);
  await page.waitForTimeout(SETTLE_MS);
}

/**
 * Frames to a loop. Two passes rather than one: a shared palette generated from
 * every frame keeps the cyan HUD from banding differently in each one.
 */
async function toGif() {
  const palette = path.join(WORK, 'palette.png');
  const scale = 'scale=900:-1:flags=lanczos';
  await ffmpeg(['-i', path.join(WORK, '%03d.png'), '-vf', `${scale},palettegen=max_colors=96`, palette]);
  await ffmpeg([
    '-framerate', '10',
    '-i', path.join(WORK, '%03d.png'),
    '-i', palette,
    '-lavfi', `${scale}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
    '-loop', '0',
    path.join(OUT, 'preview.gif'),
  ]);
}

/** The gallery still: the same opening shot, at gallery size. */
async function toThumb() {
  const frames = (await readdir(WORK)).filter((f) => /^\d+\.png$/.test(f)).sort();
  const source = frames[Math.round(CARD_AT * (frames.length - 1))] ?? frames[0];
  await ffmpeg(['-i', path.join(WORK, source), '-quality', '82', path.join(OUT, 'thumb.webp')]);
}

const ffmpeg = (args) => run('ffmpeg', ['-y', '-loglevel', 'error', ...args]);

await main();
