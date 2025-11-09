import type {
  ScenePackage,
  TimelineLayer,
  TimelineItem,
  TimelineScene,
  SceneLayer,
  SceneItem
} from '../../../types/scenePackage';

export const updateItem = (
  scenePackage: ScenePackage,
  itemId: string,
  updates: Partial<SceneItem>,
  onUpdate?: (scenePackage: ScenePackage) => void
): void => {
  if (!onUpdate) return;

  const updated = JSON.parse(JSON.stringify(scenePackage));
  const scenes = updated.timeline.scenes || [];

  const findAndUpdateItem = (scenes: TimelineScene[]): boolean => {
    for (const scene of scenes) {
      for (const layer of scene.layers) {
        const item = layer.items.find((i: SceneItem) => i.id === itemId);
        if (item) {
          Object.assign(item, updates);
          return true;
        }
      }
    }
    return false;
  };

  if (findAndUpdateItem(scenes)) {
    updated.timeline.scenes = scenes;
    onUpdate(updated);
    // Don't save during drag - only update in-memory state
  }
};

export const handleAddImage = async (
  scenePackage: ScenePackage,
  scenePath: string,
  layerId: string,
  assetKey: string,
  assetPath: string,
  onUpdate?: (scenePackage: ScenePackage) => void
): Promise<void> => {
  if (!onUpdate) return;

  const updated = JSON.parse(JSON.stringify(scenePackage));
  const scenes = updated.timeline.scenes || [];

  // Calculate max depth across all image items in the entire timeline
  const calculateMaxDepth = (scenes: TimelineScene[]): number => {
    let maxDepth = -1;
    for (const scene of scenes) {
      for (const layer of scene.layers) {
        layer.items.forEach((item: SceneItem) => {
          if (item.type === 'image' && item.depth !== undefined) {
            maxDepth = Math.max(maxDepth, item.depth);
          }
        });
      }
    }
    return maxDepth;
  };

  const maxDepth = calculateMaxDepth(scenes);

  const findAndAddToLayer = (scenes: TimelineScene[]): boolean => {
    for (const scene of scenes) {
      for (const layer of scene.layers) {
        if (layer.id === layerId) {
          const newItem: SceneItem = {
            id: `${assetKey}-${Date.now()}`,
            type: 'image' as const,
            name: assetKey,
            asset: assetKey,
            startTime: 0,
            duration: 1000,
            depth: maxDepth + 1
          };
          layer.items.push(newItem);
          return true;
        }
      }
    }
    return false;
  };

  if (findAndAddToLayer(scenes)) {
    // Register asset in manifest if not already present
    if (!updated.assets.images[assetKey]) {
      updated.assets.images[assetKey] = assetPath;
    }

    updated.timeline.scenes = scenes;
    onUpdate(updated);
    await window.electronAPI.saveScene(scenePath, updated);
  }
};

export const handleAddAudio = async (
  scenePackage: ScenePackage,
  scenePath: string,
  layerId: string,
  assetKey: string,
  assetPath: string,
  onUpdate?: (scenePackage: ScenePackage) => void
): Promise<void> => {
  if (!onUpdate) return;

  const updated = JSON.parse(JSON.stringify(scenePackage));
  const scenes = updated.timeline.scenes || [];

  const findAndAddToLayer = (scenes: TimelineScene[]): boolean => {
    for (const scene of scenes) {
      for (const layer of scene.layers) {
        if (layer.id === layerId) {
          const newItem: SceneItem = {
            id: `${assetKey}-${Date.now()}`,
            type: 'audio' as const,
            name: assetKey,
            asset: assetKey,
            startTime: 0,
            duration: 5000,
            volume: 1.0
          };
          layer.items.push(newItem);
          return true;
        }
      }
    }
    return false;
  };

  if (findAndAddToLayer(scenes)) {
    // Register asset in manifest if not already present
    if (!updated.assets.audio[assetKey]) {
      updated.assets.audio[assetKey] = assetPath;
    }

    updated.timeline.scenes = scenes;
    onUpdate(updated);
    await window.electronAPI.saveScene(scenePath, updated);
  }
};

// handleAddScene is now for adding a new top-level scene
export const handleAddScene = async (
  scenePackage: ScenePackage,
  scenePath: string,
  _layerId: string, // Deprecated but kept for compatibility
  onUpdate?: (scenePackage: ScenePackage) => void
): Promise<void> => {
  if (!onUpdate) return;

  const updated = JSON.parse(JSON.stringify(scenePackage));
  const scenes = updated.timeline.scenes || [];

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
  updated.timeline.scenes = scenes;
  onUpdate(updated);
  await window.electronAPI.saveScene(scenePath, updated);
};

