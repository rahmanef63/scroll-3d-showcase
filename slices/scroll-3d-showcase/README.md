# scroll-3d-showcase

Scroll-driven 3D showcase. The camera completes one full 360° orbit as the page
scrolls, zooming into keyframed points of interest, under a game-style HUD.

Presentational only — no Convex functions, no server actions, no env vars. The
optional `<ShowcaseStudio>` editor is part of the slice but talks to the host
through an adapter, so it stays backend-agnostic too.

## Install

```bash
npx rr add scroll-3d-showcase
bun add three && bun add -d @types/three
bunx shadcn add button          # only if components/ui/button.tsx isn't vendored yet
```

Then drop a `.glb` into `public/`, add the `--showcase-*` tokens and the three
`@keyframes` from `app/globals.css` into your own stylesheet, and render it.

## Usage

```tsx
'use client';
import { Scroll3DShowcase } from '@/slices/scroll-3d-showcase';

<Scroll3DShowcase
  modelUrl="/model.glb"
  title="RAHMAN"
  sections={MY_SECTIONS}   // copy is yours; the slice ships none
/>;
```

### Props

| Prop | Required | Notes |
| --- | --- | --- |
| `modelUrl` | ✅ | Path to the GLB, relative to the site root. |
| `title` | ✅ | Boot screen wordmark and HUD bar. |
| `sections` | ✅ | `ShowcaseSection[]` — id, name, `progress`, `fade`, `align`, `content`. |
| `keyframes` | | Camera path. Defaults to `DEFAULT_KEYFRAMES`. |
| `markers` | | HUD tags pinned to the model. Defaults to shades/suit/sidearm/shoes. |
| `settings` | | `modelHeight`, `scrollLength`, `damping`, `parallax`, `bloom`. |
| `labels` | | Every HUD string, including per-error-code copy. Translate here. |
| `onError` | | Fires on load failure with a typed `ShowcaseError`. |

`useShowcaseJump()` is exported for panel copy that needs to drive the camera —
a "see my work" button calls `jumpToSection('03')`.

## Studio

Hand-editing the table below works, but `<ShowcaseStudio>` tunes the same path
against the live scene: the page behind the editor *is* the showcase, so what
you frame while editing is what a visitor scrolls through.

```tsx
// Second entry point on purpose — see "Two entry points" below.
import { ShowcaseStudio, createMockStudioAdapter } from '@/slices/scroll-3d-showcase/studio';

<ShowcaseStudio
  models={[{ id: 'model', name: 'model', url: '/model.glb', bytes: 0 }]}
  modelId="model"
  preset={{ keyframes: DEFAULT_KEYFRAMES, markers: DEFAULT_MARKERS }}
  adapter={createMockStudioAdapter()}   // in-memory: no backend needed
  liveModelId="model"                   // optional: which one the public page shows
  onSelectModel={(id) => router.push(`/studio?model=${id}`)}
/>;
```

#### Two entry points

`@/slices/scroll-3d-showcase` renders a showcase. `@/slices/scroll-3d-showcase/studio`
edits one. The split is not tidiness — a value re-export keeps a module graph
alive whether or not anyone calls it, so listing `ShowcaseStudio` in the runtime
barrel put the fields, sliders, history and path map in the chunk every visitor
of `/` downloaded. It hid inside the same chunk as three.js, so no build output
showed it; only grepping the emitted JS for `AT LOOK-AT` did. Import the editor
from the editor entry and a page that never mounts it never pays for it.

0.11.0 adds `contentPresets` — named whole-copy sets the COPY tab loads in one
click, one per character or brand. Host-owned data, like the copy itself; omit
it and no chips render.

0.10.0 frames the scene: `<ShowcaseStudio>` now mounts the showcase inside a
centred, letterboxed viewport instead of full-bleed under the chrome, adds a
`PREVIEW` mode, and adds WASD/QE camera navigation. Two knock-on changes for
consumers: `Scroll3DShowcase` takes `scrollSpacer` (set false when you frame it
yourself), and bare `S` no longer saves — `Ctrl`/`Cmd`+`S` does, because `S` now
dollies.

