import type { ShowcaseContent } from '@/slices/scroll-3d-showcase';

/**
 * Every word on this site, as plain data.
 *
 * This is the fallback, not the source of truth: /studio saves an edited copy
 * of exactly this shape to Convex, and the page prefers that. With no backend —
 * or before anything has ever been saved — the site renders what is here.
 *
 * Deliberately not a `.tsx`: a server module reads it, and the rich blocks that
 * wrap this text (stat grids, card grids, link lists) live in `panel-extras.tsx`
 * keyed by section id.
 *
 * Each fade window is timed to one camera stop in DEFAULT_KEYFRAMES, and
 * `align` sits opposite that keyframe's `screenShiftX` so copy never lands on
 * the model:
 *
 *   r1 Intro    full body -> SHADES   (shift +, copy left)
 *   r2 Build    SUIT                  (shift -, copy right)
 *   r3 Prop     SIDEARM               (shift +, copy left)
 *   r4 Contact  SHOES -> full body    (shift -, copy right)
 *
 * The voice is dry and first-person. The model is a scan-grade generation of a
 * real person — me — and the parts that came out wrong are named rather than
 * hidden, because a visitor can see them anyway.
 */
const RAHMAN: ShowcaseContent = {
  title: 'RAHMAN',
  // The boot screen is the one place that can say something the tab and the
  // search result should not — here it names the thing being demonstrated,
  // while the wordmark, the tab and the search result stay RAHMAN.
  bootTitle: 'SCROLL 3D SHOWCASE',
  brand: 'SELF PORTRAIT',
  description: 'Scroll-driven 3D showcase, built around a model of me.',
  sections: [
    {
      id: 'r1',
      name: 'Intro',
      progress: 0,
      fadeIn: -0.12,
      fadeOut: 0.26,
      align: 'start',
      kicker: 'Self portrait // the camera does the work',
      // `|` outlines the rest — the two-tone wordmark, as one character.
      heading: 'RAH|MAN',
      body: 'That is me, rendered. The glasses are right, the jacket is right, and the hair is doing something I have never once managed in real life. Scroll and the camera walks the model on its own, stopping on whatever is worth stopping on — that is the whole trick this page sells. Your product goes in this slot instead. A bottle, a sneaker, a watch. Anything with edges holds a close-up better than a face does.',
    },
    {
      id: 'r2',
      name: 'Build',
      progress: 0.42,
      fadeIn: 0.32,
      fadeOut: 0.52,
      align: 'end',
      kicker: 'r2 — The numbers',
      heading: 'Ten megabytes\nof me',
      body: 'That is what came out of the exporter: 130 thousand triangles and three 4K texture atlases, which is a lot of file for one man standing still. Compressed down to a third without touching anything you can actually see. The version you just loaded is the small one — the big one is still on my disk, doing nothing.',
    },
    {
      id: 'r3',
      name: 'Prop',
      progress: 0.64,
      fadeIn: 0.56,
      fadeOut: 0.74,
      align: 'start',
      kicker: 'r3 — The prop',
      heading: 'I never asked\nfor a gun',
      body: 'It came with the model and I kept it, because it makes the point better than a pocket would: the camera can hold on one small object at any angle, and the object does not have to be a weapon. Swap the .glb, move one keyframe, and this stop orbits a perfume bottle with exactly the same seriousness.',
    },
    {
      id: 'r4',
      name: 'Contact',
      progress: 0.85,
      fadeIn: 0.79,
      fadeOut: 1.14,
      align: 'end',
      kicker: 'r4 — Contact',
      heading: 'Now you know\nwhat I look like',
      body: 'Roughly. The polygons are generous around the jaw and I am not correcting them. Everything below is real and answers faster than the model does.',
    },
  ],
};

/**
 * Words for the spare model, `public/hitman.glb`.
 *
 * Not this site's story: it is the demo half of the model picker, so anyone who
 * clones this repo has a second .glb and a second set of copy to try SYNC, GO
 * LIVE, EXPORT and IMPORT against without generating anything first. Nothing
 * renders it unless it is loaded in /studio or published.
 *
 * Section ids are `01`–`04` rather than `r1`–`r4` on purpose: the ids key the
 * rich blocks in `panel-extras.tsx`, and sharing them would hand this set the
 * self-portrait's stat grid.
 */
