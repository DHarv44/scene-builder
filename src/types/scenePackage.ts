// Scene Package Type Definitions
// Based on Scene Builder Meta Prompt schema

export type EasingType =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInOutSine';

export interface Keyframe {
  time: number;              // Time relative to scene start (ms)
  value: number;             // Property value at this time
  easing?: EasingType;       // Easing function TO this keyframe
}

export interface KeyframeTrack {
  keyframes: Keyframe[];
}

export interface CameraKeyframe {
  time: number;              // Time relative to scene start (ms)
  x: number;                 // Pan X offset (pixels)
  y: number;                 // Pan Y offset (pixels)
  zoom: number;              // Zoom level (1.0=normal, 2.0=2x zoom)
  easing?: EasingType;
}

export interface CameraTrack {
  keyframes: CameraKeyframe[];
  enableMouseParallax?: boolean;
}

export interface TitleCard {
  text: string;
  fontSize: number;
  offsetY: number;           // Offset from group Y position
  letterSpacing?: number;
  font?: string;
  color?: string;
  outlineColor?: string;
  outlineWidth?: number;
}

export interface TitleCardGroup {
  id: string;
  position: {
    x: number | string;
    y: number | string;
  };
  textAlign?: 'left' | 'center' | 'right';
  fadeInStart: number;
  fadeInDuration?: number;
  holdDuration: number;
  fadeOutDuration?: number;
  cards: TitleCard[];
}

export interface Layer {
  id: string;
  asset: string;             // Asset key from AssetManifest
  depth: number;             // Z-order (0=back, higher=front)

  // Static properties
  position?: {
    x: number | string;
    y: number | string;
  };
  anchor?: 'center' | 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  scale?: number;
  cover?: boolean;
  parallax?: number;

  // Animated properties
  opacity?: KeyframeTrack;
  x?: KeyframeTrack;
  y?: KeyframeTrack;
  rotation?: KeyframeTrack;
  scaleX?: KeyframeTrack;
  scaleY?: KeyframeTrack;
}

export interface FadeTransition {
  duration: number;
  startOffset?: number;
  color?: string;
  easing?: EasingType;
}

// New Timeline Structure
// Timeline contains Layers (horizontal tracks)
// Layers contain Items (placed horizontally by time)
// Items can be: Image, Audio, Effect, or Scene
// Scenes have their own internal layers (recursive structure)

export type TimelineItemType = 'image' | 'audio' | 'effect' | 'scene';

export interface BaseTimelineItem {
  id: string;
  type: TimelineItemType;
  name: string;
  startTime: number;  // Position on the timeline (ms)
  duration: number;   // How long it lasts (ms)
  // Computed: endTime = startTime + duration
}

// Image item
export interface TimelineImage extends BaseTimelineItem {
  type: 'image';
  asset: string;             // Asset key from AssetManifest
  position?: {
    x: number | string;
    y: number | string;
  };
  anchor?: 'center' | 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  scale?: number;
  depth?: number;
  cover?: boolean;
  parallax?: number;
  // Animated properties
  opacity?: KeyframeTrack;
  x?: KeyframeTrack;
  y?: KeyframeTrack;
  rotation?: KeyframeTrack;
  scaleX?: KeyframeTrack;
  scaleY?: KeyframeTrack;
}

// Audio item
export interface TimelineAudio extends BaseTimelineItem {
  type: 'audio';
  asset: string;             // Asset key from AssetManifest.audio
  volume?: number;           // 0.0 to 1.0
  fadeIn?: number;           // Fade in duration (ms)
  fadeOut?: number;          // Fade out duration (ms)
}

// Effect item (fade, camera, etc.)
export interface TimelineEffect extends BaseTimelineItem {
  type: 'effect';
  effectType: 'fade-in' | 'fade-out' | 'camera-pan' | 'camera-zoom' | 'camera-rotate';
  properties: Record<string, any>;  // Effect-specific properties
}

// Scene - contains its own internal layers (RECURSIVE)
export interface TimelineScene extends BaseTimelineItem {
  type: 'scene';
  camera?: CameraTrack;
  layers: TimelineLayer[];   // Internal layers (recursive - can contain more scenes!)
  collapsed?: boolean;       // UI state for showing/hiding internal layers
}

export type TimelineItem = TimelineImage | TimelineAudio | TimelineEffect | TimelineScene;

// Layer - a horizontal track that contains items
export interface TimelineLayer {
  id: string;
  name: string;
  items: TimelineItem[];     // Items placed horizontally by startTime
  collapsed?: boolean;       // UI state
}

export interface Background {
  type: 'color' | 'gradient';
  color?: string;
  gradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    stops?: number[];
    angle?: number;
  };
}

// Deprecated: Old Scene interface (replaced by TimelineScene)
// Keeping Layer interface for legacy canvas rendering support

export interface Timeline {
  layers: TimelineLayer[];   // Horizontal tracks containing items (images, scenes, music, effects)
}

export interface AssetManifest {
  images: { [key: string]: string };
  audio: { [key: string]: string };
}

export interface SceneMetadata {
  id: string;
  type: 'timeline';
  name: string;
  version: string;
  author?: string;
  created: string;
  modified: string;
}

export interface ScenePackage {
  metadata: SceneMetadata;
  timeline: Timeline;
  assets: AssetManifest;
  nextScene?: string;
  skipToScene?: string;
}
