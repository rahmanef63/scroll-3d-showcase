import type { DocStep } from './_steps';

/**
 * Part one — getting a usable .glb out of a person, a product or a character.
 *
 * Its own file because it is its own story: a pipeline of third-party tools and
 * hand work that ends the moment a file lands in public/. Everything after that
 * is this repo's problem, and lives in _steps.ts.
 *
 * The art is the real set behind the model on this site, downscaled to webp
 * under public/docs/ — swap the files and the captions, no code change.
 */
export const MODEL_STEPS: readonly DocStep[] = [
  {
    n: '01',
    title: 'Start from one photo, and take the glasses off',
    body: 'Nothing downstream ever sees your face — it sees whatever the reference images agree on. So the source photo has to carry nothing the solver would need to invent its way around. Glasses are the common case and the worst one: a lens is a transparent surface with reflections, the frame casts a shadow across the temples, and an image-to-3D pass reads all of it as geometry welded to the head. Removing them costs one sentence to any image model — mine was four words of Indonesian — and the eyes, brows and nose bridge come back reconstructed. Hats, masks, headphones and earrings go the same way.',
    images: [
      {
        src: '/docs/source-glasses.webp',
        alt: 'Portrait photo of a man wearing round metal-framed glasses',
        caption: 'Don’t — frames, reflections, shadow on the temples',
      },
      {
        src: '/docs/source-glasses-off.webp',
        alt: 'Chat screenshot: the same portrait sent to an image model, returned without glasses',
        caption: 'Do — one line: “lepas kacamatanya”, take the glasses off',
      },
      {
        src: '/docs/mesh-glasses-fused.webp',
        alt: 'A generated 3D head with the glasses fused into the face as solid geometry',
        caption: 'Why — skip it and the frames come back as skull',
      },
    ],
  },
  {
    n: '02',
    title: 'Ask for the head turnaround — four files, not a sheet',
    body: 'Front, left profile, back, right profile, of the same head at the same age with the same hair. Identical camera height, identical scale, identical crop, one neutral expression with the mouth closed, flat even light and a plain background. A long lens or an orthographic camera, because perspective distortion is a shape change the solver believes. Insist on four separate files: a contact sheet has to be cut back apart, and every crop you make by hand puts back the misalignment the prompt spent a page removing. The full prompt is below — paste it verbatim and attach the photo from step 01.',
    links: [
      {
        label: 'prompt-head-turnaround.txt',
        href: '/docs/prompt-head-turnaround.txt',
        note: 'the exact prompt, copy it whole',
      },
    ],
    images: [
      {
        src: '/docs/head-front.webp',
        alt: 'Front view of a generated head reference on a plain grey background',
        caption: 'File 1 of 4 — front, its own 2048² image',
      },
    ],
  },
  {
    n: '03',
    title: 'Then the body, in an A-pose',
    body: 'Same four angles, same rules, one addition that decides whether the result can ever be rigged: arms held 25–35° away from the torso, palms turned in, fingers apart, legs straight, feet about shoulder width. That gap is the whole point — it is what lets an automatic rigger find a shoulder, an elbow and a wrist instead of guessing at a silhouette. Keep the floor line, the camera height and the crop identical across all four, put the camera at pelvis height, and let the body fill 85–90% of the frame.',
    links: [
      {
        label: 'prompt-body-turnaround.txt',
        href: '/docs/prompt-body-turnaround.txt',
        note: 'A-pose, camera, outfit and backpack rules',
      },
    ],
    images: [
      {
        src: '/docs/body-front.webp',
        alt: 'Front full-body reference in a black suit, arms clear of the torso',
        caption: 'Do — front: arms clear, hands open, prop pointed down',
      },
      {
        src: '/docs/body-back.webp',
        alt: 'Back full-body reference, same pose and same shoulder line',
        caption: 'Do — back: same shoulder line, same hand holding it',
      },
    ],
  },
  {
    n: '04',
    title: 'The side views are where a set goes wrong',
    body: 'Ask for a profile and an image model will happily hand you a fashion photograph: arms hanging flush against the body, the prop laid across the thigh, and — because you stopped saying it — the glasses back on. Read the silhouette instead of the picture. If the arm does not separate from the jacket in outline, the mesh will not separate it either, and you will be rebuilding a forearm by hand in Blender. Regenerate until both side views show a gap at the shoulder and the wrist, the bag reads as a box with depth rather than a flat patch, and the two profiles are mirrors of each other rather than two different days.',
    images: [
      {
        src: '/docs/body-side.webp',
        alt: 'Side full-body reference with a visible gap between arm and torso',
        caption: 'Do — arm reads as its own limb, bag has depth',
      },
      {
        src: '/docs/body-side-wrong.webp',
        alt: 'Side reference with arms flush to the torso, glasses on, prop across the leg',
        caption: 'Don’t — arms welded to the torso, glasses back, prop over the leg',
      },
    ],
  },
  {
    n: '05',
    title: 'Give props and worn objects their own reference',
    body: 'A bag, a jacket, a weapon, a product: anything you actually care about the look of gets a real photograph fed in beside the turnaround, so the generator copies it instead of inventing a plausible one. Then generate a second clean pass with nothing worn and nothing held — a backpack sits exactly over the spine and shoulder line the rigger reads, and a prop in a hand costs you the fingers. A character is the same job with a different subject: one full-body reference in, four views out, which is where the second model on this site came from.',
    images: [
      {
        src: '/docs/prop-backpack.webp',
        alt: 'Product photo of a black backpack on a white background',
        caption: 'The bag as the shop shot it — flat light, plain background',
      },
      {
        src: '/docs/character-reference.webp',
        alt: 'Full-body character reference in a black suit against a plain background',
        caption: 'A character reference — one view in, four out',
      },
    ],
  },
  {
    n: '06',
    title: 'Turn the references into a mesh',
    body: 'Upload the sheet to an image-to-3D service. I use Meshy: open the workspace, switch the Multiview toggle on, and add your views one at a time rather than dropping the whole set in at once. Generate, inspect the preview from every side, and download the result — GLB by default, or .blend if you already know you will keep editing. Run the head and the body as separate generations, and expect the body pass to lose the face: it spends its resolution on a whole person, so the head comes back as a generic one. That is not a failed run. The head pass is where the likeness lives, the body pass is where the silhouette lives, and step 08 joins them.',
    links: [
      {
        label: 'meshy.ai',
        href: 'https://www.meshy.ai?via=rahman',
        note: 'affiliate link — costs you nothing, supports this',
      },
    ],
    images: [
      {
        src: '/docs/mesh-head-result.webp',
        alt: 'Meshy workspace showing the generated head, 940,544 faces',
        caption: 'Head pass — the likeness, at 940k faces',
      },
      {
        src: '/docs/mesh-body-result.webp',
        alt: 'Meshy preview of the generated full body with a generic face',
        caption: 'Body pass — 1.98M faces, and a face that is not mine',
      },
    ],
  },
  {
    n: '07',
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
    n: '08',
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
    n: '09',
    title: 'Export a .glb that is ready to use',
    body: 'Ask for glTF 2.0 binary, +Y up, transforms applied, no cameras, no lights, no animation, and a triangle budget you can defend over a mobile connection — 100k to 200k is comfortable. One material and one texture atlas. Compress it: both meshopt and Draco load here, and the model on this page went from ten megabytes to under two with nothing visible lost. Meshopt is marginally better on this site because its decoder ships inside the bundle, while Draco fetches one the first time a compressed model opens.',
  },
];
