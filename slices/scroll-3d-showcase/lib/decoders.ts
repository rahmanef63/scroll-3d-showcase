import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * The two optional geometry decoders, and where each one comes from.
 *
 * Their own module because both are lazy singletons with a lifetime of their
 * own — one spins up worker threads, the other carries inlined WASM — and
 * neither has anything to do with fetching or normalising a model.
 */
export type MeshoptDecoderModule = Parameters<GLTFLoader['setMeshoptDecoder']>[0];
export type DracoLoaderInstance = Parameters<GLTFLoader['setDRACOLoader']>[0];

let decoderPromise: Promise<MeshoptDecoderModule | null> | null = null;
let dracoPromise: Promise<DracoLoaderInstance | null> | null = null;

/**
 * Where the host serves three's Draco decoder from. Vendored into `public/draco/`
 * rather than pulled off a CDN: this site self-hosts its fonts for the same
 * reason, the build works offline, and a decoder fetched from gstatic is a third
 * party in the critical path of the one asset the page exists to show.
 */
const DRACO_PATH = '/draco/';

/**
 * Loads the meshopt decoder for EXT_meshopt_compression.
 *
 * Meshopt is the preferred format here — its decoder is a plain ES module with
 * the WASM inlined, so the bundler handles it and no runtime fetch happens at
 * all, which sidesteps the patched-`fetch` hazard the loader above works around.
 * Draco is supported anyway (below) because every generator and every
 * gltf-transform default emits it, and a model that will not open is worse than
 * a decoder that has to be downloaded.
 */
export function loadMeshoptDecoder(): Promise<MeshoptDecoderModule | null> {
  decoderPromise ??= import('three/examples/jsm/libs/meshopt_decoder.module.js')
    .then((module) => module.MeshoptDecoder as MeshoptDecoderModule)
    .catch((err: unknown) => {
      // Uncompressed models still parse fine without it.
      console.error('[scroll-3d-showcase:meshopt]', err);
      return null;
    });
  return decoderPromise;
}

/**
 * Loads DRACOLoader for KHR_draco_mesh_compression.
 *
 * Lazily, and only ever once: the decoder spins up worker threads, so a fresh
 * instance per parse would leak one set per model swap. It fetches its WASM from
 * `DRACO_PATH` on the first Draco model and never again.
 */
export function loadDraco(): Promise<DracoLoaderInstance | null> {
  dracoPromise ??= import('three/examples/jsm/loaders/DRACOLoader.js')
    .then(({ DRACOLoader }) => {
      const loader = new DRACOLoader();
      loader.setDecoderPath(DRACO_PATH);
      return loader as DracoLoaderInstance;
    })
    .catch((err: unknown) => {
      // A model that does not use Draco still parses fine without it.
      console.error('[scroll-3d-showcase:draco]', err);
      return null;
    });
  return dracoPromise;
}
