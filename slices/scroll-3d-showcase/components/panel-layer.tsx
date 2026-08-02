'use client';

import type { RefObject } from 'react';
import { SectionPanel } from './section-panel';
import type { ShowcaseSection } from '../types';

export interface PanelLayerProps {
  sections: readonly ShowcaseSection[];
  panelRefs: RefObject<(HTMLElement | null)[]>;
}

/**
 * Fixed layer holding every copy panel. Sits below the HUD in the stack so the
 * panel scrims never dim the HUD chrome.
 */
export function PanelLayer({ sections, panelRefs }: PanelLayerProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-5">
      {sections.map((section, index) => (
        <SectionPanel
          key={section.id}
          section={section}
          index={index}
          panelRefs={panelRefs}
        />
      ))}
    </div>
  );
}
