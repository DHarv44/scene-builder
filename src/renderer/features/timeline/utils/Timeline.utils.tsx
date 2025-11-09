import * as React from 'react';
import type {
  TimelineLayer,
  TimelineScene
} from '../../../types/scenePackage';

/**
 * Format time in professional timecode format: HH:MM:SS:FF
 * @param ms - Time in milliseconds
 * @param fps - Frames per second (default: 30)
 * @returns Formatted timecode string
 */
export const formatTime = (ms: number, fps: number = 30): string => {
  const totalSeconds = ms / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = Math.floor((ms % 1000) * fps / 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}:${frames
    .toString()
    .padStart(2, '0')}`;
};

export const findParentScene = (
  layers: TimelineLayer[],
  targetLayerId: string
): TimelineScene | null => {
  for (const layer of layers) {
    for (const item of layer.items) {
      if (item.type === 'scene' && item.layers) {
        for (const internalLayer of item.layers) {
          if (internalLayer.id === targetLayerId) {
            return item;
          }
        }
      }
    }
  }
  return null;
};

export const findSceneItem = (
  layers: TimelineLayer[],
  sceneId: string
): TimelineScene | null => {
  for (const layer of layers) {
    for (const item of layer.items) {
      if (item.type === 'scene' && item.id === sceneId) {
        return item;
      }
    }
  }
  return null;
};

export const findParentSceneForItem = (
  layers: TimelineLayer[],
  itemId: string
): TimelineScene | null => {
  for (const layer of layers) {
    for (const item of layer.items) {
      if (item.type === 'scene' && item.layers) {
        // Check if itemId is in any of the scene's internal layers
        for (const internalLayer of item.layers) {
          const found = internalLayer.items.find(i => i.id === itemId);
          if (found) {
            return item;
          }
        }
        // Recursively check nested scenes
        const nestedScene = findParentSceneForItem(item.layers, itemId);
        if (nestedScene) return nestedScene;
      }
    }
  }
  return null;
};

export const generateRulerMarkers = (
  duration: number,
  pixelsPerMs: number
): JSX.Element[] => {
  const markers: JSX.Element[] = [];

  // Calculate optimal intervals based on zoom level
  // Target: major tick every 100-150px, minor ticks at 1/5 of that
  const targetMajorPixels = 120;
  const majorIntervalMs = Math.round(targetMajorPixels / pixelsPerMs / 1000) * 1000; // Round to nearest second

  // Determine major interval (snap to nice values: 1s, 5s, 10s, 30s, 1m, 5m, etc.)
  let interval: number;
  if (majorIntervalMs <= 1000) interval = 1000;
  else if (majorIntervalMs <= 5000) interval = 5000;
  else if (majorIntervalMs <= 10000) interval = 10000;
  else if (majorIntervalMs <= 30000) interval = 30000;
  else if (majorIntervalMs <= 60000) interval = 60000;
  else if (majorIntervalMs <= 300000) interval = 300000;
  else interval = 600000;

  // Minor interval is 1/5 of major interval
  const minorInterval = interval / 5;

  for (let time = 0; time <= duration; time += minorInterval) {
    const isMajor = time % interval === 0;
    markers.push(
      <div
        key={time}
        className="ruler-marker"
        style={{ left: `${time * pixelsPerMs}px` }}
      >
        <div className={`ruler-tick ${isMajor ? 'major-tick' : 'minor-tick'}`} />
        {isMajor && <div className="ruler-label">{formatTime(time)}</div>}
      </div>
    );
  }

  return markers;
};

/**
 * Finds the context menu target by walking up the DOM tree
 * Returns the first element with data-context-type attribute
 */
export const findContextMenuTarget = (
  event: React.MouseEvent
): { type: string; id: string } | null => {
  let element: HTMLElement | null = event.target as HTMLElement;

  while (element) {
    const contextType = element.getAttribute('data-context-type');
    const contextId = element.getAttribute('data-context-id');

    if (contextType && contextId) {
      return { type: contextType, id: contextId };
    }

    element = element.parentElement;
  }

  return null;
};

/**
 * Snap a time value to the nearest snap point
 * @param time - The original time in milliseconds
 * @param snapEnabled - Whether snapping is enabled
 * @param snapTargets - Array of snap target times (clip edges, playhead, markers)
 * @param snapTolerance - Tolerance in milliseconds (default: 100ms or ~3 frames at 30fps)
 * @returns Snapped time value
 */
export const snapToGrid = (
  time: number,
  snapEnabled: boolean,
  snapTargets: number[] = [],
  snapTolerance: number = 100
): number => {
  if (!snapEnabled || snapTargets.length === 0) {
    return time;
  }

  // Find the closest snap target within tolerance
  let closestTarget = time;
  let minDistance = snapTolerance;

  for (const target of snapTargets) {
    const distance = Math.abs(time - target);
    if (distance < minDistance) {
      minDistance = distance;
      closestTarget = target;
    }
  }

  return closestTarget;
};

/**
 * Collect all snap targets in the timeline
 * @param layers - Timeline layers
 * @param currentTime - Current playhead position
 * @param excludeItemId - Item ID to exclude (the item being dragged)
 * @returns Array of snap target times
 */
export const collectSnapTargets = (
  layers: TimelineLayer[],
  currentTime: number,
  excludeItemId?: string
): number[] => {
  const targets: number[] = [0, currentTime]; // Always include timeline start and playhead

  const collectFromLayers = (layerList: TimelineLayer[]) => {
    for (const layer of layerList) {
      for (const item of layer.items) {
        if (item.id === excludeItemId) continue;

        // Add item start and end times
        targets.push(item.startTime);
        targets.push(item.startTime + item.duration);

        // If it's a scene, collect from child layers
        if (item.type === 'scene' && item.layers) {
          collectFromLayers(item.layers);
        }
      }
    }
  };

  collectFromLayers(layers);

  return targets;
};
