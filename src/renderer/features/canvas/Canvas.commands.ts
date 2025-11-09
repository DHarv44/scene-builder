import type { Command } from '../../services/undoRedoManager';
import type { Layer } from '../../../types/scenePackage';
import * as CanvasActions from './Canvas.actions';

/**
 * Command for updating canvas layer properties
 */
export class UpdateLayersCommand implements Command {
  description: string;
  private sceneId: string | null;
  private oldLayers: Layer[];
  private newLayers: Layer[];
  private updateScene: (updater: any) => void;
  private saveScene: () => Promise<void>;

  constructor(
    sceneId: string | null,
    oldLayers: Layer[],
    newLayers: Layer[],
    updateScene: (updater: any) => void,
    saveScene: () => Promise<void>,
    description: string = 'Update layers'
  ) {
    this.sceneId = sceneId;
    this.oldLayers = JSON.parse(JSON.stringify(oldLayers)); // Deep clone
    this.newLayers = JSON.parse(JSON.stringify(newLayers)); // Deep clone
    this.updateScene = updateScene;
    this.saveScene = saveScene;
    this.description = description;
  }

  execute(): void {
    CanvasActions.updateCanvasLayers(this.sceneId, this.newLayers, this.updateScene, this.saveScene);
  }

  undo(): void {
    CanvasActions.updateCanvasLayers(this.sceneId, this.oldLayers, this.updateScene, this.saveScene);
  }
}

/**
 * Command for deleting layers
 */
export class DeleteLayersCommand implements Command {
  description: string;
  private sceneId: string;
  private layerIds: string[];
  private deletedLayers: Layer[];
  private updateScene: (updater: any) => void;
  private saveScene: () => Promise<void>;
  private clearSelection: () => void;

  constructor(
    sceneId: string,
    layerIds: string[],
    deletedLayers: Layer[], // Layers to restore on undo
    updateScene: (updater: any) => void,
    saveScene: () => Promise<void>,
    clearSelection: () => void
  ) {
    this.sceneId = sceneId;
    this.layerIds = [...layerIds];
    this.deletedLayers = JSON.parse(JSON.stringify(deletedLayers)); // Deep clone
    this.updateScene = updateScene;
    this.saveScene = saveScene;
    this.clearSelection = clearSelection;
    this.description = `Delete ${layerIds.length} layer${layerIds.length > 1 ? 's' : ''}`;
  }

  execute(): void {
    CanvasActions.deleteLayers(this.sceneId, this.layerIds, this.updateScene, this.saveScene, this.clearSelection);
  }

  undo(): void {
    // Restore deleted layers
    CanvasActions.updateCanvasLayers(this.sceneId, this.deletedLayers, this.updateScene, this.saveScene);
  }
}

/**
 * Command for changing layer depth
 */
export class ChangeLayerDepthCommand implements Command {
  description: string;
  private sceneId: string;
  private layerIds: string[];
  private action: 'toFront' | 'forward' | 'backward' | 'toBack';
  private updateScene: (updater: any) => void;
  private saveScene: () => Promise<void>;
  private oldDepths: Map<string, number>;

  constructor(
    sceneId: string,
    layerIds: string[],
    oldDepths: Map<string, number>,
    action: 'toFront' | 'forward' | 'backward' | 'toBack',
    updateScene: (updater: any) => void,
    saveScene: () => Promise<void>
  ) {
    this.sceneId = sceneId;
    this.layerIds = [...layerIds];
    this.oldDepths = new Map(oldDepths);
    this.action = action;
    this.updateScene = updateScene;
    this.saveScene = saveScene;

    const actionNames = {
      toFront: 'Bring to Front',
      forward: 'Bring Forward',
      backward: 'Send Backward',
      toBack: 'Send to Back'
    };
    this.description = actionNames[action];
  }

  execute(): void {
    switch (this.action) {
      case 'toFront':
        CanvasActions.bringLayersToFront(this.sceneId, this.layerIds, this.updateScene, this.saveScene);
        break;
      case 'forward':
        CanvasActions.bringLayersForward(this.sceneId, this.layerIds, this.updateScene, this.saveScene);
        break;
      case 'backward':
        CanvasActions.sendLayersBackward(this.sceneId, this.layerIds, this.updateScene, this.saveScene);
        break;
      case 'toBack':
        CanvasActions.sendLayersToBack(this.sceneId, this.layerIds, this.updateScene, this.saveScene);
        break;
    }
  }

  undo(): void {
    // Restore old depths by creating layer updates
    const layerUpdates: Layer[] = [];
    this.oldDepths.forEach((depth, layerId) => {
      layerUpdates.push({ id: layerId, depth } as Layer);
    });
    CanvasActions.updateCanvasLayers(this.sceneId, layerUpdates, this.updateScene, this.saveScene);
  }
}
