import type {
  ScenePackage,
  TimelineLayer,
  TimelineItem,
  TimelineScene
} from '../../../types/scenePackage';

export const updateItem = (
  scenePackage: ScenePackage,
  itemId: string,
  updates: Partial<TimelineItem>,
  onUpdate?: (scenePackage: ScenePackage) => void
): void => {
  if (!onUpdate) return;

  const updated = JSON.parse(JSON.stringify(scenePackage));
  const layers = updated.timeline.layers || [];

  const findAndUpdateItem = (layers: TimelineLayer[]): boolean => {
    for (const layer of layers) {
      const item = layer.items.find(i => i.id === itemId);
      if (item) {
        Object.assign(item, updates);
        return true;
      }
      // Check scene internal layers
      for (const sceneItem of layer.items) {
        if (sceneItem.type === 'scene' && sceneItem.layers) {
          if (findAndUpdateItem(sceneItem.layers)) return true;
        }
      }
    }
    return false;
  };

  if (findAndUpdateItem(layers)) {
    updated.timeline.layers = layers;
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
  const layers = updated.timeline.layers || [];

  // Calculate max depth across all image items in the entire timeline
  const calculateMaxDepth = (layers: TimelineLayer[]): number => {
    let maxDepth = -1;
    const checkLayers = (layerList: TimelineLayer[]) => {
      layerList.forEach(layer => {
        layer.items.forEach(item => {
          if (item.type === 'image' && item.depth !== undefined) {
            maxDepth = Math.max(maxDepth, item.depth);
          }
          if (item.type === 'scene' && item.layers) {
            checkLayers(item.layers);
          }
        });
      });
    };
    checkLayers(layers);
    return maxDepth;
  };

  const maxDepth = calculateMaxDepth(layers);

  const findAndAddToLayer = (layers: TimelineLayer[]): boolean => {
    for (const layer of layers) {
      if (layer.id === layerId) {
        const newItem = {
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
      // Check scene internal layers
      for (const item of layer.items) {
        if (item.type === 'scene' && item.layers) {
          if (findAndAddToLayer(item.layers)) return true;
        }
      }
    }
    return false;
  };

  if (findAndAddToLayer(layers)) {
    // Register asset in manifest if not already present
    if (!updated.assets.images[assetKey]) {
      updated.assets.images[assetKey] = assetPath;
    }

    updated.timeline.layers = layers;
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
  const layers = updated.timeline.layers || [];

  const findAndAddToLayer = (layers: TimelineLayer[]): boolean => {
    for (const layer of layers) {
      if (layer.id === layerId) {
        const newItem = {
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
      // Check scene internal layers
      for (const item of layer.items) {
        if (item.type === 'scene' && item.layers) {
          if (findAndAddToLayer(item.layers)) return true;
        }
      }
    }
    return false;
  };

  if (findAndAddToLayer(layers)) {
    // Register asset in manifest if not already present
    if (!updated.assets.audio[assetKey]) {
      updated.assets.audio[assetKey] = assetPath;
    }

    updated.timeline.layers = layers;
    onUpdate(updated);
    await window.electronAPI.saveScene(scenePath, updated);
  }
};

export const handleAddScene = async (
  scenePackage: ScenePackage,
  scenePath: string,
  layerId: string,
  onUpdate?: (scenePackage: ScenePackage) => void
): Promise<void> => {
  if (!onUpdate) return;

  const updated = JSON.parse(JSON.stringify(scenePackage));
  const layers = updated.timeline.layers || [];

  const findAndAddToLayer = (layers: TimelineLayer[]): boolean => {
    const countScenes = (layers: TimelineLayer[]): number => {
      let count = 0;
      for (const layer of layers) {
        count += layer.items.filter((i: TimelineItem) => i.type === 'scene').length;
        for (const item of layer.items) {
          if (item.type === 'scene' && item.layers) {
            count += countScenes(item.layers);
          }
        }
      }
      return count;
    };

    for (const layer of layers) {
      if (layer.id === layerId) {
        const sceneCount = countScenes(updated.timeline.layers || []);
        const newScene: TimelineScene = {
          id: `scene-${Date.now()}`,
          type: 'scene',
          name: `Scene ${sceneCount + 1}`,
          startTime: 0,
          duration: 10000,
          layers: [
            {
              id: `scene-${Date.now()}-layer-1`,
              name: 'Layer 1',
              items: [],
              collapsed: false
            }
          ],
          collapsed: false
        };
        layer.items.push(newScene);
        return true;
      }
      // Check scene internal layers
      for (const item of layer.items) {
        if (item.type === 'scene' && item.layers) {
          if (findAndAddToLayer(item.layers)) return true;
        }
      }
    }
    return false;
  };

  if (findAndAddToLayer(layers)) {
    updated.timeline.layers = layers;
    onUpdate(updated);
    await window.electronAPI.saveScene(scenePath, updated);
  }
};

export const handleDeleteItem = async (
  scenePackage: ScenePackage,
  scenePath: string,
  itemId: string,
  onUpdate?: (scenePackage: ScenePackage) => void
): Promise<boolean> => {
  if (!onUpdate) return false;

  const updated = JSON.parse(JSON.stringify(scenePackage));
  const layers = updated.timeline.layers || [];

  const removeFromLayers = (layers: TimelineLayer[]): boolean => {
    for (const layer of layers) {
      const index = layer.items.findIndex(item => item.id === itemId);
      if (index !== -1) {
        layer.items.splice(index, 1);
        return true;
      }
      // Check scene internal layers
      for (const item of layer.items) {
        if (item.type === 'scene' && item.layers) {
          if (removeFromLayers(item.layers)) return true;
        }
      }
    }
    return false;
  };

  if (removeFromLayers(layers)) {
    updated.timeline.layers = layers;
    onUpdate(updated);
    await window.electronAPI.saveScene(scenePath, updated);
    return true;
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
  const layers = updated.timeline.layers || [];

  const removeLayer = (layers: TimelineLayer[]): boolean => {
    // Check top-level layers
    const index = layers.findIndex(layer => layer.id === layerId);
    if (index !== -1) {
      layers.splice(index, 1);
      return true;
    }
    // Check scene internal layers
    for (const layer of layers) {
      for (const item of layer.items) {
        if (item.type === 'scene' && item.layers) {
          const sceneLayerIndex = item.layers.findIndex((l: TimelineLayer) => l.id === layerId);
          if (sceneLayerIndex !== -1) {
            item.layers.splice(sceneLayerIndex, 1);
            return true;
          }
        }
      }
    }
    return false;
  };

  if (removeLayer(layers)) {
    updated.timeline.layers = layers;
    onUpdate(updated);
    await window.electronAPI.saveScene(scenePath, updated);
    return true;
  }

  return false;
};

export const handleAddLayer = async (
  scenePackage: ScenePackage,
  scenePath: string,
  onUpdate?: (scenePackage: ScenePackage) => void
): Promise<void> => {
  if (!onUpdate) return;

  const updated = JSON.parse(JSON.stringify(scenePackage));
  const layers = updated.timeline.layers || [];

  const newLayer: TimelineLayer = {
    id: `layer-${Date.now()}`,
    name: `Layer ${layers.length + 1}`,
    items: [],
    collapsed: false
  };

  layers.push(newLayer);
  updated.timeline.layers = layers;

  onUpdate(updated);
  await window.electronAPI.saveScene(scenePath, updated);
};

export const handleAddLayerToScene = async (
  scenePackage: ScenePackage,
  scenePath: string,
  sceneId: string,
  onUpdate?: (scenePackage: ScenePackage) => void
): Promise<void> => {
  if (!onUpdate) return;

  const updated = JSON.parse(JSON.stringify(scenePackage));
  const layers = updated.timeline.layers || [];

  // Find the scene
  const findScene = (layers: TimelineLayer[]): TimelineScene | null => {
    for (const layer of layers) {
      for (const item of layer.items) {
        if (item.type === 'scene' && item.id === sceneId) {
          return item;
        }
      }
    }
    return null;
  };

  const scene = findScene(layers);
  if (scene) {
    const newLayerId = `${sceneId}-layer-${Date.now()}`;
    console.log('[handleAddLayerToScene] sceneId:', sceneId, 'scene.id:', scene.id, 'newLayerId:', newLayerId);

    const newLayer: TimelineLayer = {
      id: newLayerId,
      name: `Layer ${scene.layers.length + 1}`,
      items: [],
      collapsed: false
    };

    scene.layers.push(newLayer);

    updated.timeline.layers = layers;
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
  const layers = updated.timeline.layers || [];

  const findAndRenameLayer = (layers: TimelineLayer[]): boolean => {
    for (const layer of layers) {
      if (layer.id === layerId) {
        const newName = window.prompt('Enter new layer name:', layer.name);
        if (newName && newName.trim()) {
          layer.name = newName.trim();
          return true;
        }
        return false;
      }
      // Check scene internal layers
      for (const item of layer.items) {
        if (item.type === 'scene' && item.layers) {
          if (findAndRenameLayer(item.layers)) return true;
        }
      }
    }
    return false;
  };

  if (findAndRenameLayer(layers)) {
    updated.timeline.layers = layers;
    onUpdate(updated);
    await window.electronAPI.saveScene(scenePath, updated);
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
  const layers = updated.timeline.layers || [];

  const findAndRenameItem = (layers: TimelineLayer[]): boolean => {
    for (const layer of layers) {
      const item = layer.items.find(i => i.id === itemId);
      if (item) {
        const newName = window.prompt('Enter new name:', item.name);
        if (newName && newName.trim()) {
          item.name = newName.trim();
          return true;
        }
        return false;
      }
      // Check scene internal layers
      for (const sceneItem of layer.items) {
        if (sceneItem.type === 'scene' && sceneItem.layers) {
          if (findAndRenameItem(sceneItem.layers)) return true;
        }
      }
    }
    return false;
  };

  if (findAndRenameItem(layers)) {
    updated.timeline.layers = layers;
    onUpdate(updated);
    await window.electronAPI.saveScene(scenePath, updated);
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
  const layers = updated.timeline.layers || [];

  const findAndDuplicateItem = (layers: TimelineLayer[]): boolean => {
    for (const layer of layers) {
      const itemIndex = layer.items.findIndex(i => i.id === itemId);
      if (itemIndex !== -1) {
        const originalItem = layer.items[itemIndex];
        const duplicatedItem: TimelineItem = {
          ...JSON.parse(JSON.stringify(originalItem)),
          id: `${originalItem.id}-copy-${Date.now()}`,
          name: `${originalItem.name} Copy`,
          startTime: originalItem.startTime + originalItem.duration + 100 // Place after original
        };
        layer.items.splice(itemIndex + 1, 0, duplicatedItem);
        return true;
      }
      // Check scene internal layers
      for (const sceneItem of layer.items) {
        if (sceneItem.type === 'scene' && sceneItem.layers) {
          if (findAndDuplicateItem(sceneItem.layers)) return true;
        }
      }
    }
    return false;
  };

  if (findAndDuplicateItem(layers)) {
    updated.timeline.layers = layers;
    onUpdate(updated);
    await window.electronAPI.saveScene(scenePath, updated);
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
  const layers = updated.timeline.layers || [];

  const findAndDuplicateLayer = (layers: TimelineLayer[], parentScene?: TimelineScene): boolean => {
    const layerIndex = layers.findIndex(l => l.id === layerId);
    if (layerIndex !== -1) {
      const originalLayer = layers[layerIndex];
      const duplicatedLayer: TimelineLayer = {
        ...JSON.parse(JSON.stringify(originalLayer)),
        id: `${originalLayer.id}-copy-${Date.now()}`,
        name: `${originalLayer.name} Copy`,
        items: originalLayer.items.map((item: TimelineItem) => ({
          ...JSON.parse(JSON.stringify(item)),
          id: `${item.id}-copy-${Date.now()}`
        }))
      };
      layers.splice(layerIndex + 1, 0, duplicatedLayer);
      return true;
    }

    // Check scene internal layers
    for (const layer of layers) {
      for (const item of layer.items) {
        if (item.type === 'scene' && item.layers) {
          if (findAndDuplicateLayer(item.layers, item)) return true;
        }
      }
    }
    return false;
  };

  if (findAndDuplicateLayer(layers)) {
    updated.timeline.layers = layers;
    onUpdate(updated);
    await window.electronAPI.saveScene(scenePath, updated);
  }
};
