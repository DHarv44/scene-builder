import React from 'react';
import type { TimelineScene, TimelineLayer } from '../../../types/scenePackage';
import type { ResizeHandle, ContextMenuState } from './Timeline.types';
import type { ContextMenuItem } from '../Preview/ContextMenu';
import SceneLayerTrack from './SceneLayerTrack';

interface SceneClipProps {
  item: TimelineScene;
  layerId: string;
  pixelsPerMs: number;
  isBeingDragged: boolean;
  isBeingResized: boolean;
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
  isDragging: boolean;
  draggedItemId: string | null;
  draggedItemSourceLayer: string | null;
  draggedItemTargetLayer: string | null;
  onSelectScene?: (sceneId: string) => void;
  onSelectItem?: (itemId: string | null) => void;
  onSelectLayer?: (layerId: string | null) => void;
  onFocusScene?: (sceneId: string, sceneName: string) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  handleClipMouseDown: (
    e: React.MouseEvent,
    item: any,
    handle: ResizeHandle,
    layerId: string,
    setIsDragging: (value: boolean) => void,
    setDraggedItemId: (value: string | null) => void,
    setDragStartX: (value: number) => void,
    setDragStartTime: (value: number) => void,
    setDraggedItemSourceLayer: (value: string | null) => void,
    setDraggedItemTargetLayer: (value: string | null) => void,
    setIsResizing: (value: boolean) => void,
    setResizingItemId: (value: string | null) => void,
    setResizeHandle: (value: ResizeHandle) => void,
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
  setResizeHandle: (value: ResizeHandle) => void;
  setResizeStartX: (value: number) => void;
  setResizeStartTime: (value: number) => void;
  setResizeStartDuration: (value: number) => void;
  scenePackage: any;
  scenePath: string | null;
  onUpdate?: (scenePackage: any) => void;
}

const SceneClip: React.FC<SceneClipProps> = ({
  item,
  layerId,
  pixelsPerMs,
  isBeingDragged,
  isBeingResized,
  isCollapsed,
  onToggleCollapse,
  isDragging,
  draggedItemId,
  draggedItemSourceLayer,
  draggedItemTargetLayer,
  onSelectScene,
  onSelectItem,
  onSelectLayer,
  onFocusScene,
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
  setResizeStartDuration,
  scenePackage,
  scenePath,
  onUpdate
}) => {
  return (
    <div
      className={`scene-clip ${isBeingDragged ? 'dragging' : ''} ${isBeingResized ? 'resizing' : ''}`}
      data-context-type="scene"
      data-context-id={item.id}
      style={{
        left: `${item.startTime * pixelsPerMs}px`,
        width: `${item.duration * pixelsPerMs}px`
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectScene?.(item.id);
        onSelectItem?.(item.id);
        onSelectLayer?.(null);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onFocusScene?.(item.id, item.name);
      }}
    >
      {/* Clip header with collapse button and name */}
      <div className="clip-header">
        <button
          className="scene-collapse-toggle"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse?.();
          }}
          title={isCollapsed ? 'Expand scene layers' : 'Collapse scene layers'}
          style={{
            width: '18px',
            height: '18px',
            padding: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '2px',
            color: '#fff',
            fontSize: '10px',
            cursor: 'pointer',
            marginRight: '6px',
            flexShrink: 0
          }}
        >
          {isCollapsed ? '▶' : '▼'}
        </button>
        <span className="clip-name">{item.name}</span>
      </div>

      {/* Clip content area */}
      <div
        className="clip-content"
        onMouseDown={(e) => handleClipMouseDown(
          e, item, null, layerId,
          setIsDragging, setDraggedItemId, setDragStartX, setDragStartTime,
          setDraggedItemSourceLayer, setDraggedItemTargetLayer,
          setIsResizing, setResizingItemId, setResizeHandle,
          setResizeStartX, setResizeStartTime, setResizeStartDuration
        )}
      />

      {/* Resize handles */}
      <div
        className="clip-resize-handle left"
        onMouseDown={(e) => handleClipMouseDown(
          e, item, 'left', layerId,
          setIsDragging, setDraggedItemId, setDragStartX, setDragStartTime,
          setDraggedItemSourceLayer, setDraggedItemTargetLayer,
          setIsResizing, setResizingItemId, setResizeHandle,
          setResizeStartX, setResizeStartTime, setResizeStartDuration
        )}
      />
      <div
        className="clip-resize-handle right"
        onMouseDown={(e) => handleClipMouseDown(
          e, item, 'right', layerId,
          setIsDragging, setDraggedItemId, setDragStartX, setDragStartTime,
          setDraggedItemSourceLayer, setDraggedItemTargetLayer,
          setIsResizing, setResizingItemId, setResizeHandle,
          setResizeStartX, setResizeStartTime, setResizeStartDuration
        )}
      />
    </div>
  );
};

export const getSceneClipContextMenu = (
  onAddLayer: () => void,
  onAddFadeIn: () => void,
  onAddFadeOut: () => void,
  onDelete: () => void,
  onRename: () => void,
  onDuplicate: () => void
): ContextMenuItem[] => {
  return [
    { label: 'Rename Scene', onClick: onRename },
    { label: 'separator', onClick: () => {}, separator: true },
    { label: 'Add Layer', onClick: onAddLayer },
    { label: 'separator', onClick: () => {}, separator: true },
    { label: 'Add Fade In', onClick: onAddFadeIn },
    { label: 'Add Fade Out', onClick: onAddFadeOut },
    { label: 'Add Camera Motion', onClick: () => alert('Not implemented') },
    { label: 'separator', onClick: () => {}, separator: true },
    { label: 'Duplicate', onClick: onDuplicate },
    { label: 'Delete', onClick: onDelete }
  ];
};

export default SceneClip;
