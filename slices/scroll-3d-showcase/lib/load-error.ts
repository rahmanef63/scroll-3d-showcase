import type { ShowcaseErrorCode } from '../types';

/**
 * Its own module, free of three, so the engine hook can `instanceof` it without
 * pulling three into the page's first load. Everything else that throws it
 * already imports three anyway; this is the one import that crosses back.
 *
 * `model-loader` re-exports it, so importers that predate the split still work.
 */
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
