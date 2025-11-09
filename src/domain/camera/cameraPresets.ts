import type { CameraItem, CameraItemType, CameraTransform } from '../../types/scenePackage';

/**
 * Camera Preset Library
 * Provides pre-configured camera movements for common cinematic effects
 */

export interface CameraPreset {
  name: string;
  description: string;
  type: CameraItemType;
  duration: number;
  start: CameraTransform;
  end: CameraTransform;
  easing?: string;
  shake?: any;
  orbit?: any;
}

const DEFAULT_TRANSFORM: CameraTransform = {
  x: 0,
  y: 0,
  zoom: 1.0,
  rotation: 0
};

export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  // ============================================================================
  // ZOOM PRESETS
  // ============================================================================
  'slow-zoom-in': {
    name: 'Slow Zoom In',
    description: 'Gradual zoom into the scene',
    type: 'zoom',
    duration: 3000,
    start: { ...DEFAULT_TRANSFORM, zoom: 1.0 },
    end: { ...DEFAULT_TRANSFORM, zoom: 1.5 },
    easing: 'easeInOutCubic'
  },
  'slow-zoom-out': {
    name: 'Slow Zoom Out',
    description: 'Gradual zoom out from the scene',
    type: 'zoom',
    duration: 3000,
    start: { ...DEFAULT_TRANSFORM, zoom: 1.5 },
    end: { ...DEFAULT_TRANSFORM, zoom: 1.0 },
    easing: 'easeInOutCubic'
  },
  'quick-zoom-in': {
    name: 'Quick Zoom In',
    description: 'Fast zoom for impact',
    type: 'zoom',
    duration: 800,
    start: { ...DEFAULT_TRANSFORM, zoom: 1.0 },
    end: { ...DEFAULT_TRANSFORM, zoom: 2.0 },
    easing: 'easeOutQuad'
  },
  'dramatic-zoom-in': {
    name: 'Dramatic Zoom In',
    description: 'Intense close-up zoom',
    type: 'zoom',
    duration: 2000,
    start: { ...DEFAULT_TRANSFORM, zoom: 1.0 },
    end: { ...DEFAULT_TRANSFORM, zoom: 3.0 },
    easing: 'easeInOutCubic'
  },

  // ============================================================================
  // PAN PRESETS
  // ============================================================================
  'pan-right': {
    name: 'Pan Right',
    description: 'Smooth pan to the right',
    type: 'pan',
    duration: 2000,
    start: { ...DEFAULT_TRANSFORM, x: 0 },
    end: { ...DEFAULT_TRANSFORM, x: -300 },
    easing: 'easeInOutSine'
  },
  'pan-left': {
    name: 'Pan Left',
    description: 'Smooth pan to the left',
    type: 'pan',
    duration: 2000,
    start: { ...DEFAULT_TRANSFORM, x: 0 },
    end: { ...DEFAULT_TRANSFORM, x: 300 },
    easing: 'easeInOutSine'
  },
  'pan-up': {
    name: 'Pan Up',
    description: 'Smooth pan upward',
    type: 'pan',
    duration: 2000,
    start: { ...DEFAULT_TRANSFORM, y: 0 },
    end: { ...DEFAULT_TRANSFORM, y: 200 },
    easing: 'easeInOutSine'
  },
  'pan-down': {
    name: 'Pan Down',
    description: 'Smooth pan downward',
    type: 'pan',
    duration: 2000,
    start: { ...DEFAULT_TRANSFORM, y: 0 },
    end: { ...DEFAULT_TRANSFORM, y: -200 },
    easing: 'easeInOutSine'
  },
  'quick-pan-right': {
    name: 'Quick Pan Right',
    description: 'Fast whip pan to the right',
    type: 'pan',
    duration: 600,
    start: { ...DEFAULT_TRANSFORM, x: 0 },
    end: { ...DEFAULT_TRANSFORM, x: -400 },
    easing: 'easeOutQuad'
  },

  // ============================================================================
  // DOLLY PRESETS (Pan + Zoom)
  // ============================================================================
  'dolly-in-right': {
    name: 'Dolly In Right',
    description: 'Move forward and right (classic dolly)',
    type: 'dolly',
    duration: 2500,
    start: { x: 0, y: 0, zoom: 1.0, rotation: 0 },
    end: { x: -200, y: 0, zoom: 1.8, rotation: 0 },
    easing: 'easeInOutCubic'
  },
  'dolly-in-left': {
    name: 'Dolly In Left',
    description: 'Move forward and left',
    type: 'dolly',
    duration: 2500,
    start: { x: 0, y: 0, zoom: 1.0, rotation: 0 },
    end: { x: 200, y: 0, zoom: 1.8, rotation: 0 },
    easing: 'easeInOutCubic'
  },
  'dolly-out': {
    name: 'Dolly Out',
    description: 'Pull back from the scene',
    type: 'dolly',
    duration: 2500,
    start: { x: 0, y: 0, zoom: 2.0, rotation: 0 },
    end: { x: 0, y: 0, zoom: 1.0, rotation: 0 },
    easing: 'easeInOutCubic'
  },
  'dramatic-dolly': {
    name: 'Dramatic Dolly In',
    description: 'Aggressive push-in with offset',
    type: 'dolly',
    duration: 1800,
    start: { x: 100, y: 50, zoom: 1.0, rotation: 0 },
    end: { x: -150, y: -80, zoom: 2.5, rotation: 0 },
    easing: 'easeInCubic'
  },

  // ============================================================================
  // ROTATION PRESETS
  // ============================================================================
  'rotate-cw': {
    name: 'Rotate Clockwise',
    description: 'Slow clockwise rotation',
    type: 'rotate',
    duration: 4000,
    start: { ...DEFAULT_TRANSFORM, rotation: 0 },
    end: { ...DEFAULT_TRANSFORM, rotation: 15 },
    easing: 'easeInOutSine'
  },
  'rotate-ccw': {
    name: 'Rotate Counter-Clockwise',
    description: 'Slow counter-clockwise rotation',
    type: 'rotate',
    duration: 4000,
    start: { ...DEFAULT_TRANSFORM, rotation: 0 },
    end: { ...DEFAULT_TRANSFORM, rotation: -15 },
    easing: 'easeInOutSine'
  },
  'dutch-angle': {
    name: 'Dutch Angle',
    description: 'Quick tilt for dramatic effect',
    type: 'rotate',
    duration: 800,
    start: { ...DEFAULT_TRANSFORM, rotation: 0 },
    end: { ...DEFAULT_TRANSFORM, rotation: 8 },
    easing: 'easeOutQuad'
  },

  // ============================================================================
  // SHAKE PRESETS
  // ============================================================================
  'handheld-subtle': {
    name: 'Handheld (Subtle)',
    description: 'Light camera shake for realism',
    type: 'shake',
    duration: 5000,
    start: DEFAULT_TRANSFORM,
    end: DEFAULT_TRANSFORM,
    shake: {
      magnitude: 4,
      frequency: 8,
      xAmount: 0.6,
      yAmount: 0.4,
      rotationAmount: 0.2,
      decay: 0
    }
  },
  'handheld-medium': {
    name: 'Handheld (Medium)',
    description: 'Moderate camera shake',
    type: 'shake',
    duration: 5000,
    start: DEFAULT_TRANSFORM,
    end: DEFAULT_TRANSFORM,
    shake: {
      magnitude: 8,
      frequency: 12,
      xAmount: 0.7,
      yAmount: 0.5,
      rotationAmount: 0.3,
      decay: 0
    }
  },
  'handheld-intense': {
    name: 'Handheld (Intense)',
    description: 'Heavy camera shake for action',
    type: 'shake',
    duration: 5000,
    start: DEFAULT_TRANSFORM,
    end: DEFAULT_TRANSFORM,
    shake: {
      magnitude: 15,
      frequency: 18,
      xAmount: 0.8,
      yAmount: 0.7,
      rotationAmount: 0.5,
      decay: 0
    }
  },
  'earthquake': {
    name: 'Earthquake',
    description: 'Violent shaking effect',
    type: 'shake',
    duration: 3000,
    start: DEFAULT_TRANSFORM,
    end: DEFAULT_TRANSFORM,
    shake: {
      magnitude: 25,
      frequency: 20,
      xAmount: 0.8,
      yAmount: 0.9,
      rotationAmount: 0.4,
      decay: 0.3
    }
  },
  'impact-shake': {
    name: 'Impact Shake',
    description: 'Single impact with decay',
    type: 'shake',
    duration: 1200,
    start: DEFAULT_TRANSFORM,
    end: DEFAULT_TRANSFORM,
    shake: {
      magnitude: 30,
      frequency: 15,
      xAmount: 0.7,
      yAmount: 0.7,
      rotationAmount: 0.5,
      decay: 0.8
    }
  },

  // ============================================================================
  // ORBIT PRESETS
  // ============================================================================
  'orbit-cw': {
    name: 'Orbit Clockwise',
    description: 'Rotate around center point',
    type: 'orbit',
    duration: 6000,
    start: DEFAULT_TRANSFORM,
    end: DEFAULT_TRANSFORM,
    orbit: {
      centerX: 0,
      centerY: 0,
      radius: 300,
      startAngle: 0,
      endAngle: 360,
      clockwise: true
    }
  },
  'orbit-ccw': {
    name: 'Orbit Counter-Clockwise',
    description: 'Rotate around center point (reverse)',
    type: 'orbit',
    duration: 6000,
    start: DEFAULT_TRANSFORM,
    end: DEFAULT_TRANSFORM,
    orbit: {
      centerX: 0,
      centerY: 0,
      radius: 300,
      startAngle: 0,
      endAngle: 360,
      clockwise: false
    }
  },
  'half-orbit': {
    name: 'Half Orbit',
    description: '180-degree rotation around subject',
    type: 'orbit',
    duration: 4000,
    start: DEFAULT_TRANSFORM,
    end: DEFAULT_TRANSFORM,
    orbit: {
      centerX: 0,
      centerY: 0,
      radius: 400,
      startAngle: 0,
      endAngle: 180,
      clockwise: true
    }
  },

  // ============================================================================
  // STATIC PRESETS
  // ============================================================================
  'hold-center': {
    name: 'Hold Center',
    description: 'Static camera at default position',
    type: 'static',
    duration: 5000,
    start: DEFAULT_TRANSFORM,
    end: DEFAULT_TRANSFORM
  },
  'hold-zoomed': {
    name: 'Hold Zoomed In',
    description: 'Static camera zoomed in',
    type: 'static',
    duration: 5000,
    start: { ...DEFAULT_TRANSFORM, zoom: 1.5 },
    end: { ...DEFAULT_TRANSFORM, zoom: 1.5 }
  }
};

