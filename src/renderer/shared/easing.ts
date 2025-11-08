// Easing functions for animations
// t = progress (0 to 1)
// Copied from Low Sun game

export type EasingFunction = (t: number) => number;

export const easing = {
  linear: (t: number): number => t,

  easeInQuad: (t: number): number => t * t,

  easeOutQuad: (t: number): number => t * (2 - t),

  easeInOutQuad: (t: number): number =>
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  easeInCubic: (t: number): number => t * t * t,

  easeOutCubic: (t: number): number => (--t) * t * t + 1,

  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  easeInOutSine: (t: number): number =>
    -(Math.cos(Math.PI * t) - 1) / 2,
};

export type EasingType = keyof typeof easing;

// Linear interpolation
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