0.9.0 adds `content.bootTitle` (the loading screen can say something the tab and
the search result should not — falls back to `title` when empty), an optional
`blockIds` prop, and an optional `forgetModel` adapter method.

0.8.0 adds an optional `liveModelId` prop and an optional `setLiveModel` adapter
method — together they are the `LIVE` chip. Leave both out and the chip is not
rendered, which is right for a host that only ever shows one asset.

0.7.0 adds one optional field to `preset`:
`content`, the words — title, brand, meta description and each panel's kicker /
heading / body. Omit it and the COPY tab opens empty; the camera side is
untouched either way.

### Layout

Every editor surface is a fixed bar, and the scene sits in a box between them —
centred, letterboxed to a chosen output shape, never underneath the chrome.

That framing is not cosmetic. `screenShiftX` is a fraction of the camera's
half-width, so a shot only reads correctly at the aspect ratio it will be viewed
at. A full-bleed canvas with chrome laid over it previews *your editor window
minus whatever the panel happens to cover* — a composition no visitor ever sees.
A 16:9 box previews 16:9, and switching to 9:16 shows you what a phone gets.

The mechanism is one line: a `transform` makes an element the containing block
for `fixed` descendants, so the box silently redefines "the viewport" for the
showcase's own layers. Nothing is threaded through the slice, and the public
page is untouched. The one thing that cannot live inside a `fixed` box is the
page height, so the studio renders that spacer itself — hence `scrollSpacer`.

`PREVIEW` (`P`) drops the frame and hides every bar: full-bleed, exactly what a
visitor gets. Below 1024px the scene is always full-bleed — there is no room to
letterbox a phone, and the phone's own aspect is the one worth previewing.

Desktop, ≥1024px:

```
┌────────────────────────────────────────────────────────────────┐
│ STUDIO │ model ▾ │ SYNC SAVE COPY TS │ ↶ ↷ │      ● UNSAVED    │ chrome   36
│ 1–9 KEY · ←→ STEP · SPACE PLAY · F FOCUS · S SAVE · Z UNDO · H │
├─────────┬────────────────────────────────────┬─────────────────┤
│ KEYS 6 +│                                  │SHOT COPY MRK SCN│
│ ▸01 .000│                                    │ ═══════════════ │
│  02 .180│              canvas                │ AZIMUTH    38°  │ panel  300
│  03 .420│                                    │ [───●───────]   │
│ rail 176│                                    │ …               │
├─────────┘                                    │                 │
│ ◯ path map 132                               │                 │
├────────────────────────────────────────────────────────────────┤
│ |◀ ▶ ▶|  LOOP  12s  [═══════●════════]  P·AZ·EL·R·FOV·LABEL    │ transport 56
└────────────────────────────────────────────────────────────────┘
```

Mobile, <1024px — the rail flattens into a chip strip and the panel becomes a
bottom sheet:

```
┌──────────────────────────────┐
│ STUDIO  ↶ ↷  ●  SOLO         │ chrome
│ ‹ 01 ▸02 03 04 + DUP DEL ›   │ rail strip
│                              │
│           canvas             │ ≥313px with the sheet open
│                              │ ≥668px with it closed
│ |◀ ▶ ▶| [═══●═══]  P .180    │ transport
│ sheet — max 42vh, scrolls    │ renders nothing when closed
│ [SHOT][COPY][MARKS][SCENE]   │ dock
└──────────────────────────────┘
```

Tapping the open dock tab closes the sheet, which hands the whole screen back to
the model. The path map is desktop-only.

### The five regions

