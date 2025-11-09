# Timeline Feature

**Owner:** Timeline Team
**Status:** ✅ Active
**Last Updated:** 2025-11-08

---

## Purpose

Self-contained timeline editor module for managing scenes, layers, and items with drag/drop, resize, and nested scene support.

---

## Public API

### Components
- `<Timeline />` - Main timeline component with ruler, tracks, and playback integration

### Types
- `TimelineProps` - Component props interface
- `TimelineHandle` - Imperative handle for programmatic control
- `ContextMenuState` - Context menu configuration
- `ResizeHandle` - Resize handle type (`'left' | 'right' | null`)

### Actions (Externally Callable)
- `handleAddImage(scenePackage, scenePath, layerId, assets, onUpdate)` - Add image to layer
- `handleAddAudio(scenePackage, scenePath, layerId, assets, onUpdate)` - Add audio to layer
- `handleAddScene(scenePackage, scenePath, layerId, sceneName, onUpdate)` - Create new scene

---

## Internal Structure

```
timeline/
├── components/          ← UI components (internal)
│   ├── Timeline.tsx     ← Main component
│   ├── LayerRow.tsx     ← Layer track row
│   ├── SceneLayerRow.tsx ← Scene child layer row
│   ├── SceneClip.tsx    ← Scene item renderer
│   ├── ImageClip.tsx    ← Image item renderer
│   ├── AudioClip.tsx    ← Audio item renderer
│   ├── EffectClip.tsx   ← Effect item renderer
│   ├── AudioWaveform.tsx ← Waveform visualizer
│   └── TimelineBreadcrumb.tsx ← Navigation breadcrumbs
├── actions/             ← Business logic
│   └── Timeline.actions.ts
├── handlers/            ← Event handlers
│   └── Timeline.handlers.ts
├── utils/               ← Utilities
│   └── Timeline.utils.tsx
├── types.ts             ← Type definitions
├── index.ts             ← Public exports
└── README.md            ← This file
```

---

## Usage Example

```typescript
import { Timeline, type TimelineProps } from '@features/timeline';

function MyApp() {
  return (
    <Timeline
      scenePackage={scenePackage}
      scenePath="/path/to/scene"
      currentTime={0}
      onTimeChange={(time) => setCurrentTime(time)}
      onSelectItem={(id) => setSelectedItemId(id)}
      onSelectLayer={(id) => setSelectedLayerId(id)}
      onUpdate={(pkg) => saveScenePackage(pkg)}
    />
  );
}
```

---

## Dependencies

### Internal (within features)
- Domain: `@domain/timeline` - Pure positioning & validation logic
- Shared Components: `@components/ContextMenu`, `@components/Dialogs/AssetPickerDialog`
- Context: `context/TimelineNavigationContext`, `context/SceneContext`
- Services: `services/sceneSaveService`

### External
- React, React DOM
- Scene Package types from `/types/scenePackage`

---

## Architecture Notes

### Layering
- **components/** - React UI components only
- **actions/** - Scene package mutations (to be refactored to commands)
- **handlers/** - DOM event handlers (to be extracted to hooks)
- **utils/** - Pure helper functions (time formatting, markers, etc.)

### Future Refactoring (See `/docs/arch/0001-timeline-refactor-plan.md`)
1. **PR#2**: Replace `actions/` with command pattern
2. **PR#3**: Extract `handlers/` into custom hooks (`useTimelineDragDrop`, `useTimelineResize`)
3. **Goal**: Reduce Timeline.tsx from 831 lines to <200 lines

---

## Internal Components (Not Exported)

These are implementation details and should NOT be imported externally:

- `LayerRow` - Individual layer track row
- `SceneLayerRow` - Scene child layer row
- `SceneClip` - Scene item renderer with collapse/expand
- `ImageClip`, `AudioClip`, `EffectClip` - Item type renderers
- `AudioWaveform` - Audio waveform visualization
- `BaseClip` - Shared clip rendering logic
- `TimelineBreadcrumb` - Scene navigation breadcrumbs

**Import Rule:** Always import from `@features/timeline`, never reach into `@features/timeline/components/*`

---

## Testing

Tests will be added in future PR:
```
timeline/
└── __tests__/
    ├── Timeline.test.tsx
    ├── calculatePosition.test.ts
    └── dragDrop.test.ts
```

---

## Contributing

1. All changes to this feature should go through the Timeline team
2. Follow the architecture patterns in `/docs/arch/`
3. Keep components small (<300 LOC)
4. Use domain layer for business logic
5. Update this README when adding new public APIs

---

## Related Documentation

- [Refactor Plan](/docs/arch/0001-timeline-refactor-plan.md)
- [Module Map](/docs/arch/module-map.md)
- [Domain Layer](/docs/arch/PR-0001-domain-layer.md)