export const handleDeleteItem = async (
  scenePackage: ScenePackage,
  scenePath: string,
  itemId: string,
  onUpdate?: (scenePackage: ScenePackage) => void
): Promise<boolean> => {
  if (!onUpdate) return false;

  const updated = JSON.parse(JSON.stringify(scenePackage));
  const scenes = updated.timeline.scenes || [];

  // Try to delete scene
  const sceneIndex = scenes.findIndex((s: TimelineScene) => s.id === itemId);
  if (sceneIndex !== -1) {
    scenes.splice(sceneIndex, 1);
    updated.timeline.scenes = scenes;
    onUpdate(updated);
    await window.electronAPI.saveScene(scenePath, updated);
    return true;
  }

  // Try to delete item from scene layers
  for (const scene of scenes) {
    for (const layer of scene.layers) {
      const index = layer.items.findIndex((item: SceneItem) => item.id === itemId);
      if (index !== -1) {
        layer.items.splice(index, 1);
        updated.timeline.scenes = scenes;
        onUpdate(updated);
        await window.electronAPI.saveScene(scenePath, updated);
        return true;
      }
    }
  }

  return false;
};

export const handleDeleteLayer = async (
  scenePackage: ScenePackage,
  scenePath: string,
  layerId: string,
  onUpdate?: (scenePackage: ScenePackage) => void
): Promise<boolean> => {
  if (!onUpdate) return false;

  const updated = JSON.parse(JSON.stringify(scenePackage));
  const scenes = updated.timeline.scenes || [];

  // Find and remove layer from scene
  for (const scene of scenes) {
    const layerIndex = scene.layers.findIndex((l: SceneLayer) => l.id === layerId);
    if (layerIndex !== -1) {
      scene.layers.splice(layerIndex, 1);
      updated.timeline.scenes = scenes;
      onUpdate(updated);
      await window.electronAPI.saveScene(scenePath, updated);
      return true;
    }
  }

  return false;
};

// Deprecated: handleAddLayer is now handleAddScene (adds top-level scene)
export const handleAddLayer = async (
  scenePackage: ScenePackage,
  scenePath: string,
  onUpdate?: (scenePackage: ScenePackage) => void
): Promise<void> => {
  // Just redirect to adding a scene
  return handleAddScene(scenePackage, scenePath, '', onUpdate);
};

export const handleAddLayerToScene = async (
  scenePackage: ScenePackage,
  scenePath: string,
  sceneId: string,
  onUpdate?: (scenePackage: ScenePackage) => void
): Promise<void> => {
  if (!onUpdate) return;

  const updated = JSON.parse(JSON.stringify(scenePackage));
  const scenes = updated.timeline.scenes || [];

  // Find the scene
  const scene = scenes.find((s: TimelineScene) => s.id === sceneId);
  if (scene) {
    const newLayerId = `${sceneId}-layer-${Date.now()}`;
    console.log('[handleAddLayerToScene] sceneId:', sceneId, 'scene.id:', scene.id, 'newLayerId:', newLayerId);

    const newLayer: SceneLayer = {
      id: newLayerId,
      name: `Layer ${scene.layers.length + 1}`,
      depth: scene.layers.length,
      items: [],
      collapsed: false
    };

    scene.layers.push(newLayer);

    updated.timeline.scenes = scenes;
    onUpdate(updated);
    await window.electronAPI.saveScene(scenePath, updated);
  }
};

export const handleAddFadeIn = async (): Promise<void> => {
  alert('Fade In not implemented - this will add fade effect item to timeline');
};

export const handleAddFadeOut = async (): Promise<void> => {
  alert('Fade Out not implemented - this will add fade effect item to timeline');
};

// Rename functions
export const handleRenameLayer = async (
  scenePackage: ScenePackage,
  scenePath: string,
  layerId: string,
  onUpdate?: (scenePackage: ScenePackage) => void
): Promise<void> => {
  if (!onUpdate) return;

  const updated = JSON.parse(JSON.stringify(scenePackage));
  const scenes = updated.timeline.scenes || [];

  // Find layer in scenes
  for (const scene of scenes) {
    const layer = scene.layers.find((l: SceneLayer) => l.id === layerId);
    if (layer) {
      const newName = window.prompt('Enter new layer name:', layer.name);
      if (newName && newName.trim()) {
        layer.name = newName.trim();
        updated.timeline.scenes = scenes;
        onUpdate(updated);
        await window.electronAPI.saveScene(scenePath, updated);
      }
      return;
    }
  }
};

