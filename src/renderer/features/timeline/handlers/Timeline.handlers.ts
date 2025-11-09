import type {
  ScenePackage,
  TimelineLayer,
  TimelineItem,
  TimelineImage,
  TimelineScene,
  SceneLayer,
  SceneItem,
  ImageItem
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

    // Check if this is a camera item
    if (scenePackage.timeline.camera?.items) {
      const cameraItem = scenePackage.timeline.camera.items.find(item => item.id === draggedItemId);
      if (cameraItem && onUpdate) {
        const updated = JSON.parse(JSON.stringify(scenePackage));
        const item = updated.timeline.camera.items.find((i: any) => i.id === draggedItemId);
        if (item) {
          item.startTime = newStartTime;
          onUpdate(updated);
          return;
        }
      }
    }

    // Check if this is an effects item
    if (scenePackage.timeline.effects?.items) {
      const effectItem = scenePackage.timeline.effects.items.find(item => item.id === draggedItemId);
      if (effectItem && onUpdate) {
        const updated = JSON.parse(JSON.stringify(scenePackage));
        const item = updated.timeline.effects.items.find((i: any) => i.id === draggedItemId);
        if (item) {
          item.startTime = newStartTime;
          onUpdate(updated);
          return;
        }
      }
    }

    // For now, no parent scene clamping in new schema
    // Items are positioned within their scene's duration
    updateItem(scenePackage, draggedItemId, { startTime: newStartTime }, onUpdate);
  } else if (isResizing && resizingItemId && resizeHandle) {
    const deltaX = e.clientX - resizeStartX;
    const deltaTime = deltaX / pixelsPerMs;

    if (resizeHandle === 'left') {
      // Resize from left (change startTime and duration)
      const newStartTime = Math.max(0, resizeStartTime + deltaTime);
      const timeDiff = newStartTime - resizeStartTime;
      const newDuration = Math.max(100, resizeStartDuration - timeDiff); // Min 100ms

      // Check if this is a camera item
      if (scenePackage.timeline.camera?.items) {
        const cameraItem = scenePackage.timeline.camera.items.find(item => item.id === resizingItemId);
        if (cameraItem && onUpdate) {
          const updated = JSON.parse(JSON.stringify(scenePackage));
          const item = updated.timeline.camera.items.find((i: any) => i.id === resizingItemId);
          if (item) {
            item.startTime = newStartTime;
            item.duration = newDuration;
            onUpdate(updated);
            return;
          }
        }
      }

      // Check if this is an effects item
      if (scenePackage.timeline.effects?.items) {
        const effectItem = scenePackage.timeline.effects.items.find(item => item.id === resizingItemId);
        if (effectItem && onUpdate) {
          const updated = JSON.parse(JSON.stringify(scenePackage));
          const item = updated.timeline.effects.items.find((i: any) => i.id === resizingItemId);
          if (item) {
            item.startTime = newStartTime;
            item.duration = newDuration;
            onUpdate(updated);
            return;
          }
        }
      }

      updateItem(scenePackage, resizingItemId, {
        startTime: newStartTime,
        duration: newDuration
      } as Partial<SceneItem>, onUpdate);
    } else if (resizeHandle === 'right') {
      // Resize from right (change duration only)
      let newDuration = Math.max(100, resizeStartDuration + deltaTime);

      // Check if this is a camera item
      if (scenePackage.timeline.camera?.items) {
        const cameraItem = scenePackage.timeline.camera.items.find(item => item.id === resizingItemId);
        if (cameraItem && onUpdate) {
          const updated = JSON.parse(JSON.stringify(scenePackage));
          const item = updated.timeline.camera.items.find((i: any) => i.id === resizingItemId);
          if (item) {
            item.duration = newDuration;
            onUpdate(updated);
            return;
          }
        }
      }

      // Check if this is an effects item
      if (scenePackage.timeline.effects?.items) {
        const effectItem = scenePackage.timeline.effects.items.find(item => item.id === resizingItemId);
        if (effectItem && onUpdate) {
          const updated = JSON.parse(JSON.stringify(scenePackage));
          const item = updated.timeline.effects.items.find((i: any) => i.id === resizingItemId);
          if (item) {
            item.duration = newDuration;
            onUpdate(updated);
            return;
          }
        }
      }

      updateItem(scenePackage, resizingItemId, { duration: newDuration } as Partial<SceneItem>, onUpdate);
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
        const scenes = pkg.timeline.scenes || [];

        // Helper to find and remove item from any scene layer
        const findAndRemoveItem = (scenes: TimelineScene[]): SceneItem | null => {
          for (const scene of scenes) {
            for (const layer of scene.layers) {
              const index = layer.items.findIndex((item: SceneItem) => item.id === draggedItemId);
              if (index !== -1) {
                return layer.items.splice(index, 1)[0];
              }
            }
          }
          return null;
        };

        // Helper to add item to target layer
        const addToLayer = (scenes: TimelineScene[], targetLayerId: string, item: SceneItem): boolean => {
          for (const scene of scenes) {
            for (const layer of scene.layers) {
              if (layer.id === targetLayerId) {
                layer.items.push(item);
                return true;
              }
            }
          }
          return false;
        };

        const movedItem = findAndRemoveItem(scenes);
        if (movedItem) {
          addToLayer(scenes, draggedItemTargetLayer, movedItem);
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
    // TODO: Implement staging layer drop for new schema
    console.warn('Staging layer drop not yet implemented for new schema');
    return;
  }

  // Check for asset from Resources panel
  const assetKey = e.dataTransfer.getData('assetKey');
  const assetType = e.dataTransfer.getData('assetType');

  if (assetKey && assetType) {
    const updated = JSON.parse(JSON.stringify(scenePackage));
    let scenes = updated.timeline.scenes || [];

    // If no layerId provided, we need to create a scene first
    let targetLayerId = layerId;
    if (!targetLayerId) {
      // Create a new scene with a default layer
      const newScene: TimelineScene = {
        id: `scene-${Date.now()}`,
        name: `Scene ${scenes.length + 1}`,
        startTime: 0,
        duration: 10000,
        layers: [
          {
            id: `scene-${Date.now()}-layer-1`,
            name: 'Layer 1',
            depth: 0,
            items: [],
            collapsed: false
          }
        ],
        collapsed: false
      };
      scenes.push(newScene);
      targetLayerId = newScene.layers[0].id;
    }

    // Default duration - images are 1 second, audio is 5 seconds
    let duration = assetType === 'image' ? 1000 : 5000;

    let newItem: SceneItem;
    if (assetType === 'image') {
      newItem = {
        id: `${assetKey}-${Date.now()}`,
        type: 'image',
        name: assetKey,
        asset: assetKey,
        startTime: dropTime,
        duration: duration
      };
    } else if (assetType === 'audio') {
      newItem = {
        id: `${assetKey}-${Date.now()}`,
        type: 'audio',
        name: assetKey,
        asset: assetKey,
        startTime: dropTime,
        duration: duration,
        volume: 1.0
      };
    } else {
      return;
    }

    // Find target layer in scenes
    let added = false;
    for (const scene of scenes) {
      const targetLayer = scene.layers.find((l: SceneLayer) => l.id === targetLayerId);
      if (targetLayer) {
        targetLayer.items.push(newItem);
        added = true;
        break;
      }
    }

    if (added) {
      // Register asset in manifest if not already present
      if (assetType === 'image' && !updated.assets.images[assetKey]) {
        updated.assets.images[assetKey] = e.dataTransfer.getData('sourcePath') || assetKey;
      } else if (assetType === 'audio' && !updated.assets.audio[assetKey]) {
        updated.assets.audio[assetKey] = e.dataTransfer.getData('sourcePath') || assetKey;
      }

      updated.timeline.scenes = scenes;
      onUpdate(updated);
      await window.electronAPI.saveScene(scenePath, updated);
    }
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

// handleLayerDrop is now used for scene reordering
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
  const scenes = updated.timeline.scenes || [];

  // Find and remove the dragged scene
  const draggedIndex = scenes.findIndex((s: TimelineScene) => s.id === draggedLayerId);
  const targetIndex = scenes.findIndex((s: TimelineScene) => s.id === targetLayerId);

  if (draggedIndex === -1 || targetIndex === -1) {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
    return;
  }

  const [draggedScene] = scenes.splice(draggedIndex, 1);
  scenes.splice(targetIndex, 0, draggedScene);

  updated.timeline.scenes = scenes;
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
