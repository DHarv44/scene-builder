import type {
  ScenePackage,
  TimelineLayer,
  TimelineItem,
  TimelineImage
} from '../../../types/scenePackage';
import type { ResizeHandle } from '../types';
import { findParentScene, findParentSceneForItem } from '../utils/Timeline.utils';
import { updateItem } from '../actions/Timeline.actions';
import { sceneSaveService } from '../../../services/sceneSaveService';

export const handleTimelineClick = (
  e: React.MouseEvent<HTMLDivElement>,
  pixelsPerMs: number,
  duration: number,
  isDragging: boolean,
  isResizing: boolean,
  onTimeChange: (time: number) => void
): void => {
  if (isDragging || isResizing) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left - 150; // Account for track header width
  const time = Math.max(0, Math.min(duration, x / pixelsPerMs));
  onTimeChange(time);
};

export const handleClipMouseDown = (
  e: React.MouseEvent,
  item: TimelineItem,
  handle: ResizeHandle,
  sourceLayerId: string,
  setIsDragging: (value: boolean) => void,
  setDraggedItemId: (value: string | null) => void,
  setDragStartX: (value: number) => void,
  setDragStartTime: (value: number) => void,
  setDraggedItemSourceLayer: (value: string | null) => void,
  setDraggedItemTargetLayer: (value: string | null) => void,
  setIsResizing: (value: boolean) => void,
  setResizingItemId: (value: string | null) => void,
  setResizeHandle: (value: ResizeHandle) => void,
  setResizeStartX: (value: number) => void,
  setResizeStartTime: (value: number) => void,
  setResizeStartDuration: (value: number) => void
): void => {
  if (e.button !== 0) return; // Only left click

  if (handle) {
    // Start resizing
    e.stopPropagation();
    setIsResizing(true);
    setResizingItemId(item.id);
    setResizeHandle(handle);
    setResizeStartX(e.clientX);
    setResizeStartTime(item.startTime);
    setResizeStartDuration(item.duration);
  } else {
    // Start dragging
    e.stopPropagation();
    setIsDragging(true);
    setDraggedItemId(item.id);
    setDragStartX(e.clientX);
    setDragStartTime(item.startTime);
    setDraggedItemSourceLayer(sourceLayerId);
    setDraggedItemTargetLayer(sourceLayerId);
  }
};

export const handleMouseMove = (
  e: MouseEvent,
  isDragging: boolean,
  isResizing: boolean,
  draggedItemId: string | null,
  resizingItemId: string | null,
  resizeHandle: ResizeHandle,
  dragStartX: number,
  dragStartTime: number,
  resizeStartX: number,
  resizeStartTime: number,
  resizeStartDuration: number,
  pixelsPerMs: number,
  scenePackage: ScenePackage | null,
  onUpdate?: (scenePackage: ScenePackage) => void
): void => {
  if (!scenePackage) return;

  if (isDragging && draggedItemId) {
    const deltaX = e.clientX - dragStartX;
    const deltaTime = deltaX / pixelsPerMs;
    let newStartTime = Math.max(0, dragStartTime + deltaTime);

    // Find parent scene and clamp within its duration
    const parentScene = findParentSceneForItem(scenePackage.timeline.layers || [], draggedItemId);
    if (parentScene) {
      // Get item to find its duration
      let itemDuration = 0;
      const findItem = (layers: TimelineLayer[]): TimelineItem | null => {
        for (const layer of layers) {
          const found = layer.items.find(i => i.id === draggedItemId);
          if (found) return found;
          for (const item of layer.items) {
            if (item.type === 'scene' && item.layers) {
              const nested = findItem(item.layers);
              if (nested) return nested;
            }
          }
        }
        return null;
      };
      const item = findItem(scenePackage.timeline.layers || []);
      if (item) {
        itemDuration = item.duration;
        // Clamp so item doesn't exceed scene duration
        const maxStartTime = parentScene.duration - itemDuration;
        newStartTime = Math.min(newStartTime, maxStartTime);
      }
    }

    updateItem(scenePackage, draggedItemId, { startTime: newStartTime }, onUpdate);
  } else if (isResizing && resizingItemId && resizeHandle) {
    const deltaX = e.clientX - resizeStartX;
    const deltaTime = deltaX / pixelsPerMs;

    // Find parent scene for clamping
    const parentScene = findParentSceneForItem(scenePackage.timeline.layers || [], resizingItemId);

    if (resizeHandle === 'left') {
      // Resize from left (change startTime and duration)
      const newStartTime = Math.max(0, resizeStartTime + deltaTime);
      const timeDiff = newStartTime - resizeStartTime;
      const newDuration = Math.max(100, resizeStartDuration - timeDiff); // Min 100ms

      updateItem(scenePackage, resizingItemId, {
        startTime: newStartTime,
        duration: newDuration
      }, onUpdate);
    } else if (resizeHandle === 'right') {
      // Resize from right (change duration only)
      let newDuration = Math.max(100, resizeStartDuration + deltaTime);

      // If in a scene, clamp duration so startTime + duration doesn't exceed scene duration
      if (parentScene) {
        const maxDuration = parentScene.duration - resizeStartTime;
        newDuration = Math.min(newDuration, maxDuration);
      }

      updateItem(scenePackage, resizingItemId, { duration: newDuration }, onUpdate);
    }
  }
};

