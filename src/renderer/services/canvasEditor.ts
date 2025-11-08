import type { Layer } from '../../types/scenePackage';

export interface LayerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformHandle {
  type: 'resize' | 'rotate';
  position: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';
  x: number;
  y: number;
}

export class CanvasEditor {
  private canvasWidth: number = 1920;
  private canvasHeight: number = 1080;
  private selectedLayers: Set<string> = new Set();
  private loadedImages: Map<string, HTMLImageElement> = new Map();

  constructor() {}

  setCanvasSize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  setLoadedImages(images: Map<string, HTMLImageElement>) {
    this.loadedImages = images;
  }

  getSelectedLayers(): string[] {
    return Array.from(this.selectedLayers);
  }

  selectLayer(layerId: string, addToSelection: boolean = false) {
    if (!addToSelection) {
      this.selectedLayers.clear();
    }
    this.selectedLayers.add(layerId);
  }

  deselectLayer(layerId: string) {
    this.selectedLayers.delete(layerId);
  }

  clearSelection() {
    this.selectedLayers.clear();
  }

  isLayerSelected(layerId: string): boolean {
    return this.selectedLayers.has(layerId);
  }

  /**
   * Get the bounds of a layer in canvas space
   */
  getLayerBounds(layer: Layer): LayerBounds | null {
    const img = this.loadedImages.get(layer.asset);
    if (!img) return null;

    const parsePosition = (value: number | string | undefined, dimension: number): number => {
      if (value === undefined) return 0;
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.endsWith('%')) {
        return (parseFloat(value) / 100) * dimension;
      }
      return parseFloat(value as string);
    };

    const posX = parsePosition(layer.position?.x, this.canvasWidth);
    const posY = parsePosition(layer.position?.y, this.canvasHeight);

    let x = posX;
    let y = posY;
    const width = img.width * (layer.scale || 1);
    const height = img.height * (layer.scale || 1);

    // Apply anchor offset
    switch (layer.anchor) {
      case 'center':
        x -= width / 2;
        y -= height / 2;
        break;
      case 'top-left':
        // No adjustment
        break;
      case 'bottom-center':
        x -= width / 2;
        y -= height;
        break;
      case 'bottom-left':
        y -= height;
        break;
    }

