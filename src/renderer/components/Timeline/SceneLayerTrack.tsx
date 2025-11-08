import React from 'react';
import type { TimelineLayer, TimelineItem, TimelineScene } from '../../../types/scenePackage';
import type { ContextMenuState } from './Timeline.types';
import type { ContextMenuItem } from '../Preview/ContextMenu';
import { handleItemDrop, handleTrackMouseEnter } from './Timeline.handlers';
import ImageClip from './ImageClip';
import AudioClip from './AudioClip';
import EffectClip from './EffectClip';

interface SceneLayerTrackProps {
  layer: TimelineLayer;
  layerIndex: number;
  sceneItem: TimelineScene;
  pixelsPerMs: number;
  isDragging: boolean;
  draggedItemId: string | null;
  draggedItemSourceLayer: string | null;
  draggedItemTargetLayer: string | null;
  isResizing: boolean;
  resizingItemId: string | null;
  setContextMenu: (menu: ContextMenuState | null) => void;
  scenePackage: any;
  scenePath: string | null;
  onUpdate?: (scenePackage: any) => void;
  onSelectItem?: (itemId: string | null) => void;
  onSelectLayer?: (layerId: string | null) => void;
  handleClipMouseDown: (
    e: React.MouseEvent,
    item: TimelineItem,
    handle: 'left' | 'right' | null,
    layerId: string,
    setIsDragging: (value: boolean) => void,
    setDraggedItemId: (value: string | null) => void,
    setDragStartX: (value: number) => void,
    setDragStartTime: (value: number) => void,
    setDraggedItemSourceLayer: (value: string | null) => void,
    setDraggedItemTargetLayer: (value: string | null) => void,
    setIsResizing: (value: boolean) => void,
    setResizingItemId: (value: string | null) => void,
    setResizeHandle: (value: 'left' | 'right' | null) => void,
    setResizeStartX: (value: number) => void,
    setResizeStartTime: (value: number) => void,
    setResizeStartDuration: (value: number) => void
  ) => void;
  setIsDragging: (value: boolean) => void;
  setDraggedItemId: (value: string | null) => void;
  setDragStartX: (value: number) => void;
  setDragStartTime: (value: number) => void;
  setDraggedItemSourceLayer: (value: string | null) => void;
  setDraggedItemTargetLayer: (value: string | null) => void;
  setIsResizing: (value: boolean) => void;
  setResizingItemId: (value: string | null) => void;
  setResizeHandle: (value: 'left' | 'right' | null) => void;
  setResizeStartX: (value: number) => void;
  setResizeStartTime: (value: number) => void;
  setResizeStartDuration: (value: number) => void;
}

