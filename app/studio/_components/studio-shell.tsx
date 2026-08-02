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
}: StudioShellProps) {
  const router = useRouter();

  return (
    <ShowcaseStudio
      models={models}
      modelId={modelId}
      preset={preset}
      liveModelId={liveModelId}
      blockIds={BLOCK_IDS}
      contentPresets={CONTENT_PRESETS}
      adapter={adapter}
      onSelectModel={(id) => router.push(`/studio?model=${encodeURIComponent(id)}`)}
    />
  );
}
