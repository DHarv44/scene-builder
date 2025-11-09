import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import type { EffectTrack, EffectItem } from '../../../../types/scenePackage';
import { EFFECTS_PRESETS, EFFECTS_PRESET_CATEGORIES, createEffectItemFromPreset } from '../../../../domain/effects/effectsPresets';
import type { ContextMenuState, ResizeHandle } from '../types';

interface EffectsTrackProps {
  effects: EffectTrack;
  currentTime: number;
  pixelsPerMs: number;
  duration: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onUpdate: (effects: EffectTrack) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  isDragging: boolean;
  isResizing: boolean;
  draggedItemId: string | null;
  resizingItemId: string | null;
  setIsDragging: (value: boolean) => void;
  setDraggedItemId: (value: string | null) => void;
  setIsResizing: (value: boolean) => void;
  setResizingItemId: (value: string | null) => void;
  setResizeHandle: (value: ResizeHandle) => void;
  setDragStartX: (value: number) => void;
  setDragStartTime: (value: number) => void;
  setResizeStartX: (value: number) => void;
  setResizeStartTime: (value: number) => void;
  setResizeStartDuration: (value: number) => void;
}

const EffectsTrack: React.FC<EffectsTrackProps> = ({
  effects,
  currentTime,
  pixelsPerMs,
  duration,
  collapsed,
  onToggleCollapse,
  onUpdate,
  setContextMenu,
  isDragging,
  isResizing,
  draggedItemId,
  resizingItemId,
  setIsDragging,
  setDraggedItemId,
  setIsResizing,
  setResizingItemId,
  setResizeHandle,
  setDragStartX,
  setDragStartTime,
  setResizeStartX,
  setResizeStartTime,
  setResizeStartDuration
}) => {
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [presetMenuPosition, setPresetMenuPosition] = useState({ x: 0, y: 0 });

  const handleAddEffectItem = (presetKey: string, startTime: number) => {
    const newItem = createEffectItemFromPreset(presetKey, startTime);
    const updatedEffects = {
      ...effects,
      items: [...effects.items, newItem]
    };
    onUpdate(updatedEffects);
    setShowPresetMenu(false);
  };

  const handleDeleteEffectItem = (itemId: string) => {
    const updatedEffects = {
      ...effects,
      items: effects.items.filter(item => item.id !== itemId)
    };
    onUpdate(updatedEffects);
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const clickTime = Math.max(0, x / pixelsPerMs);

      setPresetMenuPosition({ x: e.clientX, y: e.clientY });
      setShowPresetMenu(true);
    }
  };

  const handleItemMouseDown = (
    e: React.MouseEvent,
    item: EffectItem,
    handle: ResizeHandle
  ) => {
    if (e.button !== 0) return; // Only left click

    if (handle) {
      // Start resizing
      e.stopPropagation();
      setIsResizing(true);
      setResizingItemId(item.id);
      setResizeHandle(handle);
      setResizeStartX(e.clientX);
      setResizeStartTime(item.startTime);
      setResizeStartDuration(item.duration);
    } else {
      // Start dragging
      e.stopPropagation();
      setIsDragging(true);
      setDraggedItemId(item.id);
      setDragStartX(e.clientX);
      setDragStartTime(item.startTime);
    }
  };

  return (
    <>
      <tr className="timeline-track effects-track">
        <th
          className="track-header effects-header"
          onClick={onToggleCollapse}
        >
          <div className="track-header-content">
            <button className="scene-collapse-btn">
              {collapsed ? '▶' : '▼'}
            </button>
            <span className="track-name">✨ Effects</span>
          </div>
        </th>
        <td
          className="track-content effects-track-content"
          style={{
            minWidth: `${duration * pixelsPerMs}px`,
            position: 'relative',
            background: 'rgba(250, 150, 50, 0.05)',
            height: collapsed ? '40px' : '60px'
          }}
          onClick={handleTrackClick}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ type: 'effects-track', targetId: 'effects', x: e.clientX, y: e.clientY });
          }}
        >
          {!collapsed && effects.items.map((item) => {
            const isBeingDragged = isDragging && draggedItemId === item.id;
            const isBeingResized = isResizing && resizingItemId === item.id;

            return (
              <div
                key={item.id}
                className="effect-item"
                style={{
                  position: 'absolute',
                  left: `${item.startTime * pixelsPerMs}px`,
                  top: '5px',
                  width: `${item.duration * pixelsPerMs}px`,
                  height: '50px',
                  background: 'rgba(251, 146, 60, 0.6)',
                  border: '1px solid rgba(251, 146, 60, 0.8)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  cursor: isBeingDragged ? 'grabbing' : 'grab',
                  overflow: 'hidden',
                  opacity: isBeingDragged || isBeingResized ? 0.5 : 1
                }}
                onMouseDown={(e) => handleItemMouseDown(e, item, null)}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({
                    type: 'effect-item',
                    targetId: item.id,
                    x: e.clientX,
                    y: e.clientY
                  });
                }}
              >
                {/* Left resize handle */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '8px',
                    cursor: 'ew-resize',
                    zIndex: 10
                  }}
                  onMouseDown={(e) => handleItemMouseDown(e, item, 'left')}
                />

                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#fff',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  pointerEvents: 'none'
                }}>
                  {item.name}
                </span>

                {/* Right resize handle */}
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '8px',
                    cursor: 'ew-resize',
                    zIndex: 10
                  }}
                  onMouseDown={(e) => handleItemMouseDown(e, item, 'right')}
                />
              </div>
            );
          })}
        </td>
      </tr>

      {/* Preset Menu - Portal to body to avoid tbody nesting */}
      {showPresetMenu && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            left: `${presetMenuPosition.x}px`,
            top: `${presetMenuPosition.y}px`,
            background: '#1e1e1e',
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '8px',
            zIndex: 10000,
            maxHeight: '400px',
            overflowY: 'auto',
            minWidth: '200px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#aaa',
            borderBottom: '1px solid #333',
            marginBottom: '4px'
          }}>
            Add Effect
          </div>

          {Object.entries(EFFECTS_PRESET_CATEGORIES).map(([category, presets]) => (
            <div key={category} style={{ marginBottom: '8px' }}>
              <div style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                color: '#888',
                padding: '4px 8px',
                marginTop: '4px'
              }}>
                {category}
              </div>
              {presets.map((presetKey) => {
                const preset = EFFECTS_PRESETS[presetKey];
                return (
                  <div
                    key={presetKey}
                    style={{
                      padding: '6px 8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#ddd',
                      borderRadius: '2px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#333';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                    onClick={() => {
                      const rect = (document.querySelector('.effects-track-content') as HTMLElement)?.getBoundingClientRect();
                      if (rect) {
                        const x = presetMenuPosition.x - rect.left;
                        const clickTime = Math.max(0, x / pixelsPerMs);
                        handleAddEffectItem(presetKey, clickTime);
                      }
                    }}
                  >
                    {preset.name}
                  </div>
                );
              })}
            </div>
          ))}

          <div style={{
            padding: '8px',
            borderTop: '1px solid #333',
            marginTop: '8px'
          }}>
            <button
              onClick={() => setShowPresetMenu(false)}
              style={{
                width: '100%',
                padding: '6px',
                background: '#444',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Click outside to close menu */}
      {showPresetMenu && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999
          }}
          onClick={() => setShowPresetMenu(false)}
        />,
        document.body
      )}
    </>
  );
};

export default EffectsTrack;
