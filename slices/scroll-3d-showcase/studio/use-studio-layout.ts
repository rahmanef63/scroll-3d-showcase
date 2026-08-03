'use client';

import { useCallback, useState } from 'react';
import { useMediaQuery } from '../hooks/use-media-flags';
import type { AspectId } from './presets';

export type StudioTab = 'shot' | 'copy' | 'markers' | 'scene';

export interface StudioLayout {
  /** true below 1024px. SSR snapshot is false — desktop-first, like use-media-flags. */
  mobile: boolean;
  tab: StudioTab;
  /** Mobile only. Desktop ignores it; the panel always shows `tab`. */
  sheetOpen: boolean;
  /** Desktop only. Panel shrinks to a 32px stub. */
  panelCollapsed: boolean;
  /**
   * Chrome hidden and the scene full-bleed — exactly what a visitor gets. The
   * inverse is not "editing enabled" but "framed": in edit mode the scene is a
   * box inside the chrome rather than underneath it.
   */
  preview: boolean;
  /** Output shape the framed viewport is letterboxed to. Ignored in preview. */
  aspect: AspectId;
  /** The models + preset-JSON dialog. Mounted only while true, so it reads nothing when shut. */
  library: boolean;
  /** Desktop: switch tab. Mobile: open that section, or close it if it is already the open one. */
  selectTab: (tab: StudioTab) => void;
  closeSheet: () => void;
  togglePanel: () => void;
  togglePreview: () => void;
  toggleLibrary: () => void;
  closeLibrary: () => void;
  setAspect: (aspect: AspectId) => void;
}

/**
 * The chrome breakpoint, deliberately not `useMediaFlags().compact`: that query
 * is 900px + coarse pointer and describes where the scene reflows, not where a
 * 300px panel stops fitting beside the model.
 */
const MOBILE_QUERY = '(max-width: 1023px)';

/** Pure chrome state — no draft, no engine, so nothing here re-renders the scene. */
export function useStudioLayout(): StudioLayout {
  const mobile = useMediaQuery(MOBILE_QUERY);
  const [tab, setTab] = useState<StudioTab>('shot');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [preview, setPreview] = useState(false);
  const [library, setLibrary] = useState(false);
  // 16:9 rather than `fit`: the default should be a real output shape, or the
  // editor quietly goes back to previewing the editor window.
  const [aspect, setAspect] = useState<AspectId>('16:9');

  const selectTab = useCallback(
    (next: StudioTab) => {
      // Dock semantics: tapping the section that is already open closes it, so
      // the canvas is one tap away wherever you are.
      setSheetOpen((open) => !(open && next === tab));
      setTab(next);
    },
    [tab],
  );

  return {
    mobile,
    tab,
    sheetOpen,
    panelCollapsed,
    preview,
    aspect,
    library,
    selectTab,
    closeSheet: useCallback(() => setSheetOpen(false), []),
    togglePanel: useCallback(() => setPanelCollapsed((value) => !value), []),
    togglePreview: useCallback(() => setPreview((value) => !value), []),
    toggleLibrary: useCallback(() => setLibrary((value) => !value), []),
    closeLibrary: useCallback(() => setLibrary(false), []),
    setAspect,
  };
}