const SceneLayerTrack: React.FC<SceneLayerTrackProps> = ({
  layer,
  layerIndex,
  sceneItem,
  pixelsPerMs,
  isDragging,
  draggedItemId,
  draggedItemSourceLayer,
  draggedItemTargetLayer,
  isResizing,
  resizingItemId,
  setContextMenu,
  scenePackage,
  scenePath,
  onUpdate,
  onSelectItem,
  onSelectLayer,
  handleClipMouseDown,
  setIsDragging,
  setDraggedItemId,
  setDragStartX,
  setDragStartTime,
  setDraggedItemSourceLayer,
  setDraggedItemTargetLayer,
  setIsResizing,
  setResizingItemId,
  setResizeHandle,
  setResizeStartX,
  setResizeStartTime,
  setResizeStartDuration
}) => {
  return (
    <div
      className="scene-layer-track"
      style={{
        position: 'relative',
        height: '50px',
        borderTop: layerIndex === 0 ? 'none' : '1px solid rgba(14, 99, 156, 0.6)',
        pointerEvents: 'auto'
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.stopPropagation();
        if (scenePath) handleItemDrop(e, scenePackage, scenePath, pixelsPerMs, layer.id, onUpdate);
      }}
      onMouseEnter={() => {
        handleTrackMouseEnter(layer.id, isDragging, draggedItemId, setDraggedItemTargetLayer);
      }}
    >
      {/* Render items in this layer */}
      <div
        className="scene-layer-track-content"
        data-context-type="scene-layer"
        data-context-id={layer.id}
        style={{ position: 'relative', height: '100%', padding: '10px 0' }}
        onClick={(e) => {
          // Only select layer if clicking empty space (not on items)
          const target = e.target as HTMLElement;
          if (target.classList.contains('scene-layer-track-content')) {
            e.stopPropagation();
            onSelectLayer?.(layer.id);
            onSelectItem?.(null);
          }
        }}
      >
        {layer.items.map((childItem: TimelineItem) => {
          if (isDragging && draggedItemId === childItem.id && draggedItemSourceLayer === layer.id && draggedItemTargetLayer !== layer.id) {
            return null;
          }

          const isBeingDragged = isDragging && draggedItemId === childItem.id;
          const isBeingResized = isResizing && resizingItemId === childItem.id;

          const clipProps = {
            item: childItem,
            layerId: layer.id,
            parentSceneStartTime: sceneItem.startTime,
            pixelsPerMs,
            isBeingDragged,
            isBeingResized,
            onSelectItem,
            onSelectLayer,
            setContextMenu,
            handleClipMouseDown,
            setIsDragging,
            setDraggedItemId,
            setDragStartX,
            setDragStartTime,
            setDraggedItemSourceLayer,
            setDraggedItemTargetLayer,
            setIsResizing,
            setResizingItemId,
            setResizeHandle,
            setResizeStartX,
            setResizeStartTime,
            setResizeStartDuration
          };

          if (childItem.type === 'image') {
            return <ImageClip key={childItem.id} {...clipProps} />;
          } else if (childItem.type === 'audio') {
            return <AudioClip key={childItem.id} {...clipProps} scenePackage={scenePackage} />;
          } else if (childItem.type === 'effect') {
            return <EffectClip key={childItem.id} {...clipProps} />;
          }

          return null;
        })}
      </div>
    </div>
  );
};

export const getSceneLayerTrackContextMenu = (
  onDelete: () => void,
  onRename: () => void,
  onDuplicate: () => void,
  isDefaultLayer?: boolean,
  sceneOperations?: {
    onAddLayer: () => void;
    onAddFadeIn: () => void;
    onAddFadeOut: () => void;
    onDeleteScene: () => void;
  }
): ContextMenuItem[] => {
  const layerItems: ContextMenuItem[] = [
    { label: 'Rename Layer', onClick: onRename },
    { label: 'separator', onClick: () => {}, separator: true },
    { label: 'Duplicate Layer', onClick: onDuplicate },
    { label: 'Delete Layer', onClick: onDelete }
  ];

  // If this is the default layer, prepend scene operations
  if (isDefaultLayer && sceneOperations) {
    const sceneItems: ContextMenuItem[] = [
      { label: 'Rename Scene', onClick: () => alert('Not implemented') },
      { label: 'separator', onClick: () => {}, separator: true },
      { label: 'Add Layer', onClick: sceneOperations.onAddLayer },
      { label: 'separator', onClick: () => {}, separator: true },
      { label: 'Add Fade In', onClick: sceneOperations.onAddFadeIn },
      { label: 'Add Fade Out', onClick: sceneOperations.onAddFadeOut },
      { label: 'Add Camera Motion', onClick: () => alert('Not implemented') },
      { label: 'separator', onClick: () => {}, separator: true },
      { label: 'Duplicate Scene', onClick: () => alert('Not implemented') },
      { label: 'Delete Scene', onClick: sceneOperations.onDeleteScene },
      { label: 'separator', onClick: () => {}, separator: true }
    ];
    return [...sceneItems, ...layerItems];
  }

  return layerItems;
};

export default SceneLayerTrack;
