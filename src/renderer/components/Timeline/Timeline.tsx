import React, { useState, useMemo, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import type {
  TimelineLayer,
  TimelineItem,
  TimelineScene
} from '../../../types/scenePackage';
import ContextMenu, { ContextMenuItem } from '../Preview/ContextMenu';
import './Timeline.css';

// Import extracted modules
import type { TimelineProps, ResizeHandle, ContextMenuState } from './Timeline.types';
import { formatTime, generateRulerMarkers, findContextMenuTarget } from './Timeline.utils';
import { getSceneClipContextMenu } from './SceneClip';
import { getSceneLayerTrackContextMenu } from './SceneLayerTrack';
import {
  handleDeleteItem,
  handleDeleteLayer,
  handleAddLayer,
  handleAddLayerToScene,
  handleAddFadeIn,
  handleAddFadeOut,
  handleRenameLayer,
  handleRenameItem,
  handleDuplicateItem,
  handleDuplicateLayer,
  handleAddImage,
  handleAddAudio,
  handleAddScene
} from './Timeline.actions';
import {
  handleTimelineClick,
  handleClipMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleItemDrop,
  handleLayerDragStart,
  handleLayerDragOver,
  handleLayerDragLeave,
  handleLayerDrop,
  handleLayerDragEnd,
  handleTrackMouseEnter
} from './Timeline.handlers';
import { sceneSaveService } from '../../services/sceneSaveService';
import SceneClip from './SceneClip';
import ImageClip, { getImageClipContextMenu } from './ImageClip';
import AudioClip from './AudioClip';
import EffectClip from './EffectClip';
import TimelineBreadcrumb from './TimelineBreadcrumb';
import { useTimelineNavigation } from '../../context/TimelineNavigationContext';
import AssetPickerDialog from '../Dialogs/AssetPickerDialog';

export interface TimelineHandle {
  scrollToEnd: () => void;
}

const Timeline = forwardRef<TimelineHandle, TimelineProps>(({
  scenePackage,
  scenePath,
  currentTime,
  onTimeChange,
  onSelectItem,
  selectedSceneId,
  onSelectScene,
  onSelectLayer,
  onUpdate
}, ref) => {
  const [zoom, setZoom] = useState(1.0);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [collapsedScenes, setCollapsedScenes] = useState<Set<string>>(new Set());
  const [assetPickerDialog, setAssetPickerDialog] = useState<{
    type: 'images' | 'audio';
    layerId: string;
  } | null>(null);

  // Toggle scene collapse
  const toggleSceneCollapse = (sceneId: string) => {
    setCollapsedScenes(prev => {
      const next = new Set(prev);
      if (next.has(sceneId)) {
        next.delete(sceneId);
      } else {
        next.add(sceneId);
      }
      return next;
    });
  };

  // Drag state for repositioning items
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [draggedItemSourceLayer, setDraggedItemSourceLayer] = useState<string | null>(null);
  const [draggedItemTargetLayer, setDraggedItemTargetLayer] = useState<string | null>(null);

  // Drag state for reordering layers
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartTime, setResizeStartTime] = useState(0);
  const [resizeStartDuration, setResizeStartDuration] = useState(0);

  const timelineRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef<HTMLDivElement>(null);
  const { focusedSceneId, focusScene } = useTimelineNavigation();

  // Expose scroll methods to parent via ref
  useImperativeHandle(ref, () => ({
    scrollToEnd: () => {
      if (tracksRef.current) {
        tracksRef.current.scrollLeft = tracksRef.current.scrollWidth;
      }
    }
  }));

  // Get timeline layers (filtered by focused scene if applicable)
  const timelineLayers = useMemo(() => {
    if (!scenePackage) return [];

    // If no scene is focused, return root timeline layers
    if (!focusedSceneId) {
      return scenePackage.timeline.layers || [];
    }

    // Find the focused scene and return its internal layers
    const findScene = (layers: TimelineLayer[]): TimelineScene | null => {
      for (const layer of layers) {
        for (const item of layer.items) {
          if (item.type === 'scene' && item.id === focusedSceneId) {
            return item as TimelineScene;
          }
          // Recursively search in nested scenes
          if (item.type === 'scene') {
            const found = findScene((item as TimelineScene).layers);
            if (found) return found;
          }
        }
      }
      return null;
    };

    const focusedScene = findScene(scenePackage.timeline.layers || []);
    return focusedScene?.layers || [];
  }, [scenePackage, focusedSceneId]);

  // Calculate duration from all items across all layers
  const duration = useMemo(() => {
    let maxDuration = 300000; // Default 5 minutes
    timelineLayers.forEach(layer => {
      layer.items.forEach(item => {
        const itemEnd = item.startTime + item.duration;
        if (itemEnd > maxDuration) {
          maxDuration = itemEnd;
        }
      });
    });
    return Math.max(maxDuration, 300000); // Minimum 5 minutes, expands if content is longer
  }, [timelineLayers]);

  const basePixelsPerMs = 0.1; // 100ms = 10px at 1x zoom
  const pixelsPerMs = basePixelsPerMs * zoom;

  // Store duration and basePixelsPerMs in refs to avoid recreating event listener
  const durationRef = useRef(duration);
  const basePixelsPerMsRef = useRef(basePixelsPerMs);

  useEffect(() => {
    durationRef.current = duration;
    basePixelsPerMsRef.current = basePixelsPerMs;
  }, [duration, basePixelsPerMs]);

  // Handle wheel zoom (Ctrl+scroll) using native listener to avoid passive event warning
  React.useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = -e.deltaY / 1000;
        setZoom(prevZoom => {
          const viewportWidth = tracksRef.current?.clientWidth ?? 800;
          const requiredWidth = durationRef.current * basePixelsPerMsRef.current;
          const calculatedMinZoom = Math.max(0.01, (viewportWidth - 150) / requiredWidth);
          const newZoom = Math.max(calculatedMinZoom, Math.min(5, prevZoom + delta));
          return newZoom;
        });
      }
    };

    const timelineEl = timelineRef.current;
    if (timelineEl) {
      timelineEl.addEventListener('wheel', handleWheel, { passive: false });
      return () => timelineEl.removeEventListener('wheel', handleWheel);
    }
  }, []); // Only attach once on mount

  // Keep save service in sync with latest scenePackage
  useEffect(() => {
    sceneSaveService.updateScenePackage(scenePackage);
  }, [scenePackage]);

  // Attach global mouse handlers for drag and resize
  React.useEffect(() => {
    const mouseMoveHandler = (e: MouseEvent) => {
      handleMouseMove(
        e,
        isDragging,
        isResizing,
        draggedItemId,
        resizingItemId,
        resizeHandle,
        dragStartX,
        dragStartTime,
        resizeStartX,
        resizeStartTime,
        resizeStartDuration,
        pixelsPerMs,
        scenePackage,
        onUpdate
      );
    };

    const mouseUpHandler = () => {
      handleMouseUp(
        isDragging,
        isResizing,
        draggedItemId,
        draggedItemSourceLayer,
        draggedItemTargetLayer,
        scenePackage,
        scenePath,
        onUpdate,
        setIsDragging,
        setDraggedItemId,
        setDraggedItemSourceLayer,
        setDraggedItemTargetLayer,
        setIsResizing,
        setResizingItemId,
        setResizeHandle
      );
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', mouseMoveHandler);
      window.addEventListener('mouseup', mouseUpHandler);
      return () => {
        window.removeEventListener('mousemove', mouseMoveHandler);
        window.removeEventListener('mouseup', mouseUpHandler);
      };
    }
  }, [isDragging, isResizing, draggedItemId, resizingItemId, dragStartX, dragStartTime, resizeStartX, resizeStartTime, resizeStartDuration, resizeHandle, pixelsPerMs, draggedItemSourceLayer, draggedItemTargetLayer, scenePackage, scenePath, onUpdate]);

  if (!scenePackage) {
    return (
      <div className="timeline timeline-empty">
        <div className="timeline-placeholder">
          No scene loaded. Create or open a scene to begin.
        </div>
      </div>
    );
  }

  // Render a single timeline item (horizontally positioned)
  const renderItem = (item: TimelineItem, layerId: string, parentSceneStartTime: number = 0): JSX.Element | null => {
    const isBeingDragged = isDragging && draggedItemId === item.id;
    const isBeingResized = isResizing && resizingItemId === item.id;

    // Common props for all clips
    const commonClipProps = {
      isBeingDragged,
      isBeingResized,
      isDragging,
      draggedItemId,
      draggedItemSourceLayer,
      draggedItemTargetLayer,
      pixelsPerMs,
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

    if (item.type === 'scene') {
      const isCollapsed = collapsedScenes.has(item.id);
      return (
        <SceneClip
          key={item.id}
          item={item as TimelineScene}
          layerId={layerId}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => toggleSceneCollapse(item.id)}
          onSelectScene={onSelectScene}
          onFocusScene={focusScene}
          scenePackage={scenePackage}
          scenePath={scenePath}
          onUpdate={onUpdate}
          {...commonClipProps}
        />
      );
    } else if (item.type === 'image') {
      return (
        <ImageClip
          key={item.id}
          item={item}
          layerId={layerId}
          parentSceneStartTime={parentSceneStartTime}
          {...commonClipProps}
        />
      );
    } else if (item.type === 'audio') {
      return (
        <AudioClip
          key={item.id}
          item={item}
          layerId={layerId}
          parentSceneStartTime={parentSceneStartTime}
          scenePackage={scenePackage}
          {...commonClipProps}
        />
      );
    } else if (item.type === 'effect') {
      return (
        <EffectClip
          key={item.id}
          item={item}
          layerId={layerId}
          parentSceneStartTime={parentSceneStartTime}
          {...commonClipProps}
        />
      );
    }

    return null;
  };

  const getContextMenuItems = (): ContextMenuItem[] => {
    if (!contextMenu) return [];

    if (contextMenu.type === 'timeline-empty') {
      return [
        { label: 'Add Layer', onClick: () => {
          if (scenePath) handleAddLayer(scenePackage, scenePath, onUpdate);
          setContextMenu(null);
        }}
      ];
    } else if (contextMenu.type === 'timeline') {
      return [
        { label: 'Add Layer', onClick: () => {
          if (scenePath) handleAddLayer(scenePackage, scenePath, onUpdate);
          setContextMenu(null);
        }},
        { label: 'Add Scene', onClick: async () => {
          if (!onUpdate || !scenePath) return;
          const updated = JSON.parse(JSON.stringify(scenePackage));
          const layers = updated.timeline.layers || [];

          // Create new layer
          const newLayer: TimelineLayer = {
            id: `layer-${Date.now()}`,
            name: `Layer ${layers.length + 1}`,
            items: [],
            collapsed: false
          };
          layers.push(newLayer);

          // Create new scene and add it to the new layer
          const newScene: TimelineScene = {
            id: `scene-${Date.now()}`,
            type: 'scene',
            name: `Scene ${layers.reduce((count: number, l: TimelineLayer) => count + l.items.filter((i: TimelineItem) => i.type === 'scene').length, 0) + 1}`,
            startTime: 0,
            duration: 10000,
            layers: [
              {
                id: `scene-${Date.now()}-default-layer`,
                name: 'Default Layer',
                items: [],
                collapsed: false
              }
            ],
            collapsed: false
          };
          newLayer.items.push(newScene);

          updated.timeline.layers = layers;
          onUpdate(updated);
          await window.electronAPI.saveScene(scenePath, updated);
          setContextMenu(null);
        }}
      ];
    } else if (contextMenu.type === 'layer-header') {
      return [
        { label: 'Add Image', onClick: () => {
          setAssetPickerDialog({ type: 'images', layerId: contextMenu.targetId });
          setContextMenu(null);
        }},
        { label: 'Add Audio', onClick: () => {
          setAssetPickerDialog({ type: 'audio', layerId: contextMenu.targetId });
          setContextMenu(null);
        }},
        { label: 'Add Scene', onClick: async () => {
          if (scenePath) {
            await handleAddScene(scenePackage, scenePath, contextMenu.targetId, onUpdate);
            setContextMenu(null);
          }
        }},
        { label: 'separator', onClick: () => {}, separator: true },
        { label: 'Rename Layer', onClick: async () => {
          if (scenePath) {
            await handleRenameLayer(scenePackage, scenePath, contextMenu.targetId, onUpdate);
            setContextMenu(null);
          }
        }},
        { label: 'Duplicate Layer', onClick: async () => {
          if (scenePath) {
            await handleDuplicateLayer(scenePackage, scenePath, contextMenu.targetId, onUpdate);
            setContextMenu(null);
          }
        }},
        { label: 'separator', onClick: () => {}, separator: true },
        { label: 'Delete Layer', onClick: async () => {
          if (scenePath) {
            await handleDeleteLayer(scenePackage, scenePath, contextMenu.targetId, onUpdate);
            setContextMenu(null);
          }
        }}
      ];
    } else if (contextMenu.type === 'layer') {
      // Check if this is a default layer (ends with -default-layer)
      const isDefaultLayer = contextMenu.targetId.endsWith('-default-layer');

      // If it's a default layer, find the parent scene ID
      let sceneId: string | null = null;
      if (isDefaultLayer) {
        // Extract scene ID from layer ID (format: scene-{id}-default-layer)
        const match = contextMenu.targetId.match(/^(scene-\d+)-default-layer$/);
        if (match) {
          sceneId = match[1];
        }
      }

      return getSceneLayerTrackContextMenu(
        async () => {
          // Delete layer from scene
          if (scenePath) {
            await handleDeleteLayer(scenePackage, scenePath, contextMenu.targetId, onUpdate);
            setContextMenu(null);
          }
        },
        async () => {
          // Rename layer
          if (scenePath) {
            await handleRenameLayer(scenePackage, scenePath, contextMenu.targetId, onUpdate);
            setContextMenu(null);
          }
        },
        async () => {
          // Duplicate layer
          if (scenePath) {
            await handleDuplicateLayer(scenePackage, scenePath, contextMenu.targetId, onUpdate);
            setContextMenu(null);
          }
        },
        isDefaultLayer,
        sceneId ? {
          onAddLayer: async () => {
            if (scenePath) {
              await handleAddLayerToScene(scenePackage, scenePath, sceneId, onUpdate);
              setContextMenu(null);
            }
          },
          onAddFadeIn: async () => {
            await handleAddFadeIn();
            setContextMenu(null);
          },
          onAddFadeOut: async () => {
            await handleAddFadeOut();
            setContextMenu(null);
          },
          onDeleteScene: async () => {
            if (scenePath) {
              await handleDeleteItem(scenePackage, scenePath, sceneId, onUpdate);
              setContextMenu(null);
            }
          }
        } : undefined
      );
    } else if (contextMenu.type === 'scene') {
      return getSceneClipContextMenu(
        async () => {
          if (scenePath) {
            await handleAddLayerToScene(scenePackage, scenePath, contextMenu.targetId, onUpdate);
            setContextMenu(null);
          }
        },
        async () => {
          await handleAddFadeIn();
          setContextMenu(null);
        },
        async () => {
          await handleAddFadeOut();
          setContextMenu(null);
        },
        async () => {
          if (scenePath) {
            await handleDeleteItem(scenePackage, scenePath, contextMenu.targetId, onUpdate);
            setContextMenu(null);
          }
        },
        async () => {
          if (scenePath) {
            await handleRenameItem(scenePackage, scenePath, contextMenu.targetId, onUpdate);
            setContextMenu(null);
          }
        },
        async () => {
          if (scenePath) {
            await handleDuplicateItem(scenePackage, scenePath, contextMenu.targetId, onUpdate);
            setContextMenu(null);
          }
        }
      );
    } else if (contextMenu.type === 'item') {
      return getImageClipContextMenu(
        async () => {
          if (scenePath) {
            await handleDeleteItem(scenePackage, scenePath, contextMenu.targetId, onUpdate);
            setContextMenu(null);
          }
        },
        async () => {
          if (scenePath) {
            await handleRenameItem(scenePackage, scenePath, contextMenu.targetId, onUpdate);
            setContextMenu(null);
          }
        },
        async () => {
          if (scenePath) {
            await handleDuplicateItem(scenePackage, scenePath, contextMenu.targetId, onUpdate);
            setContextMenu(null);
          }
        }
      );
    }

    return [];
  };

  return (
    <div className="timeline" ref={timelineRef}>
      {/* Breadcrumb Navigation */}
      <TimelineBreadcrumb />

      {/* Timeline Header */}
      <div className="timeline-header">
        <div className="timeline-title">Timeline</div>
        <div className="timeline-duration">Duration: {formatTime(duration)}</div>
      </div>

      {/* Ruler */}
      <div className="timeline-ruler" onClick={(e) => handleTimelineClick(e, pixelsPerMs, duration, isDragging, isResizing, onTimeChange)}>
        <div className="ruler-markers">
          {generateRulerMarkers(duration, pixelsPerMs)}
        </div>

        {/* Playhead */}
        <div
          className="playhead"
          style={{ left: `${150 + currentTime * pixelsPerMs}px` }}
        >
          <div className="playhead-line">
            <div className="playhead-handle" />
          </div>
        </div>
      </div>

      {/* Tracks */}
      <div
        ref={tracksRef}
        className="timeline-tracks"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          if (scenePath) handleItemDrop(e, scenePackage, scenePath, pixelsPerMs, undefined, onUpdate);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ type: 'timeline', targetId: '', x: e.clientX, y: e.clientY });
        }}
      >
        {timelineLayers.length === 0 ? (
          <div
            className="timeline-empty-state"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              if (scenePath) handleItemDrop(e, scenePackage, scenePath, pixelsPerMs, undefined, onUpdate);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({ type: 'timeline-empty', targetId: '', x: e.clientX, y: e.clientY });
            }}
          >
            <div style={{ marginBottom: '15px' }}>No layers yet. Right-click to add layer.</div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => {
                if (scenePath) handleAddLayer(scenePackage, scenePath, onUpdate);
              }} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                Add Layer
              </button>
              <button onClick={async () => {
                if (!onUpdate || !scenePath) return;
                const updated = JSON.parse(JSON.stringify(scenePackage));
                const layers = updated.timeline.layers || [];
                const newLayer: TimelineLayer = {
                  id: `layer-${Date.now()}`,
                  name: `Layer ${layers.length + 1}`,
                  items: [],
                  collapsed: false
                };
                layers.push(newLayer);
                const newScene: TimelineScene = {
                  id: `scene-${Date.now()}`,
                  type: 'scene',
                  name: `Scene ${layers.reduce((count: number, l: TimelineLayer) => count + l.items.filter((i: TimelineItem) => i.type === 'scene').length, 0) + 1}`,
                  startTime: 0,
                  duration: 10000,
                  layers: [
                    {
                      id: `scene-${Date.now()}-default-layer`,
                      name: 'Default Layer',
                      items: [],
                      collapsed: false
                    }
                  ],
                  collapsed: false
                };
                newLayer.items.push(newScene);
                updated.timeline.layers = layers;
                onUpdate(updated);
                await window.electronAPI.saveScene(scenePath, updated);
              }} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                Add Scene
              </button>
            </div>
          </div>
        ) : (
          <table className="timeline-tracks-table" style={{ minWidth: `${150 + duration * pixelsPerMs}px` }}>
            <tbody>
          {timelineLayers.map((layer) => {
            // Calculate rowspan for this layer - counts scenes and their expanded layers
            let rowSpan = 1; // Base row for the layer itself
            layer.items.forEach(item => {
              if (item.type === 'scene') {
                const sceneItem = item as TimelineScene;
                if (!collapsedScenes.has(sceneItem.id)) {
                  // Add 1 for scene header + number of scene layers
                  rowSpan += 1 + (sceneItem.layers?.length || 0);
                } else {
                  // Just the scene header when collapsed
                  rowSpan += 1;
                }
              }
            });

            return (
              <React.Fragment key={layer.id}>
                {/* Main timeline layer */}
                <tr className="timeline-track">
                <th
                  className={`track-header ${dragOverLayerId === layer.id ? 'drag-over' : ''}`}
                  rowSpan={rowSpan}
                  draggable
                  onDragStart={(e) => handleLayerDragStart(e, layer.id, setDraggedLayerId)}
                  onDragOver={(e) => handleLayerDragOver(e, layer.id, draggedLayerId, setDragOverLayerId)}
                  onDragLeave={(e) => handleLayerDragLeave(e, setDragOverLayerId)}
                  onDrop={(e) => handleLayerDrop(e, layer.id, draggedLayerId, scenePackage, scenePath, onUpdate, setDraggedLayerId, setDragOverLayerId)}
                  onDragEnd={() => handleLayerDragEnd(setDraggedLayerId, setDragOverLayerId)}
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

                    // DEBUG: Log click information
                    const clickTarget = e.target as HTMLElement;
                    console.log('=== CONTEXT MENU DEBUG ===');
                    console.log('Click coordinates:', { x: e.clientX, y: e.clientY });
                    console.log('Click target element:', clickTarget);
                    console.log('Click target className:', clickTarget.className);
                    console.log('Click target tagName:', clickTarget.tagName);

                    // Log DOM hierarchy from click point upward
                    console.log('DOM hierarchy (bottom to top):');
                    let el: HTMLElement | null = clickTarget;
                    let depth = 0;
                    while (el && depth < 10) {
                      const contextType = el.getAttribute('data-context-type');
                      const contextId = el.getAttribute('data-context-id');
                      console.log(`  ${depth}: ${el.className || el.tagName}`, {
                        contextType,
                        contextId,
                        element: el
                      });
                      el = el.parentElement;
                      depth++;
                    }

                    const target = findContextMenuTarget(e);
                    console.log('findContextMenuTarget result:', target);

                    if (target) {
                      // Map data-context-type to menu type expected by getContextMenuItems
                      const menuType = target.type === 'timeline-layer' ? 'layer' :
                                      target.type === 'scene-layer' ? 'layer' :
                                      target.type as 'scene' | 'item';
                      console.log('Menu type determined:', menuType);
                      console.log('Target ID:', target.id);
                      console.log('=========================');
                      setContextMenu({ type: menuType, targetId: target.id, x: e.clientX, y: e.clientY });
                    } else {
                      console.log('No context menu target found!');
                      console.log('=========================');
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    if (!scenePath) return;

                    // Calculate drop position to determine target layer
                    const trackRect = e.currentTarget.getBoundingClientRect();
                    const dropX = e.clientX - trackRect.left;
                    const dropTime = dropX / pixelsPerMs;

                    // Check if dropping within a scene on this layer
                    let targetLayerId = layer.id;
                    for (const item of layer.items) {
                      if (item.type === 'scene') {
                        const sceneStart = item.startTime * pixelsPerMs;
                        const sceneEnd = (item.startTime + item.duration) * pixelsPerMs;
                        if (dropX >= sceneStart && dropX <= sceneEnd) {
                          // Dropping within scene bounds - use default layer
                          const defaultLayer = item.layers?.[0];
                          if (defaultLayer) {
                            targetLayerId = defaultLayer.id;
                          }
                          break;
                        }
                      }
                    }

                    handleItemDrop(e, scenePackage, scenePath, pixelsPerMs, targetLayerId, onUpdate);
                  }}
                  onMouseEnter={() => handleTrackMouseEnter(layer.id, isDragging, draggedItemId, setDraggedItemTargetLayer)}
                  style={{ minWidth: `${duration * pixelsPerMs}px` }}
                >
                  {/* Render all items on this layer */}
                  {/* Render non-scene items only */}
                  {layer.items
                    .filter(item => item.type !== 'scene')
                    .map(item => {
                      // Hide item if it's being dragged to a DIFFERENT layer
                      if (isDragging && draggedItemId === item.id && draggedItemSourceLayer === layer.id && draggedItemTargetLayer !== layer.id) {
                        return null;
                      }
                      return renderItem(item, layer.id);
                    })}

                  {/* Render ghost item if this is the target layer during drag */}
                  {isDragging && draggedItemId && draggedItemTargetLayer === layer.id && draggedItemSourceLayer !== layer.id && (() => {
                    // Find the dragged item to render as ghost
                    const findItem = (layers: any[]): any => {
                      for (const l of layers) {
                        for (const i of l.items) {
                          if (i.id === draggedItemId) return i;
                          if (i.type === 'scene' && i.layers) {
                            const found = findItem(i.layers);
                            if (found) return found;
                          }
                        }
                      }
                      return null;
                    };
                    const ghostItem = findItem(scenePackage?.timeline.layers || []);
                    if (ghostItem) {
                      return (
                        <div
                          key={`ghost-${draggedItemId}`}
                          className="timeline-item timeline-item-ghost"
                          style={{
                            left: `${ghostItem.startTime * pixelsPerMs}px`,
                            width: `${ghostItem.duration * pixelsPerMs}px`,
                            opacity: 0.5,
                            pointerEvents: 'none'
                          }}
                        >
                          <span className="item-label">{ghostItem.name}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </td>
              </tr>

              {/* Render scene rows for this layer */}
              {layer.items
                .filter(item => item.type === 'scene')
                .map((sceneItem: TimelineScene) => {
                  const isCollapsed = collapsedScenes.has(sceneItem.id);

                  return (
                    <React.Fragment key={`scene-${sceneItem.id}`}>
                      {/* Scene header row */}
                      <tr className="timeline-track scene-header-row">
                        <td
                          className="track-content"
                          style={{
                            minWidth: `${duration * pixelsPerMs}px`,
                            background: 'linear-gradient(to right, rgba(14, 99, 156, 0.2), rgba(14, 99, 156, 0.1))',
                            borderLeft: '3px solid #0e639c',
                            position: 'relative'
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              left: `${sceneItem.startTime * pixelsPerMs}px`,
                              width: `${sceneItem.duration * pixelsPerMs}px`,
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0 6px',
                              background: 'linear-gradient(to bottom, rgba(14, 99, 156, 0.4), rgba(14, 99, 156, 0.25))',
                              border: '1px solid #0e639c',
                              borderTop: '2px solid #1a7fbf',
                              borderRadius: '4px'
                            }}
                          >
                            <button
                              className="scene-collapse-toggle"
                              onClick={() => toggleSceneCollapse(sceneItem.id)}
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
                                cursor: 'pointer',
                                marginRight: '6px',
                                flexShrink: 0
                              }}
                            >
                              {isCollapsed ? '▶' : '▼'}
                            </button>
                            <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>{sceneItem.name}</span>
                          </div>
                        </td>
                      </tr>

                      {/* Scene layer rows */}
                      {!isCollapsed && (sceneItem.layers || []).map((sceneLayer) => (
                        <tr key={`scene-layer-${sceneLayer.id}`} className="timeline-track scene-layer-row">
                          <td
                            className="track-content"
                            style={{
                              minWidth: `${duration * pixelsPerMs}px`,
                              background: 'rgba(14, 99, 156, 0.05)',
                              borderLeft: '3px solid #0e639c',
                              position: 'relative'
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                left: `${sceneItem.startTime * pixelsPerMs}px`,
                                width: `${sceneItem.duration * pixelsPerMs}px`,
                                height: '100%',
                                background: 'rgba(0, 0, 0, 0.1)',
                                border: '1px solid rgba(14, 99, 156, 0.3)',
                                borderTop: 'none'
                              }}
                            >
                              <div
                                style={{
                                  width: '80px',
                                  height: '100%',
                                  fontSize: '10px',
                                  padding: '4px',
                                  background: 'rgba(0, 0, 0, 0.2)',
                                  borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                                  color: '#ccc',
                                  float: 'left'
                                }}
                              >
                                {sceneLayer.name}
                              </div>
                              <div
                                style={{
                                  marginLeft: '80px',
                                  height: '100%',
                                  position: 'relative'
                                }}
                              >
                                {/* Render scene layer items */}
                                {sceneLayer.items?.map(item => renderItem(item, sceneLayer.id))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
            </React.Fragment>
            );
          })}
            </tbody>
          </table>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Asset Picker Dialog */}
      {assetPickerDialog && scenePath && (
        <AssetPickerDialog
          title={assetPickerDialog.type === 'images' ? 'Add Image to Layer' : 'Add Audio to Layer'}
          assetType={assetPickerDialog.type}
          scenePath={scenePath}
          onConfirm={async (assetKey, assetPath) => {
            if (assetPickerDialog.type === 'images') {
              await handleAddImage(scenePackage, scenePath, assetPickerDialog.layerId, assetKey, assetPath, onUpdate);
            } else {
              await handleAddAudio(scenePackage, scenePath, assetPickerDialog.layerId, assetKey, assetPath, onUpdate);
            }
            setAssetPickerDialog(null);
          }}
          onCancel={() => setAssetPickerDialog(null)}
        />
      )}
    </div>
  );
});

Timeline.displayName = 'Timeline';

export default Timeline;
