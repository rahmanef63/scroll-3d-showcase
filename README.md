# model-website

Talent showcase site. A 3D model orbits 360° as you scroll, zooming into
keyframed points of interest under a sci-fi HUD.

**Live → [scroll-3d.rahmanef.com](https://scroll-3d.rahmanef.com)**

![The scroll, captured frame by frame from the running scene](./public/preview.gif)

Built to rr conventions: the feature is a vertical slice, the app is a thin host.

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frahmanef63%2Fscroll-3d-showcase&env=NEXT_PUBLIC_CONVEX_URL,STUDIO_TOKEN&envDescription=Convex%20deployment%20URL%20and%20the%20studio%20password&envLink=https%3A%2F%2Fgithub.com%2Frahmanef63%2Fscroll-3d-showcase%23readme)

Order matters, because the second half of it is a shared secret:

```bash
bunx convex deploy                          # creates the deployment, prints its URL
bunx convex env set STUDIO_TOKEN <password> # the backend's half
```

Then set `NEXT_PUBLIC_CONVEX_URL` to that URL and `STUDIO_TOKEN` to the same
password in the host's environment, and open `/studio`. From there a model is an
UPLOAD away — no second deploy, no repository. `convex/_generated` is committed,
so the build needs no codegen step of its own.

Skipping all of that is a supported outcome: with neither variable set the site
builds and serves the bundled model on the default camera path, and `/studio`
stays locked.

## Run it

```bash
bun install
bun dev          # http://localhost:3000
```

```bash
bun run validate # typecheck + file-size audit + tests
bun run build && bun start
```

Bun is the documented runner — it installs this tree in about 20s and `bun.lock`
is what the Dockerfile builds from. Nothing here is bun-only: `package.json` is
plain, so npm or pnpm still work if you delete the lockfile and use your own.

## Layout

```
app/
  (public)/
    page.tsx                    static route, "use cache"
    docs/                       the clone-it-yourself guide, fully static
    error.tsx  not-found.tsx    route boundaries
    _components/                host wiring
    _content/                   copy.ts (the words) + sections.tsx (the rich blocks)
  studio/                       the one dynamic route — camera editor, token-gated
  fonts/                        self-hosted Chakra Petch + JetBrains Mono
  globals.css                   theme tokens (CSS and WebGL read the same values)
components/ui/                  vendored shadcn primitives
convex/                         models + presets tables, 3 queries, 4 mutations, 1 seed
lib/                            showcase-source (cached read), convex-server, studio-auth
slices/scroll-3d-showcase/      the feature — see its README
                                two entries: `/` renders, `/studio` edits
public/*.glb                    the models (meshopt or Draco; originals in legacy-static/)
public/draco/                   three's Draco decoder, vendored — see below
scripts/audit-file-size.mjs     200-line cap
.env.example                    the two optional env vars
```

The boot screen has its own line (`bootTitle`) so the loading moment can say
something the tab should not — this deploy uses it for a joke about the model.
`/`'s `<title>`, `<meta name="description">` and its Open Graph / Twitter card
are all generated from the same saved copy, so renaming the site in the studio
renames the tab, the search result and the link preview together. The card image
is a real frame of the running scene — see *Preview images* — which is why it is
regenerated rather than drawn: a link preview of the previous model is worse than
none.

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

- **Chrome** across the top — model picker, `SYNC` / `SAVE` / `COPY TS` /
  `EXPORT` / `IMPORT` / `LIBRARY`, undo/redo, the unsaved dot, and the shortcut
  legend.
- **RESET** beside SAVE is its counterpart — it throws away unsaved edits and
  puts the last saved preset back. It asks nothing first because it goes through
  the undo stack: `Z` brings the discarded work straight back.
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
- **Library** — a dialog over the whole editor, opened by `LIBRARY` in the
  chrome. Two columns: every model on the left, that model's entire preset as
  editable JSON on the right. It is a native `<dialog>`, so it lands in the
  browser's top layer above every bar the studio draws, traps focus while it is
  open and closes on `Esc`. See *Library* below.
- Below 1024px the rail flattens to a chip strip and the panel becomes a bottom
  sheet with a `SHOT | COPY | MARKS | SCENE` dock, the library becomes a bottom
  drawer showing one column at a time, and the scene goes full-bleed — there is
  no room to letterbox a phone.

What each toolbar action does:

- **SYNC** scans `public/` for `.glb`/`.gltf`, gives each new file an id derived
  from its path (`rahman-3d.glb` → `rahman-3d`) and registers it. Ids are assigned once
  and never reassigned, so a saved camera path stays attached to its model.
