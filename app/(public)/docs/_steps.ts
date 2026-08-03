/** Where a visitor gets the code. Referenced from the guide and the studio lock screen. */
export const REPO_URL = 'https://github.com/rahmanef63/scroll-3d-showcase';

export interface DocStep {
  n: string;
  title: string;
  body: string;
  /** Shell or config block under the prose. Omitted where there is nothing to run. */
  code?: string;
  /** Tools the step sends you to. Rendered as a chip row, never inline in the prose. */
  links?: readonly { label: string; href: string; note?: string }[];
  /** Reference art. Paths under public/, so they are swappable without a code change. */
  images?: readonly { src: string; alt: string; caption: string }[];
}

/**
 * Getting a usable .glb out of a person, a product or a character.
 *
 * Deliberately separate from the build steps: this half is a pipeline of
 * third-party tools and hand work, and it ends the moment a file lands in
 * public/. Everything after that is this repo's problem.
 */
export const MODEL_STEPS: readonly DocStep[] = [
  {
    n: '01',
    title: 'Generate the reference views',
    body: 'Ask an image model for a character sheet: the head from the front, left, right and back, then the full body from those same four angles. Hold one subject, one pose, one flat light and one plain background across all eight frames. Consistency matters more than beauty — the solver reads the set as a single object seen from four sides, so anything that drifts between views comes back as geometry you repair by hand.',
    images: [
      {
        src: '/docs/reference-do.webp',
        alt: 'Four consistent reference views: front, left, right and back, evenly lit on a plain background',
        caption: 'Do — one pose, one light, full body in frame',
      },
      {
        src: '/docs/reference-dont.webp',
        alt: 'Four inconsistent reference views with mixed angles, hard shadows and cropped limbs',
        caption: 'Don’t — mixed angles, hard shadows, cropped limbs',
      },
    ],
  },
  {
    n: '02',
    title: 'Turn the references into a mesh',
    body: 'Upload the sheet to an image-to-3D service. I use Meshy: open the workspace, switch the Multiview toggle on, and add your views one at a time rather than dropping the whole set in at once. Generate, inspect the preview from every side, and download the result — GLB by default, or .blend if you already know you will keep editing. Run the head and the body as separate generations; one pass rarely resolves both at a quality worth keeping.',
    links: [
      {
        label: 'meshy.ai',
        href: 'https://www.meshy.ai?via=rahman',
        note: 'affiliate link — costs you nothing, supports this',
      },
    ],
  },
  {
    n: '03',
    title: 'Install Blender and the Blender MCP server',
    body: 'Blender is where the separate generations become one model. The MCP server exposes a running Blender session to an assistant, so the assembly can be described instead of clicked. Install Blender 3.0 or newer and the uv package manager, add addon.py from the blender-mcp repository through Edit > Preferences > Add-ons, and enable it. Register the server with your MCP client, then in Blender press N for the sidebar, open the BlenderMCP tab and hit Connect.',
    code: `{
  "mcpServers": {
    "blender": { "command": "uvx", "args": ["blender-mcp"] }
  }
}`,
    links: [
      { label: 'blender.org/download', href: 'https://www.blender.org/download/' },
      { label: 'github.com/ahujasid/blender-mcp', href: 'https://github.com/ahujasid/blender-mcp' },
    ],
  },
  {
    n: '04',
    title: 'Assemble it with an assistant, one stage at a time',
    body: 'Point your MCP-capable assistant at Blender and work in stages. This is the step that fails if you ask for everything in one message: a long request runs past the tool timeout, and a run that dies halfway leaves the scene in a state neither of you can describe. Give one instruction, confirm it in the viewport, save the file, then give the next. Eight stages is a realistic shape — import, align, join, clean, retopologise or decimate, bake the textures into one atlas, collapse to a single PBR material, export.',
    code: `You are driving Blender over MCP. Work one stage at a time and stop
after each one.

Stage 3 of 8 — join HEAD and BODY into a single mesh: merge by
distance, delete the interior faces where they overlap, and recalculate
normals outward. Do not touch materials yet. Report the triangle count
before and after, then save the file and stop.`,
  },
  {
    n: '05',
    title: 'Export a .glb that is ready to use',
    body: 'Ask for glTF 2.0 binary, +Y up, transforms applied, no cameras, no lights, no animation, and a triangle budget you can defend over a mobile connection — 100k to 200k is comfortable, and this site ships 130k. One material and one texture atlas. Compression is worth the round trip: meshopt or Draco took the model on this page from ten megabytes to three and a half with nothing visible lost.',
  },
];

/**
 * The whole build, in the order it actually happens.
 *
 * Data rather than markup so the page stays a renderer, and prose rather than
 * markdown so nothing has to parse it — paths are written plainly and the only
 * formatted thing is the shell block.
 */