| Region | What it holds |
| --- | --- |
| **Chrome** — top bar | Model picker, the viewport aspect (`FIT` / `16:9` / `21:9` / `4:3` / `1:1` / `9:16`), `PREVIEW`, `GO LIVE` (disabled and reading `LIVE` once it holds, so it doubles as the answer to "which one is the site showing?"), `SYNC` / `SAVE` / `COPY TS`, undo/redo, the `● UNSAVED` / `○ SAVED` dot, transient action status, and the one-line shortcut legend (desktop). |
| **Rail** — left column | One row per keyframe: index, `p`, label. Clicking a row seeks to it. `+` captures the camera as it looks at the current scroll position; `DUP` / `DEL` act on the selected row. `DEL` is disabled at one keyframe — undo covers the rest, so there is no confirm dialog. |
| **Panel** — right column | Four tabs: **SHOT** (the selected keyframe), **COPY** (the words), **MARKS** (the tags pinned to the model), **SCENE** (scene settings). Collapses to a 32px stub. |
| **Transport** — bottom bar | Prev / play / next, `LOOP`, sweep duration in seconds, a scrubber, and a live readout: `P 0.180 · AZ 38° · EL 1° · R 0.42 · FOV 34° · 33MM · SHADES`. |
| **Path map** — bottom-left, desktop | Top-down plot of the orbit: one dot per keyframe at its azimuth and radius, a needle for where the camera is right now. Click a dot to seek to it. |

### How editing behaves

- **Selection follows the playhead.** Seeking, playing, a rail row, a path-map
  dot and the number keys all land on the keyframe nearest the current scroll
  position — so a drag on the canvas can never quietly edit a key that is not
  on screen.
- **Drag to orbit, wheel to dolly.** Both patch the selected keyframe; the
  studio snaps the scroll to that keyframe first if the two have drifted apart.
- **Play is the real page scroll**, not a preview: the transport drives the same
  scroll position a visitor moves, so playback and the published page cannot
  disagree. Any pointer or wheel input stops it. Under
  `prefers-reduced-motion` the play button is disabled.
- **Sliders carry their own unit** — `38°`, `0.42m`, `34° · 33mm` — instead of
  the bare number boxes of 0.5.0. The number box next to each one still takes
  typed values.
- **Undo is 50 deep** and cleared on model swap. One drag is one entry (edits
  coalesce for 280ms); adds, duplicates, deletes and marker edits commit
  immediately.
- **The six fly keys hold.** They run on their own rAF rather than on keydown
  auto-repeat, which the OS throttles and delays — a camera driven by repeat
  feels broken. Holding one snaps the page onto the selected keyframe first,
  same as an orbit drag, so the keys can never edit a shot that is off screen.
  A whole run coalesces into one undo entry.
- **PREVIEW** (`P`) hides every editor surface and un-frames the scene. The only
  thing left is an invisible exit button in the top-right corner — hover or tab
  to it.
- **CHARACTER loads a whole set of words.** `contentPresets` puts a chip per
  preset at the top of the tab; clicking one replaces title, boot line, brand,
  description and every panel in a single undo step. It does *not* change which
  model is live — that is the picker in the bar, and doing both from one button
  would navigate away and lose the copy it had just loaded. The active chip is
  matched on section ids, not on the title, so it survives every word being
  rewritten.
- **COPY edits words, not blocks.** Title, boot line, brand, meta description, and per
  panel: id, name, `progress`, the two fade bounds, which side it sits on, and
  kicker / heading / body. `+` adds a panel at the current scroll with a fade
  window around it. A heading takes `⏎` for a line break and `|` to outline
  everything after it. The host renders whatever rich blocks it wants around
  this text, keyed by section id — those stay code. Typing a title updates the
  HUD wordmark live; the panels themselves are not previewed here, because they
  would sit under the chrome. Pass `blockIds` and a section whose id has drifted
  off the host's blocks is flagged in place — the join is by id and nothing
  enforces it, so without this the only symptom is a stat grid quietly missing
  from the live page.