- Every model row says where its bytes live — `PUBLIC/` for a file the scan
  found, `CLOUD` for an upload — in the picker and again in the library, because
  that word decides what deleting one is worth. A `CLOUD` row is gone for good
  and its file leaves storage with it; a `PUBLIC/` row comes back on the next
  SYNC, since the file is still in the build and `sync` upserts by id. The
  confirm says which it is about to be — `SURE?` against `BACK ON SYNC?`. The
  live model is the only row that cannot be deleted at all: publish another one
  first, or the site drops to the bundled asset.
- **Replacing a model under the same filename** is the one case `+0 NEW` reads
  like a failure. SYNC counts it separately (`+0 NEW / 1 REPLACED`), and the
  file's byte count rides along on its URL (`/rahman-3d.glb?v=1838500`) —
  `public/` paths are permanent and cached for an hour plus a week of
  stale-while-revalidate, so without it every browser would go on serving the
  geometry it already had. Press SYNC after the deploy that carries the new file,
  or nothing downstream learns the size changed — and press it **in /studio**,
  not from a terminal. The studio action calls `updateTag`, so `/` re-reads the
  row within the second; `npx convex run models:sync` writes the same row and
  leaves the page serving what it baked at build time, which then needs a
  rebuild *on a new commit* to move.
- **UPLOAD** is the other way in, and the only one that does not need a git
  checkout: the file goes from the browser straight into the backend's storage,
  no rebuild and no deploy. See *Uploads* below for what it costs and what it
  checks. A `SYNC` never touches an uploaded row — it was never in `public/` and
  never will be — and **FORGET** is what deletes one, taking its bytes with it.
- **GO LIVE** points `/` at the selected model. A model whose file has left
  `public/` reads `NO FILE` and cannot be published; if it was already live when
  the file went, `/` falls back to the bundled asset rather than serving a 404.
  **FORGET** appears beside it and drops the row for good; the saved preset is
  left behind, so putting the file back gets the same id and its tuning with it.
  `LIBRARY` is where that orphaned preset can be swept up. Syncing never changes what the
  site shows — dropping a file into `public/` must not silently swap the hero —
  so publishing is its own explicit act. Nothing published means the site serves
  the bundled `rahman-3d.glb`, which is the state it ships in. `hitman.glb`
  rides along as a second asset with nothing riding on it, so the picker, GO
  LIVE and IMPORT have something to swap to on a fresh clone. A model published
  before anyone has tuned it renders on the default camera path rather than
  quietly keeping the old one on screen.
- Drag the canvas to orbit, wheel to dolly, tune any field, then **SAVE** — the
  write invalidates the public page through `updateTag`.
- **COPY TS** puts the tuned table on the clipboard in `config/keyframes.ts`
  shape, so a path can be baked back into code and shipped without a backend.
  Camera only — copy is not part of that export.
- **EXPORT** downloads the whole preset — path, markers, scene knobs and every
  word — as `<model-id>.json`. **IMPORT** reads one back into whatever model is
  open, which is the point: a preset belongs to one model id, so swapping the
  `.glb` would strand its tuning otherwise. An import lands in the draft, so it
  is one undo away and nothing reaches the live site until `SAVE`. Files under
  `seed/` are exactly these files, and `convex/seed.ts` writes one straight into
  the backend:

  ```sh
  bunx convex run seed:preset "$(cat seed/rahman-3d.json)"          # dev
  bunx convex run seed:preset --prod "$(cat seed/rahman-3d.json)"   # production
  ```

  `seed/hitman.json` does the same for the demo asset. Seeding refuses to
  overwrite a preset that already exists unless the file carries `"force":
  true`, so re-running it can never eat a tuning session.
- The **COPY** tab edits the words. A `CHARACTER` row at the top loads a whole
  set in one click — `RAHMAN`, which is this site, and `HITMAN`, the words for
  the spare demo model. Separate section ids, so neither inherits the other's
  stat grid. Loading one is a single
  undo step and does not change which model is live. Typing a title updates the HUD wordmark as
  you go; saving it renames the browser tab and the search result too, because
  `/`'s `generateMetadata` reads the same source. Panels can be added at the
  current scroll position and deleted. A saved row with no copy at all — every
  preset written before 0.7.0 — keeps this site's defaults rather than blanking.
  A model with no preset at all gets its own title, boot line and description
  derived from its filename (`models/vintage-car.glb` → `VINTAGE CAR`), so two
  models never share one browser tab and one search result.

### Library