    return { x, y, width, height };
  }

  /**
   * Check if a point intersects with a layer
   */
  hitTestLayer(layer: Layer, canvasX: number, canvasY: number): boolean {
    const bounds = this.getLayerBounds(layer);
    if (!bounds) return false;

    return (
      canvasX >= bounds.x &&
      canvasX <= bounds.x + bounds.width &&
      canvasY >= bounds.y &&
      canvasY <= bounds.y + bounds.height
    );
  }

  /**
   * Get transform handles for a selected layer
   */
  getTransformHandles(layer: Layer): TransformHandle[] {
    const bounds = this.getLayerBounds(layer);
    if (!bounds) return [];

    const handles: TransformHandle[] = [];
    const handleSize = 8;

    // Corner resize handles
    handles.push(
      { type: 'resize', position: 'nw', x: bounds.x, y: bounds.y },
      { type: 'resize', position: 'ne', x: bounds.x + bounds.width, y: bounds.y },
      { type: 'resize', position: 'se', x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { type: 'resize', position: 'sw', x: bounds.x, y: bounds.y + bounds.height }
    );

    // Edge resize handles
    handles.push(
      { type: 'resize', position: 'n', x: bounds.x + bounds.width / 2, y: bounds.y },
      { type: 'resize', position: 'e', x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
      { type: 'resize', position: 's', x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
      { type: 'resize', position: 'w', x: bounds.x, y: bounds.y + bounds.height / 2 }
    );

    // Rotation handle (above top-center)
    handles.push({
      type: 'rotate',
      position: 'rotate',
      x: bounds.x + bounds.width / 2,
      y: bounds.y - 30
    });

    return handles;
  }

  /**
   * Check if a point hits a transform handle
   */
  hitTestHandle(handles: TransformHandle[], canvasX: number, canvasY: number): TransformHandle | null {
    const handleHitZone = 16; // Increased from 8 to make handles easier to grab
    for (const handle of handles) {
      const dist = Math.sqrt(
        Math.pow(canvasX - handle.x, 2) + Math.pow(canvasY - handle.y, 2)
      );
      if (dist <= handleHitZone) {
        return handle;
      }
    }
    return null;
  }

  /**
   * Convert canvas position to layer position based on anchor
   */
  canvasPosToLayerPos(
    canvasX: number,
    canvasY: number,
    width: number,
    height: number,
    anchor: Layer['anchor']
  ): { x: number; y: number } {
    let x = canvasX;
    let y = canvasY;

    switch (anchor) {
      case 'center':
        x += width / 2;
        y += height / 2;
        break;
      case 'top-left':
        // No adjustment
        break;
      case 'bottom-center':
        x += width / 2;
        y += height;
        break;
      case 'bottom-left':
        y += height;
        break;
    }

    return { x, y };
  }

  /**
   * Render actual layer images
   */
  renderLayers(ctx: CanvasRenderingContext2D, layers: Layer[]) {
    const sortedLayers = [...layers].sort((a, b) => a.depth - b.depth);

    sortedLayers.forEach(layer => {
      const img = this.loadedImages.get(layer.asset);
      if (!img) return;

      ctx.save();

      const parsePosition = (value: number | string | undefined, dimension: number): number => {
        if (value === undefined) return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'string' && value.endsWith('%')) {
          return (parseFloat(value) / 100) * dimension;
        }
        return parseFloat(value as string);
      };

      const posX = parsePosition(layer.position?.x, this.canvasWidth);
      const posY = parsePosition(layer.position?.y, this.canvasHeight);
      const scale = layer.scale || 1;

      let drawX = posX;
      let drawY = posY;
      const width = img.width * scale;
      const height = img.height * scale;

      // Adjust for anchor point
      const anchor = layer.anchor || 'top-left';
      switch (anchor) {
        case 'center':
          drawX -= width / 2;
          drawY -= height / 2;
          break;
        case 'top-center':
          drawX -= width / 2;
          break;
        case 'top-right':
          drawX -= width;
          break;
        case 'center-right':
          drawX -= width;
          drawY -= height / 2;
          break;
        case 'bottom-right':
          drawX -= width;
          drawY -= height;
          break;
        case 'bottom-center':
          drawX -= width / 2;
          drawY -= height;
          break;
        case 'bottom-left':
          drawY -= height;
          break;
      }

      ctx.drawImage(img, drawX, drawY, width, height);
      ctx.restore();
    });
  }

  /**
   * Render selection overlay and transform handles
   */
  renderSelection(ctx: CanvasRenderingContext2D, layers: Layer[]) {
    layers.forEach(layer => {
      if (!this.isLayerSelected(layer.id)) return;

      const bounds = this.getLayerBounds(layer);
      if (!bounds) return;

      // Draw selection outline
      ctx.save();
      ctx.strokeStyle = '#00a0ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.setLineDash([]);

      // Draw transform handles
      const handles = this.getTransformHandles(layer);
      handles.forEach(handle => {
        ctx.fillStyle = handle.type === 'rotate' ? '#ff00ff' : '#ffffff';
        ctx.strokeStyle = '#00a0ff';
        ctx.lineWidth = 1;

        if (handle.type === 'rotate') {
          // Draw rotation handle as circle
          ctx.beginPath();
          ctx.arc(handle.x, handle.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Draw line from top edge to rotation handle
          ctx.beginPath();
          ctx.moveTo(bounds.x + bounds.width / 2, bounds.y);
          ctx.lineTo(handle.x, handle.y);
          ctx.strokeStyle = '#00a0ff';
          ctx.stroke();
        } else {
          // Draw resize handle as square
          ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8);
          ctx.strokeRect(handle.x - 4, handle.y - 4, 8, 8);
        }
      });

      ctx.restore();
    });
  }
}
