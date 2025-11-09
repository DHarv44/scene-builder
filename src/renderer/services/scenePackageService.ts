import type {
  ScenePackage,
  TimelineScene,
  SceneLayer,
  SceneItem,
  ImageItem,
  Layer
} from '../../types/scenePackage';

/**
 * Centralized service for all ScenePackage mutations
 * Ensures consistent data manipulation across all features
 */
export class ScenePackageService {
  /**
   * Find a scene item by ID in timeline scenes
   */
  static findSceneById(scenePackage: ScenePackage, sceneId: string): TimelineScene | null {
    for (const scene of scenePackage.timeline.scenes || []) {
      if (scene.id === sceneId) {
        return scene;
      }
    }
    return null;
  }

  /**
   * Find the scene active at a specific time
   */
  static findSceneAtTime(scenePackage: ScenePackage, time: number): TimelineScene | null {
    for (const scene of scenePackage.timeline.scenes || []) {
      const sceneEnd = scene.startTime + scene.duration;
      if (time >= scene.startTime && time < sceneEnd) {
        return scene;
      }
    }
    return null;
  }

  /**
   * Update layer depths (z-index) for canvas layers within a scene
   * Used by: Canvas "Bring to Front", "Send to Back", SceneLayers drag-drop
   */
  static updateLayerDepths(
    scenePackage: ScenePackage,
    sceneId: string,
    depthUpdates: Map<string, number>
  ): ScenePackage {
    const updated = JSON.parse(JSON.stringify(scenePackage)) as ScenePackage;
    const scene = this.findSceneById(updated, sceneId);

    if (!scene || !scene.layers) return updated;

    // Update depths in scene's internal layers
    scene.layers.forEach((sceneLayer: SceneLayer) => {
      sceneLayer.items.forEach((item: SceneItem) => {
        if (item.type === 'image') {
          const newDepth = depthUpdates.get(item.id);
          if (newDepth !== undefined) {
            (item as ImageItem).depth = newDepth;
          }
        }
      });
    });

    return updated;
  }