`LIBRARY` opens the one place where a model can be worked on without being the
model you have open. Left column: every row the backend knows about, each with
its read-only id under an editable name, plus `OPEN`, `PUBLISH`, `SET` (rename)
and — only where the backend would actually allow it — `DELETE`. Right column:
that row's whole preset as JSON, byte-for-byte the file `EXPORT` writes, so text
copied out of the box is a valid `seed/` file and a `seed/` file pastes straight
in. `APPLY` loads it into the draft (one undo away, nothing written), `SAVE`
writes it to the backend for whichever row is selected, `DEFAULTS` fills the box
without writing anything, and `DELETE PRESET` sweeps a row's tuning away.

Three refusals worth knowing, because each one is the backend's:

- **A model still sitting in `public/` has no `DELETE` button**, just a line
  saying to delete the file and press `SYNC`. Deleting the row would only bring
  it back on the next scan, and in the window between, its id could be handed to
  a different file.
- **`APPLY` is only offered for the model that is open.** The editor holds one
  model's state, so applying another row's JSON would show a scene that does not
  match the row. `SAVE` works on any row; `APPLY` does not.
- **A rename never touches the model id.** The presets table joins on that id
  and nothing cascades. The new name is stored separately from the scanned path,
  which is why it survives a `SYNC` — writing it over the scanned name would
  have it silently reverted the next time anyone pressed that button. Emptying
  the field puts the scanned name back. The picker shows the rename; the id
  beside it in the library is how you find the file on disk again.

Typing in the JSON box never reaches the studio's shortcuts, and neither does
anything else inside the dialog — `P`, `Z`, `Space` and `WASD` stop at its edge
rather than driving the scene behind it. `Ctrl/Cmd+S` inside the dialog saves
the JSON column. Everything the library writes goes through the same status
line and the same `FAILED:` wording as the toolbar, and a rename or a preset
delete invalidates the public page exactly like a `SAVE` does — a model's name
is where `/`'s title, boot line and meta description come from when nobody has
written any copy for it.

Both env vars are optional and both fail closed — see `.env.example`. With
neither set the site builds and renders exactly as it did before Convex existed,
and `/studio` stays locked.

## Two deployments, and which one you are looking at

`npx convex dev` writes to a **dev** deployment and puts its URL in `.env.local`.
The host runs against a **prod** one, whose URL is set in the host's own
environment. They are separate databases with separate copies of every preset,
so a model published or a preset seeded in one is invisible in the other. Every
`convex` command here takes `--prod` for the second:

```bash
npx convex run seed:preset "$(cat seed/rahman-3d.json)"          # dev
npx convex run --prod seed:preset "$(cat seed/rahman-3d.json)"   # what the site serves
bunx convex deploy                                               # functions -> prod
```

And a write that goes straight to the database does **not** reach the page on
its own: `/` is prerendered at build time and cached for a day. A save from
/studio calls `updateTag` and refreshes it; a `convex run` from a terminal does
not, so that one needs a redeploy — and a redeploy on an unchanged commit can
reuse a cached Docker layer and rebuild nothing at all.

## Uploads

Two routes in, and they trade different things:

| | `public/` + SYNC | UPLOAD in /studio |
|---|---|---|
| Adding a model | commit, rebuild, redeploy | drag a file |
| Needs git access | yes | no |
| Serving cost | static asset, free | backend bandwidth, per view |
| Works with no backend | yes | there is nothing to upload to |

The upload path is the one place a stranger's bytes enter the deployment, and
every byte that survives is then served to every visitor, so it is checked twice
over:

- **In the browser, before anything is sent** — extension, size against the
  16 MB cap, and the twelve-byte glB header. A file refused here costs nothing.
- **In the backend, on what actually arrived** — `uploads.register` is an action
  rather than a mutation for exactly one reason: it is the only place that can
  read the bytes. It re-checks the size, that the magic is `glTF`, that the
  version is 2, and that the header's own length field matches the file. A .png
  renamed `.glb` fails there, and **anything that fails is deleted on the spot**,
  including when the check itself throws — so a rejected upload never sits in
  storage costing anything. Only then does an internal mutation write the row.

The cap is a bandwidth budget rather than a storage one: 16 MB is a raw
generator export with room to spare, and a compressed one is a third of that.

## Docs

`/docs` is the same story written for someone else's model, in two parts: making
the model (reference sheet → image-to-3D → Blender over MCP → a shipping-size
`.glb`) and making the site (clone, wire the two env vars, tune, publish). It is a
static page with no data behind it. The do/don't reference art in part one is a
placeholder pair under `public/docs/` — swap the files, no code change. Both routes reach it — the showcase carries a `DOCS` / `STUDIO`
pair in the bottom right, and the studio's lock screen points anyone who lands on
it at the repo and the guide rather than at a password they do not have.

