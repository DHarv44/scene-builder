import type {
  ScenePackage,
  Timeline,
  TimelineScene,
  SceneLayer,
  SceneItem,
  CameraTrack,
  EffectTrack
} from '../../types/scenePackage';

/**
 * Schema Migration Service
 * Converts old schema (timeline.layers) to new schema (timeline.scenes + camera + effects)
 */

interface OldTimelineLayer {
  id: string;
  name: string;
  items: any[];
  collapsed?: boolean;
}

interface OldTimeline {
  layers: OldTimelineLayer[];
}

interface OldScenePackage {
  metadata: any;
  timeline: OldTimeline;
  assets: any;
  nextScene?: string;
  skipToScene?: string;
}

/**
 * Migrate old schema to new schema
 * Transforms timeline.layers into timeline.scenes with camera and effects tracks
 */
export function migrateOldSchemaToNew(oldPackage: OldScenePackage): ScenePackage {
  const scenes: TimelineScene[] = [];

  // Process each old layer as a potential scene
  oldPackage.timeline.layers.forEach((oldLayer, layerIndex) => {
    // Separate items by type
    const audioItems: any[] = [];
    const imageItems: any[] = [];
    const sceneItems: any[] = [];

    oldLayer.items.forEach((item: any) => {
      if (item.type === 'audio') {
        audioItems.push(item);
      } else if (item.type === 'image') {
        imageItems.push(item);
      } else if (item.type === 'scene') {
        sceneItems.push(item);
      }
    });

    // If layer has audio items, create an audio scene
    if (audioItems.length > 0) {
      const audioSceneLayers: SceneLayer[] = [{
        id: `${oldLayer.id}-audio-layer`,
        name: 'Audio',
        depth: 0,
        items: audioItems.map((audio: any): SceneItem => ({
          id: audio.id,
          type: 'audio',
          name: audio.name || audio.asset,
          asset: audio.asset,
          startTime: audio.startTime || 0,
          duration: audio.duration || 1000,
          volume: audio.volume ?? 1
        })),
        collapsed: false
      }];

      // Calculate duration from audio items
      const maxDuration = audioItems.reduce((max: number, item: any) => {
        const itemEnd = (item.startTime || 0) + (item.duration || 0);
        return Math.max(max, itemEnd);
      }, 0);

      scenes.push({
        id: `${oldLayer.id}-audio`,
        name: `${oldLayer.name} (Audio)`,
        startTime: 0,
        duration: maxDuration || 10000,
        layers: audioSceneLayers,
        collapsed: oldLayer.collapsed ?? false
      });
    }

    // If layer has image items, create a visual scene
    if (imageItems.length > 0) {
      const imageLayers: SceneLayer[] = [];

      // Group images by depth to create layers
      const depthMap = new Map<number, any[]>();
      imageItems.forEach((img: any) => {
        const depth = img.depth ?? 0;
        if (!depthMap.has(depth)) {
          depthMap.set(depth, []);
        }
        depthMap.get(depth)!.push(img);
      });

      // Create a layer for each depth level
      const depths = Array.from(depthMap.keys()).sort((a, b) => a - b);
      depths.forEach((depth, index) => {
        const images = depthMap.get(depth)!;
        imageLayers.push({
          id: `${oldLayer.id}-layer-${depth}`,
          name: `Layer ${index + 1}`,
          depth: index,
          items: images.map((img: any): SceneItem => ({
            id: img.id,
            type: 'image',
            name: img.name || img.asset,
            asset: img.asset,
            startTime: img.startTime || 0,
            duration: img.duration || 1000,
            x: img.x,
            y: img.y,
            scale: img.scale,
            depth: img.depth ?? 0
          })),
          collapsed: false
        });
      });

      // If no layers were created, create a default empty layer
      if (imageLayers.length === 0) {
        imageLayers.push({
          id: `${oldLayer.id}-default-layer`,
          name: 'Default Layer',
          depth: 0,
          items: [],
          collapsed: false
        });
      }

      // Calculate duration from image items
      const maxDuration = imageItems.reduce((max: number, item: any) => {
        const itemEnd = (item.startTime || 0) + (item.duration || 0);
        return Math.max(max, itemEnd);
      }, 0);

      scenes.push({
        id: oldLayer.id,
        name: oldLayer.name,
        startTime: 0,
        duration: maxDuration || 10000,
        layers: imageLayers,
        collapsed: oldLayer.collapsed ?? false
      });
    }

    // Process nested scene items (flatten them)
    sceneItems.forEach((sceneItem: any) => {
      if (sceneItem.layers && sceneItem.layers.length > 0) {
        // Convert nested scene layers to SceneLayer[]
        const nestedLayers: SceneLayer[] = sceneItem.layers.map((nestedLayer: any, idx: number) => ({
          id: nestedLayer.id,
          name: nestedLayer.name,
          depth: idx,
          items: (nestedLayer.items || []).map((item: any): SceneItem => {
            if (item.type === 'image') {
              return {
                id: item.id,
                type: 'image',
                name: item.name || item.asset,
                asset: item.asset,
                startTime: item.startTime || 0,
                duration: item.duration || 1000,
                x: item.x,
                y: item.y,
                scale: item.scale,
                depth: item.depth ?? 0
              };
            } else if (item.type === 'audio') {
              return {
                id: item.id,
                type: 'audio',
                name: item.name || item.asset,
                asset: item.asset,
                startTime: item.startTime || 0,
                duration: item.duration || 1000,
                volume: item.volume ?? 1
              };
            }
            return item;
          }),
          collapsed: nestedLayer.collapsed ?? false
        }));

        scenes.push({
          id: sceneItem.id,
          name: sceneItem.name,
          startTime: sceneItem.startTime || 0,
          duration: sceneItem.duration || 10000,
          layers: nestedLayers,
          collapsed: sceneItem.collapsed ?? false
        });
      }
    });
  });

  // Create default camera and effects tracks
  const camera: CameraTrack = {
    items: [],
    defaultTransform: {
      x: 0,
      y: 0,
      zoom: 1.0,
      rotation: 0
    }
  };

  const effects: EffectTrack = {
    items: []
  };

  const newTimeline: Timeline = {
    scenes,
    camera,
    effects
  };

  return {
    metadata: oldPackage.metadata,
    timeline: newTimeline,
    assets: oldPackage.assets,
    nextScene: oldPackage.nextScene,
    skipToScene: oldPackage.skipToScene
  };
}

/**
 * Create a new empty scene package with default camera and effects tracks
 */
export function createDefaultScenePackage(name: string = 'New Scene'): ScenePackage {
  const timestamp = new Date().toISOString();

  return {
    metadata: {
      id: `scene-${Date.now()}`,
      type: 'timeline',
      name,
      version: '1.0.0',
      created: timestamp,
      modified: timestamp
    },
    timeline: {
      scenes: [],
      camera: {
        items: [],
        defaultTransform: {
          x: 0,
          y: 0,
          zoom: 1.0,
          rotation: 0
        }
      },
      effects: {
        items: []
      }
    },
    assets: {
      images: {},
      audio: {}
    }
  };
}

/**
 * Check if a scene package uses the old schema
 */
export function isOldSchema(pkg: any): boolean {
  return (
    pkg &&
    pkg.timeline &&
    'layers' in pkg.timeline &&
    !('scenes' in pkg.timeline)
  );
}

/**
 * Automatically migrate if old schema is detected
 */
export function autoMigrate(pkg: any): ScenePackage {
  if (isOldSchema(pkg)) {
    console.log('Old schema detected, migrating to new schema...');
    return migrateOldSchemaToNew(pkg as OldScenePackage);
  }
  return pkg as ScenePackage;
}
