import React, { useState, useMemo, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import type {
  TimelineLayer,
  TimelineItem,
  TimelineScene
} from '../../../types/scenePackage';
import ContextMenu, { ContextMenuItem } from '../../../components/Preview/ContextMenu';
import './Timeline.css';

// Import extracted modules
import type { TimelineProps, ResizeHandle, ContextMenuState } from '../types';
import { formatTime, generateRulerMarkers } from '../utils/Timeline.utils';
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
} from '../actions/Timeline.actions';
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
} from '../handlers/Timeline.handlers';
import { sceneSaveService } from '../../../services/sceneSaveService';
import SceneClip from './SceneClip';
import ImageClip, { getImageClipContextMenu } from './ImageClip';
import AudioClip from './AudioClip';
import EffectClip from './EffectClip';
import TimelineBreadcrumb from './TimelineBreadcrumb';
import { useTimelineNavigation } from '../../../context/TimelineNavigationContext';
import AssetPickerDialog from '../../../components/Dialogs/AssetPickerDialog';
import LayerRow from './LayerRow';
import SceneLayerRow from './SceneLayerRow';

export interface TimelineHandle {
  scrollToEnd: () => void;
}

const Timeline = forwardRef<TimelineHandle, TimelineProps>(({
  scenePackage,
  scenePath,
  currentTime,
  onTimeChange,
  onSelectItem,
  selectedSceneId: _selectedSceneId,
  onSelectScene,
  onSelectLayer,
  onUpdate
}, ref) => {
  const [zoom, setZoom] = useState(1.0);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [mutedLayers, setMutedLayers] = useState<Set<string>>(new Set());
  const [soloedLayers, setSoloedLayers] = useState<Set<string>>(new Set());
  const [lockedLayers, setLockedLayers] = useState<Set<string>>(new Set());
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

  // Handle multi-selection
  const handleItemSelection = (itemId: string, event: React.MouseEvent) => {
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      // Multi-select: toggle item in selection
      setSelectedItems(prev => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          next.add(itemId);
        }
        return next;
      });
    } else {
      // Single select: clear others and select this item
      setSelectedItems(new Set([itemId]));
    }

    // Also call the parent's onSelectItem
    if (onSelectItem) {
      onSelectItem(itemId);
    }
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

  // Track control toggle handlers
  const handleToggleMute = (layerId: string) => {
    setMutedLayers(prev => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  };

  const handleToggleSolo = (layerId: string) => {
    setSoloedLayers(prev => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  };

  const handleToggleLock = (layerId: string) => {
    setLockedLayers(prev => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  };

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
        <div className="timeline-controls">
          <button
            className={`timeline-snap-btn ${snapEnabled ? 'active' : ''}`}
            onClick={() => setSnapEnabled(!snapEnabled)}
            title={`Snap to Grid ${snapEnabled ? '(On)' : '(Off)'} - Toggle with 'S' key`}
          >
            <span className="snap-icon">⚡</span>
            Snap
          </button>
          <div className="timeline-zoom-separator" />
          <button
            className="timeline-zoom-btn"
            onClick={() => setZoom(Math.max(0.1, zoom - 0.25))}
            title="Zoom Out"
          >
            −
          </button>
          <span className="timeline-zoom-display">{Math.round(zoom * 100)}%</span>
          <button
            className="timeline-zoom-btn"
            onClick={() => setZoom(Math.min(5, zoom + 0.25))}
            title="Zoom In"
          >
            +
          </button>
          <button
            className="timeline-zoom-btn timeline-zoom-fit"
            onClick={() => setZoom(1)}
            title="Zoom to Fit"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Ruler */}
      <div className="timeline-ruler" onClick={(e) => handleTimelineClick(e, pixelsPerMs, duration, isDragging, isResizing, onTimeChange)}>
        <div className="ruler-markers">
          {generateRulerMarkers(duration, pixelsPerMs)}
        </div>

        {/* Playhead */}
        <div
          className="playhead"
          style={{ left: `${200 + currentTime * pixelsPerMs}px` }}
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
          <table className="timeline-tracks-table" style={{ minWidth: `${200 + duration * pixelsPerMs}px` }}>
            <tbody>
          {timelineLayers.map((layer) => {
            const rows: JSX.Element[] = [];

            // Helper functions for layer row
            const createGhostItem = () => {
              if (!isDragging || !draggedItemId || draggedItemTargetLayer !== layer.id || draggedItemSourceLayer === layer.id) {
                return null;
              }
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
            };

            const handleLayerItemDrop = (e: React.DragEvent, layerId?: string) => {
              if (!scenePath) return;
              const trackRect = e.currentTarget.getBoundingClientRect();
              const dropX = e.clientX - trackRect.left;
              let targetLayerId = layerId || layer.id;
              for (const item of layer.items) {
                if (item.type === 'scene') {
                  const sceneStart = item.startTime * pixelsPerMs;
                  const sceneEnd = (item.startTime + item.duration) * pixelsPerMs;
                  if (dropX >= sceneStart && dropX <= sceneEnd) {
                    const defaultLayer = item.layers?.[0];
                    if (defaultLayer) {
                      targetLayerId = defaultLayer.id;
                    }
                    break;
                  }
                }
              }
              handleItemDrop(e, scenePackage, scenePath, pixelsPerMs, targetLayerId, onUpdate);
            };

            // Main layer row
            rows.push(
              <LayerRow
                key={layer.id}
                layer={layer}
                duration={duration}
                pixelsPerMs={pixelsPerMs}
                isDragging={isDragging}
                draggedItemId={draggedItemId}
                draggedItemSourceLayer={draggedItemSourceLayer}
                draggedItemTargetLayer={draggedItemTargetLayer}
                dragOverLayerId={dragOverLayerId}
                scenePackage={scenePackage}
                scenePath={scenePath}
                isMuted={mutedLayers.has(layer.id)}
                isSoloed={soloedLayers.has(layer.id)}
                isLocked={lockedLayers.has(layer.id)}
                onToggleMute={handleToggleMute}
                onToggleSolo={handleToggleSolo}
                onToggleLock={handleToggleLock}
                onSelectLayer={onSelectLayer}
                onSelectItem={onSelectItem}
                setContextMenu={setContextMenu}
                onUpdate={onUpdate}
                renderItem={renderItem}
                handleLayerDragStart={(e, layerId) => handleLayerDragStart(e, layerId, setDraggedLayerId)}
                handleLayerDragOver={(e, layerId) => handleLayerDragOver(e, layerId, draggedLayerId, setDragOverLayerId)}
                handleLayerDragLeave={(e) => handleLayerDragLeave(e, setDragOverLayerId)}
                handleLayerDrop={(e, layerId) => handleLayerDrop(e, layerId, draggedLayerId, scenePackage, scenePath, onUpdate, setDraggedLayerId, setDragOverLayerId)}
                handleLayerDragEnd={() => handleLayerDragEnd(setDraggedLayerId, setDragOverLayerId)}
                handleItemDrop={handleLayerItemDrop}
                handleTrackMouseEnter={(layerId) => handleTrackMouseEnter(layerId, isDragging, draggedItemId, setDraggedItemTargetLayer)}
                renderGhostItem={createGhostItem}
              />
            );

            // Add scene layer rows for each scene item in this layer
            layer.items
              .filter(item => item.type === 'scene')
              .forEach((sceneItem: TimelineScene) => {
                const isCollapsed = collapsedScenes.has(sceneItem.id);
                if (!isCollapsed) {
                  (sceneItem.layers || []).forEach((sceneLayer, layerIndex) => {
                    rows.push(
                      <SceneLayerRow
                        key={`scene-layer-${sceneLayer.id}`}
                        sceneLayer={sceneLayer}
                        sceneItem={sceneItem}
                        isFirstLayer={layerIndex === 0}
                        duration={duration}
                        pixelsPerMs={pixelsPerMs}
                        isDragging={isDragging}
                        draggedItemId={draggedItemId}
                        draggedItemSourceLayer={draggedItemSourceLayer}
                        draggedItemTargetLayer={draggedItemTargetLayer}
                        scenePath={scenePath}
                        onSelectLayer={onSelectLayer}
                        onSelectItem={onSelectItem}
                        setContextMenu={setContextMenu}
                        handleItemDrop={(e, layerId) => {
                          if (scenePath) handleItemDrop(e, scenePackage, scenePath, pixelsPerMs, layerId, onUpdate);
                        }}
                        handleTrackMouseEnter={(layerId) => handleTrackMouseEnter(layerId, isDragging, draggedItemId, setDraggedItemTargetLayer)}
                        renderItem={renderItem}
                      />
                    );
                  });
                }
              });

            return <React.Fragment key={layer.id}>{rows}</React.Fragment>;
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
