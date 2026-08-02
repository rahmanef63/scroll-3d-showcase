'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FOCUS, LABEL, SURFACE, TAP } from './studio-ui';
import type { StudioLayout, StudioTab } from './use-studio-layout';

export interface StudioPanelProps {
  layout: StudioLayout;
  /** Slots, keyed by tab. SHELL never imports the field files; HOST wires the bodies in. */
  bodies: Record<StudioTab, ReactNode>;
  /** Mobile only: rendered as the first row of the bottom stack. Ignored on desktop. */
  transport: ReactNode;
}

// Four tabs is the ceiling at 256px — MARKERS is already the longest label that
// fits. A fifth would need either abbreviations or a second row.
const TABS: readonly { id: StudioTab; label: string }[] = [
  { id: 'shot', label: 'SHOT' },
  { id: 'copy', label: 'COPY' },
  { id: 'markers', label: 'MARKS' },
  { id: 'scene', label: 'SCENE' },
];

const tabId = (tab: StudioTab) => `studio-tab-${tab}`;
const panelId = (tab: StudioTab) => `studio-panel-${tab}`;

function TabButton({
  tab,
  label,
  layout,
  className,
}: {
  tab: StudioTab;
  label: string;
  layout: StudioLayout;
  className?: string;
}) {
  const active = layout.tab === tab;
  return (
    <button
      type="button"
      role="tab"
      id={tabId(tab)}
      aria-controls={panelId(tab)}
      aria-selected={active}
      // Roving tabindex: the tablist is one stop, arrows move inside it.
      tabIndex={active ? 0 : -1}
      onClick={() => layout.selectTab(tab)}
      className={cn(
        'flex-1',
        LABEL,
        FOCUS,
        active ? 'bg-showcase-line/30 text-showcase-primary' : 'hover:text-showcase-fg',
        className,
      )}
    >
      {label}
    </button>
  );
}

/**
 * The inspector: one tab visible at a time on both breakpoints. Bodies switch by
 * ternary rather than display:none — the WebGL canvas is a separate fixed layer,
 * so nothing expensive unmounts with them.
 */
export function StudioPanel({ layout, bodies, transport }: StudioPanelProps) {
  const body = bodies[layout.tab];

  const onArrows = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const at = TABS.findIndex((tab) => tab.id === layout.tab);
    const next = TABS[(at + step + TABS.length) % TABS.length].id;
    layout.selectTab(next);
    document.getElementById(tabId(next))?.focus();
  };

  if (layout.mobile) {
    return (
      <div className={cn('fixed inset-x-0 bottom-0 z-30 flex flex-col border-t', SURFACE)}>
        {transport}
        {/* Closed → renders nothing, so the stack collapses to transport + dock
            and the canvas gets the rest. No animation, no height math. */}
        {layout.sheetOpen ? (
          <div
            role="tabpanel"
            id={panelId(layout.tab)}
            aria-labelledby={tabId(layout.tab)}
            className="max-h-[42vh] touch-pan-y space-y-2 overflow-y-auto border-t border-showcase-line/60 p-2"
          >
            {body}
          </div>
        ) : null}
        <div
          role="tablist"
          aria-label="Inspector"
          onKeyDown={onArrows}
          className="flex h-14 shrink-0 border-t border-showcase-line/60"
        >
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab.id}
              label={tab.label}
              layout={layout}
              className={cn(TAP, layout.sheetOpen ? '' : 'bg-transparent')}
            />
          ))}
        </div>
      </div>
    );
  }

  if (layout.panelCollapsed) {
    return (
      <aside className={cn('fixed bottom-14 right-0 top-9 z-20 w-8 border-l', SURFACE)}>
        <button
          type="button"
          onClick={layout.togglePanel}
          title="Show the panel"
          className={cn('flex h-full w-full items-start justify-center pt-3', LABEL, FOCUS)}
        >
          <span className="[writing-mode:vertical-rl]">
            {TABS.find((tab) => tab.id === layout.tab)?.label} ▸
          </span>
        </button>
      </aside>
    );
  }

  // w-64, not w-75: the preset framing puts the subject at ~0.71 of the width,
  // so every 4px of panel eats into it. This is the widest that clears the model
  // at 1280; below that, collapse the panel (or solo) to see the whole frame.
  return (
    <aside className={cn('fixed bottom-14 right-0 top-9 z-20 flex w-64 flex-col border-l', SURFACE)}>
      <div
        role="tablist"
        aria-label="Inspector"
        onKeyDown={onArrows}
        className="flex h-8 shrink-0 border-b border-showcase-line/60"
      >
        {TABS.map((tab) => (
          <TabButton key={tab.id} tab={tab.id} label={tab.label} layout={layout} />
        ))}
      </div>
      <div
        role="tabpanel"
        id={panelId(layout.tab)}
        aria-labelledby={tabId(layout.tab)}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2"
      >
        {body}
      </div>
    </aside>
  );
}
