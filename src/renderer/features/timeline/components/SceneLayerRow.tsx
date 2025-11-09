import React from 'react';
import type { TimelineLayer, TimelineScene, TimelineItem } from '../../../types/scenePackage';
import type { ContextMenuState } from '../types';
import { findContextMenuTarget } from '../utils/Timeline.utils';

interface SceneLayerRowProps {
  sceneLayer: TimelineLayer;
  sceneItem: TimelineScene;
  isFirstLayer: boolean;
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
  isFirstLayer,
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
        <span className="track-name scene-layer-name">└─ {sceneLayer.name}</span>
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
        {/* Render scene bounds container with header on first layer only */}
        <div
          className="scene-bounds-container"
          style={{
            position: 'absolute',
            left: `${sceneItem.startTime * pixelsPerMs}px`,
            width: `${sceneItem.duration * pixelsPerMs}px`,
            height: '100%',
            background: 'rgba(14, 99, 156, 0.08)',
            borderLeft: '2px solid rgba(14, 99, 156, 0.3)',
            borderRight: '2px solid rgba(14, 99, 156, 0.3)',
            borderTop: isFirstLayer ? '2px solid rgba(14, 99, 156, 0.5)' : 'none',
            pointerEvents: 'none'
          }}
        >
          {/* Scene header - only on first layer */}
          {isFirstLayer && (
            <div
              style={{
                height: '24px',
                background: 'rgba(14, 99, 156, 0.3)',
                borderBottom: '1px solid rgba(14, 99, 156, 0.4)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#5a9fd4',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
              }}
            >
              {sceneItem.name}
            </div>
          )}
        </div>
        {/* Render scene layer items */}
        <div style={{
          position: 'absolute',
          left: `${sceneItem.startTime * pixelsPerMs}px`,
          width: `${sceneItem.duration * pixelsPerMs}px`,
          height: '100%',
          top: isFirstLayer ? '24px' : '0'
        }}>
          {sceneLayer.items.map((item) => {
            if (isDragging && draggedItemId === item.id && draggedItemSourceLayer === sceneLayer.id && draggedItemTargetLayer !== sceneLayer.id) {
              return null;
            }
            return renderItem(item, sceneLayer.id, sceneItem.startTime);
          })}
        </div>
      </td>
    </tr>
  );
};

export default SceneLayerRow;
