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
    <React.Fragment>
      {/* Scene container as nested table */}
      <div
        className="scene-clip-container"
        data-context-type="scene"
        data-context-id={item.id}
        style={{
          left: `${item.startTime * pixelsPerMs}px`,
          width: `${item.duration * pixelsPerMs}px`,
          position: 'absolute',
          top: 2,
          borderRadius: 4,
          background: 'linear-gradient(to bottom, rgba(14, 99, 156, 0.4), rgba(14, 99, 156, 0.25))',
          border: '1px solid #0e639c',
          borderTop: '2px solid #1a7fbf',
          pointerEvents: 'auto',
          zIndex: 1,
          overflow: 'visible'
        }}
        onClick={(e) => {
          // Select scene if clicking on the container background (not layers or items)
          const target = e.target as HTMLElement;
          if (target.classList.contains('scene-clip-container') || target.classList.contains('scene-header')) {
            e.stopPropagation();
            onSelectScene?.(item.id);
            onSelectItem?.(item.id);
            onSelectLayer?.(null);
          }
        }}
        onDoubleClick={(e) => {
          // Double-click to focus on this scene
          const target = e.target as HTMLElement;
          if (target.classList.contains('scene-clip-container') || target.classList.contains('scene-header')) {
            e.stopPropagation();
            onFocusScene?.(item.id, item.name);
          }
        }}
      >
        <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {/* Scene header row */}
            <tr>
              <td
                colSpan={2}
                className="scene-header"
                style={{
                  height: '32px',
                  padding: '0 6px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {/* Collapse/Expand toggle button */}
                  <button
                    className="scene-collapse-toggle"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCollapse?.();
                    }}
                    title={isCollapsed ? 'Expand scene layers' : 'Collapse scene layers'}
                    style={{
                      width: '20px',
                      height: '20px',
                      padding: 0,
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '2px',
                      color: '#fff',
                      fontSize: '12px',
                      lineHeight: '1',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '6px'
                    }}
                  >
                    {isCollapsed ? '▶' : '▼'}
                  </button>

                  {/* Scene name label */}
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#fff',
                      fontWeight: 500,
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      userSelect: 'none'
                    }}
                  >
                    {item.name}
                  </div>
                </div>
              </td>
            </tr>

            {/* Scene layer rows - only if not collapsed */}
            {!isCollapsed && (item.layers || []).map((sceneLayer) => (
              <tr key={sceneLayer.id} className="scene-layer-row" style={{ height: '40px' }}>
                <th
                  className="scene-layer-header"
                  style={{
                    width: '80px',
                    fontSize: '10px',
                    padding: '4px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                    textAlign: 'left',
                    verticalAlign: 'middle',
                    color: '#ccc'
                  }}
                >
                  {sceneLayer.name}
                </th>
                <td
                  className="scene-layer-content"
                  style={{
                    position: 'relative',
                    background: 'rgba(0, 0, 0, 0.1)',
                    padding: 0,
                    height: '40px'
                  }}
                >
                  {/* Scene layer items will be rendered here by parent Timeline component */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Interactive scene clip - for dragging/resizing the scene itself */}
      <div
        className={`scene-clip ${isBeingDragged ? 'dragging' : ''} ${isBeingResized ? 'resizing' : ''}`}
        style={{
          left: `${item.startTime * pixelsPerMs}px`,
          width: `${item.duration * pixelsPerMs}px`,
          height: isCollapsed ? '36px' : `${32 + (item.layers?.length || 0) * 40}px`,
          background: 'transparent',
          border: 'none',
          zIndex: 2,
          position: 'absolute',
          top: 2,
          pointerEvents: 'none'
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectScene?.(item.id);
          onSelectItem?.(item.id);
          onSelectLayer?.(null);
        }}
      >
        {/* Resize handles */}
        <div
          className="clip-resize-handle left"
          style={{ pointerEvents: 'auto' }}
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
          style={{ pointerEvents: 'auto' }}
          onMouseDown={(e) => handleClipMouseDown(
            e, item, 'right', layerId,
            setIsDragging, setDraggedItemId, setDragStartX, setDragStartTime,
            setDraggedItemSourceLayer, setDraggedItemTargetLayer,
            setIsResizing, setResizingItemId, setResizeHandle,
            setResizeStartX, setResizeStartTime, setResizeStartDuration
          )}
        />

        {/* Drag area - only header height at top */}
        <div
          className="clip-content"
          style={{
            pointerEvents: 'auto',
            height: '32px',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            cursor: 'move'
          }}
          onMouseDown={(e) => handleClipMouseDown(
            e, item, null, layerId,
            setIsDragging, setDraggedItemId, setDragStartX, setDragStartTime,
            setDraggedItemSourceLayer, setDraggedItemTargetLayer,
            setIsResizing, setResizingItemId, setResizeHandle,
            setResizeStartX, setResizeStartTime, setResizeStartDuration
          )}
        />
      </div>
    </React.Fragment>
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
