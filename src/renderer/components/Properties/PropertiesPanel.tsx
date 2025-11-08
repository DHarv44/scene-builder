import React from 'react';
import type { ScenePackage, TimelineItem, TimelineLayer, TimelineAudio, TimelineScene } from '../../../types/scenePackage';
import './PropertiesPanel.css';

interface PropertiesPanelProps {
  scenePackage: ScenePackage | null;
  selectedSceneId: string | null;
  selectedLayerIds: string[];
  selectedItemId: string | null;
  selectedLayerId?: string | null;
  onUpdate: (scenePackage: ScenePackage) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  scenePackage,
  selectedSceneId,
  selectedLayerIds,
  selectedItemId,
  selectedLayerId,
  onUpdate
}) => {
  // Helper to find a timeline layer by ID
  const findTimelineLayer = (layers: TimelineLayer[], layerId: string): TimelineLayer | null => {
    for (const layer of layers) {
      if (layer.id === layerId) return layer;

      // Check scene internal layers
      for (const item of layer.items) {
        if (item.type === 'scene' && item.layers) {
          const found = findTimelineLayer(item.layers, layerId);
          if (found) return found;
        }
      }
    }
    return null;
  };

  const selectedLayer = selectedLayerId && scenePackage?.timeline.layers
    ? findTimelineLayer(scenePackage.timeline.layers, selectedLayerId)
    : null;

  // Helper to find a timeline item by ID
  const findTimelineItem = (layers: TimelineLayer[], itemId: string): { item: TimelineItem; layerId: string } | null => {
    for (const layer of layers) {
      const item = layer.items.find((i: TimelineItem) => i.id === itemId);
      if (item) return { item, layerId: layer.id };

      // Check scene internal layers
      for (const layerItem of layer.items) {
        if (layerItem.type === 'scene' && layerItem.layers) {
          const found = findTimelineItem(layerItem.layers, itemId);
          if (found) return found;
        }
      }
    }
    return null;
  };

  const selectedItemData = selectedItemId && scenePackage?.timeline.layers
    ? findTimelineItem(scenePackage.timeline.layers, selectedItemId)
    : null;

  const selectedItem = selectedItemData?.item || null;


  // Update timeline item property
  const updateTimelineItem = (itemId: string, updates: Partial<TimelineItem>) => {
    if (!scenePackage) return;

    const updated = JSON.parse(JSON.stringify(scenePackage));
    const layers = updated.timeline.layers || [];

    const updateInLayers = (layers: TimelineLayer[]): boolean => {
      for (const layer of layers) {
        const item = layer.items.find((i: TimelineItem) => i.id === itemId);
        if (item) {
          Object.assign(item, updates);
          return true;
        }
        // Check scene internal layers
        for (const layerItem of layer.items) {
          if (layerItem.type === 'scene' && layerItem.layers) {
            if (updateInLayers(layerItem.layers)) return true;
          }
        }
      }
      return false;
    };

    if (updateInLayers(layers)) {
      updated.timeline.layers = layers;
      onUpdate(updated);
    }
  };


  if (!scenePackage) {
    return (
      <div className="properties-panel">
        <div className="properties-header"></div>
        <div className="properties-empty">
          No scene loaded
        </div>
      </div>
    );
  }

  // Show layer properties if a layer is selected
  if (selectedLayer) {
    // Check if this is a default layer (ends with -default-layer)
    const isDefaultLayer = selectedLayer.id.endsWith('-default-layer');

    // If it's a default layer, find the parent scene
    let parentScene: TimelineScene | null = null;
    if (isDefaultLayer) {
      const match = selectedLayer.id.match(/^(scene-\d+)-default-layer$/);
      if (match) {
        const sceneId = match[1];
        const sceneData = findTimelineItem(scenePackage?.timeline.layers || [], sceneId);
        if (sceneData?.item && sceneData.item.type === 'scene') {
          parentScene = sceneData.item as TimelineScene;
        }
      }
    }

    return (
      <div className="properties-panel">
        <div className="properties-header"></div>
        <div className="properties-content">
          {/* Show Scene Properties if this is a default layer */}
          {isDefaultLayer && parentScene && (
            <div className="properties-section">
              <div className="section-title">SCENE: {parentScene.name}</div>

              <div className="property-group">
                <label>Scene Name</label>
                <input
                  type="text"
                  value={parentScene.name}
                  onChange={(e) => updateTimelineItem(parentScene.id, { name: e.target.value })}
                />
              </div>

              <div className="property-group">
                <label>Start Time (ms)</label>
                <input
                  type="number"
                  value={parentScene.startTime}
                  onChange={(e) => updateTimelineItem(parentScene.id, { startTime: parseInt(e.target.value) || 0 })}
                  step="100"
                />
              </div>

              <div className="property-group">
                <label>Duration (ms)</label>
                <input
                  type="number"
                  value={parentScene.duration}
                  onChange={(e) => updateTimelineItem(parentScene.id, { duration: parseInt(e.target.value) || 100 })}
                  step="100"
                  min="100"
                />
              </div>

              <div className="property-group">
                <label>Layers</label>
                <input
                  type="text"
                  value={`${parentScene.layers?.length || 0} layers`}
                  readOnly
                  style={{ backgroundColor: '#1a1a1a', color: '#666' }}
                />
              </div>
            </div>
          )}

          {/* Layer Properties */}
          <div className="properties-section">
            <div className="section-title">LAYER: {selectedLayer.name}</div>

            <div className="property-group">
              <label>Layer ID</label>
              <input
                type="text"
                value={selectedLayer.id}
                readOnly
                style={{ backgroundColor: '#1a1a1a', color: '#666' }}
              />
            </div>

            <div className="property-group">
              <label>Layer Name</label>
              <input
                type="text"
                value={selectedLayer.name}
                onChange={(e) => {
                  const updated = JSON.parse(JSON.stringify(scenePackage));
                  const updateInLayers = (layers: TimelineLayer[]): boolean => {
                    for (const layer of layers) {
                      if (layer.id === selectedLayer.id) {
                        layer.name = e.target.value;
                        return true;
                      }
                      for (const item of layer.items) {
                        if (item.type === 'scene' && item.layers) {
                          if (updateInLayers(item.layers)) return true;
                        }
                      }
                    }
                    return false;
                  };

                  if (updateInLayers(updated.timeline.layers)) {
                    onUpdate(updated);
                  }
                }}
              />
            </div>

            <div className="property-group">
              <label>Items in Layer</label>
              <input
                type="text"
                value={`${selectedLayer.items.length} items`}
                readOnly
                style={{ backgroundColor: '#1a1a1a', color: '#666' }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show timeline item properties if an item is selected
  if (selectedItem) {
    const endTime = selectedItem.startTime + selectedItem.duration;

    return (
      <div className="properties-panel">
        <div className="properties-header"></div>
        <div className="properties-content">
          <div className="properties-section">
            <div className="section-title">{selectedItem.type.toUpperCase()}: {selectedItem.name}</div>

            {/* Timeline Properties */}
            <div className="property-group">
              <label>Name</label>
              <input
                type="text"
                value={selectedItem.name}
                onChange={(e) => updateTimelineItem(selectedItem.id, { name: e.target.value })}
              />
            </div>

            <div className="property-group">
              <label>Start Time (ms)</label>
              <input
                type="number"
                value={selectedItem.startTime}
                onChange={(e) => updateTimelineItem(selectedItem.id, { startTime: parseInt(e.target.value) || 0 })}
                step="100"
              />
            </div>

            <div className="property-group">
              <label>Duration (ms)</label>
              <input
                type="number"
                value={selectedItem.duration}
                onChange={(e) => updateTimelineItem(selectedItem.id, { duration: parseInt(e.target.value) || 100 })}
                step="100"
                min="100"
              />
            </div>

            <div className="property-group">
              <label>End Time (ms)</label>
              <input
                type="number"
                value={endTime}
                readOnly
                style={{ backgroundColor: '#1a1a1a', color: '#666' }}
              />
            </div>

            {/* Image-specific properties */}
            {selectedItem.type === 'image' && (
              <>
                <div className="section-title" style={{ marginTop: '20px' }}>Image Properties</div>
                <div className="property-group">
                  <label>Asset</label>
                  <input type="text" value={selectedItem.asset} readOnly />
                </div>
                <div className="property-group">
                  <label>Position X</label>
                  <input
                    type="number"
                    value={(selectedItem as any).x || 0}
                    onChange={(e) => updateTimelineItem(selectedItem.id, { x: parseInt(e.target.value) || 0 } as any)}
                  />
                </div>
                <div className="property-group">
                  <label>Position Y</label>
                  <input
                    type="number"
                    value={(selectedItem as any).y || 0}
                    onChange={(e) => updateTimelineItem(selectedItem.id, { y: parseInt(e.target.value) || 0 } as any)}
                  />
                </div>
              </>
            )}

            {/* Audio-specific properties */}
            {selectedItem.type === 'audio' && (
              <>
                <div className="section-title" style={{ marginTop: '20px' }}>Audio Properties</div>
                <div className="property-group">
                  <label>Asset</label>
                  <input type="text" value={selectedItem.asset} readOnly />
                </div>
                <div className="property-group">
                  <label>Volume</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="range"
                      value={(selectedItem as TimelineAudio).volume}
                      onChange={(e) => updateTimelineItem(selectedItem.id, { volume: parseFloat(e.target.value) } as any)}
                      step="0.01"
                      min="0"
                      max="1"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      value={(selectedItem as TimelineAudio).volume?.toFixed(2) || '1.00'}
                      onChange={(e) => updateTimelineItem(selectedItem.id, { volume: Math.max(0, Math.min(1, parseFloat(e.target.value) || 1)) } as any)}
                      step="0.1"
                      min="0"
                      max="1"
                      style={{ width: '60px' }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Scene-specific properties */}
            {selectedItem.type === 'scene' && (
              <>
                <div className="section-title" style={{ marginTop: '20px' }}>Scene Properties</div>
                <div className="property-group">
                  <label>Layers</label>
                  <input
                    type="text"
                    value={`${(selectedItem as TimelineScene).layers?.length || 0} layers`}
                    readOnly
                    style={{ backgroundColor: '#1a1a1a', color: '#666' }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show layer/image properties if layers are selected in SceneLayers
  if (selectedLayerIds && selectedLayerIds.length > 0 && selectedSceneId) {
    // Find the scene
    const scene = findTimelineItem(scenePackage?.timeline.layers || [], selectedSceneId)?.item;
    if (!scene || scene.type !== 'scene') {
      return <div className="properties-panel"><div className="properties-content">Scene not found</div></div>;
    }

    // Find the selected layer items in the scene's internal layers
    const selectedLayerItems: any[] = [];
    for (const timelineLayer of scene.layers || []) {
      for (const item of timelineLayer.items) {
        if (selectedLayerIds.includes(item.id) && item.type === 'image') {
          selectedLayerItems.push(item);
        }
      }
    }

    if (selectedLayerItems.length === 0) {
      return <div className="properties-panel"><div className="properties-content">No image selected</div></div>;
    }

    const layer = selectedLayerItems[0]; // Show properties of first selected layer

    // Update layer property in scene
    const updateLayerProp = async (layerId: string, updates: any) => {
      if (!scenePackage) return;

      const updated = JSON.parse(JSON.stringify(scenePackage));

      // Find scene and update the layer item
      for (const tlLayer of updated.timeline.layers || []) {
        for (const tlItem of tlLayer.items) {
          if (tlItem.type === 'scene' && tlItem.id === selectedSceneId) {
            for (const sceneLayer of tlItem.layers || []) {
              for (const item of sceneLayer.items) {
                if (item.id === layerId && item.type === 'image') {
                  Object.assign(item, updates);
                  onUpdate(updated);
                  if (window.electronAPI?.saveScene) {
                    await window.electronAPI.saveScene(scenePackage.metadata.id, updated);
                  }
                  return;
                }
              }
            }
          }
        }
      }
    };

    // Parse position values
    const scale = layer.scale || 1;
    const anchor = layer.anchor || 'center';

    return (
      <div className="properties-panel">
        <div className="properties-header">Image Properties</div>
        <div className="properties-content">
          {selectedLayerItems.length > 1 && (
            <div className="multi-select-notice">
              {selectedLayerItems.length} images selected (editing first)
            </div>
          )}

          <div className="properties-section">
            <div className="section-title">{layer.name}</div>

            <div className="property-group">
              <label>Asset</label>
              <input type="text" value={layer.asset} readOnly style={{ backgroundColor: '#1a1a1a', color: '#666' }} />
            </div>

            <div className="property-group">
              <label>Position X</label>
              <input
                type="text"
                value={layer.x || '50%'}
                onChange={(e) => updateLayerProp(layer.id, { x: e.target.value })}
              />
            </div>

            <div className="property-group">
              <label>Position Y</label>
              <input
                type="text"
                value={layer.y || '50%'}
                onChange={(e) => updateLayerProp(layer.id, { y: e.target.value })}
              />
            </div>

            <div className="property-group">
              <label>Scale</label>
              <input
                type="number"
                value={scale}
                onChange={(e) => updateLayerProp(layer.id, { scale: parseFloat(e.target.value) || 1 })}
                step="0.1"
                min="0.1"
              />
            </div>

            <div className="property-group">
              <label>Anchor</label>
              <select
                value={anchor}
                onChange={(e) => updateLayerProp(layer.id, { anchor: e.target.value })}
              >
                <option value="center">Center</option>
                <option value="top-left">Top Left</option>
                <option value="top-center">Top Center</option>
                <option value="top-right">Top Right</option>
                <option value="center-left">Center Left</option>
                <option value="center-right">Center Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>

            <div className="property-group">
              <label>Start Time (ms)</label>
              <input
                type="number"
                value={layer.startTime || 0}
                onChange={(e) => updateLayerProp(layer.id, { startTime: parseInt(e.target.value) || 0 })}
                step="100"
              />
            </div>

            <div className="property-group">
              <label>Duration (ms)</label>
              <input
                type="number"
                value={layer.duration || 1000}
                onChange={(e) => updateLayerProp(layer.id, { duration: parseInt(e.target.value) || 1000 })}
                step="100"
                min="100"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }


  // Fallback to scene settings if no layers selected
  if (!selectedItemId) {
    return (
      <div className="properties-panel">
        <div className="properties-header"></div>
        <div className="properties-empty">
          No layer selected
        </div>
        <div className="properties-section">
          <div className="section-title">Scene Settings</div>
          <div className="property-group">
            <label>Scene ID</label>
            <input type="text" value={scenePackage.metadata.id} readOnly />
          </div>
          <div className="property-group">
            <label>Scene Name</label>
            <input type="text" value={scenePackage.metadata.name} readOnly />
          </div>
          <div className="property-group">
            <label>Layers</label>
            <input
              type="number"
              value={scenePackage.timeline.layers?.length || 0}
              readOnly
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="properties-panel">
      <div className="properties-header"></div>
      <div className="properties-content">
        <div className="properties-section">
          <div className="section-title">Selected: {selectedItemId}</div>
          <div className="property-group">
            <label>ID</label>
            <input type="text" value={selectedItemId} readOnly />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
