import React from 'react';
import type { TimelineLayer, TimelineItem } from '../../../types/scenePackage';
import type { ContextMenuState } from '../types';
import { findContextMenuTarget } from '../utils/Timeline.utils';

interface LayerRowProps {
  layer: TimelineLayer;
  duration: number;
  pixelsPerMs: number;
  isDragging: boolean;
  draggedItemId: string | null;
  draggedItemSourceLayer: string | null;
  draggedItemTargetLayer: string | null;
  dragOverLayerId: string | null;
  scenePackage: any;
  scenePath: string | null;
  onSelectLayer?: (layerId: string | null) => void;
  onSelectItem?: (itemId: string | null) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  onUpdate?: (scenePackage: any) => void;
  renderItem: (item: TimelineItem, layerId: string, parentSceneStartTime?: number) => JSX.Element | null;
  handleLayerDragStart: (e: React.DragEvent, layerId: string) => void;
  handleLayerDragOver: (e: React.DragEvent, layerId: string) => void;
  handleLayerDragLeave: (e: React.DragEvent) => void;
  handleLayerDrop: (e: React.DragEvent, layerId: string) => void;
  handleLayerDragEnd: () => void;
  handleItemDrop: (e: React.DragEvent, layerId?: string) => void;
  handleTrackMouseEnter: (layerId: string) => void;
  renderGhostItem: () => JSX.Element | null;
}

const LayerRow: React.FC<LayerRowProps> = ({
  layer,
  duration,
  pixelsPerMs,
  isDragging,
  draggedItemId,
  draggedItemSourceLayer,
  draggedItemTargetLayer,
  dragOverLayerId,
  onSelectLayer,
  onSelectItem,
  setContextMenu,
  handleLayerDragStart,
  handleLayerDragOver,
  handleLayerDragLeave,
  handleLayerDrop,
  handleLayerDragEnd,
  handleItemDrop,
  handleTrackMouseEnter,
  renderItem,
  renderGhostItem
}) => {
  return (
    <tr className="timeline-track">
      <th
        className={`track-header ${dragOverLayerId === layer.id ? 'drag-over' : ''}`}
        draggable
        onDragStart={(e) => handleLayerDragStart(e, layer.id)}
        onDragOver={(e) => handleLayerDragOver(e, layer.id)}
        onDragLeave={handleLayerDragLeave}
        onDrop={(e) => handleLayerDrop(e, layer.id)}
        onDragEnd={handleLayerDragEnd}
        onClick={() => {
          onSelectLayer?.(layer.id);
          onSelectItem?.(null);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({ type: 'layer-header', targetId: layer.id, x: e.clientX, y: e.clientY });
        }}
      >
        <span className="track-name">{layer.name}</span>
      </th>
      <td
        className="track-content"
        data-context-type="timeline-layer"
        data-context-id={layer.id}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const target = findContextMenuTarget(e);
          if (target) {
            const menuType = target.type === 'timeline-layer' ? 'layer' :
                            target.type === 'scene-layer' ? 'layer' :
                            target.type as 'scene' | 'item';
            setContextMenu({ type: menuType, targetId: target.id, x: e.clientX, y: e.clientY });
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleItemDrop(e, layer.id)}
        onMouseEnter={() => handleTrackMouseEnter(layer.id)}
        style={{ minWidth: `${duration * pixelsPerMs}px` }}
      >
        {/* Render ALL items on this layer (including scene clips) */}
        {layer.items.map(item => {
          // Hide item if it's being dragged to a DIFFERENT layer
          if (isDragging && draggedItemId === item.id && draggedItemSourceLayer === layer.id && draggedItemTargetLayer !== layer.id) {
            return null;
          }
          return renderItem(item, layer.id);
        })}

        {/* Render ghost item if this is the target layer during drag */}
        {renderGhostItem()}
      </td>
    </tr>
  );
};

export default LayerRow;
