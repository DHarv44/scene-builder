import { easing, lerp, type EasingType } from './easing';

export interface CameraKeyframe {
  time: number;         // Timestamp in ms
  x: number;           // Pan X offset
  y: number;           // Pan Y offset
  zoom: number;        // Zoom level (1.0 = normal, 2.0 = 2x zoom)
  easing?: EasingType; // Easing function for transition TO this keyframe
}

export interface CameraConfig {
  keyframes: CameraKeyframe[];
  enableMouseParallax: boolean;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Camera controller for cinematic pan/zoom animations
 * Uses keyframe interpolation with easing
 * Copied from Low Sun game
 */
export class CameraController {
  private config: CameraConfig;
  private currentState: CameraState;

  constructor(config: CameraConfig) {
    this.config = config;

    // Initialize with first keyframe or defaults
    const firstKeyframe = config.keyframes[0];
    this.currentState = {
      x: firstKeyframe?.x ?? 0,
      y: firstKeyframe?.y ?? 0,
      zoom: firstKeyframe?.zoom ?? 1.0,
    };
  }

  /**
   * Update camera state based on current time
   * @param time Current time in milliseconds
   * @returns Current camera state
   */
  update(time: number): CameraState {
    const keyframes = this.config.keyframes;

    if (keyframes.length === 0) {
      return this.currentState;
    }

    // Find the two keyframes we're between
    let startKeyframe: CameraKeyframe | null = null;
    let endKeyframe: CameraKeyframe | null = null;

    for (let i = 0; i < keyframes.length; i++) {
      if (time >= keyframes[i].time) {
        startKeyframe = keyframes[i];
        endKeyframe = keyframes[i + 1] ?? null;
      } else {
        break;
      }
    }

    // Before first keyframe
    if (!startKeyframe) {
      const first = keyframes[0];
      this.currentState = { x: first.x, y: first.y, zoom: first.zoom };
      return this.currentState;
    }

    // After last keyframe
    if (!endKeyframe) {
      this.currentState = {
        x: startKeyframe.x,
        y: startKeyframe.y,
        zoom: startKeyframe.zoom,
      };
      return this.currentState;
    }

    // Interpolate between keyframes
    const duration = endKeyframe.time - startKeyframe.time;
    const elapsed = time - startKeyframe.time;
    const progress = Math.min(elapsed / duration, 1);

    // Apply easing function
    const easingFunc = endKeyframe.easing ? easing[endKeyframe.easing] : easing.linear;
    const easedProgress = easingFunc(progress);

    // Interpolate values
    this.currentState = {
      x: lerp(startKeyframe.x, endKeyframe.x, easedProgress),
      y: lerp(startKeyframe.y, endKeyframe.y, easedProgress),
      zoom: lerp(startKeyframe.zoom, endKeyframe.zoom, easedProgress),
    };

    return this.currentState;
  }

  /**
   * Get current camera state without updating
   */
  getState(): CameraState {
    return this.currentState;
  }

  /**
   * Check if mouse parallax is enabled
   */
  isMouseParallaxEnabled(): boolean {
    return this.config.enableMouseParallax;
  }

  /**
   * Apply camera transform to canvas context
   */
  applyTransform(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // Translate to center, apply zoom, translate back, then apply pan
    ctx.translate(centerX, centerY);
    ctx.scale(this.currentState.zoom, this.currentState.zoom);
    ctx.translate(-centerX + this.currentState.x, -centerY + this.currentState.y);
  }
}
