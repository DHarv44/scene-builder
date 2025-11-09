import React from 'react';
import type { TimelineItem } from '../../../types/scenePackage';
import type { ContextMenuState } from './Timeline.types';

export interface BaseClipProps {
  item: TimelineItem;
  layerId: string;
  parentSceneStartTime: number;
  pixelsPerMs: number;
  isBeingDragged: boolean;
  isBeingResized: boolean;
  className?: string;
  onSelectItem?: (itemId: string | null) => void;
  onSelectLayer?: (layerId: string | null) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
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
  children?: React.ReactNode;
}

const BaseClip: React.FC<BaseClipProps> = ({
  item,
  layerId,
  parentSceneStartTime,
  pixelsPerMs,
  isBeingDragged,
  isBeingResized,
  className,
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
  setResizeStartDuration,
  children
}) => {
  return (
    <div
      className={`${className} ${isBeingDragged ? 'dragging' : ''} ${isBeingResized ? 'resizing' : ''}`}
      data-context-type="item"
      data-context-id={item.id}
      style={{
        left: `${item.startTime * pixelsPerMs}px`,
        width: `${item.duration * pixelsPerMs}px`
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectItem?.(item.id);
        onSelectLayer?.(null);
      }}
    >
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

      {/* Header with name - drag only from here */}
      <div className="clip-header"
        onMouseDown={(e) => handleClipMouseDown(
          e, item, null, layerId,
          setIsDragging, setDraggedItemId, setDragStartX, setDragStartTime,
          setDraggedItemSourceLayer, setDraggedItemTargetLayer,
          setIsResizing, setResizingItemId, setResizeHandle,
          setResizeStartX, setResizeStartTime, setResizeStartDuration
        )}
      >
        <span className="clip-name">{item.name}</span>
      </div>

      {/* Content area - no drag here */}
      <div className="clip-content">
        {children}
      </div>
    </div>
  );
};

export default BaseClip;
