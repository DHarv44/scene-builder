/**
 * Domain service for calculating valid item positions
 * Pure function - no side effects, no React, no DOM
 */

import type { TimelineLayer, TimelineScene } from '../../../types/scenePackage.ts';
import { Result } from './Result';
import { ValidationError, InvalidTimeRangeError } from './errors';

export interface PositionConstraints {
  /** Minimum allowed start time */
  minTime: number;
  /** Maximum allowed start time (considering item duration) */
  maxTime: number;
  /** Parent scene if item is within a scene */
  parentScene?: TimelineScene;
  /** Whether to allow negative times (default: false) */
  allowNegative?: boolean;
}

export interface PositionCalculation {
  /** Calculated start time */
  startTime: number;
  /** Whether position was clamped */
  wasClamped: boolean;
  /** Original unclamped value */
  unclampedTime: number;
}

export interface ResizeCalculation {
  /** New start time (for left handle resize) */
  startTime: number;
  /** New duration */
  duration: number;
  /** Whether resize was clamped */
  wasClamped: boolean;
}

/**
 * Calculate valid item position after drag
 */
export function calculateItemPosition(
  currentStartTime: number,
  deltaTime: number,
  itemDuration: number,
  constraints: PositionConstraints
): Result<ValidationError, PositionCalculation> {
  // Validate inputs
  if (itemDuration < 0) {
    return Result.err(new InvalidTimeRangeError(currentStartTime, itemDuration));
  }

  const unclampedTime = currentStartTime + deltaTime;
  const minTime = constraints.allowNegative ? Number.NEGATIVE_INFINITY : constraints.minTime;

  // Clamp to constraints
  let newStartTime = Math.max(minTime, unclampedTime);

  // If within a parent scene, ensure item doesn't exceed scene bounds
  if (constraints.parentScene) {
    const sceneEnd = constraints.parentScene.duration;
    const maxAllowedStart = sceneEnd - itemDuration;
    newStartTime = Math.min(newStartTime, Math.max(0, maxAllowedStart));
  } else if (constraints.maxTime !== undefined) {
    const maxAllowedStart = constraints.maxTime - itemDuration;
    newStartTime = Math.min(newStartTime, maxAllowedStart);
  }

  const wasClamped = newStartTime !== unclampedTime;

  return Result.ok({
    startTime: newStartTime,
    wasClamped,
    unclampedTime
  });
}

/**
 * Calculate valid resize dimensions
 */
export function calculateItemResize(
  handle: 'left' | 'right',
  currentStartTime: number,
  currentDuration: number,
  deltaPixels: number,
  pixelsPerMs: number,
  constraints: PositionConstraints
): Result<ValidationError, ResizeCalculation> {
  const MIN_DURATION = 100; // ms
  const deltaTime = deltaPixels / pixelsPerMs;

  if (handle === 'left') {
    // Resize from left: change startTime and duration
    const newStartTime = Math.max(constraints.minTime, currentStartTime + deltaTime);
    const deltaActual = newStartTime - currentStartTime;
    let newDuration = currentDuration - deltaActual;

    // Enforce minimum duration
    if (newDuration < MIN_DURATION) {
      newDuration = MIN_DURATION;
    }

    const wasClamped = newStartTime !== (currentStartTime + deltaTime) || newDuration !== (currentDuration - deltaActual);

    return Result.ok({
      startTime: newStartTime,
      duration: newDuration,
      wasClamped
    });
  } else {
    // Resize from right: change duration only
    let newDuration = Math.max(MIN_DURATION, currentDuration + deltaTime);

    // If within parent scene, clamp to scene end
    if (constraints.parentScene) {
      const maxDuration = constraints.parentScene.duration - currentStartTime;
      newDuration = Math.min(newDuration, maxDuration);
    }

    const wasClamped = newDuration !== (currentDuration + deltaTime);

    return Result.ok({
      startTime: currentStartTime,
      duration: newDuration,
      wasClamped
    });
  }
}

/**
 * Find parent scene for an item
 */
export function findParentSceneForItem(
  layers: TimelineLayer[],
  itemId: string
): TimelineScene | null {
  for (const layer of layers) {
    for (const item of layer.items) {
      if (item.type === 'scene') {
        const scene = item as TimelineScene;
        // Check if item is in one of this scene's layers
        for (const sceneLayer of scene.layers || []) {
          if (sceneLayer.items.some((i: any) => i.id === itemId)) {
            return scene;
          }
        }
        // Recursively check nested scenes
        const nestedParent = findParentSceneForItem(scene.layers || [], itemId);
        if (nestedParent) return nestedParent;
      }
    }
  }
  return null;
}

/**
 * Convert pixel delta to time delta
 */
export function pixelsToTime(pixels: number, pixelsPerMs: number): number {
  return pixels / pixelsPerMs;
}

/**
 * Convert time delta to pixel delta
 */
export function timeToPixels(time: number, pixelsPerMs: number): number {
  return time * pixelsPerMs;
}

/**
 * Snap time to grid (optional - for future use)
 */
export function snapToGrid(time: number, gridSize: number): number {
  return Math.round(time / gridSize) * gridSize;
}