export const STEPS: readonly DocStep[] = [
  {
    n: '01',
    title: 'Clone it and run it',
    body: 'No environment variables, no backend, no account. What you get is this site: the bundled model, the default camera path, and the copy that lives in app/(public)/_content/copy.ts. Everything below is optional on top of a page that already works.',
    code: `git clone ${REPO_URL}.git
cd scroll-3d-showcase
bun install
bun dev              # http://localhost:3000`,
  },
  {
    n: '02',
    title: 'Get the model into the site — two routes',
    body: 'Either put the .glb in public/ and commit it, which needs a rebuild for every model but serves the file as a static asset for free; or press UPLOAD in /studio, which stores it in the backend and needs no repository, no rebuild and no deploy. The second is the only route someone without git has, and the one that matters if you deployed this to Vercel from a clone. Exporter units do not matter either way — the loader rescales whatever you give it to a fixed height and centres it on the origin.',
  },
  {
    n: '03',
    title: 'Add a backend, if you want the editor',
    body: 'Convex holds two tables: the models it has seen, and one preset per model. Both ends compare the same token — the deployment copy guards every write, the local copy unlocks /studio. Skip this step entirely and the public page still renders; only the editor stays shut.',
    code: `bunx convex dev                              # creates the deployment
bunx convex env set STUDIO_TOKEN <password>  # guards the mutations
echo 'STUDIO_TOKEN=<password>' >> .env.local`,
  },
  {
    n: '04',
    title: 'Open /studio, then SYNC or UPLOAD',
    body: 'SYNC scans public/ and registers every model file it finds; UPLOAD takes a .glb straight from your machine into the backend. Ids are assigned once and never reassigned, so a file that leaves and comes back gets its tuning back with it. A scanned file that vanished is flagged rather than deleted — it cannot be published, and it stops being served if it already was. An uploaded one has no file to lose; FORGET deletes the row and its bytes together, and that is the only way it leaves storage.',
  },
  {
    n: '05',
    title: 'Keep uploads small — that is a bandwidth budget',
    body: 'An uploaded model is served by the backend, and every visitor downloads it in full, so its size is a recurring cost rather than a one-off. The limit is 16 MB and the browser refuses anything over it before a byte is sent; the backend then reads the first twelve bytes of what actually arrived, checks they say glTF version 2 and that the header length matches the file, and deletes anything that fails. A renamed .png never becomes a model. Ship a compressed export and this is a non-issue: the model on this page is 3.5 MB, down from 10.8.',
  },
  {
    n: '06',
    title: 'Tune the camera',
    body: 'Drag to orbit, wheel to dolly, W/S/A/D/Q/E to fly, and + on the left rail to capture the current view as a new stop. Each stop is a keyframe at a scroll position: the page scroll is the timeline, SPACE plays it back, and the sliders in the SHOT tab do the fine work. Undo is Z and goes back fifty steps.',
  },
  {
    n: '07',
    title: 'Write the words',
    body: 'The COPY tab holds the title, the boot line, the brand, the meta description and one panel per stop, each with its own fade window. Type into the title and the wordmark updates as you go; saving it renames the browser tab and the search result too. The rich blocks — stat grids, card grids, link lists — are components keyed by section id in app/(public)/_content/panel-extras.tsx.',
  },
  {
    n: '08',
    title: 'SAVE, then GO LIVE',
    body: 'SAVE writes the preset and invalidates the public page. GO LIVE points / at this model. Two acts rather than one, on purpose: dropping a file into public/ must never swap the site hero on its own. A model published before anyone tuned it renders on the default path rather than quietly keeping the old one on screen.',
  },
  {
    n: '09',
    title: 'Keep the tuning portable',
    body: 'EXPORT downloads the whole preset — camera, markers, scene settings and every word — as JSON. IMPORT reads one back into whichever model is open, which is how a tuning session survives swapping the .glb for a better export under a new name. It is also the shortest route through a language model: export the file, ask for a rewritten set of panels or a different camera rhythm, import the answer. Nothing is written until you press SAVE, so a bad suggestion costs one undo. The files under seed/ are exactly these files, and one command writes one straight into a deployment.',
    code: 'bunx convex run seed:preset "$(cat seed/rahman-3d.json)"',
  },
  {
    n: '10',
    title: 'Ship it',
    body: 'Two ways out: the Dockerfile builds a standalone server that any Node host runs, and the repo has a Vercel button that clones it and asks for the same two variables. convex/_generated is committed, so neither needs a codegen step. Set the same two variables wherever it lands. With neither set the deploy still serves the bundled model and the default path, so a backend that is down or misconfigured can never take the page with it. Want no backend at all? COPY TS puts the tuned keyframe table on the clipboard in config/keyframes.ts shape — paste it in and the path ships inside the bundle.',
  },
  {
    n: '11',
    title: 'Show it to the world, and mention me',
    body: 'I am genuinely curious what comes out of this — no two of these have looked alike yet, and the model is the least predictable part. If you get stuck anywhere, including inside somebody else’s tool, search rahmanef_ and message me wherever you find me.',
  },
];