/**
 * Create a camera item from a preset
 */
export function createCameraItemFromPreset(
  presetKey: string,
  startTime: number,
  customDuration?: number
): CameraItem {
  const preset = CAMERA_PRESETS[presetKey];
  if (!preset) {
    throw new Error(`Camera preset "${presetKey}" not found`);
  }

  return {
    id: `camera-${presetKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: preset.name,
    type: preset.type,
    startTime,
    duration: customDuration || preset.duration,
    start: preset.start,
    end: preset.end,
    easing: preset.easing as any,
    shake: preset.shake,
    orbit: preset.orbit,
    enabled: true
  };
}

/**
 * Get all preset categories for UI organization
 */
export const CAMERA_PRESET_CATEGORIES = {
  zoom: ['slow-zoom-in', 'slow-zoom-out', 'quick-zoom-in', 'dramatic-zoom-in'],
  pan: ['pan-right', 'pan-left', 'pan-up', 'pan-down', 'quick-pan-right'],
  dolly: ['dolly-in-right', 'dolly-in-left', 'dolly-out', 'dramatic-dolly'],
  rotate: ['rotate-cw', 'rotate-ccw', 'dutch-angle'],
  shake: ['handheld-subtle', 'handheld-medium', 'handheld-intense', 'earthquake', 'impact-shake'],
  orbit: ['orbit-cw', 'orbit-ccw', 'half-orbit'],
  static: ['hold-center', 'hold-zoomed']
};
