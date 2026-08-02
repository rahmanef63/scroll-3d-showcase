import type { RefObject } from 'react';
import { clamp, fadeWindow } from '../lib/math';
import type { FrameState, HudLabels, ShowcaseSection } from '../types';

/**
 * Elements the render loop writes to directly. Everything here changes 60 times
 * a second, which is exactly the work React should not be doing.
 */
export interface ShowcaseDomRefs {
  meterFill: RefObject<HTMLDivElement | null>;
  meterValue: RefObject<HTMLElement | null>;
  sectionLabel: RefObject<HTMLElement | null>;
  targetLabel: RefObject<HTMLElement | null>;
  reticle: RefObject<HTMLDivElement | null>;
  scrollHint: RefObject<HTMLDivElement | null>;
  markers: RefObject<(HTMLElement | null)[]>;
  panels: RefObject<(HTMLElement | null)[]>;
  railNodes: RefObject<(HTMLElement | null)[]>;
}

const ACTIVE_NODE_CLASS = 'is-active';
const HOT_MARKER_CLASS = 'is-hot';

/** Pushes one frame of engine output into the DOM. Called from the RAF callback. */
export function applyFrameToDom(
  refs: ShowcaseDomRefs,
  state: FrameState,
  sections: readonly ShowcaseSection[],
  labels: HudLabels,
): void {
  const percent = Math.round(state.progress * 100);

  if (refs.meterFill.current) refs.meterFill.current.style.height = `${percent}%`;
  if (refs.meterValue.current) {
    refs.meterValue.current.textContent = String(percent).padStart(3, '0');
  }

  const section = sections[state.activeSection];
  if (refs.sectionLabel.current && section) {
    refs.sectionLabel.current.textContent =
      `${labels.sectionPrefix} ${section.id}/${String(sections.length).padStart(2, '0')}`;
  }
  if (refs.targetLabel.current) {
    refs.targetLabel.current.textContent = `${labels.targetPrefix} // ${state.label}`;
  }

  refs.railNodes.current?.forEach((node, index) => {
    node?.classList.toggle(ACTIVE_NODE_CLASS, index === state.activeSection);
  });

  const reticle = refs.reticle.current;
  if (reticle) {
    reticle.style.transform =
      `translate3d(${state.reticle.x}px, ${state.reticle.y}px, 0) translate(-50%, -50%) scale(${state.reticle.scale.toFixed(3)})`;
    reticle.style.opacity = state.reticle.opacity.toFixed(3);
  }

  if (refs.scrollHint.current) {
    refs.scrollHint.current.style.opacity = clamp(1 - state.progress * 14, 0, 1).toFixed(3);
  }

  state.markers.forEach((marker, index) => {
    const element = refs.markers.current?.[index];
    if (!element) return;
    element.style.opacity = marker.opacity.toFixed(2);
    element.style.visibility = marker.opacity > 0.01 ? 'visible' : 'hidden';
    if (marker.opacity > 0.01) {
      element.style.transform =
        `translate3d(${marker.x}px, ${marker.y}px, 0) translate(-50%, -50%)`;
      element.classList.toggle(HOT_MARKER_CLASS, marker.hot);
    }
  });

  sections.forEach((sectionDef, index) => {
    const panel = refs.panels.current?.[index];
    if (!panel) return;
    const opacity = fadeWindow(state.progress, sectionDef.fade);
    panel.style.opacity = opacity.toFixed(3);
    panel.style.visibility = opacity > 0.01 ? 'visible' : 'hidden';
    panel.style.transform = `translateY(${((1 - opacity) * 20).toFixed(1)}px)`;
  });
}
