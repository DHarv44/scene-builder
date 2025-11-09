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

// ============================================================================
// CAMERA SYSTEM
// ============================================================================

export interface CameraTransform {
  x: number;                 // Pan X offset (pixels, 0 = centered)
  y: number;                 // Pan Y offset (pixels, 0 = centered)
  zoom: number;              // Zoom level (1.0 = fill canvas, 2.0 = 2x zoom)
  rotation: number;          // Rotation (degrees)
}

export type CameraItemType =
  | 'static'        // Camera doesn't move (holds position)
  | 'pan'           // Horizontal/vertical pan
  | 'zoom'          // Zoom in/out
  | 'dolly'         // Pan + zoom (simulates moving camera)
  | 'rotate'        // Rotation
  | 'shake'         // Handheld shake effect
  | 'follow'        // Follow a layer's movement
  | 'orbit'         // Orbit around a point
  | 'custom';       // Free-form keyframe animation

export interface ShakeProperties {
  magnitude: number;           // Shake intensity (pixels)
  frequency: number;           // Shakes per second
  xAmount: number;             // 0-1 (how much X shake)
  yAmount: number;             // 0-1 (how much Y shake)
  rotationAmount: number;      // 0-1 (how much rotation shake)
  seed?: number;               // Random seed for reproducible shake
  decay?: number;              // Shake decay over time (0-1)
}

export interface FollowProperties {
  targetLayerId: string;       // Layer to follow
  offset: { x: number; y: number };  // Offset from layer center
  smoothing: number;           // 0-1 (0=instant, 1=very smooth)
  limitToBounds?: boolean;     // Keep target in frame
}

export interface OrbitProperties {
  centerX: number;             // Orbit center X
  centerY: number;             // Orbit center Y
  radius: number;              // Orbit radius (pixels)
  startAngle: number;          // Starting angle (degrees)
  endAngle: number;            // Ending angle (degrees)
  clockwise: boolean;          // Direction of orbit
}

export interface CameraItem {
  id: string;
  name: string;
  type: CameraItemType;
  startTime: number;           // Absolute timeline time (ms)
  duration: number;
  start: CameraTransform;      // Starting transform
  end: CameraTransform;        // Ending transform
  easing?: EasingType;
  enabled?: boolean;           // Toggle on/off

  // Type-specific properties
  shake?: ShakeProperties;
  follow?: FollowProperties;
  orbit?: OrbitProperties;
}

export interface CameraTrack {
  items: CameraItem[];
  defaultTransform: CameraTransform;  // Applied when no items are active
}

// ============================================================================
// EFFECTS SYSTEM
// ============================================================================

export type EffectItemType =
  | 'fade-in'
  | 'fade-out'
  | 'mouse-parallax'
  | 'vignette'
  | 'color-grade'
  | 'chromatic-aberration'
  | 'film-grain'
  | 'blur'
  | 'glitch';

export interface MouseParallaxEffect {
  effectType: 'mouse-parallax';
  intensity: number;          // 0-1 (parallax strength)
  smoothing: number;          // 0-1 (response smoothing)
  invertX?: boolean;          // Invert X axis
  invertY?: boolean;          // Invert Y axis
  affectedLayers?: string[];  // Layer IDs to affect (empty = all)
}

export interface VignetteEffect {
  effectType: 'vignette';
  intensity: number;          // 0-1
  radius: number;             // 0-1 (size of clear area)
  feather: number;            // 0-1 (edge softness)
  color: string;              // Vignette color
}

export interface ColorGradeEffect {
  effectType: 'color-grade';
  temperature: number;        // -100 to 100 (cool to warm)
  tint: number;               // -100 to 100 (green to magenta)
  saturation: number;         // 0-200 (0=grayscale, 100=normal, 200=hyper)
  contrast: number;           // 0-200
  brightness: number;         // 0-200
  highlights: number;         // -100 to 100
  shadows: number;            // -100 to 100
}

export interface FilmGrainEffect {
  effectType: 'film-grain';
  intensity: number;          // 0-1
  size: number;               // Grain size (pixels)
  animated: boolean;          // Animate grain over time
}

export interface BlurEffect {
  effectType: 'blur';
  radius: number;             // Blur radius (pixels)
  type: 'gaussian' | 'motion' | 'radial';
  angle?: number;             // For motion blur
  center?: { x: number; y: number };  // For radial blur
}

