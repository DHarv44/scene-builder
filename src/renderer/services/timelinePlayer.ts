import type { ScenePackage, Layer } from '../../types/scenePackage';
import { CameraController, type CameraConfig } from '../shared/CameraController';
import { TitleCard, TitleCardGroup, type TitleCardConfig, type TitleCardGroupConfig } from '../shared/TitleCard';
import { lerp, easing, type EasingType } from '../shared/easing';

/**
 * TimelinePlayer - Plays ScenePackage JSON in canvas preview
 * Manages all rendering, animation, and timing for the Scene Builder preview
 */
export class TimelinePlayer {
  private scenePackage: ScenePackage | null = null;
  private currentTime: number = 0;
  private isPlaying: boolean = false;
  private lastUpdateTime: number = 0;

  private canvasWidth: number = 1920;
  private canvasHeight: number = 1080;

  // Rendering state
  private cameras: Map<string, CameraController> = new Map();
  private titleCards: Map<string, (TitleCard | TitleCardGroup)[]> = new Map();
  private loadedImages: Map<string, HTMLImageElement> = new Map();

  // Audio playback
  private loadedAudio: Map<string, HTMLAudioElement> = new Map();
  private currentSceneAudio: HTMLAudioElement | null = null;
  private currentSceneId: string | null = null;
  private activeTimelineAudio: Map<string, HTMLAudioElement> = new Map(); // Track active timeline audio items

  constructor() {
    this.lastUpdateTime = performance.now();
  }

  /**
   * Load a scene package and initialize all rendering components
   */
  loadScenePackage(scenePackage: ScenePackage): void {
    // Stop and clear all existing audio
    if (this.currentSceneAudio) {
      this.currentSceneAudio.pause();
      this.currentSceneAudio.currentTime = 0;
      this.currentSceneAudio = null;
    }
    this.activeTimelineAudio.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.activeTimelineAudio.clear();
    this.loadedAudio.clear();

    this.scenePackage = scenePackage;
    this.currentTime = 0;
    this.currentSceneId = null;
    this.cameras.clear();
    this.titleCards.clear();

    // Initialize cameras for each scene (using new timeline.scenes structure)
    for (const scene of scenePackage.timeline.scenes || []) {
      if ((scene as any).camera) {
        const cameraConfig: CameraConfig = {
          keyframes: (scene as any).camera.keyframes,
          enableMouseParallax: false // Disabled in preview
        };
        this.cameras.set(scene.id, new CameraController(cameraConfig));
      }

      // Initialize title cards for each scene
      if ((scene as any).titleCards) {
        const cards: (TitleCard | TitleCardGroup)[] = [];

        (scene as any).titleCards.forEach((cardConfig: any) => {
          if ('cards' in cardConfig) {
            // TitleCardGroup
            const groupConfig: TitleCardGroupConfig = {
              position: cardConfig.position,
              textAlign: cardConfig.textAlign,
              fadeInStart: cardConfig.fadeInStart,
              holdDuration: cardConfig.holdDuration,
              cards: cardConfig.cards
            };
            cards.push(new TitleCardGroup(groupConfig, this.canvasWidth, this.canvasHeight));
          } else {
            // Single TitleCard
            const titleConfig: TitleCardConfig = {
              text: cardConfig.text,
              subtitle: cardConfig.subtitle,
              fontSize: cardConfig.fontSize,
              subtitleSize: cardConfig.subtitleSize,
              font: cardConfig.font,
              color: cardConfig.color,
              outlineColor: cardConfig.outlineColor,
              outlineWidth: cardConfig.outlineWidth,
              position: cardConfig.position,
              textAlign: cardConfig.textAlign,
              fadeInStart: cardConfig.fadeInStart,
              fadeInDuration: cardConfig.fadeInDuration,
              holdDuration: cardConfig.holdDuration,
              fadeOutDuration: cardConfig.fadeOutDuration,
              letterSpacing: cardConfig.letterSpacing
            };
            cards.push(new TitleCard(titleConfig, this.canvasWidth, this.canvasHeight));
          }
        });

        this.titleCards.set(scene.id, cards);
      }
    }

    // Preload all images
    this.preloadAssets();
  }

