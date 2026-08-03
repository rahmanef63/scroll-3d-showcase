'use client';

import { useRouter } from 'next/navigation';
import {
  ShowcaseStudio,
  type ShowcaseModel,
  type ShowcasePreset,
  type ShowcaseStudioAdapter,
} from '@/slices/scroll-3d-showcase/studio';
import { CONTENT_PRESETS } from '../../(public)/_content/copy';
import { BLOCK_IDS } from '../../(public)/_content/sections';

interface StudioShellProps {
  models: ShowcaseModel[];
  modelId: string;
  preset: ShowcasePreset;
  liveModelId: string;
  adapter: ShowcaseStudioAdapter;
  /** Server actions for the two halves of an upload. Absent with no backend. */
  upload?: {
    createUrl: () => Promise<string>;
    register: (storageId: string, name: string) => Promise<string>;
  };
}

/**
 * A server component cannot hand a client callback to the slice, so this thin
 * wrapper owns the one interactive bit: selecting a model pushes `?model=`, and
 * the server re-loads that model's preset. Keeps /studio?model=x shareable.
 *
 * Rendered bare on purpose: the studio is chrome, rail, panel and transport as
 * `fixed` bars over a full-bleed canvas, so any wrapper carrying `transform`,
 * `filter` or `contain` would become their containing block and collapse the
 * whole layout into it.
 */
export function StudioShell({
  models,
  modelId,
  preset,
  liveModelId,
  adapter,
  upload,
}: StudioShellProps) {
  const router = useRouter();

  /**
   * The file goes from this browser straight to the backend's storage: the
   * server action only mints the URL and, afterwards, vouches for what landed.
   * Routing megabytes through a server action would hit its body limit and
   * spend the transfer twice.
   */
  const uploadModel = upload
    ? async (file: File) => {
        const url = await upload.createUrl();
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': file.type || 'model/gltf-binary' },
          body: file,
        });
        if (!response.ok) throw new Error(`Storage refused the upload (${response.status})`);
        const { storageId } = (await response.json()) as { storageId: string };
        return upload.register(storageId, file.name);
      }
    : undefined;

  return (
    <ShowcaseStudio
      models={models}
      modelId={modelId}
      preset={preset}
      liveModelId={liveModelId}
      blockIds={BLOCK_IDS}
      contentPresets={CONTENT_PRESETS}
      adapter={{ ...adapter, uploadModel }}
      onSelectModel={(id) => router.push(`/studio?model=${encodeURIComponent(id)}`)}
    />
  );
}
