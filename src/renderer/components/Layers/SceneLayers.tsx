import React, { useState } from 'react';
import type { ScenePackage, Layer } from '../../../types/scenePackage';
import './SceneLayers.css';

interface SceneLayersProps {
  scenePackage: ScenePackage | null;
  scenePath: string | null;
  selectedSceneId: string | null;
  selectedLayerIds: string[];
  onUpdate: (scenePackage: ScenePackage) => void;
  onSelectLayers: (layerIds: string[]) => void;
}

const SceneLayers: React.FC<SceneLayersProps> = ({
  scenePackage,
  scenePath,
  selectedSceneId,
  selectedLayerIds,
  onUpdate,
  onSelectLayers
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  // Find the scene item in timeline scenes
  const findSceneItem = (scenes: any[], sceneId: string): any | null => {
    for (const scene of scenes) {
      if (scene.id === sceneId) {
        return scene;
      }
    }
    return null;
  };

  const currentScene = selectedSceneId ? findSceneItem(scenePackage?.timeline.scenes || [], selectedSceneId) : null;

  // Flatten scene's internal timeline layers into Layer[] for canvas editing
  const layers: Layer[] = React.useMemo(() => {
    if (!currentScene || !currentScene.layers) return [];

    const result: Layer[] = [];
    currentScene.layers.forEach((timelineLayer: any) => {
      timelineLayer.items.forEach((item: any) => {
        if (item.type === 'image') {
          result.push({
            id: item.id,
            asset: item.asset,
            depth: item.depth ?? 0, // Read depth from stored data
            position: { x: item.x || '50%', y: item.y || '50%' },
            anchor: 'center'
          });
        }
      });
    });
    return result;
  }, [currentScene]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!scenePackage || !scenePath || !currentScene) return;

    // Check for asset key from resource tree
    const assetKey = e.dataTransfer.getData('assetKey');
    const assetType = e.dataTransfer.getData('assetType');

    if (assetKey && assetType === 'images') {
      // Dropped from resource tree
      addLayer(assetKey);
      return;
    }

    // Check for files from filesystem
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Import and add as layers
      const imagePaths = files
        .filter(f => f.type.startsWith('image/'))
        .map(f => f.path);

      if (imagePaths.length > 0) {
        const result = await window.electronAPI.importFiles(scenePath, 'images', imagePaths);

        if (result.success && result.assets) {
          // Update scene package with new assets
          const updated = JSON.parse(JSON.stringify(scenePackage));
          updated.assets.images = { ...updated.assets.images, ...result.assets };

          // Find the scene in timeline and add images
          for (const scene of updated.timeline.scenes || []) {
            if (scene.id === currentScene.id) {
              // Ensure scene has at least one internal layer
              if (!scene.layers || scene.layers.length === 0) {
                scene.layers = [{
                  id: `${scene.id}-default-layer`,
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
              Object.keys(result.assets).forEach((assetKey, index) => {
                scene.layers[0].items.push({
                  id: `${assetKey}-${Date.now()}-${index}`,
                  type: 'image',
                  name: assetKey,
                  asset: assetKey,
                  x: '50%',
                  y: '50%',
                  scale: 1,
                  depth: maxDepth + index + 1,
                  startTime: 0,
                  duration: 1000
                });
              });

              onUpdate(updated);
              await window.electronAPI.saveScene(scenePath, updated);
              return;
            }
          }
        }
      }
    }
  };

  const addLayer = async (assetKey: string) => {
    if (!scenePackage || !scenePath || !currentScene) return;

    const updated = JSON.parse(JSON.stringify(scenePackage));

    // Find the scene in timeline and add image item to its first internal layer
    for (const scene of updated.timeline.scenes || []) {
      if (scene.id === currentScene.id) {
        // Ensure scene has at least one internal layer
        if (!scene.layers || scene.layers.length === 0) {
          scene.layers = [{
            id: `${scene.id}-default-layer`,
            name: 'Default Layer',
            depth: 0,
            items: [],
            collapsed: false
          }];
        }

        // Calculate max depth for new item
        let maxDepth = -1;
        scene.layers.forEach((tLayer: any) => {
          tLayer.items.forEach((img: any) => {
            if (img.type === 'image' && img.depth !== undefined) {
              maxDepth = Math.max(maxDepth, img.depth);
            }
          });
        });

        // Add image to the first internal layer
        scene.layers[0].items.push({
          id: `${assetKey}-${Date.now()}`,
          type: 'image',
          name: assetKey,
          asset: assetKey,
          x: '50%',
          y: '50%',
          scale: 1,
          depth: maxDepth + 1,
          startTime: 0,
          duration: 1000
        });

        onUpdate(updated);
        await window.electronAPI.saveScene(scenePath, updated);
        return;
      }
    }
  };

  const deleteLayer = async (layerId: string) => {
    if (!scenePackage || !scenePath || !currentScene) return;

    const updated = JSON.parse(JSON.stringify(scenePackage));

    // Find scene in timeline and remove the item from its internal layers
    for (const scene of updated.timeline.scenes || []) {
      if (scene.id === currentScene.id) {
        // Remove item from all internal layers
        if (scene.layers) {
          scene.layers.forEach((tLayer: any) => {
            tLayer.items = tLayer.items.filter((i: any) => i.id !== layerId);
          });
        }
        onUpdate(updated);
        await window.electronAPI.saveScene(scenePath, updated);
        return;
      }
    }
  };

  const handleLayerDragStart = (e: React.DragEvent, layerId: string) => {
    e.stopPropagation();
    setDraggedLayerId(layerId);
    e.dataTransfer.effectAllowed = 'copy'; // Changed to copy since we want to add to timeline
    e.dataTransfer.setData('stagingLayerId', layerId); // Mark as staging layer for timeline
    e.dataTransfer.setData('sceneId', selectedSceneId || ''); // Include scene context
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

    if (!scenePackage || !scenePath || !currentScene || !draggedLayerId) return;

    const draggedLayer = layers.find(l => l.id === draggedLayerId);
    const targetLayer = layers.find(l => l.id === targetLayerId);

    if (!draggedLayer || !targetLayer || draggedLayerId === targetLayerId) {
      setDraggedLayerId(null);
      setDragOverLayerId(null);
      return;
    }

    const draggedDepth = draggedLayer.depth;
    const targetDepth = targetLayer.depth;

    const updated = JSON.parse(JSON.stringify(scenePackage));

    // Find and update depth values by reordering
    for (const scene of updated.timeline.scenes || []) {
      if (scene.id === currentScene.id) {
        if (scene.layers) {
          // Collect all image items with their current depths
          const allImageItems: any[] = [];
          scene.layers.forEach((tLayer: any) => {
            tLayer.items.forEach((img: any) => {
              if (img.type === 'image') {
                allImageItems.push(img);
              }
            });
          });

          // Sort by current depth to get the current ordering
          allImageItems.sort((a, b) => a.depth - b.depth);

          // Find indices in the sorted array
          const draggedIndex = allImageItems.findIndex(img => img.id === draggedLayerId);
          const targetIndex = allImageItems.findIndex(img => img.id === targetLayerId);

          if (draggedIndex === -1 || targetIndex === -1) return;

          // Reorder: remove dragged item and insert at target position
          const [draggedItem] = allImageItems.splice(draggedIndex, 1);
          allImageItems.splice(targetIndex, 0, draggedItem);

          // Reassign depths based on new order (0, 1, 2, 3...)
          allImageItems.forEach((img, index) => {
            img.depth = index;
          });
        }

        onUpdate(updated);
        await window.electronAPI.saveScene(scenePath, updated);
        setDraggedLayerId(null);
        setDragOverLayerId(null);
        return;
      }
    }

    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  const handleLayerDragEnd = () => {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  const handleLayerClick = (layerId: string, e: React.MouseEvent) => {
    const ctrlKey = e.ctrlKey || e.metaKey;

    if (ctrlKey) {
      // Ctrl+click: Toggle layer in selection
      if (selectedLayerIds.includes(layerId)) {
        onSelectLayers(selectedLayerIds.filter(id => id !== layerId));
      } else {
        onSelectLayers([...selectedLayerIds, layerId]);
      }
    } else {
      // Regular click: Select only this layer
      onSelectLayers([layerId]);
    }
  };

  return (
    <div className="scene-layers">
      <div className="scene-layers-header">
        <h3>Scene Layers</h3>
        {currentScene && <span className="scene-name">{currentScene.id}</span>}
      </div>

      <div
        className={`scene-layers-content ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="drop-overlay">
            <p>Drop image to add layer</p>
          </div>
        )}

        {!scenePackage ? (
          <div className="empty-state">
            <p>No scene loaded</p>
          </div>
        ) : !currentScene ? (
          <div className="empty-state">
            <p>No scene selected</p>
            <p className="hint">Select a scene from timeline</p>
          </div>
        ) : layers.length === 0 ? (
          <div className="empty-state">
            <p>No layers in scene</p>
            <p className="hint">Drag images here to add</p>
          </div>
        ) : (
          <div className="layer-list">
            {[...layers].sort((a, b) => b.depth - a.depth).map((layer, sortedIndex) => {
              const assetPath = scenePackage.assets.images[layer.asset];
              const thumbnailSrc = assetPath ? `scene://${assetPath.replace(/^\.\//, '')}` : '';
              const actualIndex = layers.findIndex(l => l.id === layer.id);

              return (
                <div
                  key={layer.id}
                  className={`layer-item ${selectedLayerIds.includes(layer.id) ? 'selected' : ''} ${dragOverLayerId === layer.id ? 'drag-over' : ''} ${draggedLayerId === layer.id ? 'dragging' : ''}`}
                  onClick={(e) => handleLayerClick(layer.id, e)}
                  draggable
                  onDragStart={(e) => handleLayerDragStart(e, layer.id)}
                  onDragOver={(e) => handleLayerDragOver(e, layer.id)}
                  onDragLeave={handleLayerDragLeave}
                  onDrop={(e) => handleLayerDrop(e, layer.id)}
                  onDragEnd={handleLayerDragEnd}
                >
                  <div className="layer-depth">{layer.depth}</div>

                  {thumbnailSrc && (
                    <div className="layer-thumbnail">
                      <img src={thumbnailSrc} alt={layer.asset} />
                    </div>
                  )}

                  <div className="layer-info">
                    <div className="layer-name" title={layer.asset}>{layer.asset}</div>
                  </div>

                  <div className="layer-actions">
                    <button
                      className="icon-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayer(layer.id);
                      }}
                      title="Delete layer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SceneLayers;
