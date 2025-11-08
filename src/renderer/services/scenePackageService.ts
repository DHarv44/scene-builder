import type {
  ScenePackage,
  TimelineLayer,
  TimelineItem,
  TimelineImage,
  TimelineScene,
  Layer
} from '../../types/scenePackage';

/**
 * Centralized service for all ScenePackage mutations
 * Ensures consistent data manipulation across all features
 */
export class ScenePackageService {
  /**
   * Find a scene item by ID in timeline layers
   */
  static findSceneById(scenePackage: ScenePackage, sceneId: string): TimelineScene | null {
    for (const layer of scenePackage.timeline.layers || []) {
      for (const item of layer.items) {
        if (item.type === 'scene' && item.id === sceneId) {
          return item as TimelineScene;
        }
      }
    }
    return null;
  }

  /**
   * Find the scene active at a specific time
   */
  static findSceneAtTime(scenePackage: ScenePackage, time: number): TimelineScene | null {
    for (const layer of scenePackage.timeline.layers || []) {
      for (const item of layer.items) {
        if (item.type === 'scene') {
          const sceneEnd = item.startTime + item.duration;
          if (time >= item.startTime && time < sceneEnd) {
            return item as TimelineScene;
          }
        }
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
    scene.layers.forEach((timelineLayer: TimelineLayer) => {
      timelineLayer.items.forEach((item: TimelineItem) => {
        if (item.type === 'image') {
          const newDepth = depthUpdates.get(item.id);
          if (newDepth !== undefined) {
            (item as TimelineImage).depth = newDepth;
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
    const allImageItems: TimelineImage[] = [];
    scene.layers.forEach((layer: TimelineLayer) => {
      layer.items.forEach((item: TimelineItem) => {
        if (item.type === 'image') {
          allImageItems.push(item as TimelineImage);
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

    // Recursively update layer properties in entire timeline tree
    const updateInLayers = (layers: TimelineLayer[]) => {
      layers.forEach((timelineLayer: TimelineLayer) => {
        timelineLayer.items.forEach((item: TimelineItem) => {
          const updates = layerUpdates.get(item.id);
          if (updates && item.type === 'image') {
            const imgItem = item as TimelineImage;

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

          // Recursively check scene internal layers
          if (item.type === 'scene' && item.layers) {
            updateInLayers(item.layers);
          }
        });
      });
    };

    updateInLayers(updated.timeline.layers || []);
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
    const allImageItems: TimelineImage[] = [];
    scene.layers.forEach((layer: TimelineLayer) => {
      layer.items.forEach((item: TimelineItem) => {
        if (item.type === 'image') {
          allImageItems.push(item as TimelineImage);
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
    const allImageItems: TimelineImage[] = [];
    scene.layers.forEach((layer: TimelineLayer) => {
      layer.items.forEach((item: TimelineItem) => {
        if (item.type === 'image') {
          allImageItems.push(item as TimelineImage);
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
    const allImageItems: TimelineImage[] = [];
    scene.layers.forEach((layer: TimelineLayer) => {
      layer.items.forEach((item: TimelineItem) => {
        if (item.type === 'image') {
          allImageItems.push(item as TimelineImage);
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
    const allImageItems: TimelineImage[] = [];
    scene.layers.forEach((layer: TimelineLayer) => {
      layer.items.forEach((item: TimelineItem) => {
        if (item.type === 'image') {
          allImageItems.push(item as TimelineImage);
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

    // Remove items from all layers
    scene.layers.forEach((layer: TimelineLayer) => {
      layer.items = layer.items.filter(item => !layerIds.includes(item.id));
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
        items: [],
        collapsed: false
      }];
    }

    // Calculate max depth for new item
    let maxDepth = -1;
    scene.layers.forEach((layer: TimelineLayer) => {
      layer.items.forEach((item: TimelineItem) => {
        if (item.type === 'image' && (item as TimelineImage).depth !== undefined) {
          maxDepth = Math.max(maxDepth, (item as TimelineImage).depth!);
        }
      });
    });

    // Add new image item to first layer
    const newItem: any = {
      id: `${assetKey}-${Date.now()}`,
      type: 'image',
      name: layerName || assetKey,
      asset: assetKey,
      x: '50%',
      y: '50%',
      scale: 1,
      depth: maxDepth + 1,
      startTime: 0,
      duration: 1000
    };

    scene.layers[0].items.push(newItem);

    return updated;
  }
}
