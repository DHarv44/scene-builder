import type { EffectItem, EffectProperties } from '../../types/scenePackage';

/**
 * Effects Preset Library
 * Provides pre-configured visual effects for post-processing
 */

export interface EffectPreset {
  name: string;
  description: string;
  duration: number;
  properties: EffectProperties;
}

export const EFFECTS_PRESETS: Record<string, EffectPreset> = {
  // ============================================================================
  // FADE EFFECTS
  // ============================================================================
  'fade-in-black': {
    name: 'Fade In (Black)',
    description: 'Fade in from black',
    duration: 1000,
    properties: {
      effectType: 'fade-in',
      color: '#000000'
    }
  },
  'fade-in-white': {
    name: 'Fade In (White)',
    description: 'Fade in from white',
    duration: 1000,
    properties: {
      effectType: 'fade-in',
      color: '#FFFFFF'
    }
  },
  'fade-out-black': {
    name: 'Fade Out (Black)',
    description: 'Fade out to black',
    duration: 1000,
    properties: {
      effectType: 'fade-out',
      color: '#000000'
    }
  },
  'fade-out-white': {
    name: 'Fade Out (White)',
    description: 'Fade out to white',
    duration: 1000,
    properties: {
      effectType: 'fade-out',
      color: '#FFFFFF'
    }
  },

  // ============================================================================
  // MOUSE PARALLAX
  // ============================================================================
  'parallax-subtle': {
    name: 'Mouse Parallax (Subtle)',
    description: 'Light mouse-based parallax',
    duration: 5000,
    properties: {
      effectType: 'mouse-parallax',
      intensity: 0.3,
      smoothing: 0.8,
      invertX: false,
      invertY: false
    }
  },
  'parallax-medium': {
    name: 'Mouse Parallax (Medium)',
    description: 'Moderate mouse-based parallax',
    duration: 5000,
    properties: {
      effectType: 'mouse-parallax',
      intensity: 0.6,
      smoothing: 0.7,
      invertX: false,
      invertY: false
    }
  },
  'parallax-intense': {
    name: 'Mouse Parallax (Intense)',
    description: 'Strong mouse-based parallax',
    duration: 5000,
    properties: {
      effectType: 'mouse-parallax',
      intensity: 1.0,
      smoothing: 0.5,
      invertX: false,
      invertY: false
    }
  },

  // ============================================================================
  // VIGNETTE
  // ============================================================================
  'vignette-subtle': {
    name: 'Vignette (Subtle)',
    description: 'Light edge darkening',
    duration: 5000,
    properties: {
      effectType: 'vignette',
      intensity: 0.3,
      radius: 0.7,
      feather: 0.8,
      color: '#000000'
    }
  },
  'vignette-classic': {
    name: 'Vignette (Classic)',
    description: 'Traditional vignette effect',
    duration: 5000,
    properties: {
      effectType: 'vignette',
      intensity: 0.6,
      radius: 0.5,
      feather: 0.7,
      color: '#000000'
    }
  },
  'vignette-dramatic': {
    name: 'Vignette (Dramatic)',
    description: 'Heavy edge darkening',
    duration: 5000,
    properties: {
      effectType: 'vignette',
      intensity: 0.9,
      radius: 0.3,
      feather: 0.6,
      color: '#000000'
    }
  },

  // ============================================================================
  // COLOR GRADING
  // ============================================================================
  'colorgrade-warm': {
    name: 'Warm Color Grade',
    description: 'Warm, golden tones',
    duration: 5000,
    properties: {
      effectType: 'color-grade',
      temperature: 30,
      tint: -10,
      saturation: 110,
      contrast: 105,
      brightness: 102,
      highlights: 5,
      shadows: -5
    }
  },
  'colorgrade-cool': {
    name: 'Cool Color Grade',
    description: 'Cool, blue tones',
    duration: 5000,
    properties: {
      effectType: 'color-grade',
      temperature: -30,
      tint: 10,
      saturation: 105,
      contrast: 105,
      brightness: 100,
      highlights: 0,
      shadows: 0
    }
  },
  'colorgrade-cinematic': {
    name: 'Cinematic Color Grade',
    description: 'Film-like color treatment',
    duration: 5000,
    properties: {
      effectType: 'color-grade',
      temperature: 15,
      tint: -5,
      saturation: 90,
      contrast: 115,
      brightness: 98,
      highlights: -10,
      shadows: -15
    }
  },
  'colorgrade-desaturated': {
    name: 'Desaturated Look',
    description: 'Muted, low-saturation style',
    duration: 5000,
    properties: {
      effectType: 'color-grade',
      temperature: 0,
      tint: 0,
      saturation: 50,
      contrast: 110,
      brightness: 100,
      highlights: 0,
      shadows: 0
    }
  },
  'colorgrade-vintage': {
    name: 'Vintage Look',
    description: 'Retro, faded colors',
    duration: 5000,
    properties: {
      effectType: 'color-grade',
      temperature: 20,
      tint: 15,
      saturation: 70,
      contrast: 90,
      brightness: 105,
      highlights: 15,
      shadows: 20
    }
  },
  'colorgrade-bw': {
    name: 'Black & White',
    description: 'Full desaturation',
    duration: 5000,
    properties: {
      effectType: 'color-grade',
      temperature: 0,
      tint: 0,
      saturation: 0,
      contrast: 110,
      brightness: 100,
      highlights: 0,
      shadows: 0
    }
  },

  // ============================================================================
  // FILM GRAIN
  // ============================================================================
  'grain-subtle': {
    name: 'Film Grain (Subtle)',
    description: 'Light film grain texture',
    duration: 5000,
    properties: {
      effectType: 'film-grain',
      intensity: 0.15,
      size: 1,
      animated: true
    }
  },
  'grain-medium': {
    name: 'Film Grain (Medium)',
    description: 'Moderate film grain',
    duration: 5000,
    properties: {
      effectType: 'film-grain',
      intensity: 0.3,
      size: 1.5,
      animated: true
    }
  },
  'grain-heavy': {
    name: 'Film Grain (Heavy)',
    description: 'Strong film grain effect',
    duration: 5000,
    properties: {
      effectType: 'film-grain',
      intensity: 0.6,
      size: 2,
      animated: true
    }
  },
  'grain-8mm': {
    name: '8mm Film Grain',
    description: 'Home movie grain texture',
    duration: 5000,
    properties: {
      effectType: 'film-grain',
      intensity: 0.8,
      size: 3,
      animated: true
    }
  },

  // ============================================================================
  // BLUR
  // ============================================================================
  'blur-soft': {
    name: 'Soft Blur',
    description: 'Light gaussian blur',
    duration: 5000,
    properties: {
      effectType: 'blur',
      radius: 3,
      type: 'gaussian'
    }
  },
  'blur-medium': {
    name: 'Medium Blur',
    description: 'Moderate gaussian blur',
    duration: 5000,
    properties: {
      effectType: 'blur',
      radius: 8,
      type: 'gaussian'
    }
  },
  'blur-heavy': {
    name: 'Heavy Blur',
    description: 'Strong gaussian blur',
    duration: 5000,
    properties: {
      effectType: 'blur',
      radius: 15,
      type: 'gaussian'
    }
  },
  'motion-blur-horizontal': {
    name: 'Motion Blur (Horizontal)',
    description: 'Horizontal motion blur',
    duration: 5000,
    properties: {
      effectType: 'blur',
      radius: 10,
      type: 'motion',
      angle: 0
    }
  },
  'motion-blur-vertical': {
    name: 'Motion Blur (Vertical)',
    description: 'Vertical motion blur',
    duration: 5000,
    properties: {
      effectType: 'blur',
      radius: 10,
      type: 'motion',
      angle: 90
    }
  },
  'radial-blur': {
    name: 'Radial Blur',
    description: 'Blur radiating from center',
    duration: 5000,
    properties: {
      effectType: 'blur',
      radius: 12,
      type: 'radial',
      center: { x: 960, y: 540 }
    }
  },

  // ============================================================================
  // GLITCH
  // ============================================================================
  'glitch-subtle': {
    name: 'Glitch (Subtle)',
    description: 'Light digital corruption',
    duration: 2000,
    properties: {
      effectType: 'glitch',
      intensity: 0.2,
      blockSize: 8,
      rgbShift: 2,
      scanlineIntensity: 0.1
    }
  },
  'glitch-medium': {
    name: 'Glitch (Medium)',
    description: 'Moderate digital distortion',
    duration: 2000,
    properties: {
      effectType: 'glitch',
      intensity: 0.5,
      blockSize: 16,
      rgbShift: 5,
      scanlineIntensity: 0.3
    }
  },
  'glitch-intense': {
    name: 'Glitch (Intense)',
    description: 'Severe digital corruption',
    duration: 2000,
    properties: {
      effectType: 'glitch',
      intensity: 0.8,
      blockSize: 32,
      rgbShift: 10,
      scanlineIntensity: 0.6
    }
  },
  'glitch-rgb-shift': {
    name: 'RGB Channel Shift',
    description: 'Chromatic aberration effect',
    duration: 2000,
    properties: {
      effectType: 'glitch',
      intensity: 0.3,
      blockSize: 4,
      rgbShift: 15,
      scanlineIntensity: 0.1
    }
  },
  'glitch-scanlines': {
    name: 'CRT Scanlines',
    description: 'Old monitor scanline effect',
    duration: 5000,
    properties: {
      effectType: 'glitch',
      intensity: 0.1,
      blockSize: 2,
      rgbShift: 1,
      scanlineIntensity: 0.8
    }
  }
};

