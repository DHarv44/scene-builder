import type { ScenePackage } from '../../../types/scenePackage';

export interface TimelineProps {
  scenePackage: ScenePackage | null;
  scenePath: string | null;
  currentTime: number;
  onTimeChange: (time: number) => void;
  onSelectItem: (id: string | null) => void;
  selectedSceneId?: string | null;
  onSelectScene?: (sceneId: string) => void;
  onSelectLayer?: (layerId: string | null) => void;
  onUpdate?: (scenePackage: ScenePackage) => void;
}

export type ResizeHandle = 'left' | 'right' | null;

export interface ContextMenuState {
  type: 'layer' | 'scene' | 'item' | 'timeline' | 'layer-header' | 'scene-header' | 'timeline-empty' | 'camera-track' | 'camera-item' | 'effects-track' | 'effect-item';
  targetId: string;
  x: number;
  y: number;
}
