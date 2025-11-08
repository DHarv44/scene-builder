import React, { useRef, useEffect, useState } from 'react';
import type { Layer } from '../../../types/scenePackage';
import { TimelinePlayer } from '../../services/timelinePlayer';
import { CanvasEditor, type TransformHandle } from '../../services/canvasEditor';
import { ScenePackageService } from '../../services/scenePackageService';
import ContextMenu, { type ContextMenuItem } from '../../components/Preview/ContextMenu';
import { useScenePackage } from '../../context/SceneContext';
import { useSelection } from '../../context/SelectionContext';
import { usePlayback } from '../../context/PlaybackContext';
import { useLayout } from '../../context/LayoutContext';
import * as CanvasActions from './Canvas.actions';
import './CanvasPreview.css';

type DragMode = 'none' | 'move' | 'resize' | 'rotate' | 'marquee';

const CanvasPreview: React.FC<{ viewMode: 'global' | string }> = ({ viewMode }) => {
  // Contexts
  const { scenePackage, updateScene, saveScene } = useScenePackage();
  const { selectedLayerIds, selectLayers, clearLayerSelection, selectedSceneId } = useSelection();
  const { currentTime, isPlaying } = usePlayback();
  const { previewMode, zoom, setZoom } = useLayout();

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

  // Pan state (calculated based on zoom from LayoutContext)
  const getDefaultPan = (currentZoom: number) => {
    const canvasWidth = 1920;
    const canvasHeight = 1080;
    return {
      x: (canvasWidth - canvasWidth * currentZoom) / 2,
      y: (canvasHeight - canvasHeight * currentZoom) / 2
    };
  };
  const [pan, setPan] = useState(getDefaultPan(zoom));

  // Cursor state
  const [cursorStyle, setCursorStyle] = useState('default');

  // Marquee selection state
  const [marqueeBox, setMarqueeBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Get all visible layers at currentTime from timeline
  const layers = React.useMemo(() => {
    if (!scenePackage || !scenePackage.timeline.layers) return [];

    const result: Layer[] = [];

    if (viewMode === 'global') {
      // Global mode: show all timeline items including scene contents
      const collectGlobalImages = (timelineLayers: any[], timeOffset: number = 0) => {
        timelineLayers.forEach((timelineLayer: any) => {
          timelineLayer.items.forEach((item: any) => {
            const itemStart = timeOffset + item.startTime;
            const itemEnd = itemStart + item.duration;

            if (item.type === 'image' && currentTime >= itemStart && currentTime < itemEnd) {
              const layer = {
                id: item.id,
                asset: item.asset,
                depth: item.depth ?? 0,
                position: { x: item.x || '50%', y: item.y || '50%' },
                scale: item.scale || 1,
                anchor: 'center' as const,
                opacity: item.opacity ?? 1,
                rotation: item.rotation ?? 0,
                scaleX: item.scaleX ?? 1,
                scaleY: item.scaleY ?? 1
              };
              result.push(layer);
            } else if (item.type === 'scene' && currentTime >= itemStart && currentTime < itemEnd) {
              // In global mode, recurse into scenes to show their contents
              if (item.layers) {
                collectGlobalImages(item.layers, itemStart);
              }
            }
          });
        });
      };

      collectGlobalImages(scenePackage.timeline.layers);
    } else {
      // Scene mode: show only the selected scene's internal layers
      const findSceneAndCollect = (timelineLayers: any[], timeOffset: number = 0) => {
        for (const timelineLayer of timelineLayers) {
          for (const item of timelineLayer.items) {
            const itemStart = timeOffset + item.startTime;
            const itemEnd = itemStart + item.duration;

            if (item.type === 'scene' && item.id === viewMode && currentTime >= itemStart && currentTime < itemEnd) {
              // Found the target scene, collect its internal layers
              if (item.layers) {
                item.layers.forEach((sceneLayer: any) => {
                  sceneLayer.items.forEach((sceneItem: any) => {
                    if (sceneItem.type === 'image') {
                      const sceneItemStart = itemStart + sceneItem.startTime;
                      const sceneItemEnd = sceneItemStart + sceneItem.duration;

                      if (currentTime >= sceneItemStart && currentTime < sceneItemEnd) {
                        const layer = {
                          id: sceneItem.id,
                          asset: sceneItem.asset,
                          depth: sceneItem.depth ?? 0,
                          position: { x: sceneItem.x || '50%', y: sceneItem.y || '50%' },
                          scale: sceneItem.scale || 1,
                          anchor: 'center' as const,
                          opacity: sceneItem.opacity ?? 1,
                          rotation: sceneItem.rotation ?? 0,
                          scaleX: sceneItem.scaleX ?? 1,
                          scaleY: sceneItem.scaleY ?? 1
                        };
                        result.push(layer);
                      }
                    }
                  });
                });
              }
              return;
            } else if (item.type === 'scene' && item.layers) {
              // Recursively search in nested scenes
              findSceneAndCollect(item.layers, itemStart);
            }
          }
        }
      };

      findSceneAndCollect(scenePackage.timeline.layers);
    }

    // Sort by depth (lower depth = back, higher depth = front)
    return result.sort((a, b) => a.depth - b.depth);
  }, [scenePackage, currentTime, viewMode]);

  // Load scene package into player
  useEffect(() => {
    if (scenePackage) {
      player.loadScenePackage(scenePackage);
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

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const allLayerIds = layers.map(layer => layer.id);
        selectLayers(allLayerIds);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        selectLayers([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [layers, selectLayers, previewMode]);

  // Wheel event for zoom
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

      const delta = -e.deltaY * 0.001;
      const newZoom = Math.min(Math.max(0.1, zoom + delta), 5.0);

      const zoomRatio = newZoom / zoom;
      const newPanX = mouseX - (mouseX - pan.x) * zoomRatio;
      const newPanY = mouseY - (mouseY - pan.y) * zoomRatio;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    };

    canvas.addEventListener('wheel', wheelHandler, { passive: false });
    return () => canvas.removeEventListener('wheel', wheelHandler);
  }, [zoom, pan, previewMode]);

  // Get canvas coordinates from mouse event
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    return {
      x: (canvasX - pan.x) / zoom,
      y: (canvasY - pan.y) / zoom
    };
  };

  const getCursorForHandle = (handle: TransformHandle): string => {
    if (handle.type === 'rotate') return 'grab';
    const cursorMap: Record<string, string> = {
      'nw': 'nw-resize', 'n': 'n-resize', 'ne': 'ne-resize', 'e': 'e-resize',
      'se': 'se-resize', 's': 's-resize', 'sw': 'sw-resize', 'w': 'w-resize'
    };
    return cursorMap[handle.position] || 'default';
  };

  // Removed handleResetZoom, handleZoomIn, handleZoomOut - now in LayoutContext

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlaying || previewMode === 'preview') return;

    if (e.button === 2) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setInitialPan({ ...pan });
      return;
    }

    if (e.button !== 0) return;

    const coords = getCanvasCoords(e);
    const ctrlKey = e.ctrlKey || e.metaKey;
    const shiftKey = e.shiftKey;

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

    const clickedLayer = [...layers]
      .sort((a, b) => b.depth - a.depth)
      .find(layer => editor.hitTestLayer(layer, coords.x, coords.y));

    if (clickedLayer) {
      if (ctrlKey || shiftKey) {
        if (selectedLayerIds.includes(clickedLayer.id)) {
          selectLayers(selectedLayerIds.filter(id => id !== clickedLayer.id));
        } else {
          selectLayers([...selectedLayerIds, clickedLayer.id]);
        }
      } else {
        if (!selectedLayerIds.includes(clickedLayer.id)) {
          selectLayers([clickedLayer.id]);
        }

        setDragMode('move');
        setDragStart(coords);
        setInitialLayerState({ ...clickedLayer });

        const selectedLayers = layers.filter(l => selectedLayerIds.includes(l.id) || l.id === clickedLayer.id);
        setInitialSelectedLayers(selectedLayers.map(l => ({ ...l })));
      }
    } else {
      setDragMode('marquee');
      setDragStart(coords);
      setMarqueeBox({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlaying || previewMode === 'preview') return;

    if (isPanning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan({ x: initialPan.x + dx, y: initialPan.y + dy });
      return;
    }

    const coords = getCanvasCoords(e);

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

      const hoveredLayer = [...layers]
        .sort((a, b) => b.depth - a.depth)
        .find(layer => editor.hitTestLayer(layer, coords.x, coords.y));

      setCursorStyle(hoveredLayer ? 'move' : 'default');
      return;
    }

    if (dragMode === 'marquee' && dragStart) {
      setMarqueeBox({ x1: dragStart.x, y1: dragStart.y, x2: coords.x, y2: coords.y });
      return;
    }

    if (!dragStart || !initialLayerState) return;

    const dx = coords.x - dragStart.x;
    const dy = coords.y - dragStart.y;

    const updatedLayers = layers.map(layer => {
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

        updated.position = { x: initialX + dx, y: initialY + dy };
        return updated;
      }

      if (layer.id !== initialLayerState.id) return layer;

      const updated = { ...layer };

      if (dragMode === 'move') {
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

        updated.position = { x: initialX + dx, y: initialY + dy };
      } else if (dragMode === 'resize' && dragHandle) {
        const bounds = editor.getLayerBounds(initialLayerState);
        if (!bounds) return layer;

        const initialScale = initialLayerState.scale || 1;
        const shiftKey = e.shiftKey;

        let newWidth = bounds.width;
        let newHeight = bounds.height;

        if (dragHandle.position.includes('e')) newWidth = bounds.width + dx;
        else if (dragHandle.position.includes('w')) newWidth = bounds.width - dx;

        if (dragHandle.position.includes('s')) newHeight = bounds.height + dy;
        else if (dragHandle.position.includes('n')) newHeight = bounds.height - dy;

        const scaleX = newWidth / bounds.width;
        const scaleY = newHeight / bounds.height;

        let newScale = initialScale;
        if (shiftKey) {
          newScale = initialScale * Math.max(scaleX, scaleY);
        } else {
          newScale = initialScale * ((scaleX + scaleY) / 2);
        }

        updated.scale = Math.max(0.1, newScale);
      }

      return updated;
    });

    setTempLayers(updatedLayers);
  };

  const handleMouseUp = () => {
    if (dragMode === 'marquee' && marqueeBox) {
      const { x1, y1, x2, y2 } = marqueeBox;
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);

      const selectedIds = layers.filter(layer => {
        const bounds = editor.getLayerBounds(layer);
        if (!bounds) return false;
        return !(bounds.x + bounds.width < minX || bounds.x > maxX ||
                 bounds.y + bounds.height < minY || bounds.y > maxY);
      }).map(layer => layer.id);

      selectLayers(selectedIds);
      setMarqueeBox(null);
    }

    if (tempLayers && (dragMode === 'move' || dragMode === 'resize' || dragMode === 'rotate')) {
      CanvasActions.updateCanvasLayers(selectedSceneId, tempLayers, updateScene, saveScene);
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

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (previewMode === 'preview') return;
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const getContextMenuItems = (): ContextMenuItem[] => {
    const hasSelection = selectedLayerIds.length > 0;

    return [
      { label: 'Copy', onClick: () => alert('Copy not implemented yet'), disabled: !hasSelection },
      { label: 'Paste', onClick: () => alert('Paste not implemented yet'), disabled: true },
      { label: 'Duplicate', onClick: () => alert('Duplicate not implemented yet'), disabled: !hasSelection },
      { label: '', onClick: () => {}, separator: true },
      {
        label: 'Delete',
        onClick: () => {
          if (selectedSceneId) {
            CanvasActions.deleteLayers(selectedSceneId, selectedLayerIds, updateScene, saveScene, clearLayerSelection);
          }
        },
        disabled: !hasSelection
      },
      { label: '', onClick: () => {}, separator: true },
      {
        label: 'Select All',
        onClick: () => selectLayers(layers.map(l => l.id))
      },
      {
        label: 'Deselect All',
        onClick: () => selectLayers([]),
        disabled: !hasSelection
      },
      { label: '', onClick: () => {}, separator: true },
      {
        label: 'Bring to Front',
        onClick: () => {
          if (selectedSceneId) {
            CanvasActions.bringLayersToFront(selectedSceneId, selectedLayerIds, updateScene, saveScene);
          }
        },
        disabled: !hasSelection
      },
      {
        label: 'Bring Forward',
        onClick: () => {
          if (selectedSceneId) {
            CanvasActions.bringLayersForward(selectedSceneId, selectedLayerIds, updateScene, saveScene);
          }
        },
        disabled: !hasSelection
      },
      {
        label: 'Send Backward',
        onClick: () => {
          if (selectedSceneId) {
            CanvasActions.sendLayersBackward(selectedSceneId, selectedLayerIds, updateScene, saveScene);
          }
        },
        disabled: !hasSelection
      },
      {
        label: 'Send to Back',
        onClick: () => {
          if (selectedSceneId) {
            CanvasActions.sendLayersToBack(selectedSceneId, selectedLayerIds, updateScene, saveScene);
          }
        },
        disabled: !hasSelection
      }
    ];
  };

  const drawSceneBackground = (ctx: CanvasRenderingContext2D) => {
    const canvasWidth = 1920;
    const canvasHeight = 1080;
    const checkerSize = 20;
    const color1 = '#2a2a2a';
    const color2 = '#1f1f1f';

    for (let y = 0; y < canvasHeight; y += checkerSize) {
      for (let x = 0; x < canvasWidth; x += checkerSize) {
        const isEven = ((x / checkerSize) + (y / checkerSize)) % 2 === 0;
        ctx.fillStyle = isEven ? color1 : color2;
        ctx.fillRect(x, y, checkerSize, checkerSize);
      }
    }
  };

  const drawViewportOutline = (ctx: CanvasRenderingContext2D) => {
    const canvasWidth = 1920;
    const canvasHeight = 1080;

    const viewLeft = -pan.x / zoom;
    const viewTop = -pan.y / zoom;
    const viewRight = (1920 - pan.x) / zoom;
    const viewBottom = (1080 - pan.y) / zoom;

    const extendSize = 50000;

    ctx.fillStyle = 'rgba(40, 40, 40, 0.7)';
    ctx.fillRect(viewLeft - extendSize, viewTop - extendSize, viewRight - viewLeft + extendSize * 2, extendSize - viewTop);
    ctx.fillRect(viewLeft - extendSize, canvasHeight, viewRight - viewLeft + extendSize * 2, viewBottom - canvasHeight + extendSize);
    ctx.fillRect(viewLeft - extendSize, 0, extendSize - viewLeft, canvasHeight);
    ctx.fillRect(canvasWidth, 0, viewRight - canvasWidth + extendSize, canvasHeight);

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

    canvas.width = 1920;
    canvas.height = 1080;
    editor.setCanvasSize(1920, 1080);

    const render = () => {
      ctx.save();

      if (previewMode === 'edit') {
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);
        drawSceneBackground(ctx);
      }

      player.update();

      // Render layers from our computed layers array
      const layersToRender = tempLayers || layers;
      editor.renderLayers(ctx, layersToRender);

      if (previewMode === 'edit') {
        drawViewportOutline(ctx);
      }

      if (!isPlaying && previewMode === 'edit' && scenePackage) {
        editor.renderSelection(ctx, layersToRender);
      }

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
  }, [player, editor, isPlaying, previewMode, layers, zoom, pan, marqueeBox, tempLayers, scenePackage, currentTime]);

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
