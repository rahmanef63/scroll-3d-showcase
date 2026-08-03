import type { ShowcaseContent } from '@/slices/scroll-3d-showcase';

/**
 * Every word on this site, as plain data.
 *
 * This is the fallback, not the source of truth: /studio saves an edited copy
 * of exactly this shape to Convex, and the page prefers that. With no backend —
 * or before anything has ever been saved — the site renders what is here, which
 * is how it shipped before the studio existed.
 *
 * Deliberately not a `.tsx`: a server module reads it, and the rich blocks that
 * wrap this text (stat grids, card grids, link lists) live in `sections.tsx`
 * keyed by section id.
 *
 * The voice is deliberately hostile. The model is AI-generated and visibly
 * wrong in a dozen places; pretending otherwise would be worse than owning it
 * loudly. Every panel roasts whatever the camera is currently zoomed into, and
 * section 03 doubles as the actual sales pitch.
 *
 * Each fade window is timed to one camera stop in DEFAULT_KEYFRAMES, and
 * `align` sits opposite that keyframe's `screenShiftX` so copy never lands on
 * the model:
 *
 *   01 Intro    full body -> SHADES   (shift +, copy left)
 *   02 Profile  SUIT                  (shift -, copy right)
 *   03 Works    SIDEARM               (shift +, copy left)
 *   04 Contact  SHOES -> full body    (shift -, copy right)
 */
const KEANU: ShowcaseContent = {
  title: 'HITMAN',
  // The boot screen gets the joke; the tab and the search result stay HITMAN.
  bootTitle: 'ini keanu wanna be',
  brand: 'CONCEPT DEMO',
  description: 'Scroll-driven 3D showcase. The model is AI-generated and it shows.',
  sections: [
    {
      id: '01',
      name: 'Intro',
      progress: 0,
      fadeIn: -0.12,
      fadeOut: 0.26,
      align: 'start',
      kicker: 'Concept demo // nobody real signed off on this',
      // `|` outlines the rest — the two-tone wordmark, as one character.
      heading: 'HIT|MAN',
      body: 'Okay, listen. This was supposed to be Keanu. The one with the dog and the pencil. I typed the brief, the generator thought about it for eleven seconds, and handed back — this. I’m not fixing it. You’re not here for the face anyway, you’re here because the camera does a thing when you scroll, and apparently that still impresses people. Put your own product in this slot. Sunglasses. A watch. Anything with edges.',
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
      body: 'One word in the brief. Backpacker. What came out is a tactical harness with two heraldic crests that have never appeared on any backpack ever manufactured by anyone. And here’s the part that actually bothers me — it looks better. Five seconds of compute out-designed the brief. It stays. We never speak of this again.',
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
      body: 'It just showed up. I described a man in a suit and the machine decided he needed to be armed. Which — fine — is actually the pitch. This stop is a product slot. Swap the .glb, move one line of keyframe, and the camera orbits a perfume bottle with exactly the same reverence it’s currently giving a weapon nobody ordered.',
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
      body: 'Three hundred thousand polygons of disappointment, and then — shoes. Clean welt, correct specular, actual laces. If you own a product that genuinely exists, this gets embarrassingly good. Details below. Use them or don’t.',
    },
  ],
};

/**
 * The second character.
 *
 * Section ids are `r1`–`r4`, not `01`–`04`: the ids key the rich blocks in
 * `sections.tsx`, and a preset already saved on the live site uses `01`–`04`.
 * Reusing them would hand this character the other one's stat grid.
 *
 * The joke inverts. The first set is "I asked for Keanu and got a stranger";
 * this one is the stranger, and he is the one who typed the brief.
 */
const RAHMAN: ShowcaseContent = {
  title: 'RAHMAN',
  bootTitle: 'ini yang nulis briefnya',
  brand: 'SELF PORTRAIT',
  description: 'Scroll-driven 3D showcase. This time the model is supposed to look like this.',
  sections: [
    {
      id: 'r1',
      name: 'Intro',
      progress: 0,
      fadeIn: -0.12,
      fadeOut: 0.26,
      align: 'start',
      kicker: 'Self portrait // approved by exactly one person',
      heading: 'RAH|MAN',
      body: 'Second attempt. This time I stopped describing someone else and described myself, which is a lower bar and it still took three tries. The glasses are right, the jacket is right, and the hair is doing something I have never once managed in real life. Same scroll, same camera, different face. If you own a product, it goes here instead — that has always been the point.',
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
      body: 'That is what came out of the exporter: 130 thousand triangles and three 4K texture atlases, which is a lot of file for one man standing still. Compressed it down to a third without touching what you can see. The version you just loaded is the small one — the big one is still on my disk, doing nothing.',
    },
    {
      id: 'r3',
      name: 'Prop',
      progress: 0.64,
      fadeIn: 0.56,
      fadeOut: 0.74,
      align: 'start',
      kicker: 'r3 — Still armed, apparently',
      heading: 'I did not ask\nfor this either',
      body: 'Different generator, same instinct: put a gun in his hand. I left it in for continuity. It is also still the clearest demo of the thing this page actually sells — the camera can hold on any small object at any angle, and the object does not have to be a weapon. Swap the .glb, move one keyframe.',
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
 * Characters the studio can load in one click.
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
  { id: 'keanu', label: 'KEANU', content: KEANU },
  { id: 'rahman', label: 'RAHMAN', content: RAHMAN },
];

/** What a deploy with no saved copy renders. */
export const DEFAULT_CONTENT = KEANU;

/** Keyed by the id `models.sync` assigns to the file, not by the preset ids above. */
const BY_MODEL_ID: Readonly<Record<string, ShowcaseContent>> = {
  hitman: KEANU,
  'rahman-3d': RAHMAN,
};

/**
 * The words a synced model starts with, before anyone opens /studio.
 *
 * Every .glb gets its own title, boot line and description: sharing one
 * headline — one browser tab, one search result — across models reads as a bug,
 * and used to happen to every file but the two written by hand. The panels stay
 * the default ones, because they are timed to the camera path and a saved
 * preset overrides all of this anyway.
 */
export function contentForModel(model?: { id: string; name: string } | null): ShowcaseContent {
  if (!model) return DEFAULT_CONTENT;
  const known = BY_MODEL_ID[model.id];
  if (known) return known;

  // 'models/vintage-car' -> 'VINTAGE CAR'; the id covers a name of separators.
  const title =
    (model.name.split('/').pop() ?? '').replace(/[-_]+/g, ' ').trim().toUpperCase() ||
    model.id.replace(/-+/g, ' ').toUpperCase();
  return { ...DEFAULT_CONTENT, title, bootTitle: title, description: `${title} — scroll-driven 3D showcase.` };
}
