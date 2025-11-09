import { ScenePackageService } from '../../services/scenePackageService';

/**
 * SceneLayers feature actions
 * Business logic for scene layer manipulation
 */

/**
 * Reorder layers by drag-drop
 */
export const reorderLayers = (
  sceneId: string,
  draggedLayerId: string,
  targetLayerId: string,
  updateScene: (updater: any) => void,
  saveScene: () => Promise<void>
): void => {
  updateScene((pkg: any) =>
    ScenePackageService.reorderLayersByDepth(pkg, sceneId, draggedLayerId, targetLayerId)
  );
  saveScene();
};

/**
 * Add new image layer to scene
 */
export const addImageLayer = (
  sceneId: string,
  assetKey: string,
  layerName: string | undefined,
  updateScene: (updater: any) => void,
  saveScene: () => Promise<void>
): void => {
  updateScene((pkg: any) =>
    ScenePackageService.addImageLayer(pkg, sceneId, assetKey, layerName)
  );
  saveScene();
};

/**
 * Delete layer from scene
 */
export const deleteLayer = (
  sceneId: string,
  layerId: string,
  updateScene: (updater: any) => void,
  saveScene: () => Promise<void>
): void => {
  updateScene((pkg: any) =>
    ScenePackageService.deleteLayers(pkg, sceneId, [layerId])
  );
  saveScene();
};

/**
 * Import assets and add as layers
 */
export const importAssets = async (
  sceneId: string,
  scenePath: string,
  updateScene: (updater: any) => void,
  saveScene: () => Promise<void>
): Promise<void> => {
  // Use dialog to select images, then import them
  const selectedFiles = await window.electronAPI.dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
  });

  if (selectedFiles.canceled || !selectedFiles.filePaths || selectedFiles.filePaths.length === 0) {
    return;
  }

  const result = await window.electronAPI.importFiles(scenePath, 'images', selectedFiles.filePaths);

  if (!result.success || !result.assets) return;

  updateScene((pkg: any) => {
    const updated = JSON.parse(JSON.stringify(pkg));
    const scene = ScenePackageService.findSceneById(updated, sceneId);

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

    // Calculate max depth for new items
    let maxDepth = -1;
    scene.layers.forEach((tLayer: any) => {
      tLayer.items.forEach((img: any) => {
        if (img.type === 'image' && img.depth !== undefined) {
          maxDepth = Math.max(maxDepth, img.depth);
        }
      });
    });

    // Add each imported asset as an image item
    Object.keys(result.assets || {}).forEach((assetKey, index) => {
      scene.layers[0].items.push({
        id: `${assetKey}-${Date.now()}-${index}`,
        type: 'image',
        name: assetKey,
        asset: assetKey,
        x: '50%' as any,
        y: '50%' as any,
        scale: 1,
        depth: maxDepth + index + 1,
        startTime: 0,
        duration: 1000
      });
    });

    // Merge new assets into package
    updated.assets.images = { ...updated.assets.images, ...result.assets };

    return updated;
  });

  await saveScene();
};