export const handleRenameItem = async (
  scenePackage: ScenePackage,
  scenePath: string,
  itemId: string,
  onUpdate?: (scenePackage: ScenePackage) => void
): Promise<void> => {
  if (!onUpdate) return;

  const updated = JSON.parse(JSON.stringify(scenePackage));
  const scenes = updated.timeline.scenes || [];

  // Try to find scene
  const scene = scenes.find((s: TimelineScene) => s.id === itemId);
  if (scene) {
    const newName = window.prompt('Enter new scene name:', scene.name);
    if (newName && newName.trim()) {
      scene.name = newName.trim();
      updated.timeline.scenes = scenes;
      onUpdate(updated);
      await window.electronAPI.saveScene(scenePath, updated);
    }
    return;
  }

  // Try to find item in scene layers
  for (const scene of scenes) {
    for (const layer of scene.layers) {
      const item = layer.items.find((i: SceneItem) => i.id === itemId);
      if (item) {
        const newName = window.prompt('Enter new name:', item.name);
        if (newName && newName.trim()) {
          item.name = newName.trim();
          updated.timeline.scenes = scenes;
          onUpdate(updated);
          await window.electronAPI.saveScene(scenePath, updated);
        }
        return;
      }
    }
  }
};

// Duplicate functions
export const handleDuplicateItem = async (
  scenePackage: ScenePackage,
  scenePath: string,
  itemId: string,
  onUpdate?: (scenePackage: ScenePackage) => void
): Promise<void> => {
  if (!onUpdate) return;

  const updated = JSON.parse(JSON.stringify(scenePackage));
  const scenes = updated.timeline.scenes || [];

  // Try to duplicate scene
  const sceneIndex = scenes.findIndex((s: TimelineScene) => s.id === itemId);
  if (sceneIndex !== -1) {
    const originalScene = scenes[sceneIndex];
    const duplicatedScene: TimelineScene = {
      ...JSON.parse(JSON.stringify(originalScene)),
      id: `${originalScene.id}-copy-${Date.now()}`,
      name: `${originalScene.name} Copy`,
      startTime: originalScene.startTime + originalScene.duration + 100
    };
    scenes.splice(sceneIndex + 1, 0, duplicatedScene);
    updated.timeline.scenes = scenes;
    onUpdate(updated);
    await window.electronAPI.saveScene(scenePath, updated);
    return;
  }

  // Try to duplicate item in scene layers
  for (const scene of scenes) {
    for (const layer of scene.layers) {
      const itemIndex = layer.items.findIndex((i: SceneItem) => i.id === itemId);
      if (itemIndex !== -1) {
        const originalItem = layer.items[itemIndex];
        const duplicatedItem: SceneItem = {
          ...JSON.parse(JSON.stringify(originalItem)),
          id: `${originalItem.id}-copy-${Date.now()}`,
          name: `${originalItem.name} Copy`,
          startTime: originalItem.startTime + originalItem.duration + 100
        };
        layer.items.splice(itemIndex + 1, 0, duplicatedItem);
        updated.timeline.scenes = scenes;
        onUpdate(updated);
        await window.electronAPI.saveScene(scenePath, updated);
        return;
      }
    }
  }
};

export const handleDuplicateLayer = async (
  scenePackage: ScenePackage,
  scenePath: string,
  layerId: string,
  onUpdate?: (scenePackage: ScenePackage) => void
): Promise<void> => {
  if (!onUpdate) return;

  const updated = JSON.parse(JSON.stringify(scenePackage));
  const scenes = updated.timeline.scenes || [];

  // Find and duplicate layer in scenes
  for (const scene of scenes) {
    const layerIndex = scene.layers.findIndex((l: SceneLayer) => l.id === layerId);
    if (layerIndex !== -1) {
      const originalLayer = scene.layers[layerIndex];
      const duplicatedLayer: SceneLayer = {
        ...JSON.parse(JSON.stringify(originalLayer)),
        id: `${originalLayer.id}-copy-${Date.now()}`,
        name: `${originalLayer.name} Copy`,
        depth: originalLayer.depth + 1,
        items: originalLayer.items.map((item: SceneItem) => ({
          ...JSON.parse(JSON.stringify(item)),
          id: `${item.id}-copy-${Date.now()}`
        }))
      };
      scene.layers.splice(layerIndex + 1, 0, duplicatedLayer);
      updated.timeline.scenes = scenes;
      onUpdate(updated);
      await window.electronAPI.saveScene(scenePath, updated);
      return;
    }
  }
};
