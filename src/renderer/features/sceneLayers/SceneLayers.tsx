import React, { useState, useMemo } from 'react';
import type { Layer } from '../../../types/scenePackage';
import { ScenePackageService } from '../../services/scenePackageService';
import { useScenePackage } from '../../context/SceneContext';
import { useSelection } from '../../context/SelectionContext';
import * as SceneLayersActions from './SceneLayers.actions';
import './SceneLayers.css';

const SceneLayers: React.FC = () => {
  const { scenePackage, scenePath, updateScene, saveScene } = useScenePackage();
  const { selectedSceneId, selectedLayerIds, selectLayers, selectScene } = useSelection();

  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  // Get all scenes from timeline
  const availableScenes = useMemo(() => {
    if (!scenePackage) return [];
    const scenes: Array<{ id: string; name: string }> = [];

    scenePackage.timeline.layers.forEach((layer: any) => {
      layer.items.forEach((item: any) => {
        if (item.type === 'scene') {
          scenes.push({
            id: item.id,
            name: item.name || item.id
          });
        }
      });
    });

    return scenes;
  }, [scenePackage]);

  // Get current scene
  const currentScene = useMemo(() => {
    if (!scenePackage || !selectedSceneId) return null;
    return ScenePackageService.findSceneById(scenePackage, selectedSceneId);
  }, [scenePackage, selectedSceneId]);

  // Flatten scene's internal timeline layers into Layer[] for canvas editing
  const layers: Layer[] = useMemo(() => {
    if (!currentScene || !currentScene.layers) return [];

    const result: Layer[] = [];
    currentScene.layers.forEach((timelineLayer: any) => {
      timelineLayer.items.forEach((item: any) => {
        if (item.type === 'image') {
          result.push({
            id: item.id,
            asset: item.asset,
            depth: item.depth ?? 0,
            position: { x: item.x || '50%', y: item.y || '50%' },
            anchor: 'center'
          });
        }
      });
    });
    return result;
  }, [currentScene]);

  const handleImportImages = async () => {
    if (!scenePackage || !scenePath || !selectedSceneId) return;
    await SceneLayersActions.importAssets(selectedSceneId, scenePath, updateScene, saveScene);
  };

  const handleLayerClick = (layerId: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Add to selection
      if (selectedLayerIds.includes(layerId)) {
        selectLayers(selectedLayerIds.filter(id => id !== layerId));
      } else {
        selectLayers([...selectedLayerIds, layerId]);
      }
    } else {
      // Replace selection
      selectLayers([layerId]);
    }
  };

  const handleLayerDragStart = (e: React.DragEvent, layerId: string) => {
    e.stopPropagation();
    setDraggedLayerId(layerId);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('stagingLayerId', layerId);
    e.dataTransfer.setData('sceneId', selectedSceneId || '');
  };

  const handleLayerDragOver = (e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverLayerId(layerId);
  };

  const handleLayerDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverLayerId(null);
  };

  const handleLayerDrop = async (e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!scenePackage || !scenePath || !selectedSceneId || !draggedLayerId) return;

    const draggedLayer = layers.find(l => l.id === draggedLayerId);
    const targetLayer = layers.find(l => l.id === targetLayerId);

    if (!draggedLayer || !targetLayer || draggedLayerId === targetLayerId) {
      setDraggedLayerId(null);
      setDragOverLayerId(null);
      return;
    }

    await SceneLayersActions.reorderLayers(
      selectedSceneId,
      draggedLayerId,
      targetLayerId,
      updateScene,
      saveScene
    );

    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  const handleLayerDragEnd = () => {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  const handleDeleteLayer = async (layerId: string) => {
    if (!scenePackage || !scenePath || !selectedSceneId) return;

    await SceneLayersActions.deleteLayer(
      selectedSceneId,
      layerId,
      updateScene,
      saveScene
    );

    // Remove from selection if was selected
    if (selectedLayerIds.includes(layerId)) {
      selectLayers(selectedLayerIds.filter(id => id !== layerId));
    }
  };

  const handleSceneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sceneId = e.target.value;
    if (sceneId) {
      selectScene(sceneId);
    }
  };

  if (!scenePackage) {
    return (
      <div className="scene-layers">
        <div className="scene-layers-header">
          <h3>Scene Layers</h3>
        </div>
        <div className="scene-layers-empty">
          <p>No scene package loaded</p>
        </div>
      </div>
    );
  }

  // Sort layers by depth (highest = front = top of list)
  const sortedLayers = [...layers].sort((a, b) => b.depth - a.depth);

  return (
    <div className="scene-layers">
      <div className="scene-layers-header">
        <h3>Scene Layers</h3>
        <button onClick={handleImportImages} className="import-button" title="Import Images" disabled={!selectedSceneId}>
          + Import
        </button>
      </div>

      {/* Scene Selector Dropdown */}
      <div className="scene-selector">
        <label htmlFor="scene-select">Scene:</label>
        <select
          id="scene-select"
          value={selectedSceneId || ''}
          onChange={handleSceneChange}
          className="scene-select-dropdown"
        >
          <option value="">Select a scene...</option>
          {availableScenes.map(scene => (
            <option key={scene.id} value={scene.id}>
              {scene.name}
            </option>
          ))}
        </select>
      </div>

      <div className="scene-layers-list">
        {sortedLayers.length === 0 ? (
          <div className="scene-layers-empty">
            <p>No layers in this scene</p>
            <button onClick={handleImportImages} className="import-button-large">
              Import Images
            </button>
          </div>
        ) : (
          sortedLayers.map(layer => (
            <div
              key={layer.id}
              className={`scene-layer-item ${
                selectedLayerIds.includes(layer.id) ? 'selected' : ''
              } ${dragOverLayerId === layer.id ? 'drag-over' : ''}`}
              onClick={(e) => handleLayerClick(layer.id, e)}
              draggable
              onDragStart={(e) => handleLayerDragStart(e, layer.id)}
              onDragOver={(e) => handleLayerDragOver(e, layer.id)}
              onDragLeave={handleLayerDragLeave}
              onDrop={(e) => handleLayerDrop(e, layer.id)}
              onDragEnd={handleLayerDragEnd}
            >
              <div className="layer-icon">🖼️</div>
              <div className="layer-info">
                <div className="layer-name">{layer.asset}</div>
                <div className="layer-details">Depth: {layer.depth}</div>
              </div>
              <button
                className="layer-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteLayer(layer.id);
                }}
                title="Delete Layer"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SceneLayers;
