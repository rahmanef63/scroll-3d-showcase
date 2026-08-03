/**
 * What the browser checks before a single byte leaves the machine.
 *
 * The backend repeats every one of these on the bytes it received — that is the
 * check that counts, and it deletes what it rejects. This copy exists because
 * the upload is the expensive half: a 40 MB mistake refused here costs nothing,
 * and refused there has already crossed the wire twice.
 */
export const MAX_MODEL_BYTES = 16 * 1024 * 1024;

/** 'glTF' as a little-endian uint32 — the first four bytes of every .glb. */
const GLB_MAGIC = 0x46546c67;

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

/** Throws with something worth showing in the status slot; resolves silently. */
export async function requireGlbFile(file: File): Promise<void> {
  if (!/\.glb$/i.test(file.name)) {
    // .gltf is deliberately out: the JSON flavour points at sibling .bin and
    // texture files that an upload of one file cannot carry.
    throw new Error('Upload a .glb — the single-file glTF');
  }
  if (file.size > MAX_MODEL_BYTES) {
    throw new Error(`${mb(file.size)} is over the ${mb(MAX_MODEL_BYTES)} limit — compress it first`);
  }

  const header = new DataView(await file.slice(0, 12).arrayBuffer());
  if (header.byteLength < 12 || header.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error('That file is named .glb but does not start like one');
  }
  if (header.getUint32(4, true) !== 2) {
    throw new Error(`glTF version ${header.getUint32(4, true)} — the loader reads version 2`);
  }
  if (header.getUint32(8, true) !== file.size) {
    throw new Error('That .glb is truncated — its header disagrees with its size');
  }
}

/** File picker for a model, resolving null when the dialog is dismissed. */
export function pickGlbFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb,model/gltf-binary';
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null));
    // Without this a dismissed dialog leaves the studio busy forever.
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
