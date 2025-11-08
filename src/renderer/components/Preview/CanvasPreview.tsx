import React, { useRef, useEffect, useState } from 'react';
import type { ScenePackage, Layer } from '../../../types/scenePackage';
import { TimelinePlayer } from '../../services/timelinePlayer';
import { CanvasEditor, type TransformHandle } from '../../services/canvasEditor';
import ContextMenu, { type ContextMenuItem } from './ContextMenu';
import './CanvasPreview.css';

interface CanvasPreviewProps {
  scenePackage: ScenePackage | null;
  scenePath: string | null;
  currentTime: number;
  isPlaying: boolean;
  selectedSceneId: string | null;
  selectedLayerIds: string[];
  previewMode: 'edit' | 'preview';
  onSelectLayers: (layerIds: string[]) => void;
  onUpdateLayers: (layers: Layer[]) => void;
}

type DragMode = 'none' | 'move' | 'resize' | 'rotate' | 'marquee';

const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  scenePackage,
  scenePath,
  currentTime,
  isPlaying,
  selectedSceneId,
  selectedLayerIds,
  previewMode,
  onSelectLayers,
  onUpdateLayers
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [player] = useState(() => new TimelinePlayer());
  const [editor] = useState(() => new CanvasEditor());
  const animationFrameRef = useRef<number | null>(null);

  // Drag state
  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragHandle, setDragHandle] = useState<TransformHandle | null>(null);
  const [initialLayerState, setInitialLayerState] = useState<Layer | null>(null);
  const [initialSelectedLayers, setInitialSelectedLayers] = useState<Layer[]>([]);
  const [tempLayers, setTempLayers] = useState<Layer[] | null>(null);

  // Pan state (right mouse button)
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [initialPan, setInitialPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Zoom and pan state (default zoom at 70%, centered)
  const DEFAULT_ZOOM = 0.7;
  const getDefaultPan = () => {
    const canvasWidth = 1920;
    const canvasHeight = 1080;
    // Center the viewport: pan to center of scene at default zoom
    return {
      x: (canvasWidth - canvasWidth * DEFAULT_ZOOM) / 2,
      y: (canvasHeight - canvasHeight * DEFAULT_ZOOM) / 2
    };
  };
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState(getDefaultPan());

  // Cursor state
  const [cursorStyle, setCursorStyle] = useState('default');

  // Marquee selection state
  const [marqueeBox, setMarqueeBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Find the scene item in timeline layers by ID
  const findSceneItem = (layers: any[], sceneId: string): any | null => {
    for (const layer of layers) {
      for (const item of layer.items) {
        if (item.type === 'scene' && item.id === sceneId) {
          return item;
        }
      }
    }
    return null;
  };

  // Find the scene that should be active at currentTime
  const findSceneAtTime = (layers: any[], time: number): any | null => {
    for (const layer of layers) {
      for (const item of layer.items) {
        if (item.type === 'scene') {
          const sceneEnd = item.startTime + item.duration;
          if (time >= item.startTime && time < sceneEnd) {
            return item;
          }
        }
      }
    }
    return null;
  };

  // Timeline drives canvas: show scene based on playhead time
  const currentScene = findSceneAtTime(scenePackage?.timeline.layers || [], currentTime);

  // Get layers from the scene's internal layers (flatten them)
  // Filter by currentTime to only show items that are active
  const layers = React.useMemo(() => {
    if (!currentScene || !currentScene.layers) return [];

    const sceneTime = currentTime - currentScene.startTime;
    const result: Layer[] = [];

    currentScene.layers.forEach((timelineLayer: any) => {
      timelineLayer.items.forEach((item: any) => {
        if (item.type === 'image') {
          // Check if item is active at current time
          const itemEnd = item.startTime + item.duration;
          if (sceneTime >= item.startTime && sceneTime < itemEnd) {
            const layer = {
              id: item.id,
              asset: item.asset,
              depth: item.depth ?? 0,
              position: { x: item.x || '50%', y: item.y || '50%' },
              scale: item.scale || 1,
              anchor: 'center' as const
            };
            result.push(layer);
          }
        }
      });
    });
    return result;
  }, [currentScene, currentTime]);

  // Load scene package into player
  useEffect(() => {
    if (scenePackage) {
      player.loadScenePackage(scenePackage);
      player.seek(currentTime);

      // Share loaded images with editor
      editor.setLoadedImages(player.getLoadedImages());
    }
  }, [scenePackage, player, editor]);

  // Sync selection to editor
  useEffect(() => {
    editor.clearSelection();
    selectedLayerIds.forEach(id => editor.selectLayer(id, true));
  }, [selectedLayerIds, editor]);

  // Sync playback state
  useEffect(() => {
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying, player]);

  // Sync current time when scrubbing
  useEffect(() => {
    if (!isPlaying) {
      player.seek(currentTime);
    }
  }, [currentTime, isPlaying, player]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewMode === 'preview') return;

      // Ctrl+A - Select all layers
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const allLayerIds = layers.map(layer => layer.id);
        onSelectLayers(allLayerIds);
      }

      // Ctrl+D - Deselect all layers
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        onSelectLayers([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [layers, onSelectLayers, previewMode]);

  // Set up wheel event listener with passive: false
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wheelHandler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (previewMode === 'preview') return;

      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
      const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

      // Zoom delta
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.min(Math.max(0.1, zoom + delta), 5.0);

      // Calculate new pan to zoom toward mouse position
      const zoomRatio = newZoom / zoom;
      const newPanX = mouseX - (mouseX - pan.x) * zoomRatio;
      const newPanY = mouseY - (mouseY - pan.y) * zoomRatio;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    };

    canvas.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', wheelHandler);
    };
  }, [zoom, pan, previewMode]);

  // Get canvas coordinates from mouse event (accounting for zoom/pan)
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    // Transform canvas coordinates to world coordinates (accounting for zoom/pan)
    return {
      x: (canvasX - pan.x) / zoom,
      y: (canvasY - pan.y) / zoom
    };
  };

  // Get cursor style for handle position
  const getCursorForHandle = (handle: TransformHandle): string => {
    if (handle.type === 'rotate') return 'grab';

    // Resize cursors based on position
    const cursorMap: Record<string, string> = {
      'nw': 'nw-resize',
      'n': 'n-resize',
      'ne': 'ne-resize',
      'e': 'e-resize',
      'se': 'se-resize',
      's': 's-resize',
      'sw': 'sw-resize',
      'w': 'w-resize'
    };

    return cursorMap[handle.position] || 'default';
  };

  // Reset zoom and pan
  const handleResetZoom = () => {
    setZoom(DEFAULT_ZOOM);
    setPan(getDefaultPan());
  };

  // Zoom in
  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, 5.0);
    setZoom(newZoom);
  };

  // Zoom out
  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.2, 0.1);
    setZoom(newZoom);
  };

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlaying || previewMode === 'preview') return;

    // Right mouse button - start panning
    if (e.button === 2) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setInitialPan({ ...pan });
      return;
    }

    // Left mouse button - normal interaction
    if (e.button !== 0) return;

    const coords = getCanvasCoords(e);
    const ctrlKey = e.ctrlKey || e.metaKey;
    const shiftKey = e.shiftKey;

    // Check if clicking on a handle first
    const selectedLayer = layers.find(l => selectedLayerIds.includes(l.id));
    if (selectedLayer) {
      const handles = editor.getTransformHandles(selectedLayer);
      const handle = editor.hitTestHandle(handles, coords.x, coords.y);

      if (handle) {
        setDragMode(handle.type === 'resize' ? 'resize' : 'rotate');
        setDragHandle(handle);
        setDragStart(coords);
        setInitialLayerState({ ...selectedLayer });
        return;
      }
    }

    // Check if clicking on a layer
    const clickedLayer = [...layers]
      .sort((a, b) => b.depth - a.depth) // Check front-to-back
      .find(layer => editor.hitTestLayer(layer, coords.x, coords.y));

    if (clickedLayer) {
      if (ctrlKey || shiftKey) {
        // Ctrl/Shift: Add to or remove from selection
        if (selectedLayerIds.includes(clickedLayer.id)) {
          onSelectLayers(selectedLayerIds.filter(id => id !== clickedLayer.id));
        } else {
          onSelectLayers([...selectedLayerIds, clickedLayer.id]);
        }
      } else {
        // Replace selection if not already selected
        if (!selectedLayerIds.includes(clickedLayer.id)) {
          onSelectLayers([clickedLayer.id]);
        }

        // Start moving - store initial state of all selected layers
        setDragMode('move');
        setDragStart(coords);
        setInitialLayerState({ ...clickedLayer });

        // Store all selected layers for multi-select move
        const selectedLayers = layers.filter(l => selectedLayerIds.includes(l.id) || l.id === clickedLayer.id);
        setInitialSelectedLayers(selectedLayers.map(l => ({ ...l })));
      }
    } else {
      // Clicked on empty space - start marquee selection
      setDragMode('marquee');
      setDragStart(coords);
      setMarqueeBox({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y });
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlaying || previewMode === 'preview') return;

    // Handle right mouse button panning
    if (isPanning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan({
        x: initialPan.x + dx,
        y: initialPan.y + dy
      });
      return;
    }

    const coords = getCanvasCoords(e);

    // If not dragging, update cursor based on what's under the mouse
    if (dragMode === 'none') {
      const selectedLayer = layers.find(l => selectedLayerIds.includes(l.id));
      if (selectedLayer) {
        const handles = editor.getTransformHandles(selectedLayer);
        const handle = editor.hitTestHandle(handles, coords.x, coords.y);

        if (handle) {
          setCursorStyle(getCursorForHandle(handle));
          return;
        }
      }

      // Check if hovering over a layer
      const hoveredLayer = [...layers]
        .sort((a, b) => b.depth - a.depth)
        .find(layer => editor.hitTestLayer(layer, coords.x, coords.y));

      setCursorStyle(hoveredLayer ? 'move' : 'default');
      return;
    }

    // Handle marquee selection
    if (dragMode === 'marquee' && dragStart) {
      setMarqueeBox({ x1: dragStart.x, y1: dragStart.y, x2: coords.x, y2: coords.y });
      return;
    }

    // If dragging, perform the drag operation
    if (!dragStart || !initialLayerState) return;

    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;

    const updatedLayers = layers.map(layer => {
      // For move mode, update all selected layers
      if (dragMode === 'move' && initialSelectedLayers.length > 0) {
        const initialLayer = initialSelectedLayers.find(l => l.id === layer.id);
        if (!initialLayer) return layer;

        const updated = { ...layer };

        const parsePos = (val: number | string | undefined): number => {
          if (val === undefined) return 0;
          if (typeof val === 'number') return val;
          if (typeof val === 'string' && val.endsWith('%')) {
            return (parseFloat(val) / 100) * (val.includes('x') ? 1920 : 1080);
          }
          return parseFloat(val);
        };

        const initialX = parsePos(initialLayer.position?.x);
        const initialY = parsePos(initialLayer.position?.y);

        updated.position = {
          x: initialX + dx,
          y: initialY + dy
        };

        return updated;
      }

      // For resize/rotate, only update the primary layer
      if (layer.id !== initialLayerState.id) return layer;

      const updated = { ...layer };

      if (dragMode === 'move') {
        // Move single layer (fallback if initialSelectedLayers is empty)
        const parsePos = (val: number | string | undefined): number => {
          if (val === undefined) return 0;
          if (typeof val === 'number') return val;
          if (typeof val === 'string' && val.endsWith('%')) {
            return (parseFloat(val) / 100) * (val.includes('x') ? 1920 : 1080);
          }
          return parseFloat(val);
        };

        const initialX = parsePos(initialLayerState.position?.x);
        const initialY = parsePos(initialLayerState.position?.y);

        updated.position = {
          x: initialX + dx,
          y: initialY + dy
        };
      } else if (dragMode === 'resize' && dragHandle) {
        // Resize layer
        const bounds = editor.getLayerBounds(initialLayerState);
        if (!bounds) return layer;

        const initialScale = initialLayerState.scale || 1;
        const shiftKey = e.shiftKey;

        // Calculate new scale based on handle position
        let newWidth = bounds.width;
        let newHeight = bounds.height;

        if (dragHandle.position.includes('e')) {
          newWidth = bounds.width + dx;
        } else if (dragHandle.position.includes('w')) {
          newWidth = bounds.width - dx;
        }

        if (dragHandle.position.includes('s')) {
          newHeight = bounds.height + dy;
        } else if (dragHandle.position.includes('n')) {
          newHeight = bounds.height - dy;
        }

        // Calculate average scale
        const scaleX = newWidth / bounds.width;
        const scaleY = newHeight / bounds.height;

        let newScale = initialScale;
        if (shiftKey) {
          // Maintain aspect ratio - use the larger scale
          newScale = initialScale * Math.max(scaleX, scaleY);
        } else {
          // Free resize - use average
          newScale = initialScale * ((scaleX + scaleY) / 2);
        }

        updated.scale = Math.max(0.1, newScale);
      }

      return updated;
    });

    // Store temp layers for rendering, don't save yet
    setTempLayers(updatedLayers);
  };

  // Handle mouse up
  const handleMouseUp = () => {
    // Complete marquee selection
    if (dragMode === 'marquee' && marqueeBox) {
      const { x1, y1, x2, y2 } = marqueeBox;
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);

      // Find layers that intersect with marquee box
      const selectedIds = layers.filter(layer => {
        const bounds = editor.getLayerBounds(layer);
        if (!bounds) return false;

        // Check if layer bounding box intersects with marquee box
        return !(bounds.x + bounds.width < minX ||
                 bounds.x > maxX ||
                 bounds.y + bounds.height < minY ||
                 bounds.y > maxY);
      }).map(layer => layer.id);

      onSelectLayers(selectedIds);
      setMarqueeBox(null);
    }

    // Complete drag - save the temp layers if we have them
    if (tempLayers && (dragMode === 'move' || dragMode === 'resize' || dragMode === 'rotate')) {
      onUpdateLayers(tempLayers);
    }

    setDragMode('none');
    setDragStart(null);
    setDragHandle(null);
    setInitialLayerState(null);
    setInitialSelectedLayers([]);
    setTempLayers(null);
    setIsPanning(false);
    setPanStart(null);
  };

  // Handle context menu on right click
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (previewMode === 'preview') return;
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Get context menu items based on current selection
  const getContextMenuItems = (): ContextMenuItem[] => {
    const hasSelection = selectedLayerIds.length > 0;

    return [
      {
        label: 'Copy',
        onClick: () => alert('Copy not implemented yet'),
        disabled: !hasSelection,
      },
      {
        label: 'Paste',
        onClick: () => alert('Paste not implemented yet'),
        disabled: true,
      },
      {
        label: 'Duplicate',
        onClick: () => alert('Duplicate not implemented yet'),
        disabled: !hasSelection,
      },
      { label: '', onClick: () => {}, separator: true },
      {
        label: 'Delete',
        onClick: () => {
          if (selectedLayerIds.length === 0) return;
          const newLayers = layers.filter(l => !selectedLayerIds.includes(l.id));
          onUpdateLayers(newLayers);
          onSelectLayers([]);
        },
        disabled: !hasSelection,
      },
      { label: '', onClick: () => {}, separator: true },
      {
        label: 'Select All',
        onClick: () => {
          const allLayerIds = layers.map(layer => layer.id);
          onSelectLayers(allLayerIds);
        },
      },
      {
        label: 'Deselect All',
        onClick: () => onSelectLayers([]),
        disabled: !hasSelection,
      },
      { label: '', onClick: () => {}, separator: true },
      {
        label: 'Bring to Front',
        onClick: () => {
          if (!scenePackage || !currentScene || selectedLayerIds.length === 0) return;

          // Find max depth in current layers
          const maxDepth = Math.max(...layers.map(l => l.depth));

          // Update selected layers to have depth = maxDepth + 1 (or incrementing from there)
          const updatedLayers = layers.map(layer => {
            if (selectedLayerIds.includes(layer.id)) {
              return { ...layer, depth: maxDepth + 1 };
            }
            return layer;
          });

          onUpdateLayers(updatedLayers);
        },
        disabled: !hasSelection,
      },
      {
        label: 'Send to Back',
        onClick: () => {
          if (!scenePackage || !currentScene || selectedLayerIds.length === 0) return;

          // Find min depth in current layers
          const minDepth = Math.min(...layers.map(l => l.depth));

          // Update selected layers to have depth = minDepth - 1 (or decrementing from there)
          const updatedLayers = layers.map(layer => {
            if (selectedLayerIds.includes(layer.id)) {
              return { ...layer, depth: minDepth - 1 };
            }
            return layer;
          });

          onUpdateLayers(updatedLayers);
        },
        disabled: !hasSelection,
      },
    ];
  };

  // Draw checkerboard background (edit mode only)
  const drawSceneBackground = (ctx: CanvasRenderingContext2D) => {
    const canvasWidth = 1920;
    const canvasHeight = 1080;
    const checkerSize = 20; // Size of each checker square
    const color1 = '#2a2a2a';
    const color2 = '#1f1f1f';

    // Draw checkerboard pattern within scene viewport (0, 0, 1920, 1080)
    for (let y = 0; y < canvasHeight; y += checkerSize) {
      for (let x = 0; x < canvasWidth; x += checkerSize) {
        const isEven = ((x / checkerSize) + (y / checkerSize)) % 2 === 0;
        ctx.fillStyle = isEven ? color1 : color2;
        ctx.fillRect(x, y, checkerSize, checkerSize);
      }
    }
  };

  // Draw viewport boundary outline and mute outside area (always on top)
  const drawViewportOutline = (ctx: CanvasRenderingContext2D) => {
    const canvasWidth = 1920;
    const canvasHeight = 1080;

    // Calculate visible area accounting for zoom/pan to extend overlay far beyond view
    const viewLeft = -pan.x / zoom;
    const viewTop = -pan.y / zoom;
    const viewRight = (1920 - pan.x) / zoom;
    const viewBottom = (1080 - pan.y) / zoom;

    // Large extension to cover any overflow
    const extendSize = 50000;

    // Draw dark grey overlay outside the viewport (four rectangles forming a frame around 0,0,1920,1080)
    ctx.fillStyle = 'rgba(40, 40, 40, 0.7)';

    // Top rectangle (covers everything above y=0)
    ctx.fillRect(viewLeft - extendSize, viewTop - extendSize, viewRight - viewLeft + extendSize * 2, extendSize - viewTop);

    // Bottom rectangle (covers everything below y=1080)
    ctx.fillRect(viewLeft - extendSize, canvasHeight, viewRight - viewLeft + extendSize * 2, viewBottom - canvasHeight + extendSize);

    // Left rectangle (covers everything left of x=0, between y=0 and y=1080)
    ctx.fillRect(viewLeft - extendSize, 0, extendSize - viewLeft, canvasHeight);

    // Right rectangle (covers everything right of x=1920, between y=0 and y=1080)
    ctx.fillRect(canvasWidth, 0, viewRight - canvasWidth + extendSize, canvasHeight);

    // Draw viewport boundary outline
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
  };

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 1920;
    canvas.height = 1080;
    editor.setCanvasSize(1920, 1080);

    const render = () => {
      ctx.save();

      // Apply zoom and pan transform (only in edit mode)
      if (previewMode === 'edit') {
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        // Draw scene background (checkerboard)
        drawSceneBackground(ctx);
      }

      player.update();
      player.render(ctx);

      // If dragging, also render tempLayers on top
      if (previewMode === 'edit' && tempLayers) {
        editor.renderLayers(ctx, tempLayers);
      }

      // Draw viewport outline and mute overlay (only in edit mode)
      if (previewMode === 'edit') {
        drawViewportOutline(ctx);
      }

      // Render selection overlay LAST so it's always on top of everything (only in edit mode)
      if (!isPlaying && previewMode === 'edit' && currentScene) {
        // Use temp layers if dragging, otherwise use actual layers
        const layersToRender = tempLayers || layers;
        editor.renderSelection(ctx, layersToRender);
      }

      // Draw marquee selection box (only in edit mode)
      if (previewMode === 'edit' && marqueeBox) {
        const { x1, y1, x2, y2 } = marqueeBox;
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
        ctx.fillStyle = 'rgba(100, 150, 255, 0.1)';
        ctx.lineWidth = 2;

        ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      }

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [player, editor, isPlaying, previewMode, currentScene, layers, zoom, pan, marqueeBox, tempLayers]);

  return (
    <div className="canvas-preview" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="preview-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        style={{ cursor: isPanning ? 'grabbing' : (dragMode !== 'none' ? 'grabbing' : cursorStyle) }}
      />

      {/* Zoom controls (only in edit mode) */}
      {previewMode === 'edit' && (
        <div className="zoom-controls">
          <button onClick={handleZoomIn} title="Zoom In">+</button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomOut} title="Zoom Out">−</button>
          <button onClick={handleResetZoom} title="Reset Zoom (1:1)">⊙</button>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default CanvasPreview;