/**
 * Create an effect item from a preset
 */
export function createEffectItemFromPreset(
  presetKey: string,
  startTime: number,
  customDuration?: number
): EffectItem {
  const preset = EFFECTS_PRESETS[presetKey];
  if (!preset) {
    throw new Error(`Effect preset "${presetKey}" not found`);
  }

  return {
    id: `effect-${presetKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: preset.name,
    startTime,
    duration: customDuration || preset.duration,
    properties: preset.properties,
    enabled: true
  };
}

/**
 * Get all preset categories for UI organization
 */
export const EFFECTS_PRESET_CATEGORIES = {
  fade: ['fade-in-black', 'fade-in-white', 'fade-out-black', 'fade-out-white'],
  parallax: ['parallax-subtle', 'parallax-medium', 'parallax-intense'],
  vignette: ['vignette-subtle', 'vignette-classic', 'vignette-dramatic'],
  colorGrade: [
    'colorgrade-warm',
    'colorgrade-cool',
    'colorgrade-cinematic',
    'colorgrade-desaturated',
    'colorgrade-vintage',
    'colorgrade-bw'
  ],
  grain: ['grain-subtle', 'grain-medium', 'grain-heavy', 'grain-8mm'],
  blur: [
    'blur-soft',
    'blur-medium',
    'blur-heavy',
    'motion-blur-horizontal',
    'motion-blur-vertical',
    'radial-blur'
  ],
  glitch: [
    'glitch-subtle',
    'glitch-medium',
    'glitch-intense',
    'glitch-rgb-shift',
    'glitch-scanlines'
  ]
};
