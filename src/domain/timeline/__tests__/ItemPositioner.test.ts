import { describe, it, expect } from 'vitest';
import {
  calculateItemPosition,
  calculateItemResize,
  findParentSceneForItem,
  pixelsToTime,
  timeToPixels,
  snapToGrid,
  type PositionConstraints
} from '../ItemPositioner';
import { Result } from '../Result';
import { InvalidTimeRangeError } from '../errors';
import type { TimelineLayer, TimelineScene } from '../../../../types/scenePackage';

describe('ItemPositioner', () => {
  describe('calculateItemPosition', () => {
    it('should calculate new position without clamping', () => {
      const constraints: PositionConstraints = {
        minTime: 0,
        maxTime: 10000
      };

      const result = calculateItemPosition(1000, 500, 2000, constraints);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value.startTime).toBe(1500);
        expect(result.value.wasClamped).toBe(false);
        expect(result.value.unclampedTime).toBe(1500);
      }
    });

    it('should clamp to minimum time', () => {
      const constraints: PositionConstraints = {
        minTime: 0,
        maxTime: 10000
      };

      const result = calculateItemPosition(500, -1000, 2000, constraints);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value.startTime).toBe(0);
        expect(result.value.wasClamped).toBe(true);
        expect(result.value.unclampedTime).toBe(-500);
      }
    });

    it('should clamp to maximum time considering item duration', () => {
      const constraints: PositionConstraints = {
        minTime: 0,
        maxTime: 10000
      };

      const result = calculateItemPosition(8000, 3000, 2000, constraints);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        // maxTime - itemDuration = 10000 - 2000 = 8000
        expect(result.value.startTime).toBe(8000);
        expect(result.value.wasClamped).toBe(true);
      }
    });

    it('should clamp to parent scene bounds', () => {
      const parentScene: TimelineScene = {
        id: 'scene-1',
        type: 'scene',
        name: 'Test Scene',
        startTime: 0,
        duration: 5000,
        layers: []
      };

      const constraints: PositionConstraints = {
        minTime: 0,
        maxTime: 10000,
        parentScene
      };

      const result = calculateItemPosition(2000, 2000, 1000, constraints);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        // sceneEnd - itemDuration = 5000 - 1000 = 4000
        expect(result.value.startTime).toBe(4000);
        expect(result.value.wasClamped).toBe(true);
      }
    });

    it('should return error for negative duration', () => {
      const constraints: PositionConstraints = {
        minTime: 0,
        maxTime: 10000
      };

      const result = calculateItemPosition(1000, 0, -500, constraints);

      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.error).toBeInstanceOf(InvalidTimeRangeError);
      }
    });

    it('should allow negative times when allowNegative is true', () => {
      const constraints: PositionConstraints = {
        minTime: 0,
        maxTime: 10000,
        allowNegative: true
      };

      const result = calculateItemPosition(100, -500, 1000, constraints);

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value.startTime).toBe(-400);
        expect(result.value.wasClamped).toBe(false);
      }
    });
  });

  describe('calculateItemResize', () => {
    const constraints: PositionConstraints = {
      minTime: 0,
      maxTime: 10000
    };

    it('should resize from left handle', () => {
      const result = calculateItemResize(
        'left',
        1000,
        2000,
        500, // deltaPixels
        10, // pixelsPerMs (500px = 50ms)
        constraints
      );

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value.startTime).toBe(1050); // 1000 + 50
        expect(result.value.duration).toBe(1950); // 2000 - 50
        expect(result.value.wasClamped).toBe(false);
      }
    });

    it('should resize from right handle', () => {
      const result = calculateItemResize(
        'right',
        1000,
        2000,
        500,
        10,
        constraints
      );

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value.startTime).toBe(1000);
        expect(result.value.duration).toBe(2050); // 2000 + 50
        expect(result.value.wasClamped).toBe(false);
      }
    });

    it('should enforce minimum duration on left resize', () => {
      const result = calculateItemResize(
        'left',
        1000,
        200, // small duration
        -1500, // large negative delta (shrink)
        10,
        constraints
      );

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value.duration).toBeGreaterThanOrEqual(100); // MIN_DURATION
        expect(result.value.wasClamped).toBe(true);
      }
    });

    it('should enforce minimum duration on right resize', () => {
      const result = calculateItemResize(
        'right',
        1000,
        200,
        -1500, // shrink
        10,
        constraints
      );

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value.duration).toBeGreaterThanOrEqual(100);
        expect(result.value.wasClamped).toBe(true);
      }
    });

    it('should clamp right resize to parent scene bounds', () => {
      const parentScene: TimelineScene = {
        id: 'scene-1',
        type: 'scene',
        name: 'Test Scene',
        startTime: 0,
        duration: 5000,
        layers: []
      };

      const constraintsWithScene: PositionConstraints = {
        ...constraints,
        parentScene
      };

      const result = calculateItemResize(
        'right',
        2000,
        1000,
        5000, // try to extend beyond scene
        10,
        constraintsWithScene
      );

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        // maxDuration = sceneEnd - startTime = 5000 - 2000 = 3000
        expect(result.value.duration).toBe(3000);
        expect(result.value.wasClamped).toBe(true);
      }
    });
  });

  describe('findParentSceneForItem', () => {
    it('should find parent scene for item in scene layer', () => {
      const layers: TimelineLayer[] = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          items: [
            {
              id: 'scene-1',
              type: 'scene',
              name: 'Scene 1',
              startTime: 0,
              duration: 10000,
              layers: [
                {
                  id: 'scene-layer-1',
                  name: 'Scene Layer 1',
                  items: [
                    {
                      id: 'item-1',
                      type: 'image',
                      name: 'Image 1',
                      startTime: 1000,
                      duration: 2000,
                      asset: 'test'
                    }
                  ]
                }
              ]
            } as TimelineScene
          ]
        }
      ];

      const parentScene = findParentSceneForItem(layers, 'item-1');

      expect(parentScene).not.toBeNull();
      expect(parentScene?.id).toBe('scene-1');
    });

    it('should return null for item not in any scene', () => {
      const layers: TimelineLayer[] = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          items: [
            {
              id: 'item-1',
              type: 'image',
              name: 'Image 1',
              startTime: 1000,
              duration: 2000,
              asset: 'test'
            }
          ]
        }
      ];

      const parentScene = findParentSceneForItem(layers, 'item-1');

      expect(parentScene).toBeNull();
    });

    it('should handle nested scenes', () => {
      const layers: TimelineLayer[] = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          items: [
            {
              id: 'scene-1',
              type: 'scene',
              name: 'Scene 1',
              startTime: 0,
              duration: 10000,
              layers: [
                {
                  id: 'scene-layer-1',
                  name: 'Scene Layer 1',
                  items: [
                    {
                      id: 'scene-2',
                      type: 'scene',
                      name: 'Scene 2',
                      startTime: 0,
                      duration: 5000,
                      layers: [
                        {
                          id: 'scene-layer-2',
                          name: 'Scene Layer 2',
                          items: [
                            {
                              id: 'item-1',
                              type: 'image',
                              name: 'Image 1',
                              startTime: 1000,
                              duration: 2000,
                              asset: 'test'
                            }
                          ]
                        }
                      ]
                    } as TimelineScene
                  ]
                }
              ]
            } as TimelineScene
          ]
        }
      ];

      const parentScene = findParentSceneForItem(layers, 'item-1');

      expect(parentScene).not.toBeNull();
      expect(parentScene?.id).toBe('scene-2'); // Direct parent
    });
  });

  describe('pixelsToTime', () => {
    it('should convert pixels to time correctly', () => {
      expect(pixelsToTime(100, 0.1)).toBe(1000); // 100px at 0.1px/ms = 1000ms
      expect(pixelsToTime(50, 1)).toBe(50);
      expect(pixelsToTime(200, 0.5)).toBe(400);
    });
  });

  describe('timeToPixels', () => {
    it('should convert time to pixels correctly', () => {
      expect(timeToPixels(1000, 0.1)).toBe(100);
      expect(timeToPixels(50, 1)).toBe(50);
      expect(timeToPixels(400, 0.5)).toBe(200);
    });
  });

  describe('snapToGrid', () => {
    it('should snap time to grid', () => {
      expect(snapToGrid(1234, 100)).toBe(1200);
      expect(snapToGrid(1267, 100)).toBe(1300);
      expect(snapToGrid(50, 25)).toBe(50);
      expect(snapToGrid(62, 25)).toBe(50);
      expect(snapToGrid(63, 25)).toBe(75);
    });
  });
});
