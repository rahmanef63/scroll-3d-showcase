/** Where a visitor gets the code. Referenced from the guide and the studio lock screen. */
export const REPO_URL = 'https://github.com/rahmanef63/scroll-3d-showcase';

export interface DocStep {
  n: string;
  title: string;
  body: string;
  /** Shell block under the prose. Omitted where there is nothing to run. */
  code?: string;
}

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
npm install
npm run dev          # http://localhost:3000`,
  },
  {
    n: '02',
    title: 'Drop your model into public/',
    body: 'A .glb or .gltf of a few megabytes. Exporter units do not matter — the loader rescales whatever you give it to a fixed height and centres it on the origin. Subfolders are fine: public/models/car.glb becomes the id models-car, and the id is what a saved camera path is attached to.',
  },
  {
    n: '03',
    title: 'Add a backend, if you want the editor',
    body: 'Convex holds two tables: the models it has seen, and one preset per model. Both ends compare the same token — the deployment copy guards every write, the local copy unlocks /studio. Skip this step entirely and the public page still renders; only the editor stays shut.',
    code: `npx convex dev                              # creates the deployment
npx convex env set STUDIO_TOKEN <password>  # guards the mutations
echo 'STUDIO_TOKEN=<password>' >> .env.local`,
  },
  {
    n: '04',
    title: 'Open /studio and press SYNC',
    body: 'SYNC scans public/ and registers every model file it finds. Ids are assigned once and never reassigned, so a file that leaves and comes back gets its tuning back with it. A file that vanished is flagged rather than deleted — it cannot be published, and it stops being served if it already was.',
  },
  {
    n: '05',
    title: 'Tune the camera',
    body: 'Drag to orbit, wheel to dolly, W/S/A/D/Q/E to fly, and + on the left rail to capture the current view as a new stop. Each stop is a keyframe at a scroll position: the page scroll is the timeline, SPACE plays it back, and the sliders in the SHOT tab do the fine work. Undo is Z and goes back fifty steps.',
  },
  {
    n: '06',
    title: 'Write the words',
    body: 'The COPY tab holds the title, the boot line, the brand, the meta description and one panel per stop, each with its own fade window. Type into the title and the wordmark updates as you go; saving it renames the browser tab and the search result too. The rich blocks — stat grids, card grids, link lists — are components keyed by section id in app/(public)/_content/panel-extras.tsx.',
  },
  {
    n: '07',
    title: 'SAVE, then GO LIVE',
    body: 'SAVE writes the preset and invalidates the public page. GO LIVE points / at this model. Two acts rather than one, on purpose: dropping a file into public/ must never swap the site hero on its own. A model published before anyone tuned it renders on the default path rather than quietly keeping the old one on screen.',
  },
  {
    n: '08',
    title: 'Keep the tuning portable',
    body: 'EXPORT downloads the whole preset — camera, markers, scene settings and every word — as JSON. IMPORT reads one back into whichever model is open, which is how a tuning session survives swapping the .glb for a better export under a new name. The files under seed/ are exactly these files, and one command writes one straight into a deployment.',
    code: 'npx convex run seed:preset "$(cat seed/rahman-3d.json)"',
  },
  {
    n: '09',
    title: 'Ship it',
    body: 'The Dockerfile builds a standalone server that any Node host runs. Set the same two variables there. With neither set the deploy still serves the bundled model and the default path, so a backend that is down or misconfigured can never take the page with it. Want no backend at all? COPY TS puts the tuned keyframe table on the clipboard in config/keyframes.ts shape — paste it in and the path ships inside the bundle.',
  },
];