  /**
   * Reorder layers by depth (for SceneLayers drag-drop)
   * Normalizes depths to sequential values (0, 1, 2, 3...)
   */
  static reorderLayersByDepth(
    scenePackage: ScenePackage,
    sceneId: string,
    draggedLayerId: string,
    targetLayerId: string
  ): ScenePackage {
    const updated = JSON.parse(JSON.stringify(scenePackage)) as ScenePackage;
    const scene = this.findSceneById(updated, sceneId);

    if (!scene || !scene.layers) return updated;

    // Collect all image items
    const allImageItems: ImageItem[] = [];
    scene.layers.forEach((sceneLayer: SceneLayer) => {
      sceneLayer.items.forEach((item: SceneItem) => {
        if (item.type === 'image') {
          allImageItems.push(item as ImageItem);
        }
      });
    });

    // Sort by current depth
    allImageItems.sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));

    // Find indices
    const draggedIndex = allImageItems.findIndex(img => img.id === draggedLayerId);
    const targetIndex = allImageItems.findIndex(img => img.id === targetLayerId);

    if (draggedIndex === -1 || targetIndex === -1) return updated;

    // Reorder
    const [draggedItem] = allImageItems.splice(draggedIndex, 1);
    allImageItems.splice(targetIndex, 0, draggedItem);

    // Reassign sequential depths
    allImageItems.forEach((img, index) => {
      img.depth = index;
    });

    return updated;
  }

  /**
   * Update layer properties (position, scale) from canvas editing
   * Used by: Canvas move/resize operations
   */
  static updateLayerProperties(
    scenePackage: ScenePackage,
    sceneId: string | null,
    layerUpdates: Map<string, Partial<Layer>>
  ): ScenePackage {
    const updated = JSON.parse(JSON.stringify(scenePackage)) as ScenePackage;

    // Update layer properties in all scenes
    const updateInScenes = (scenes: TimelineScene[]) => {
      scenes.forEach((scene: TimelineScene) => {
        scene.layers.forEach((sceneLayer: SceneLayer) => {
          sceneLayer.items.forEach((item: SceneItem) => {
            const updates = layerUpdates.get(item.id);
            if (updates && item.type === 'image') {
              const imgItem = item as ImageItem;

              if (updates.position) {
                (imgItem as any).x = updates.position.x;
                (imgItem as any).y = updates.position.y;
              }
              if (updates.scale !== undefined) {
                imgItem.scale = updates.scale;
              }
              if (updates.depth !== undefined) {
                imgItem.depth = updates.depth;
              }
            }
          });
        });
      });
    };

    updateInScenes(updated.timeline.scenes || []);
    return updated;
  }

  /**
   * Bring selected layers to front (highest depth)
   * Used by: Canvas context menu "Bring to Front"
   */
  static bringLayersToFront(
    scenePackage: ScenePackage,
    sceneId: string,
    layerIds: string[]
  ): ScenePackage {
    const updated = JSON.parse(JSON.stringify(scenePackage)) as ScenePackage;
    const scene = this.findSceneById(updated, sceneId);

    if (!scene || !scene.layers || layerIds.length === 0) return updated;

    // Collect all image items
    const allImageItems: ImageItem[] = [];
    scene.layers.forEach((sceneLayer: SceneLayer) => {
      sceneLayer.items.forEach((item: SceneItem) => {
        if (item.type === 'image') {
          allImageItems.push(item as ImageItem);
        }
      });
    });

    // Sort by current depth
    allImageItems.sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));

    // Separate selected and non-selected
    const selected = allImageItems.filter(img => layerIds.includes(img.id));
    const nonSelected = allImageItems.filter(img => !layerIds.includes(img.id));

    // Reorder: non-selected first, then selected
    const reordered = [...nonSelected, ...selected];

    // Reassign sequential depths
    reordered.forEach((img, index) => {
      img.depth = index;
    });

    return updated;
  }

  /**
   * Send selected layers to back (lowest depth)
   * Used by: Canvas context menu "Send to Back"
   */
  static sendLayersToBack(
    scenePackage: ScenePackage,
    sceneId: string,
    layerIds: string[]
  ): ScenePackage {
    const updated = JSON.parse(JSON.stringify(scenePackage)) as ScenePackage;
    const scene = this.findSceneById(updated, sceneId);

    if (!scene || !scene.layers || layerIds.length === 0) return updated;

    // Collect all image items
    const allImageItems: ImageItem[] = [];
    scene.layers.forEach((sceneLayer: SceneLayer) => {
      sceneLayer.items.forEach((item: SceneItem) => {
        if (item.type === 'image') {
          allImageItems.push(item as ImageItem);
        }
      });
    });

    // Sort by current depth
    allImageItems.sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));

    // Separate selected and non-selected
    const selected = allImageItems.filter(img => layerIds.includes(img.id));
    const nonSelected = allImageItems.filter(img => !layerIds.includes(img.id));

    // Reorder: selected first, then non-selected
    const reordered = [...selected, ...nonSelected];

    // Reassign sequential depths
    reordered.forEach((img, index) => {
      img.depth = index;
    });

    return updated;
  }

  /**
   * Move selected layers forward one step (swap with layer above)
   * Used by: Canvas context menu "Bring Forward"
   */
  static bringLayersForward(
    scenePackage: ScenePackage,
    sceneId: string,
    layerIds: string[]
  ): ScenePackage {
    const updated = JSON.parse(JSON.stringify(scenePackage)) as ScenePackage;
    const scene = this.findSceneById(updated, sceneId);

    if (!scene || !scene.layers || layerIds.length === 0) return updated;

    // Collect all image items
    const allImageItems: ImageItem[] = [];
    scene.layers.forEach((sceneLayer: SceneLayer) => {
      sceneLayer.items.forEach((item: SceneItem) => {
        if (item.type === 'image') {
          allImageItems.push(item as ImageItem);
        }
      });
    });

    // Sort by current depth
    allImageItems.sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));

    // Move each selected layer forward (if not already at front)
    for (let i = allImageItems.length - 1; i >= 0; i--) {
      const item = allImageItems[i];
      if (layerIds.includes(item.id) && i < allImageItems.length - 1) {
        // Swap with next item
        [allImageItems[i], allImageItems[i + 1]] = [allImageItems[i + 1], allImageItems[i]];
      }
    }

    // Reassign sequential depths
    allImageItems.forEach((img, index) => {
      img.depth = index;
    });

    return updated;
  }

  /**
   * Move selected layers backward one step (swap with layer below)
   * Used by: Canvas context menu "Send Backward"
   */
  static sendLayersBackward(
    scenePackage: ScenePackage,
    sceneId: string,
    layerIds: string[]
  ): ScenePackage {
    const updated = JSON.parse(JSON.stringify(scenePackage)) as ScenePackage;
    const scene = this.findSceneById(updated, sceneId);

    if (!scene || !scene.layers || layerIds.length === 0) return updated;

    // Collect all image items
    const allImageItems: ImageItem[] = [];
    scene.layers.forEach((sceneLayer: SceneLayer) => {
      sceneLayer.items.forEach((item: SceneItem) => {
        if (item.type === 'image') {
          allImageItems.push(item as ImageItem);
        }
      });
    });

    // Sort by current depth
    allImageItems.sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));

    // Move each selected layer backward (if not already at back)
    for (let i = 0; i < allImageItems.length; i++) {
      const item = allImageItems[i];
      if (layerIds.includes(item.id) && i > 0) {
        // Swap with previous item
        [allImageItems[i], allImageItems[i - 1]] = [allImageItems[i - 1], allImageItems[i]];
      }
    }

    // Reassign sequential depths
    allImageItems.forEach((img, index) => {
      img.depth = index;
    });

    return updated;
  }

  /**
   * Delete layers by ID
   * Used by: Canvas/SceneLayers delete operations
   */
  static deleteLayers(
    scenePackage: ScenePackage,
    sceneId: string,
    layerIds: string[]
  ): ScenePackage {
    const updated = JSON.parse(JSON.stringify(scenePackage)) as ScenePackage;
    const scene = this.findSceneById(updated, sceneId);

    if (!scene || !scene.layers) return updated;

    // Remove items from all scene layers
    scene.layers.forEach((sceneLayer: SceneLayer) => {
      sceneLayer.items = sceneLayer.items.filter(item => !layerIds.includes(item.id));
    });

    return updated;
  }

  /**
   * Add a new image layer to a scene
   * Used by: SceneLayers asset import
   */
  static addImageLayer(
    scenePackage: ScenePackage,
    sceneId: string,
    assetKey: string,
    layerName?: string
  ): ScenePackage {
    const updated = JSON.parse(JSON.stringify(scenePackage)) as ScenePackage;
    const scene = this.findSceneById(updated, sceneId);

    if (!scene) return updated;

    // Ensure scene has at least one internal layer
    if (!scene.layers || scene.layers.length === 0) {
      scene.layers = [{
        id: `${sceneId}-default-layer`,
        name: 'Default Layer',
        depth: 0,
        items: [],
        collapsed: false
      }];
    }

    // Calculate max depth for new item
    let maxDepth = -1;
    scene.layers.forEach((sceneLayer: SceneLayer) => {
      sceneLayer.items.forEach((item: SceneItem) => {
        if (item.type === 'image' && (item as ImageItem).depth !== undefined) {
          maxDepth = Math.max(maxDepth, (item as ImageItem).depth!);
        }
      });
    });

    // Add new image item to first layer
    const newItem: ImageItem = {
      id: `${assetKey}-${Date.now()}`,
      type: 'image',
      name: layerName || assetKey,
      asset: assetKey,
      x: 960,  // Center of 1920px canvas
      y: 540,  // Center of 1080px canvas
      scale: 1,
      depth: maxDepth + 1,
      startTime: 0,
      duration: 1000
    };

    scene.layers[0].items.push(newItem);

    return updated;
  }
}
