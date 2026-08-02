'use client';

// The rAF loop writes these nodes directly 60×/s, so the whole ref bag travels
// as one prop. The compiler's ref rule cannot see that and flags every hand-off.
/* eslint-disable react-hooks/refs */

import { AnchorMarkers } from './anchor-markers';
import { HudMeter } from './hud-meter';
import { HudRail } from './hud-rail';
import { HudReticle } from './hud-reticle';
import type { ShowcaseDomRefs } from '../utils/apply-frame-to-dom';
import type { AnchorMarker, HudLabels, ShowcaseSection } from '../types';

export interface ShowcaseHudProps {
  labels: HudLabels;
  title: string;
  sections: readonly ShowcaseSection[];
  markers: readonly AnchorMarker[];
  refs: ShowcaseDomRefs;
  onJump: (progress: number) => void;
}

const CORNER = 'absolute size-[clamp(22px,4vw,46px)] border-showcase-line';

/** All non-copy chrome. Decorative throughout, so the whole layer is inert to pointers. */
export function ShowcaseHud({ labels, title, sections, markers, refs, onJump }: ShowcaseHudProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-6 font-display">
      <div className={`${CORNER} left-(--showcase-pad) top-(--showcase-pad) border-l border-t`} />
      <div className={`${CORNER} right-(--showcase-pad) top-(--showcase-pad) border-r border-t`} />
      <div className={`${CORNER} bottom-(--showcase-pad) left-(--showcase-pad) border-b border-l`} />
      <div className={`${CORNER} bottom-(--showcase-pad) right-(--showcase-pad) border-b border-r`} />

      <div className="absolute inset-x-(--showcase-pad) top-(--showcase-pad) flex items-center justify-between gap-3 whitespace-nowrap font-mono text-[8.5px] uppercase tracking-[0.18em] text-showcase-muted md:inset-x-[calc(var(--showcase-pad)+var(--showcase-inset))] md:text-[clamp(9px,1.05vw,11px)]">
        <span className="flex items-center gap-2">
          <span className="size-1.5 animate-[showcase-blink_1.9s_infinite] rounded-full bg-showcase-primary shadow-[0_0_10px_var(--showcase-primary)] motion-reduce:animate-none" />
          {labels.systemStatus}
        </span>
        <span className="hidden h-px flex-1 bg-linear-to-r from-transparent via-showcase-line to-transparent md:block" />
        <span className="hidden md:inline">
          <b className="font-bold tracking-[0.26em] text-showcase-fg">{title}</b> / {labels.brand}
        </span>
        <span className="hidden h-px flex-1 bg-linear-to-r from-transparent via-showcase-line to-transparent md:block" />
        <span ref={refs.sectionLabel}>{labels.sectionPrefix} 01/01</span>
      </div>

      <span
        ref={refs.targetLabel}
        className="absolute left-1/2 top-[calc(var(--showcase-pad)+24px)] -translate-x-1/2 font-mono text-[9.5px] tracking-[0.26em] text-showcase-primary [text-shadow:0_0_14px_var(--showcase-primary)] md:left-auto md:right-[calc(var(--showcase-pad)+var(--showcase-inset))] md:translate-x-0"
      >
        {labels.targetPrefix}
      </span>

      <HudRail sections={sections} nodeRefs={refs.railNodes} onJump={onJump} />
      <HudMeter caption={labels.meterCaption} fillRef={refs.meterFill} valueRef={refs.meterValue} />
      <HudReticle reticleRef={refs.reticle} />
      <AnchorMarkers markers={markers} markerRefs={refs.markers} />

      <div
        ref={refs.scrollHint}
        className="absolute bottom-[calc(var(--showcase-pad)+22px)] left-1/2 -translate-x-1/2 text-center font-mono text-[10px] tracking-[0.34em] text-showcase-muted md:bottom-[calc(var(--showcase-pad)+4px)]"
      >
        <span className="relative mx-auto mb-2 hidden h-[30px] w-[19px] rounded-[11px] border border-showcase-line md:block">
          <span className="absolute left-1/2 top-1.5 -ml-px h-[5px] w-0.5 animate-[showcase-wheel_1.7s_ease-in-out_infinite] rounded-sm bg-showcase-primary motion-reduce:animate-none" />
        </span>
        {labels.scrollHint}
      </div>
    </div>
  );
}
