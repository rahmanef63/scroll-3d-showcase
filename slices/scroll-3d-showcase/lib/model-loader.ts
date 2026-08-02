import { Box3, Mesh, Vector3, type Object3D } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ShowcaseErrorCode } from '../types';

export class ShowcaseLoadError extends Error {
  readonly code: ShowcaseErrorCode;
  /**
   * True only for transport-level failures. A server that answered with 404 has
   * given a definitive answer, so retrying over a different transport would
   * just replace a useful message with a confusing one.
   */
  readonly retryable: boolean;

  constructor(code: ShowcaseErrorCode, detail?: string, retryable = false) {
    super(detail ?? code);
    this.name = 'ShowcaseLoadError';
    this.code = code;
    this.retryable = retryable;
  }
}

const isFileProtocol = () =>
  typeof location !== 'undefined' && location.protocol === 'file:';

/**
 * Downloads the model over XHR, falling back to `fetch` with a plain string URL.
 *
 * Deliberately NOT `GLTFLoader.load()`: three's FileLoader wraps the URL in a
 * `new Request(...)` before calling `fetch(req)`. Browser extensions that patch
 * `window.fetch` and postMessage their argument cannot structured-clone a
 * Request, so the load dies with `DataCloneError: Request object could not be
 * cloned` even when the server is fine. A string URL clones without complaint.
 */
export function fetchModelBuffer(
  url: string,
  onProgress?: (fraction: number) => void,
): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status === 0 && isFileProtocol()) {
        reject(new ShowcaseLoadError('FILE_PROTOCOL'));
      } else if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
        resolve(xhr.response as ArrayBuffer);
      } else {
        reject(new ShowcaseLoadError('MODEL_FETCH_FAILED', `HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () =>
      reject(
        isFileProtocol()
          ? new ShowcaseLoadError('FILE_PROTOCOL')
          : new ShowcaseLoadError('MODEL_FETCH_FAILED', 'XHR transport error', true),
      );
    xhr.send();
  }).catch((err: unknown) => {
    // Only a blocked or patched XHR is worth a second attempt.
    if (!(err instanceof ShowcaseLoadError) || !err.retryable) throw err;

    return fetch(url)
      .then((res) => {
        if (!res.ok) throw new ShowcaseLoadError('MODEL_FETCH_FAILED', `HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .catch((fallbackErr: unknown) => {
        if (fallbackErr instanceof ShowcaseLoadError) throw fallbackErr;
        throw new ShowcaseLoadError('MODEL_FETCH_FAILED', String(fallbackErr));
      });
  });
}

type MeshoptDecoderModule = Parameters<GLTFLoader['setMeshoptDecoder']>[0];

let decoderPromise: Promise<MeshoptDecoderModule | null> | null = null;

/**
 * Loads the meshopt decoder for EXT_meshopt_compression.
 *
 * Meshopt rather than Draco on purpose: the Draco decoder is a separate WASM
 * file that DRACOLoader pulls in through three's FileLoader — the same
 * Request-object path that breaks under a patched `fetch`. Meshopt's decoder
 * is a plain ES module with the WASM inlined, so the bundler handles it and no
 * runtime fetch happens at all. Costs ~0.4 MB more on disk; worth it.
 */
function loadMeshoptDecoder(): Promise<MeshoptDecoderModule | null> {
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
 * Parses a GLB buffer with `ImageBitmapLoader` disabled.
 *
 * Same root cause as the loader above, one layer down: for embedded textures
 * GLTFParser picks ImageBitmapLoader whenever `createImageBitmap` exists, and
 * that loader also goes through `fetch`. With a patched fetch the geometry
 * arrives but every texture fails, leaving a flat grey model. TextureLoader
 * uses an `<img>` element instead.
 */
export async function parseModel(buffer: ArrayBuffer, basePath = ''): Promise<GLTF> {
  return parseWithoutImageBitmap(buffer, basePath, await loadMeshoptDecoder());
}

/**
 * GLTFParser reads `createImageBitmap` synchronously in its constructor, so the
 * global only has to be hidden across the `parse()` call itself — deliberately
 * not awaited in here, to keep that window one tick long.
 */
function parseWithoutImageBitmap(
  buffer: ArrayBuffer,
  basePath: string,
  decoder: MeshoptDecoderModule | null,
): Promise<GLTF> {
  const globalScope = globalThis as { createImageBitmap?: unknown };
  const original = globalScope.createImageBitmap;
  globalScope.createImageBitmap = undefined;
  try {
    const loader = new GLTFLoader();
    if (decoder) loader.setMeshoptDecoder(decoder);
    return new Promise<GLTF>((resolve, reject) => {
      loader.parse(buffer, basePath, resolve, (err) =>
        reject(new ShowcaseLoadError('MODEL_PARSE_FAILED', String(err))),
      );
    });
  } finally {
    globalScope.createImageBitmap = original;
  }
}

/**
 * Centres the model on the origin and scales it to `height`, so keyframe
 * `targetY` values stay meaningful when the model is swapped out.
 */
export function normaliseModel(root: Object3D, height: number, maxAnisotropy = 8): Object3D {
  const box = new Box3().setFromObject(root);
  const size = box.getSize(new Vector3());
  const centre = box.getCenter(new Vector3());
  const scale = height / (size.y || 1);

  root.scale.setScalar(scale);
  root.position.set(-centre.x * scale, -centre.y * scale, -centre.z * scale);

  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (!material) continue;
      material.envMapIntensity = 0.85;
      // Meshy exports set emissiveFactor to white; left on it washes the model out.
      material.emissive?.setHex(0x000000);
      if (material.map) material.map.anisotropy = maxAnisotropy;
      material.needsUpdate = true;
    }
  });

  return root;
}

const basePathOf = (url: string) => url.slice(0, url.lastIndexOf('/') + 1);

export async function loadShowcaseModel(
  url: string,
  height: number,
  options: { onProgress?: (fraction: number) => void; maxAnisotropy?: number } = {},
): Promise<Object3D> {
  const buffer = await fetchModelBuffer(url, options.onProgress);
  const gltf = await parseModel(buffer, basePathOf(url));
  return normaliseModel(gltf.scene, height, options.maxAnisotropy);
}
