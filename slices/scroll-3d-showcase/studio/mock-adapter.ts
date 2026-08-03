import type { ShowcasePreset, ShowcaseStudioAdapter } from './types';

/**
 * In-memory adapter so the studio is demoable with backend "none". Saves land
 * in a Map that dies with the tab — the COPY TS button is the real export path.
 */
export function createMockStudioAdapter(modelCount = 1): ShowcaseStudioAdapter {
  const saved = new Map<string, ShowcasePreset>();
  return {
    async syncModels() {
      return { added: 0, total: modelCount };
    },
    async savePreset(modelId, preset) {
      saved.set(modelId, preset);
    },
    // Enough of a read for the library's JSON column to open on backend "none".
    // Null is the honest answer for a model nobody has saved this session.
    async loadPreset(modelId) {
      return saved.get(modelId) ?? null;
    },
  };
}
