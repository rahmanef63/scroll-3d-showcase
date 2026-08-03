'use client';

import { Chip } from './studio-ui';

export interface ChromeFilesProps {
  busy: boolean;
  onCopy: () => void;
  onExport: () => void;
  onImport: () => void;
}

/**
 * The three chips that move a preset out of the browser and back.
 *
 * Grouped because they answer one question — how does this tuning leave here —
 * and because a preset belongs to a model id: swapping the .glb strands the
 * work unless it can leave as a file and come back on the other side.
 */
export function ChromeFiles({ busy, onCopy, onExport, onImport }: ChromeFilesProps) {
  return (
    <>
      <Chip
        disabled={busy}
        onClick={onCopy}
        title="Paste over DEFAULT_KEYFRAMES in config/keyframes.ts"
      >
        <span className="lg:hidden">TS</span>
        <span className="hidden lg:inline">COPY TS</span>
      </Chip>
      <Chip disabled={busy} onClick={onExport} title="Download this preset as a JSON file">
        <span className="lg:hidden">EXP</span>
        <span className="hidden lg:inline">EXPORT</span>
      </Chip>
      <Chip
        disabled={busy}
        onClick={onImport}
        title="Load a preset JSON into this model — SAVE still has to be pressed"
      >
        <span className="lg:hidden">IMP</span>
        <span className="hidden lg:inline">IMPORT</span>
      </Chip>
    </>
  );
}