- **SCENE** is honest about what can retune live: `scrollLength` applies
  immediately, while `modelHeight`, `damping`, `parallax` and `bloom` need the
  scene rebuilt, so they are marked `NEEDS REBUILD` and an `APPLY` chip appears.

### Keyboard

Every shortcut is ignored while focus is in a text box, a number box, a select
or any `contenteditable`.

| Key | Does |
| --- | --- |
| `W` / `S` | Dolly in / out. Multiplicative, so it moves the same *proportion* of the distance at a 0.42m close-up and a 3.6m wide shot. |
| `A` / `D` | Orbit left / right. |
| `Q` / `E` | Duck / rise. |
| `Shift` | Hold with any of the six: about 3× faster. |
| `1`–`9` | Seek to keyframe *n* (ignored past the end of the list). |
| `←` / `→` | Step to the previous / next keyframe. |
| `Space` | Play / pause. |
| `F` | Jump the page scroll to the selected keyframe. |
| `Ctrl`/`Cmd`+`S` | Save through the adapter. |
| `Z` (bare, or `Ctrl`/`Cmd`+`Z`) | Undo. |
| `Shift`+`Z`, or `Y` | Redo. |
| `P` | Toggle preview — drop the frame, hide all editor chrome. |
| `Esc` | Close the mobile sheet. |

### The adapter

The adapter is the only seam a host has to fill:

| Method | Does |
| --- | --- |
| `syncModels()` | Rescans the host's asset directory, returns `{ added, total }`. |
| `savePreset(modelId, preset)` | Persists keyframes, markers, settings and content. |
| `setLiveModel(modelId)` *(optional)* | Points the public page at this model. Omit it and the `LIVE` chip disappears rather than becoming a dead button. |
| `forgetModel(modelId)` *(optional)* | Drops a `missing` row for good. The `FORGET` chip only exists while a model is flagged, so it is absent on every healthy one. |

A `ShowcaseModel` may carry `missing: true` — the host still knows about it but
its file is gone. The picker labels it `name · MISSING` and the chip reads
`NO FILE` and refuses to publish it, so an editor can never point a live site at
a URL that 404s. The row is kept rather than dropped: an id must never be handed
to a different file later, and the preset tuned against it is worth more than
the tidiness.

Reads are not in the adapter on purpose — the host loads `models` and `preset`
itself and passes them in, so a server component can do it without shipping a
database client to the browser. **COPY TS** emits the keyframe table in the exact
shape of `config/keyframes.ts`, which is how a tuned path leaves the editor and
becomes code in a project that has no backend at all.

### `studio/` file map

| Group | Files |
| --- | --- |
| Composition root | `showcase-studio.tsx` — owns the draft, the one `seek()` every region calls, and the render order. |
| Chrome & layout | `use-studio-layout.ts`, `studio-chrome.tsx`, `studio-rail.tsx`, `studio-panel.tsx` |
| Motion | `use-studio-playback.ts`, `use-studio-history.ts`, `use-studio-keys.ts`, `studio-transport.tsx`, `path-map.tsx` |
| Fields | `field-slider.tsx`, `keyframe-fields.tsx`, `content-fields.tsx`, `marker-list.tsx`, `scene-fields.tsx`, `panel-bodies.tsx`, `studio-ui.tsx`, `presets.ts` |
| State & host seam | `use-studio-draft.ts`, `draft-utils.ts`, `use-studio-actions.ts`, `use-orbit-drag.ts`, `to-source.ts`, `mock-adapter.ts`, `types.ts` |

Only `ShowcaseStudio`, `createMockStudioAdapter` and the three studio types are
public; everything else in `studio/` stays behind the barrel.

The two-level tab bar and mobile dock shape, the debounced undo stack, the
uncontrolled sliders and the keyboard typing-guard are ported from the
MIT-licensed `framepilot` editor. Code only — no dependency, styling, icon set
or i18n came across with them.

## Tuning the camera

`config/keyframes.ts` holds the default path. Each entry:

