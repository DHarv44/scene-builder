import React from 'react';
import type { TimelineLayer, TimelineScene, TimelineItem } from '../../../types/scenePackage';
import type { ContextMenuState } from '../types';
import { findContextMenuTarget } from '../utils/Timeline.utils';

interface SceneLayerRowProps {
  sceneLayer: TimelineLayer;
  sceneItem: TimelineScene;
  duration: number;
  pixelsPerMs: number;
  isDragging: boolean;
  draggedItemId: string | null;
  draggedItemSourceLayer: string | null;
  draggedItemTargetLayer: string | null;
  scenePath: string | null;
  onSelectLayer?: (layerId: string | null) => void;
  onSelectItem?: (itemId: string | null) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  handleItemDrop: (e: React.DragEvent, layerId?: string) => void;
  handleTrackMouseEnter: (layerId: string) => void;
  renderItem: (item: TimelineItem, layerId: string, parentSceneStartTime?: number) => JSX.Element | null;
}

const SceneLayerRow: React.FC<SceneLayerRowProps> = ({
  sceneLayer,
  sceneItem,
  duration,
  pixelsPerMs,
  isDragging,
  draggedItemId,
  draggedItemSourceLayer,
  draggedItemTargetLayer,
  onSelectLayer,
  onSelectItem,
  setContextMenu,
  handleItemDrop,
  handleTrackMouseEnter,
  renderItem
}) => {
  return (
    <tr className="timeline-track scene-layer-row">
      <th
        className="track-header scene-layer-header"
        onClick={() => {
          onSelectLayer?.(sceneLayer.id);
          onSelectItem?.(null);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({ type: 'layer', targetId: sceneLayer.id, x: e.clientX, y: e.clientY });
        }}
      >
        <div className="scene-layer-header-content">
          <span className="scene-layer-tree-line">└─</span>
          <span className="track-name scene-layer-name">{sceneLayer.name}</span>
        </div>
      </th>
      <td
        className="track-content scene-layer-content"
        data-context-type="scene-layer"
        data-context-id={sceneLayer.id}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const target = findContextMenuTarget(e);
          if (target) {
            const menuType = target.type === 'scene-layer' ? 'layer' : target.type as 'scene' | 'item';
            setContextMenu({ type: menuType, targetId: target.id, x: e.clientX, y: e.clientY });
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.stopPropagation();
          handleItemDrop(e, sceneLayer.id);
        }}
        onMouseEnter={() => handleTrackMouseEnter(sceneLayer.id)}
        style={{
          minWidth: `${duration * pixelsPerMs}px`,
          position: 'relative'
        }}
      >
        {/* Render clips positioned by their startTime (relative to scene) */}
        {sceneLayer.items.map((item) => {
          if (isDragging && draggedItemId === item.id && draggedItemSourceLayer === sceneLayer.id && draggedItemTargetLayer !== sceneLayer.id) {
            return null;
          }
          return renderItem(item, sceneLayer.id, sceneItem.startTime);
        })}
      </td>
    </tr>
  );
};

export default SceneLayerRow;