  /**
   * Preload all image and audio assets referenced in the scene package
   */
  private async preloadAssets(): Promise<void> {
    if (!this.scenePackage) return;

    const imagePromises: Promise<void>[] = [];
    const audioPromises: Promise<void>[] = [];

    // Load all images from asset manifest
    Object.entries(this.scenePackage.assets.images).forEach(([key, path]) => {
      const promise = new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.loadedImages.set(key, img);
          resolve();
        };
        img.onerror = () => {
          console.error(`Failed to load image: ${path}`);
          resolve(); // Don't reject - continue loading other images
        };

        // Convert relative path to absolute file URL
        const absolutePath = this.resolveAssetPath(path);
        img.src = absolutePath;
      });
      imagePromises.push(promise);
    });

    // Load all audio from asset manifest
    Object.entries(this.scenePackage.assets.audio).forEach(([key, path]) => {
      const promise = new Promise<void>((resolve, reject) => {
        const audio = new Audio();
        audio.oncanplaythrough = () => {
          this.loadedAudio.set(key, audio);
          resolve();
        };
        audio.onerror = () => {
          console.error(`Failed to load audio: ${path}`);
          resolve(); // Don't reject - continue loading other audio
        };

        // Convert relative path to absolute file URL
        const absolutePath = this.resolveAssetPath(path);
        audio.src = absolutePath;
        audio.preload = 'auto';
      });
      audioPromises.push(promise);
    });

    await Promise.all([...imagePromises, ...audioPromises]);
  }

  /**
   * Resolve relative asset path to scene:// protocol URL
   */
  private resolveAssetPath(relativePath: string): string {
    // Remove leading './' from relative path
    const cleanPath = relativePath.replace(/^\.\//, '');

    // Use custom scene:// protocol
    // The protocol handler in main.cjs will resolve this to the actual file
    return `scene://${cleanPath}`;
  }

  /**
   * Update timeline state (call from animation loop)
   */
  update(): void {
    if (!this.isPlaying || !this.scenePackage) return;

    const now = performance.now();
    const dt = now - this.lastUpdateTime;
    this.lastUpdateTime = now;

    // Advance time
    this.currentTime += dt;

    // Calculate max duration from all scenes
    let maxDuration = 0;
    for (const scene of this.scenePackage.timeline.scenes || []) {
      const sceneEnd = scene.startTime + scene.duration;
      if (sceneEnd > maxDuration) maxDuration = sceneEnd;
    }

    // Loop or stop at end
    if (this.currentTime >= maxDuration) {
      this.currentTime = maxDuration;
      this.pause();
    }

    // Update scene and handle audio
    const scene = this.getCurrentScene();
    if (scene) {
      this.updateSceneAudio(scene);
    }

    // Update timeline audio items
    this.updateTimelineAudio();

    // Update cameras
    this.cameras.forEach((camera, sceneId) => {
      if (scene && scene.id === sceneId) {
        const sceneTime = this.currentTime - scene.startTime;
        camera.update(sceneTime);
      }
    });

    // Update title cards
    this.titleCards.forEach((cards, sceneId) => {
      if (scene && scene.id === sceneId) {
        const sceneTime = this.currentTime - scene.startTime;
        cards.forEach(card => card.update(sceneTime, dt));
      }
    });
  }

  /**
   * Update timeline audio items (audio clips on timeline)
   */
  private updateTimelineAudio(): void {
    if (!this.scenePackage) return;

    const activeAudioIds = new Set<string>();

    // Find all active audio items in all scenes
    const checkAudioInScenes = (scenes: any[]) => {
      scenes.forEach((scene: any) => {
        const sceneStart = scene.startTime;
        const sceneEnd = sceneStart + scene.duration;

        // Only process scenes that are active
        if (this.currentTime >= sceneStart && this.currentTime < sceneEnd) {
          const sceneTime = this.currentTime - sceneStart;

          // Check all scene layers
          (scene.layers || []).forEach((sceneLayer: any) => {
            (sceneLayer.items || []).forEach((item: any) => {
              if (item.type === 'audio') {
                const itemStart = item.startTime;
                const itemEnd = itemStart + item.duration;

                if (sceneTime >= itemStart && sceneTime < itemEnd) {
                  activeAudioIds.add(item.id);

                  const audio = this.loadedAudio.get(item.asset);
                  if (!audio) return;

                  // Calculate audio time relative to item start
                  const audioTime = (sceneTime - itemStart) / 1000; // Convert ms to seconds

                  // Check if this audio is already playing
                  if (!this.activeTimelineAudio.has(item.id)) {
                    // Start playing this audio
                    this.activeTimelineAudio.set(item.id, audio);
                    audio.volume = item.volume ?? 1.0;
                    audio.currentTime = Math.max(0, audioTime);

                    if (this.isPlaying) {
                      audio.play().catch(err => console.error('Error playing timeline audio:', err));
                    }
                  } else {
                    // Only sync if drift is significant (more than 0.5 seconds)
                    const drift = Math.abs(audio.currentTime - audioTime);
                    if (drift > 0.5) {
                      audio.currentTime = Math.max(0, audioTime);
                    }

                    // Ensure playback state matches
                    if (this.isPlaying && audio.paused) {
                      audio.play().catch(err => console.error('Error playing timeline audio:', err));
                    } else if (!this.isPlaying && !audio.paused) {
                      audio.pause();
                    }

                    // Update volume if changed
                    if (item.volume !== undefined && Math.abs(audio.volume - item.volume) > 0.01) {
                      audio.volume = item.volume;
                    }
                  }
                }
              }
            });
          });
        }
      });
    };

    checkAudioInScenes(this.scenePackage.timeline.scenes || []);

    // Stop any audio that's no longer active
    const toRemove: string[] = [];
    this.activeTimelineAudio.forEach((audio, itemId) => {
      if (!activeAudioIds.has(itemId)) {
        audio.pause();
        audio.currentTime = 0;
        toRemove.push(itemId);
      }
    });

    toRemove.forEach(id => this.activeTimelineAudio.delete(id));
  }

  /**
   * Update audio playback based on current scene
   */
  private updateSceneAudio(scene: any): void {
    // Check if we've switched to a different scene
    if (scene.id !== this.currentSceneId) {
      // Stop previous scene audio
      if (this.currentSceneAudio) {
        this.currentSceneAudio.pause();
        this.currentSceneAudio.currentTime = 0;
        this.currentSceneAudio = null;
      }

      this.currentSceneId = scene.id;

      // Start new scene audio if it exists
      if (scene.music) {
        const audio = this.loadedAudio.get(scene.music);
        if (audio) {
          this.currentSceneAudio = audio;
          const volume = scene.musicVolume !== undefined ? scene.musicVolume : 1.0;
          audio.volume = volume;
          audio.currentTime = 0;

          if (this.isPlaying) {
            audio.play().catch(err => {
              console.error('Error playing audio:', err);
            });
          }
        }
      }
    }

    // Sync audio playback time with scene time
    if (this.currentSceneAudio && scene.music) {
      const sceneTime = this.currentTime - scene.startTime;
      const audioTime = sceneTime / 1000; // Convert ms to seconds

      // Sync if difference is significant (> 0.05s) or if not playing (scrubbing)
      const drift = Math.abs(this.currentSceneAudio.currentTime - audioTime);
      if (drift > 0.05 || !this.isPlaying) {
        this.currentSceneAudio.currentTime = Math.max(0, audioTime);
      }

      // Ensure audio playback state matches timeline state
      if (this.isPlaying && this.currentSceneAudio.paused) {
        this.currentSceneAudio.play().catch(err => {
          console.error('Error playing audio:', err);
        });
      } else if (!this.isPlaying && !this.currentSceneAudio.paused) {
        this.currentSceneAudio.pause();
      }
    }
  }

  /**
   * Render current frame to canvas
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.scenePackage) {
      this.renderPlaceholder(ctx);
      return;
    }

    const scene = this.getCurrentScene();
    if (!scene) {
      this.renderPlaceholder(ctx);
      return;
    }

    const sceneTime = this.currentTime - scene.startTime;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.save();

    // Apply camera transform if present
    const camera = this.cameras.get(scene.id);
    if (camera) {
      camera.applyTransform(ctx, this.canvasWidth, this.canvasHeight);
    }

    // Render background
    if (scene.background) {
      this.renderBackground(ctx, scene.background);
    }

    // Flatten scene's internal timeline layers into renderable Layer[] objects
    // Only include items that are active at current scene time
    const renderableLayers: any[] = [];
    if (scene.layers) {
      scene.layers.forEach((timelineLayer: any) => {
        timelineLayer.items.forEach((item: any) => {
          if (item.type === 'image') {
            // Check if item is active at current scene time
            const itemEnd = item.startTime + item.duration;
            if (sceneTime >= item.startTime && sceneTime < itemEnd) {
              renderableLayers.push({
                id: item.id,
                asset: item.asset,
                depth: item.depth ?? 0,
                position: { x: item.x || '50%', y: item.y || '50%' },
                anchor: 'center',
                scale: item.scale || 1
              });
            }
          }
        });
      });
    }

    // Render layers (sorted by depth)
    const sortedLayers = [...renderableLayers].sort((a, b) => a.depth - b.depth);
    sortedLayers.forEach(layer => {
      this.renderLayer(ctx, layer, sceneTime);
    });

    ctx.restore();

    // Render title cards (after camera transform restored)
    const cards = this.titleCards.get(scene.id);
    if (cards) {
      cards.forEach(card => card.render(ctx));
    }

    // Render transitions (fade in/out)
    this.renderTransitions(ctx, scene, sceneTime);
  }

  /**
   * Render placeholder when no scene loaded
   */
  private renderPlaceholder(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.fillStyle = '#666666';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No scene loaded', this.canvasWidth / 2, this.canvasHeight / 2);
  }

  /**
   * Render scene background (color or image)
   */
  private renderBackground(ctx: CanvasRenderingContext2D, background: { type: 'color' | 'image'; value: string }): void {
    if (background.type === 'color') {
      ctx.fillStyle = background.value;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    } else if (background.type === 'image') {
      const img = this.loadedImages.get(background.value);
      if (img) {
        ctx.drawImage(img, 0, 0, this.canvasWidth, this.canvasHeight);
      }
    }
  }

  /**
   * Render a single layer with all animations applied
   */
  private renderLayer(ctx: CanvasRenderingContext2D, layer: Layer, sceneTime: number): void {
    const img = this.loadedImages.get(layer.asset);
    if (!img) return;

    ctx.save();

    // Calculate animated properties
    const animatedOpacity = layer.opacity ? this.evaluateKeyframeTrack(layer.opacity, sceneTime) : 1;
    const staticOpacity = (layer as any).staticOpacity !== undefined ? (layer as any).staticOpacity : 1;
    const opacity = animatedOpacity * staticOpacity;

    const staticRotation = (layer as any).staticRotation || 0;
    const animatedRotation = layer.rotation ? this.evaluateKeyframeTrack(layer.rotation, sceneTime) : 0;
    const rotation = staticRotation + animatedRotation;

    const x = layer.position?.x ?? 0;
    const y = layer.position?.y ?? 0;
    const scale = layer.scale ?? 1;

    ctx.globalAlpha = opacity;

    // Parse position (supports percentages)
    const parsePosition = (value: number | string, dimension: number): number => {
      if (typeof value === 'number') return value;
      if (value.endsWith('%')) {
        return (parseFloat(value) / 100) * dimension;
      }
      return parseFloat(value);
    };

    const posX = parsePosition(x, this.canvasWidth);
    const posY = parsePosition(y, this.canvasHeight);

    // Calculate scaled dimensions
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    // Apply rotation if needed
    if (rotation !== 0) {
      ctx.translate(posX, posY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-posX, -posY);
    }

    // Apply anchor point
    let drawX = posX;
    let drawY = posY;

    switch (layer.anchor) {
      case 'center':
        drawX -= scaledWidth / 2;
        drawY -= scaledHeight / 2;
        break;
      case 'top-left':
        // No adjustment needed
        break;
      case 'bottom-center':
        drawX -= scaledWidth / 2;
        drawY -= scaledHeight;
        break;
      case 'bottom-left':
        drawY -= scaledHeight;
        break;
    }

    ctx.drawImage(img, drawX, drawY, scaledWidth, scaledHeight);

    ctx.restore();
  }

  /**
   * Evaluate keyframe track at given time
   */
  private evaluateKeyframeTrack(track: { keyframes: Array<{ time: number; value: number; easing?: EasingType }> }, time: number): number {
    const keyframes = track.keyframes;

    if (keyframes.length === 0) return 1;
    if (keyframes.length === 1) return keyframes[0].value;

    // Find surrounding keyframes
    let startKeyframe = keyframes[0];
    let endKeyframe = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        startKeyframe = keyframes[i];
        endKeyframe = keyframes[i + 1];
        break;
      }
    }

    // Before first keyframe
    if (time < keyframes[0].time) {
      return keyframes[0].value;
    }

    // After last keyframe
    if (time > keyframes[keyframes.length - 1].time) {
      return keyframes[keyframes.length - 1].value;
    }

    // Interpolate
    const duration = endKeyframe.time - startKeyframe.time;
    const elapsed = time - startKeyframe.time;
    const progress = Math.min(elapsed / duration, 1);

    const easingFunc = endKeyframe.easing ? easing[endKeyframe.easing] : easing.linear;
    const easedProgress = easingFunc(progress);

    return lerp(startKeyframe.value, endKeyframe.value, easedProgress);
  }

  /**
   * Render scene transitions (fade in/out)
   */
  private renderTransitions(ctx: CanvasRenderingContext2D, scene: any, sceneTime: number): void {
    if (!scene.transitions) return;

    let alpha = 0;

    // Fade in
    if (scene.transitions.fadeIn && sceneTime < scene.transitions.fadeIn.duration) {
      const progress = sceneTime / scene.transitions.fadeIn.duration;
      alpha = 1 - progress; // Start opaque, fade to transparent
    }

    // Fade out
    if (scene.transitions.fadeOut) {
      const fadeOutStart = scene.duration - scene.transitions.fadeOut.duration;
      if (sceneTime >= fadeOutStart) {
        const progress = (sceneTime - fadeOutStart) / scene.transitions.fadeOut.duration;
        alpha = Math.max(alpha, progress); // Start transparent, fade to opaque
      }
    }

    if (alpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }
  }

  /**
   * Get the scene that should be rendering at current time
   */
  private getCurrentScene(): any | null {
    if (!this.scenePackage) return null;

    // Find scene in timeline.scenes
    for (const scene of this.scenePackage.timeline.scenes || []) {
      const sceneEnd = scene.startTime + scene.duration;
      if (this.currentTime >= scene.startTime && this.currentTime < sceneEnd) {
        return scene;
      }
    }

    return null;
  }

  /**
   * Playback control methods
   */
  play(): void {
    this.isPlaying = true;
    this.lastUpdateTime = performance.now();

    // Initialize audio for current scene if not already done
    const scene = this.getCurrentScene();
    if (scene) {
      this.updateSceneAudio(scene);
    }

    // Play audio if we're in a scene with music
    if (this.currentSceneAudio) {
      this.currentSceneAudio.play().catch(err => {
        console.error('Error playing audio:', err);
      });
    }
  }

  pause(): void {
    this.isPlaying = false;

    // Pause scene audio
    if (this.currentSceneAudio) {
      this.currentSceneAudio.pause();
    }

    // Pause all timeline audio
    this.activeTimelineAudio.forEach(audio => {
      audio.pause();
    });
  }

  stop(): void {
    this.isPlaying = false;
    this.currentTime = 0;
    this.currentSceneId = null;

    // Stop and reset scene audio
    if (this.currentSceneAudio) {
      this.currentSceneAudio.pause();
      this.currentSceneAudio.currentTime = 0;
      this.currentSceneAudio = null;
    }

    // Stop and reset all timeline audio
    this.activeTimelineAudio.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.activeTimelineAudio.clear();
  }

  seek(time: number): void {
    this.currentTime = Math.max(0, Math.min(time, this.getDuration()));
    this.lastUpdateTime = performance.now();

    // Force audio update when seeking
    const scene = this.getCurrentScene();
    if (scene) {
      this.currentSceneId = null; // Force re-initialization
      this.updateSceneAudio(scene);
    }
  }

  /**
   * Getters
   */
  getCurrentTime(): number {
    return this.currentTime;
  }

  getDuration(): number {
    if (!this.scenePackage) return 0;

    // Calculate max duration from all scenes
    let maxDuration = 0;
    for (const scene of this.scenePackage.timeline.scenes || []) {
      const sceneEnd = scene.startTime + scene.duration;
      if (sceneEnd > maxDuration) maxDuration = sceneEnd;
    }
    return maxDuration;
  }

  getLoadedImages(): Map<string, HTMLImageElement> {
    return this.loadedImages;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;

    // Update all title cards with new dimensions
    this.titleCards.forEach(cards => {
      cards.forEach(card => card.resize(width, height));
    });
  }
}