| Field | Meaning |
| --- | --- |
| `p` | Scroll position, 0 (top) → 1 (bottom). Keep the array sorted. |
| `azimuth` | Horizontal orbit in degrees. First → last should span 360. |
| `elevation` | Vertical orbit. Positive looks down at the model. |
| `radius` | Distance. Smaller = closer. |
| `targetY` | Look-at height in normalised space: head ≈ `0.76`, feet ≈ `-0.72`. |
| `targetX` | Lateral look-at offset for details off the centre line. Optional, defaults to `0`. |
| `targetZ` | Depth look-at offset, same purpose as `targetX`. Optional, defaults to `0`. |
| `screenShiftX` | Pushes the model sideways: `+` right, `-` left. Ignored below `md`. |
| `fov` | Field of view. |
| `label` | HUD readout text. |

The loader re-centres and re-scales any model to `settings.modelHeight`, so
`targetY` stays meaningful when you swap the GLB.

### Aiming at something off the centre line

`targetY` alone can only frame things stacked up the model's spine. A prop held
out to one side — the sidearm in the default path — needs `targetX` / `targetZ`
as well, or it sits outside the frame once the radius drops below ~1.

The fastest way to find those numbers is an orthographic render: put the model
in an ortho camera with known bounds, overlay a grid, and read the coordinates
straight off the image. The defaults here were measured that way.

`screenShiftX` is applied *on top of* the lateral target, so it still reads as
"slide the subject sideways to clear the copy column" either way. Keep its sign
opposite the paired section's `align`.


## Why the model is loaded by hand

`GLTFLoader.load()` wraps the URL in a `new Request(...)` before calling
`fetch(req)`. Extensions that patch `window.fetch` and postMessage their
argument cannot structured-clone a Request, so the load fails with
`DataCloneError: Request object could not be cloned` even when the server is
fine. `lib/model-loader.ts` fetches over XHR (string-URL `fetch` fallback) and
hands the buffer to `GLTFLoader.parse()`.

Same root cause one layer down: `GLTFParser` picks `ImageBitmapLoader` — also
fetch-based — for embedded textures. `parseGLB` hides `createImageBitmap` for
the duration of the parse so `TextureLoader` (an `<img>` element) is used
instead. Without that the geometry loads and every texture fails, leaving a
flat grey model.

`__tests__/model-loader.test.ts` locks both behaviours in with a deliberately
broken `fetch`.

## Compressed models

`parseModel` wires in the meshopt decoder, so `EXT_meshopt_compression` and
`EXT_texture_webp` load out of the box. Uncompressed GLBs still work unchanged.

Recommended pipeline:

```bash
bunx @gltf-transform/cli optimize in.glb out.glb \
  --compress meshopt --texture-compress webp --texture-size 2048 --simplify false
```

**Meshopt, not Draco.** DRACOLoader fetches its WASM decoder through three's
FileLoader — the same `Request`-object path that breaks under a patched
`fetch`, which would undo the fix above. Meshopt's decoder is a plain ES module
with the WASM inlined, so the bundler handles it and nothing is fetched at
runtime. Draco files land ~0.4 MB smaller; not worth reintroducing the failure.

On the reference model (a 312k-triangle Meshy scan, 4 × 2048² JPEG):

| | Size | Face close-up |
| --- | --- | --- |
| Original | 17.5 MB | reference |
| meshopt + webp @ 2048 | **2.5 MB** | indistinguishable |
| meshopt + webp @ 1024 | 2.0 MB | beard and skin detail visibly flatten |
| `--simplify true` @ 1024 | 1.3 MB | 39% fewer triangles — check the silhouette |

Also strip textures the material never samples. This slice forces `emissive`
to black, so an emissive map is pure waste — dropping it saved 22 MB of VRAM at
2048, far more than it cost on disk:

```js
material.setEmissiveTexture(null);
material.setEmissiveFactor([0, 0, 0]);
```