## Performance

The page is a 3D scene, so the two things that matter are how much JavaScript
runs before anything appears and how early the model starts downloading.

- **three is not in the first load.** `use-showcase-engine` imports the engine
  module inside its effect, so three, the GLTF loader and the scene graph —
  ~640 KB — arrive in their own chunk after the HTML has painted. Initial JS for
  `/` went from 1323 KB to 682 KB. The HUD and every copy panel are still
  server-rendered, so this costs nothing in SEO or first paint; only the canvas
  waits, and it already had a boot overlay.
- **The model preloads from the document.** `ReactDOM.preload(modelUrl, { as:
  'fetch' })` puts a `<link rel="preload">` in the head, so the megabytes start
  moving while the HTML is still parsing instead of after hydration. No
  `crossOrigin`, matching the loader's same-origin XHR — a mismatch there
  downloads the file twice.
- **Assets carry cache headers.** Next serves `public/` with `max-age=0`, which
  is a revalidation round trip per view on a file measured in megabytes. Models
  and reference art get an hour of freshness and a week of stale-while-
  revalidate; hashed font files get a year, immutable.
- **`optimizePackageImports: ['three']`** resolves named imports to the modules
  that define them rather than walking the package barrel.

## Compressed models

Both geometry compressions load: **meshopt** (`EXT_meshopt_compression`) and
**Draco** (`KHR_draco_mesh_compression`). Neither decoder is fetched for a model
that does not use it.

Meshopt is the better one to export — its decoder is an ES module with the WASM
inlined, so the bundler carries it and no runtime fetch happens at all. Draco
needs a decoder on disk, so three's is vendored into `public/draco/`
(`draco_decoder.js`, `draco_decoder.wasm`, `draco_wasm_wrapper.js`, copied from
`node_modules/three/examples/jsm/libs/draco/gltf/` at three 0.185.1). Re-copy
them when three is upgraded. Self-hosted rather than pulled from gstatic for the
same reason the fonts are: no third party in the critical path of the one asset
this page exists to show.

A model whose `extensionsRequired` names a decoder that is missing does not
degrade — `GLTFLoader` throws `No DRACOLoader instance provided` and the canvas
stays black — which is why both are wired on every parse.

## Preview images

`bun run capture` drives a headless Chromium down the real page — software
rasteriser, because a WebGL canvas does not screenshot itself — and writes three
files to `public/`:

| File | Size | Used by |
|---|---|---|
| `og.jpg` | 1200×630 | the link preview card, wired in `generateMetadata` |
| `preview.gif` | 900px, 24 frames | this README |
| `thumb.webp` | 1600×840 | the template gallery |

It waits on the boot overlay's `data-state="ready"` rather than a network idle,
so nothing is shot while the canvas is still black, and it settles 850ms per
frame because the camera is damped and arrives late. Re-run it whenever the
model or the copy changes; a share card of the previous model is worse than
none.

Deliberately not enabled: the React Compiler. This tree writes to refs from a
rAF loop 60×/s and hand-tunes what re-renders; automatic memoisation there is a
behaviour change to debug, not a free win.

## Stack

Next.js 16.2 (App Router, Cache Components) · React 19 · Tailwind v4 ·
TypeScript strict · three 0.185 · Vitest.

Convex covers exactly two tables (`models`, `presets`) behind three public
queries, four token-guarded mutations and one internal seed mutation. A preset carries the camera path, the markers,
the scene settings and the copy — one row, one save. The public route never depends on it: every
read falls back to the slice defaults when the backend is unset, unreachable or
empty, which is how this site is deployed today.

## License

MIT — see [`LICENSE`](./LICENSE). The bundled `.glb` files are generated assets
of a real person's likeness; the licence covers the code, not the face.

## Deviations from the rr baseline

| Rule | Status |
| --- | --- |
| `slice.json` / `slice.manifest.json` shape | `TODO(rr): confirm` — written without the rr repo on this machine. Run `audit:slices` and reshape if the validator disagrees. |
| Theme tokens | Slice-scoped `--showcase-*` rather than the tones SSOT. Marked `TODO(rr): confirm` in `globals.css` and `lib/theme-colors.ts`. |
| `components/ui/button.tsx` | Hand-written stand-in — the shadcn registry was unreachable during the build. Replace with `bunx shadcn add button`. |
| Copy-first / Source Map | Not applied; no rr repo was available to copy from. |

## The old static build

The pre-slice single-file version was moved to `legacy-static/`. It still runs
on its own via `legacy-static/start-server.bat` and is kept only for reference.
