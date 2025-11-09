import * as React from 'react';
import type {
  TimelineLayer,
  TimelineScene
} from '../../../types/scenePackage';

export const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const remainingMs = Math.floor((ms % 1000) / 100);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
    .toString()
    .padStart(2, '0')}.${remainingMs}`;
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