export const handleMouseUp = async (
  isDragging: boolean,
  isResizing: boolean,
  draggedItemId: string | null,
  draggedItemSourceLayer: string | null,
  draggedItemTargetLayer: string | null,
  scenePackage: ScenePackage | null,
  scenePath: string | null,
  onUpdate: ((scenePackage: ScenePackage) => void) | undefined,
  setIsDragging: (value: boolean) => void,
  setDraggedItemId: (value: string | null) => void,
  setDraggedItemSourceLayer: (value: string | null) => void,
  setDraggedItemTargetLayer: (value: string | null) => void,
  setIsResizing: (value: boolean) => void,
  setResizingItemId: (value: string | null) => void,
  setResizeHandle: (value: ResizeHandle) => void
): Promise<void> => {
  // Save changes after drag/resize completes
  if ((isDragging || isResizing) && scenePath) {
    // If dragging across layers, move the item
    if (isDragging && draggedItemId && draggedItemSourceLayer && draggedItemTargetLayer &&
        draggedItemSourceLayer !== draggedItemTargetLayer && onUpdate) {

      await sceneSaveService.save(scenePath, (pkg) => {
        const layers = pkg.timeline.layers || [];

        // Helper to find and remove item from any layer
        const findAndRemoveItem = (layers: TimelineLayer[]): TimelineItem | null => {
          for (const layer of layers) {
            const index = layer.items.findIndex((item: TimelineItem) => item.id === draggedItemId);
            if (index !== -1) {
              return layer.items.splice(index, 1)[0];
            }
            // Check scene internal layers
            for (const item of layer.items) {
              if (item.type === 'scene' && item.layers) {
                const found = findAndRemoveItem(item.layers);
                if (found) return found;
              }
            }
          }
          return null;
        };

        // Helper to add item to target layer
        const addToLayer = (layers: TimelineLayer[], targetLayerId: string, item: TimelineItem): boolean => {
          for (const layer of layers) {
            if (layer.id === targetLayerId) {
              layer.items.push(item);
              return true;
            }
            // Check scene internal layers
            for (const layerItem of layer.items) {
              if (layerItem.type === 'scene' && layerItem.layers) {
                if (addToLayer(layerItem.layers, targetLayerId, item)) return true;
              }
            }
          }
          return false;
        };

        const movedItem = findAndRemoveItem(layers);
        if (movedItem) {
          addToLayer(layers, draggedItemTargetLayer, movedItem);
        }

        return pkg;
      }, onUpdate);
    } else {
      // Just dragging within same layer or resizing - save current state from service
      await sceneSaveService.saveCurrentState(scenePath);
    }
  }

  setIsDragging(false);
  setDraggedItemId(null);
  setDraggedItemSourceLayer(null);
  setDraggedItemTargetLayer(null);
  setIsResizing(false);
  setResizingItemId(null);
  setResizeHandle(null);
};

