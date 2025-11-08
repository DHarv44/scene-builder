import type { Layer } from '../../../types/scenePackage';
import { ScenePackageService } from '../../services/scenePackageService';

/**
 * Canvas feature actions
 * Business logic for canvas layer manipulation
 */

export interface LayerPropertyUpdate {
  position?: { x: number | string; y: number | string };
  scale?: number;
  depth?: number;
}

/**
 * Update canvas layer properties and persist to scene package
 */
export const updateCanvasLayers = (
  sceneId: string | null,
  layers: Layer[],
  updateScene: (updater: any) => void,
  saveScene: () => Promise<void>
): void => {
  // Create map of layer updates
  const layerUpdates = new Map<string, Partial<Layer>>();
  layers.forEach(layer => {
    layerUpdates.set(layer.id, {
      position: layer.position,
      scale: layer.scale,
      depth: layer.depth
    });
  });

  // Update scene package using service
  updateScene((pkg: any) =>
    ScenePackageService.updateLayerProperties(pkg, sceneId, layerUpdates)
  );

  // Save to disk
  saveScene();
};

/**
 * Bring selected layers to front
 */
export const bringLayersToFront = (
  sceneId: string,
  layerIds: string[],
  updateScene: (updater: any) => void,
  saveScene: () => Promise<void>
): void => {
  updateScene((pkg: any) =>
    ScenePackageService.bringLayersToFront(pkg, sceneId, layerIds)
  );
  saveScene();
};

/**
 * Send selected layers to back
 */
export const sendLayersToBack = (
  sceneId: string,
  layerIds: string[],
  updateScene: (updater: any) => void,
  saveScene: () => Promise<void>
): void => {
  updateScene((pkg: any) =>
    ScenePackageService.sendLayersToBack(pkg, sceneId, layerIds)
  );
  saveScene();
};

/**
 * Bring selected layers forward one step
 */
export const bringLayersForward = (
  sceneId: string,
  layerIds: string[],
  updateScene: (updater: any) => void,
  saveScene: () => Promise<void>
): void => {
  updateScene((pkg: any) =>
    ScenePackageService.bringLayersForward(pkg, sceneId, layerIds)
  );
  saveScene();
};

/**
 * Send selected layers backward one step
 */
export const sendLayersBackward = (
  sceneId: string,
  layerIds: string[],
  updateScene: (updater: any) => void,
  saveScene: () => Promise<void>
): void => {
  updateScene((pkg: any) =>
    ScenePackageService.sendLayersBackward(pkg, sceneId, layerIds)
  );
  saveScene();
};

/**
 * Delete selected layers
 */
export const deleteLayers = (
  sceneId: string,
  layerIds: string[],
  updateScene: (updater: any) => void,
  saveScene: () => Promise<void>,
  clearSelection: () => void
): void => {
  updateScene((pkg: any) =>
    ScenePackageService.deleteLayers(pkg, sceneId, layerIds)
  );
  saveScene();
  clearSelection();
};
