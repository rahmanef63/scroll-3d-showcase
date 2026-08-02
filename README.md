# model-website

Talent showcase site. A 3D model orbits 360° as you scroll, zooming into
keyframed points of interest under a sci-fi HUD.

Built to rr conventions: the feature is a vertical slice, the app is a thin host.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run validate # typecheck + file-size audit + tests
npm run build && npm start
```

## Layout

```
app/
  (public)/
    page.tsx                    static route, "use cache"
    error.tsx  not-found.tsx    route boundaries
    _components/                host wiring
    _content/                   copy.ts (the words) + sections.tsx (the rich blocks)
  studio/                       the one dynamic route — camera editor, token-gated
  fonts/                        self-hosted Chakra Petch + JetBrains Mono
  globals.css                   theme tokens (CSS and WebGL read the same values)
components/ui/                  vendored shadcn primitives
convex/                         models + presets tables, 3 queries, 3 mutations
lib/                            showcase-source (cached read), convex-server, studio-auth
slices/scroll-3d-showcase/      the feature — see its README
                                two entries: `/` renders, `/studio` edits
public/*.glb                    the models (meshopt-compressed; originals in legacy-static/)
scripts/audit-file-size.mjs     200-line cap
.env.example                    the two optional env vars
```

The boot screen has its own line (`bootTitle`) so the loading moment can say
something the tab should not — this deploy uses it for a joke about the model.
`/`'s `<title>`, `<meta name="description">` and its Open Graph / Twitter card
are all generated from the same saved copy, so renaming the site in the studio
renames the tab, the search result and the link preview together. There is no OG
image: the only art here is a WebGL scene, and a stale screenshot of a model
that has since been swapped is worse than none.

Content lives in `app/(public)/_content/`; the slice ships no copy of its own,
so the same engine can carry a different brand by swapping that folder. It is
split in two: `copy.ts` holds the words as plain data — title, brand, meta
description, and each panel's kicker / heading / body — and `sections.tsx` holds
the rich blocks (stat grids, card grids, link lists) keyed by section id. Only
the first half is editable from `/studio`; the second stays code, because a stat
grid is a component with props, not something you type into a form.

## Studio

`/` is static. The single dynamic surface is `/studio`, a camera editor around a
live scene, saved to Convex. The scene sits in a centred box letterboxed to a
chosen output shape — `screenShiftX` is a fraction of the camera's half-width,
so a shot only reads correctly at the aspect it will be seen at, and a canvas
under the chrome previews a composition no visitor gets. `PREVIEW` (`P`) drops
the frame and every bar. Around the box:

- **Chrome** across the top — model picker, `SYNC` / `SAVE` / `COPY TS`,
  undo/redo, the unsaved dot, and the shortcut legend.
- **Rail** down the left — one row per keyframe (index, `p`, label). Clicking a
  row seeks to it; `+` captures the camera at the current scroll position.
- **Panel** on the right — four tabs: **SHOT** (the selected keyframe, as
  sliders with live unit readouts), **COPY** (title, brand, meta description and
  every panel's text, plus add/delete), **MARKS**, **SCENE**.
- **Transport** along the bottom — prev / play / next, loop, sweep duration and
  a scrubber, driving the *real* page scroll so playback and the published page
  cannot disagree, plus a live `P · AZ · EL · R · FOV` readout. A top-down path
  map next to it plots the orbit and where the camera is on it.
- **Keys** — `W/S` dolly, `A/D` orbit, `Q/E` duck-rise (hold them; `Shift` is
  3× faster), `1–9` select, `←/→` step, `Space` play, `F` focus, `Ctrl/Cmd+S`
  save, `Z` undo, `P` preview, `Esc` close.
- Below 1024px the rail flattens to a chip strip and the panel becomes a bottom
  sheet with a `SHOT | COPY | MARKS | SCENE` dock, and the scene goes full-bleed
  — there is no room to letterbox a phone.

What each toolbar action does:

- **SYNC** scans `public/` for `.glb`/`.gltf`, gives each new file an id derived
  from its path (`hitman.glb` → `hitman`) and registers it. Ids are assigned once
  and never reassigned, so a saved camera path stays attached to its model.
- **GO LIVE** points `/` at the selected model. A model whose file has left
  `public/` reads `NO FILE` and cannot be published; if it was already live when
  the file went, `/` falls back to the bundled asset rather than serving a 404.
  **FORGET** appears beside it and drops the row for good; the saved preset is
  left behind, so putting the file back gets the same id and its tuning with it. Syncing never changes what the
  site shows — dropping a file into `public/` must not silently swap the hero —
  so publishing is its own explicit act. Nothing published means the site serves
  the bundled `hitman.glb`, which is the state it ships in. A model published
  before anyone has tuned it renders on the default camera path rather than
  quietly keeping the old one on screen.
- Drag the canvas to orbit, wheel to dolly, tune any field, then **SAVE** — the
  write invalidates the public page through `updateTag`.
- **COPY TS** puts the tuned table on the clipboard in `config/keyframes.ts`
  shape, so a path can be baked back into code and shipped without a backend.
  Camera only — copy is not part of that export.
- The **COPY** tab edits the words. A `CHARACTER` row at the top loads a whole
  set in one click — this site ships two, `KEANU` and `RAHMAN`, each with its own
  section ids so neither inherits the other's stat grid. Loading one is a single
  undo step and does not change which model is live. Typing a title updates the HUD wordmark as
  you go; saving it renames the browser tab and the search result too, because
  `/`'s `generateMetadata` reads the same source. Panels can be added at the
  current scroll position and deleted. A saved row with no copy at all — every
  preset written before 0.7.0 — keeps this site's defaults rather than blanking.

Both env vars are optional and both fail closed — see `.env.example`. With
neither set the site builds and renders exactly as it did before Convex existed,
and `/studio` stays locked.

## Stack

Next.js 16.2 (App Router, Cache Components) · React 19 · Tailwind v4 ·
TypeScript strict · three 0.185 · Vitest.

Convex covers exactly two tables (`models`, `presets`) behind three public
queries and three token-guarded mutations. A preset carries the camera path, the markers,
the scene settings and the copy — one row, one save. The public route never depends on it: every
read falls back to the slice defaults when the backend is unset, unreachable or
empty, which is how this site is deployed today.

## Deviations from the rr baseline

| Rule | Status |
| --- | --- |
| `slice.json` / `slice.manifest.json` shape | `TODO(rr): confirm` — written without the rr repo on this machine. Run `audit:slices` and reshape if the validator disagrees. |
| Theme tokens | Slice-scoped `--showcase-*` rather than the tones SSOT. Marked `TODO(rr): confirm` in `globals.css` and `lib/theme-colors.ts`. |
| `components/ui/button.tsx` | Hand-written stand-in — the shadcn registry was unreachable during the build. Replace with `npx shadcn add button`. |
| Copy-first / Source Map | Not applied; no rr repo was available to copy from. |

## The old static build

The pre-slice single-file version was moved to `legacy-static/`. It still runs
on its own via `legacy-static/start-server.bat` and is kept only for reference.
