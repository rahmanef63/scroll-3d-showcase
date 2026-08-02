import type { Vector3 } from 'three';
import { MARKER_HOT_DISTANCE } from '../config/keyframes';
import type {
  AnchorMarker,
  CameraKeyframe,
  FrameState,
  SceneSettings,
  ShowcaseSection,
} from '../types';
import { projectToScreen } from '../utils/project-to-screen';
import { activeSectionIndex, applyCameraFrame, sampleKeyframes } from './camera-rig';
import { clamp, dampingFactor, fadeWindow } from './math';
import type { ShowcaseStage } from './scene-factory';
import type { StageDecor } from './stage-decor';

export interface FrameInput {
  scroll: number;
  pointer: { x: number; y: number };
}

export interface FrameContext {
  stage: ShowcaseStage;
  decor: StageDecor;
  target: Vector3;
  keyframes: readonly CameraKeyframe[];
  markers: readonly AnchorMarker[];
  sections: readonly ShowcaseSection[];
  settings: SceneSettings;
  /** Narrow viewport or coarse pointer: copy stacks below, model lifts and pulls back. */
  compact: boolean;
  reducedMotion: boolean;
  /** Mutable smoothing state, carried between frames. */
  smoothed: { progress: number; pointerX: number; pointerY: number };
}

const COMPACT_RADIUS_SCALE = 1.25;
const COMPACT_VERTICAL_LIFT = 0.3;

/** Advances every animated value by one frame and reports what the DOM layer should show. */
export function updateFrame(
  ctx: FrameContext,
  input: FrameInput,
  deltaSeconds: number,
  elapsedSeconds: number,
): FrameState {
  const { stage, smoothed, settings, compact, reducedMotion } = ctx;

  const damping = reducedMotion ? 1 : dampingFactor(settings.damping, deltaSeconds);
  smoothed.progress += (input.scroll - smoothed.progress) * damping;
  smoothed.pointerX += (input.pointer.x - smoothed.pointerX) * 0.06;
  smoothed.pointerY += (input.pointer.y - smoothed.pointerY) * 0.06;

  const progress = smoothed.progress;
  const frame = sampleKeyframes(ctx.keyframes, progress);

  // A slow sine keeps the shot alive when the user stops scrolling.
  const idle = reducedMotion ? 0 : Math.sin(elapsedSeconds * 0.42) * 0.012;
  applyCameraFrame(stage.camera, frame, ctx.target, {
    azimuthOffset: smoothed.pointerX * settings.parallax * 22,
    elevationOffset: -smoothed.pointerY * settings.parallax * 10 + idle * 40,
    radiusScale: compact ? COMPACT_RADIUS_SCALE : 1,
    verticalLift: compact ? COMPACT_VERTICAL_LIFT : 0,
    screenShiftScale: compact ? 0 : 1,
  });

  const radius = frame.radius * (compact ? COMPACT_RADIUS_SCALE : 1);
  ctx.decor.update(radius, elapsedSeconds, deltaSeconds);

  const viewport = { width: stage.renderer.domElement.clientWidth, height: stage.renderer.domElement.clientHeight };
  const panel = strongestPanel(ctx.sections, progress);

  return {
    progress,
    activeSection: activeSectionIndex(ctx.sections, progress),
    label: frame.label,
    reticle: reticleState([0, frame.targetY, 0], radius, ctx, viewport),
    markers: ctx.markers.map((marker) =>
      markerState(marker, radius, ctx, viewport, panel, frame.targetY),
    ),
  };
}

/** The panel currently most visible, used to keep HUD tags off the copy. */
function strongestPanel(sections: readonly ShowcaseSection[], progress: number) {
  let opacity = 0;
  let align: ShowcaseSection['align'] = 'start';
  for (const section of sections) {
    const value = fadeWindow(progress, section.fade);
    if (value > opacity) {
      opacity = value;
      align = section.align;
    }
  }
  return { opacity, align };
}

function reticleState(
  point: readonly [number, number, number],
  radius: number,
  ctx: FrameContext,
  viewport: { width: number; height: number },
): FrameState['reticle'] {
  const { x, y } = projectToScreen(point, ctx.stage.camera, viewport);
  const zoom = 1 - clamp((radius - 0.8) / 2.9, 0, 1);
  return { x, y, scale: 0.66 + (1 - zoom) * 0.55, opacity: 0.22 + zoom * 0.5 };
}

function markerState(
  marker: AnchorMarker,
  radius: number,
  ctx: FrameContext,
  viewport: { width: number; height: number },
  panel: { opacity: number; align: ShowcaseSection['align'] },
  targetY: number,
): FrameState['markers'][number] {
  const { x, y, facing, onScreen } = projectToScreen(marker.position, ctx.stage.camera, viewport);

  const clashes =
    panel.opacity > 0.2 &&
    (ctx.compact
      ? y > viewport.height * 0.5
      : panel.align === 'end'
        ? x > viewport.width * 0.56
        : x < viewport.width * 0.46);

  const visible = onScreen && facing > 0.2 && radius < 3.9 && !clashes;
  return {
    x,
    y,
    opacity: visible ? clamp(facing * 1.5, 0, 1) * 0.9 : 0,
    hot: Math.abs(targetY - marker.position[1]) < MARKER_HOT_DISTANCE,
  };
}
