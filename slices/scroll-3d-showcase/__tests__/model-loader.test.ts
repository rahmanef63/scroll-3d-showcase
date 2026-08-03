import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const probe = vi.hoisted(() => ({
  createImageBitmapDuringParse: [] as unknown[],
  meshoptDecoders: [] as unknown[],
  dracoLoaders: [] as unknown[],
  dracoPaths: [] as string[],
}));

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    setMeshoptDecoder(decoder: unknown) {
      probe.meshoptDecoders.push(decoder);
      return this;
    }
    setDRACOLoader(loader: unknown) {
      probe.dracoLoaders.push(loader);
      return this;
    }
    parse(
      _buffer: ArrayBuffer,
      _path: string,
      onLoad: (gltf: unknown) => void,
    ) {
      probe.createImageBitmapDuringParse.push(
        (globalThis as { createImageBitmap?: unknown }).createImageBitmap,
      );
      onLoad({ scene: {} });
    }
  },
}));

vi.mock('three/examples/jsm/libs/meshopt_decoder.module.js', () => ({
  MeshoptDecoder: { __stub: 'meshopt' },
}));

vi.mock('three/examples/jsm/loaders/DRACOLoader.js', () => ({
  DRACOLoader: class {
    setDecoderPath(path: string) {
      probe.dracoPaths.push(path);
      return this;
    }
  },
}));

const { fetchModelBuffer, parseModel, ShowcaseLoadError } = await import('../lib/model-loader');

/** Minimal XHR stand-in — jsdom's does not do arraybuffer over a fake server. */
function stubXhr(behaviour: { status: number; response?: ArrayBuffer; fail?: boolean }) {
  class FakeXhr {
    status = 0;
    response: ArrayBuffer | null = null;
    responseType = '';
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onprogress: ((e: ProgressEvent) => void) | null = null;
    open() {}
    send() {
      queueMicrotask(() => {
        if (behaviour.fail) {
          this.onerror?.();
          return;
        }
        this.status = behaviour.status;
        this.response = behaviour.response ?? null;
        this.onload?.();
      });
    }
  }
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
}

/** Reproduces an extension that patches fetch and cannot clone a Request. */
function stubBrokenFetch() {
  const spy = vi.fn(() => {
    throw new DOMException(
      "Failed to execute 'postMessage' on 'Window': Request object could not be cloned.",
      'DataCloneError',
    );
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

beforeEach(() => {
  probe.createImageBitmapDuringParse.length = 0;
  probe.meshoptDecoders.length = 0;
  probe.dracoLoaders.length = 0;
  // `dracoPaths` is deliberately NOT reset: it records constructions, and the
  // decoder is a module-level singleton whose whole point is surviving between
  // parses — clearing it here would hide a rebuild.
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchModelBuffer', () => {
  it('resolves over XHR without ever touching fetch', async () => {
    const payload = new ArrayBuffer(8);
    stubXhr({ status: 200, response: payload });
    const brokenFetch = stubBrokenFetch();

    await expect(fetchModelBuffer('/model.glb')).resolves.toBe(payload);
    // The whole point of the XHR path: a patched fetch must not be reachable.
    expect(brokenFetch).not.toHaveBeenCalled();
  });

  it('reports the HTTP status when the file is missing', async () => {
    stubXhr({ status: 404 });
    stubBrokenFetch();

    await expect(fetchModelBuffer('/missing.glb')).rejects.toMatchObject({
      code: 'MODEL_FETCH_FAILED',
      message: 'HTTP 404',
    });
  });

  it('falls back to fetch with a plain string URL, never a Request object', async () => {
    stubXhr({ status: 0, fail: true });
    const payload = new ArrayBuffer(4);
    const fetchSpy = vi.fn(async (_input: unknown) => ({
      ok: true,
      arrayBuffer: async () => payload,
    }));
    vi.stubGlobal('fetch', fetchSpy);

    await expect(fetchModelBuffer('/model.glb')).resolves.toBe(payload);
    expect(fetchSpy).toHaveBeenCalledWith('/model.glb');
    expect(typeof fetchSpy.mock.calls[0][0]).toBe('string');
  });

  it('surfaces a dedicated code for file:// so the message can be specific', async () => {
    stubXhr({ status: 0, fail: true });
    vi.stubGlobal('location', { protocol: 'file:' } as Location);

    await expect(fetchModelBuffer('/model.glb')).rejects.toBeInstanceOf(ShowcaseLoadError);
    await expect(fetchModelBuffer('/model.glb')).rejects.toMatchObject({
      code: 'FILE_PROTOCOL',
    });
  });
});

describe('parseModel', () => {
  it('hides createImageBitmap so GLTFLoader avoids the fetch-based image loader', async () => {
    const restored = () => (globalThis as { createImageBitmap?: unknown }).createImageBitmap;
    vi.stubGlobal('createImageBitmap', () => Promise.resolve());
    const before = restored();

    await parseModel(new ArrayBuffer(4));

    expect(probe.createImageBitmapDuringParse).toEqual([undefined]);
    expect(restored()).toBe(before);
  });

  it('wires the meshopt decoder in as an ES module, never a fetched WASM file', async () => {
    await parseModel(new ArrayBuffer(4));
    expect(probe.meshoptDecoders).toEqual([{ __stub: 'meshopt' }]);
  });

  it('wires a Draco decoder too, from a path this site serves itself', async () => {
    // A .glb that declares KHR_draco_mesh_compression does not degrade: the
    // parser throws "No DRACOLoader instance provided" and the canvas stays
    // black. Every generator emits Draco by default, so this is the common case.
    await parseModel(new ArrayBuffer(4));
    expect(probe.dracoLoaders).toHaveLength(1);
    expect(probe.dracoPaths).toEqual(['/draco/']);
  });

  it('builds it once and hands the same one to every parse', async () => {
    // It spins up worker threads; a fresh instance per model swap leaks a set.
    await parseModel(new ArrayBuffer(4));
    await parseModel(new ArrayBuffer(4));
    expect(probe.dracoPaths).toHaveLength(1);
    expect(new Set(probe.dracoLoaders).size).toBe(1);
  });
});