export const handleItemDrop = async (
  e: React.DragEvent,
  scenePackage: ScenePackage,
  scenePath: string,
  pixelsPerMs: number,
  layerId: string | undefined,
  onUpdate?: (scenePackage: ScenePackage) => void
): Promise<void> => {
  e.preventDefault();
  e.stopPropagation();

  if (!onUpdate) return;

  // Calculate drop position based on mouse X coordinate
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const dropTime = Math.max(0, x / pixelsPerMs);

  // Check for staging layer from SceneLayers panel
  const stagingLayerId = e.dataTransfer.getData('stagingLayerId');
  const sourceSceneId = e.dataTransfer.getData('sceneId');

  if (stagingLayerId && sourceSceneId) {
    // Find the source scene in timeline layers
    let sourceScene: any = null;
    for (const layer of scenePackage.timeline.layers || []) {
      for (const item of layer.items) {
        if (item.type === 'scene' && item.id === sourceSceneId) {
          sourceScene = item;
          break;
        }
      }
      if (sourceScene) break;
    }
    if (!sourceScene) return;

    // Find staging layer by flattening scene's internal layers
    let stagingLayer: any = null;
    for (const layer of sourceScene.layers || []) {
      for (const item of layer.items) {
        if (item.id === stagingLayerId) {
          stagingLayer = item;
          break;
        }
      }
      if (stagingLayer) break;
    }
    if (!stagingLayer) return;

    const updated = JSON.parse(JSON.stringify(scenePackage));
    const layers = updated.timeline.layers || [];
    const parentScene = findParentScene(layers, layerId || '');

    // Default duration - images are 1 second
    let duration = 1000;

    // Create TimelineImage from staging layer
    const newItem: TimelineImage = {
      id: `${stagingLayer.asset}-${Date.now()}`,
      type: 'image',
      name: stagingLayer.asset,
      asset: stagingLayer.asset,
      startTime: parentScene ? Math.max(parentScene.startTime || 0, dropTime) : dropTime,
      duration: duration,
      position: stagingLayer.position,
      anchor: stagingLayer.anchor,
      scale: stagingLayer.scale,
      depth: stagingLayer.depth,
      cover: stagingLayer.cover,
      parallax: stagingLayer.parallax,
      opacity: stagingLayer.opacity,
      x: stagingLayer.x,
      y: stagingLayer.y,
      rotation: stagingLayer.rotation,
      scaleX: stagingLayer.scaleX,
      scaleY: stagingLayer.scaleY
    };

    // If in a scene, extend scene duration if needed
    if (parentScene) {
      const itemEnd = newItem.startTime + newItem.duration;
      const sceneEnd = parentScene.startTime + parentScene.duration;
      if (itemEnd > sceneEnd) {
        parentScene.duration = itemEnd - parentScene.startTime;
      }
    }

    // Add to the target layer (could be scene internal layer or timeline layer)
    if (parentScene) {
      const internalLayer = parentScene.layers.find((l: TimelineLayer) => l.id === layerId);
      if (internalLayer) {
        internalLayer.items.push(newItem);
      }
    } else {
      const targetLayer = layers.find((l: TimelineLayer) => l.id === layerId);
      if (targetLayer) {
        targetLayer.items.push(newItem);
      }
    }

    updated.timeline.layers = layers;
    onUpdate(updated);
    await window.electronAPI.saveScene(scenePath, updated);

    return;
  }

  // Check for asset from Resources panel
  const assetKey = e.dataTransfer.getData('assetKey');
  const assetType = e.dataTransfer.getData('assetType');

  if (assetKey && assetType) {
    const updated = JSON.parse(JSON.stringify(scenePackage));
    let layers = updated.timeline.layers || [];

    // If no layerId provided, create a new layer (dropping on empty timeline)
    let targetLayerId = layerId;
    let isNewLayer = false;
    if (!targetLayerId) {
      const newLayer: TimelineLayer = {
        id: `layer-${Date.now()}`,
        name: `Layer ${layers.length + 1}`,
        items: [],
        collapsed: false
      };
      layers.push(newLayer);
      targetLayerId = newLayer.id;
      isNewLayer = true;
    }

    const parentScene = findParentScene(layers, targetLayerId);
    console.log('[handleItemDrop] targetLayerId:', targetLayerId, 'parentScene:', parentScene?.id, parentScene?.name);

    // Default duration - images are 1 second, audio is 5 seconds
    let duration = assetType === 'image' ? 1000 : 5000;

    // When dropping on empty timeline (new layer), start at 0. Otherwise use dropTime.
    const startTime = isNewLayer ? 0 : (parentScene ? Math.max(parentScene.startTime, dropTime) : dropTime);

    let newItem: TimelineItem;
    if (assetType === 'image') {
      newItem = {
        id: `${assetKey}-${Date.now()}`,
        type: 'image',
        name: assetKey,
        asset: assetKey,
        startTime: startTime,
        duration: duration
      };
    } else if (assetType === 'audio') {
      newItem = {
        id: `${assetKey}-${Date.now()}`,
        type: 'audio',
        name: assetKey,
        asset: assetKey,
        startTime: startTime,
        duration: duration,
        volume: 1.0
      };
    } else {
      return;
    }

    // If in a scene, extend scene duration if needed
    if (parentScene) {
      const itemEnd = newItem.startTime + newItem.duration;
      const sceneEnd = parentScene.startTime + parentScene.duration;
      if (itemEnd > sceneEnd) {
        parentScene.duration = itemEnd - parentScene.startTime;
      }
    }

    // Add to the target layer (could be scene internal layer or timeline layer)
    if (parentScene) {
      const internalLayer = parentScene.layers.find((l: TimelineLayer) => l.id === targetLayerId);
      if (internalLayer) {
        internalLayer.items.push(newItem);
      }
    } else {
      const targetLayer = layers.find((l: TimelineLayer) => l.id === targetLayerId);
      if (targetLayer) {
        targetLayer.items.push(newItem);
      }
    }

    updated.timeline.layers = layers;
    onUpdate(updated);
    await window.electronAPI.saveScene(scenePath, updated);
  }
};