export interface GlitchEffect {
  effectType: 'glitch';
  intensity: number;          // 0-1
  blockSize: number;          // Glitch block size
  rgbShift: number;           // RGB channel shift amount
  scanlineIntensity: number;  // Scanline strength
}

export interface FadeInEffect {
  effectType: 'fade-in';
  color?: string;             // Fade color (default: black)
}

export interface FadeOutEffect {
  effectType: 'fade-out';
  color?: string;             // Fade color (default: black)
}

export type EffectProperties =
  | MouseParallaxEffect
  | VignetteEffect
  | ColorGradeEffect
  | FilmGrainEffect
  | BlurEffect
  | GlitchEffect
  | FadeInEffect
  | FadeOutEffect;

export interface EffectItem {
  id: string;
  name: string;
  startTime: number;          // Absolute timeline time (ms)
  duration: number;
  properties: EffectProperties;
  enabled?: boolean;          // Toggle on/off
}

export interface EffectTrack {
  items: EffectItem[];
}

// ============================================================================
// TIMELINE STRUCTURE (NEW SCHEMA)
// ============================================================================

export type SceneItemType = 'image' | 'audio';

export interface BaseSceneItem {
  id: string;
  type: SceneItemType;
  name: string;
  startTime: number;          // Time relative to scene start (ms)
  duration: number;
}

// Image item within a scene
export interface ImageItem extends BaseSceneItem {
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
  // Direct transform properties (for canvas editing)
  x?: number;
  y?: number;
  rotation?: number;
  // Animated properties (keyframe tracks)
  opacity?: KeyframeTrack;
  xTrack?: KeyframeTrack;
  yTrack?: KeyframeTrack;
  rotationTrack?: KeyframeTrack;
  scaleX?: KeyframeTrack;
  scaleY?: KeyframeTrack;
}

// Audio item within a scene
export interface AudioItem extends BaseSceneItem {
  type: 'audio';
  asset: string;             // Asset key from AssetManifest.audio
  volume?: number;           // 0.0 to 1.0
  fadeIn?: number;           // Fade in duration (ms)
  fadeOut?: number;          // Fade out duration (ms)
}

export type SceneItem = ImageItem | AudioItem;

// Scene Layer - internal composition layer within a scene (like Photoshop layers)
export interface SceneLayer {
  id: string;
  name: string;
  depth: number;             // Z-order within scene (0=back, higher=front)
  items: SceneItem[];        // Image/Audio items placed by time
  collapsed?: boolean;       // UI state
}

// Timeline Scene - top-level horizontal track
export interface TimelineScene {
  id: string;
  name: string;
  startTime: number;         // Position on timeline (ms)
  duration: number;          // Scene duration (ms)
  layers: SceneLayer[];      // Internal composition layers
  collapsed?: boolean;       // UI state for showing/hiding internal layers
}

export interface Timeline {
  scenes: TimelineScene[];   // Top-level scene tracks
  camera: CameraTrack;       // Global camera track
  effects: EffectTrack;      // Global effects track
}

// ============================================================================
// LEGACY TYPES (for canvas rendering compatibility)
// ============================================================================

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

  // Direct transform properties
  opacity?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;

  // Animated properties (keyframe tracks)
  opacityTrack?: KeyframeTrack;
  x?: KeyframeTrack;
  y?: KeyframeTrack;
  rotationTrack?: KeyframeTrack;
  scaleXTrack?: KeyframeTrack;
  scaleYTrack?: KeyframeTrack;
}

// ============================================================================
// ASSET MANIFEST
// ============================================================================

export interface AssetManifest {
  images: { [key: string]: string };
  audio: { [key: string]: string };
}

// ============================================================================
// SCENE PACKAGE
// ============================================================================

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

// ============================================================================
// DEPRECATED TYPES (kept for migration)
// ============================================================================

// @deprecated Use TimelineScene instead
export interface TimelineLayer {
  id: string;
  name: string;
  items: any[];
  collapsed?: boolean;
}

// @deprecated Legacy timeline item types
export type TimelineItemType = 'image' | 'audio' | 'effect' | 'scene';

export interface TitleCard {
  text: string;
  fontSize: number;
  offsetY: number;
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

export interface FadeTransition {
  duration: number;
  startOffset?: number;
  color?: string;
  easing?: EasingType;
}
