import type { ShowcaseModel } from './types';

/**
 * Where a model's bytes actually live, in one word.
 *
 * The two are not interchangeable and the difference decides what you can do to
 * one: a file in public/ shipped with the build, so the studio cannot delete it
 * — the next SYNC would put the row straight back — while an upload exists only
 * in the backend's storage and the studio is the only thing that can remove it.
 * Both readers (the picker and the library) go through here so they can never
 * label the same row differently.
 */
export type ModelSource = 'PUBLIC/' | 'CLOUD' | 'MISSING';

export function modelSource(model: ShowcaseModel): ModelSource {
  if (model.missing) return 'MISSING';
  return model.uploaded ? 'CLOUD' : 'PUBLIC/';
}

/** `bytes === 0` is the bundled fallback's placeholder; "0.0MB" reads as an error. */
export function modelSize(model: ShowcaseModel): string {
  return model.bytes > 0 ? `${(model.bytes / 1048576).toFixed(1)}MB` : '';
}

/** One line for the <select>, which can hold text and nothing else. */
export function modelOption(model: ShowcaseModel): string {
  return [model.name, modelSize(model), modelSource(model)].filter(Boolean).join(' · ');
}