const HITMAN: ShowcaseContent = {
  title: 'HITMAN',
  bootTitle: 'sample model, bukan siapa-siapa',
  brand: 'DEMO MODEL',
  description: 'Sample model for the picker. Scroll-driven 3D showcase.',
  sections: [
    {
      id: '01',
      name: 'Intro',
      progress: 0,
      fadeIn: -0.12,
      fadeOut: 0.26,
      align: 'start',
      kicker: 'Demo asset // nobody real signed off on this',
      heading: 'HIT|MAN',
      body: 'A generated stand-in, kept around so this site ships with two models instead of one. Point the studio at it, publish it, tune a camera path on it, throw it away. It exists to be swapped out — which is the same thing your own product will do to it.',
    },
    {
      id: '02',
      name: 'Profile',
      progress: 0.42,
      fadeIn: 0.32,
      fadeOut: 0.52,
      align: 'end',
      kicker: '02 — The straps',
      heading: 'This was supposed\nto be a backpack',
      body: 'One word in the brief. Backpacker. What came out is a tactical harness with two heraldic crests that have never appeared on any backpack ever manufactured by anyone. And here is the part that bothers me — it looks better. Five seconds of compute out-designed the brief.',
    },
    {
      id: '03',
      name: 'Works',
      progress: 0.64,
      fadeIn: 0.56,
      fadeOut: 0.74,
      align: 'start',
      kicker: '03 — Unrequested prop',
      heading: 'Nobody asked\nfor a gun',
      body: 'It just showed up. A man in a suit was described and the machine decided he needed to be armed. Which — fine — is actually the pitch. This stop is a product slot. Swap the .glb, move one line of keyframe, and the camera orbits a perfume bottle with exactly the same reverence it is currently giving a weapon nobody ordered.',
    },
    {
      id: '04',
      name: 'Contact',
      progress: 0.85,
      fadeIn: 0.79,
      fadeOut: 1.14,
      align: 'end',
      kicker: '04 — Contact',
      heading: 'Only the shoes\ncame out right',
      body: 'Three hundred thousand polygons of disappointment, and then — shoes. Clean welt, correct specular, actual laces. If you own a product that genuinely exists, this gets embarrassingly good. Details below. Use them or do not.',
    },
  ],
};

/**
 * Character sets the studio can load in one click.
 *
 * A preset replaces every word — title, boot line, brand, description and all
 * the panels. It does NOT change which model is live: that is the picker two
 * controls to the left, and doing both from one button would mean navigating
 * away and losing the copy that was just loaded.
 */
export interface ContentPreset {
  id: string;
  label: string;
  content: ShowcaseContent;
}

export const CONTENT_PRESETS: readonly ContentPreset[] = [
  { id: 'rahman', label: 'RAHMAN', content: RAHMAN },
  { id: 'hitman', label: 'HITMAN', content: HITMAN },
];

/** What a deploy with no backend and no saved copy renders — the bundled model's own. */
export const DEFAULT_CONTENT = RAHMAN;

/**
 * The words a synced model starts with, before anything is saved for it.
 *
 * Derived from the file, not from a table of ids: a .glb dropped into public/
 * tomorrow gets its own title, boot line and description without anyone editing
 * this file. Per-model copy is data — it lives in the preset row, written from
 * /studio or seeded from a JSON file under seed/ — and this is only what shows
 * before that exists. The panels stay the default ones, because they are timed
 * to the camera path.
 */
export function contentForModel(model?: { id: string; name: string } | null): ShowcaseContent {
  if (!model) return DEFAULT_CONTENT;

  // 'models/vintage-car' -> 'VINTAGE CAR'; the id covers a name of separators.
  const title =
    (model.name.split('/').pop() ?? '').replace(/[-_]+/g, ' ').trim().toUpperCase() ||
    model.id.replace(/-+/g, ' ').toUpperCase();
  return { ...DEFAULT_CONTENT, title, bootTitle: title, description: `${title} — scroll-driven 3D showcase.` };
}