export const handleLayerDragStart = (
  e: React.DragEvent,
  layerId: string,
  setDraggedLayerId: (value: string | null) => void
): void => {
  e.stopPropagation();
  setDraggedLayerId(layerId);
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('layerId', layerId);
};

export const handleLayerDragOver = (
  e: React.DragEvent,
  targetLayerId: string,
  draggedLayerId: string | null,
  setDragOverLayerId: (value: string | null) => void
): void => {
  e.preventDefault();
  e.stopPropagation();

  const layerId = e.dataTransfer.types.includes('layerid');
  if (layerId && draggedLayerId && draggedLayerId !== targetLayerId) {
    setDragOverLayerId(targetLayerId);
  }
};

export const handleLayerDragLeave = (
  e: React.DragEvent,
  setDragOverLayerId: (value: string | null) => void
): void => {
  e.preventDefault();
  setDragOverLayerId(null);
};

export const handleLayerDrop = async (
  e: React.DragEvent,
  targetLayerId: string,
  draggedLayerId: string | null,
  scenePackage: ScenePackage | null,
  scenePath: string | null,
  onUpdate: ((scenePackage: ScenePackage) => void) | undefined,
  setDraggedLayerId: (value: string | null) => void,
  setDragOverLayerId: (value: string | null) => void
): Promise<void> => {
  e.preventDefault();
  e.stopPropagation();

  if (!draggedLayerId || !onUpdate || !scenePath || !scenePackage) {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
    return;
  }

  if (draggedLayerId === targetLayerId) {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
    return;
  }

  const updated = JSON.parse(JSON.stringify(scenePackage));
  const layers = updated.timeline.layers || [];

  // Find and remove the dragged layer
  const draggedIndex = layers.findIndex((l: TimelineLayer) => l.id === draggedLayerId);
  const targetIndex = layers.findIndex((l: TimelineLayer) => l.id === targetLayerId);

  if (draggedIndex === -1 || targetIndex === -1) {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
    return;
  }

  const [draggedLayer] = layers.splice(draggedIndex, 1);
  layers.splice(targetIndex, 0, draggedLayer);

  updated.timeline.layers = layers;
  onUpdate(updated);
  await window.electronAPI.saveScene(scenePath, updated);

  setDraggedLayerId(null);
  setDragOverLayerId(null);
};

export const handleLayerDragEnd = (
  setDraggedLayerId: (value: string | null) => void,
  setDragOverLayerId: (value: string | null) => void
): void => {
  setDraggedLayerId(null);
  setDragOverLayerId(null);
};

export const handleTrackMouseEnter = (
  layerId: string,
  isDragging: boolean,
  draggedItemId: string | null,
  setDraggedItemTargetLayer: (value: string | null) => void
): void => {
  if (isDragging && draggedItemId) {
    setDraggedItemTargetLayer(layerId);
  }
};
