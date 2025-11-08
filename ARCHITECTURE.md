# Scene Builder Architecture

## Overview

Scene Builder is an Electron-based desktop application for creating timeline-based cutscenes. The architecture follows a clean separation of concerns with React for UI, contexts for state management, and a feature-slice pattern for complex components.

## Technology Stack

- **Electron** - Desktop application framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast development and bundling
- **CSS Modules** - Component-scoped styling

## Application Structure

```
scene-builder/
├── main.cjs                    # Electron main process
├── preload.cjs                 # IPC bridge (secure context isolation)
├── src/
│   ├── types/
│   │   ├── scenePackage.ts     # Core data types
│   │   └── electron.d.ts       # Electron API types
│   │
│   └── renderer/
│       ├── App.tsx             # Root component (context setup + routing)
│       │
│       ├── components/         # UI components
│       │   ├── Layout/         # Layout components
│       │   │   ├── MainLayout.tsx
│       │   │   ├── LeftPanel.tsx
│       │   │   ├── MiddlePanel.tsx
│       │   │   └── *.css
│       │   ├── MenuBar/        # Top menu bar
│       │   ├── WelcomeScreen/  # Initial screen
│       │   ├── Timeline/       # Timeline editor
│       │   ├── Properties/     # Properties panel
│       │   ├── Resources/      # File browser
│       │   └── Dialogs/        # Modal dialogs
│       │
│       ├── features/           # Feature slices
│       │   ├── canvas/         # Canvas editor feature
│       │   │   ├── CanvasPreview.tsx
│       │   │   └── Canvas.actions.ts
│       │   └── sceneLayers/    # Scene layers feature
│       │       ├── SceneLayers.tsx
│       │       └── SceneLayers.actions.ts
│       │
│       ├── context/            # React contexts (state management)
│       │   ├── HistoryContext.tsx      # Undo/redo + keyboard shortcuts
│       │   ├── SceneContext.tsx        # Scene package state
│       │   ├── SelectionContext.tsx    # Selection state
│       │   ├── PlaybackContext.tsx     # Playback + animation
│       │   └── LayoutContext.tsx       # UI layout state
│       │
│       ├── services/           # Business logic services
│       │   ├── scenePackageService.ts  # Scene mutations
│       │   ├── timelinePlayer.ts       # Playback engine
│       │   └── canvasEditor.ts         # Canvas interactions
│       │
│       ├── hooks/              # Custom React hooks
│       │   └── useHistory.ts   # Undo/redo state
│       │
│       └── styles/             # Global styles
│           └── App.css
```

## Architecture Patterns

### 1. Context-Based State Management

Global state is managed through React Context API to eliminate prop drilling:

**HistoryContext** - Undo/redo functionality
```typescript
const { scenePackage, updateScene, undo, redo, canUndo, canRedo } = useHistoryContext();
```

**SceneContext** - Scene package and file operations
```typescript
const { scenePackage, scenePath, updateScene, saveScene } = useScenePackage();
```

**SelectionContext** - Selection state across all panels
```typescript
const { selectedLayerIds, selectLayers, selectedSceneId, selectScene } = useSelection();
```

**PlaybackContext** - Timeline playback state
```typescript
const { currentTime, isPlaying, duration, play, pause, seek } = usePlayback();
```

**LayoutContext** - UI panel sizes and resize handlers
```typescript
const { sizes, startResize, previewMode, setPreviewMode } = useLayout();
```

### 2. Feature Slice Pattern

Complex features are organized as self-contained slices with:
- Component file (`.tsx`)
- Actions file (`.actions.ts`) - Business logic
- Styles file (`.css`)

Example: `features/canvas/`
```
canvas/
├── CanvasPreview.tsx       # UI component
├── Canvas.actions.ts       # Business logic (updateCanvasLayers, etc.)
└── Canvas.css              # Styles
```

Benefits:
- Clear separation of UI and logic
- Easy to test business logic
- Reusable actions across components

### 3. Service Layer

Stateless services provide pure functions for complex operations:

**ScenePackageService** - Centralized scene mutations
```typescript
ScenePackageService.bringLayersToFront(scenePackage, sceneId, layerIds)
ScenePackageService.updateLayerProperties(scenePackage, sceneId, layerUpdates)
ScenePackageService.reorderLayersByDepth(scenePackage, sceneId, draggedId, targetId)
```

**TimelinePlayer** - Render scenes at specific times
```typescript
TimelinePlayer.renderAtTime(scenePackage, sceneId, currentTime)
```

### 4. Component Hierarchy

```
App (context providers)
└── HistoryProvider
    └── SceneProvider
        └── SelectionProvider
            └── PlaybackProvider
                └── LayoutProvider
                    ├── MenuBar
                    └── MainLayout
                        ├── LeftPanel
                        │   ├── SceneLayers
                        │   └── ResourceBrowser
                        ├── MiddlePanel
                        │   ├── CanvasPreview
                        │   └── Timeline
                        └── PropertiesPanel
```

## Data Flow

### Scene Updates

1. User interacts with UI component
2. Component calls action function from `.actions.ts`
3. Action function calls `ScenePackageService` method
4. Service returns new immutable scene package
5. Component calls `updateScene()` from context
6. HistoryContext adds to undo stack
7. SceneContext updates state
8. All subscribed components re-render

Example:
```typescript
// User drags layer in canvas
const handleLayerUpdate = (layers) => {
  CanvasActions.updateCanvasLayers(
    selectedSceneId,
    layers,
    updateScene,  // from SceneContext
    saveScene     // from SceneContext
  );
};
```

### File Operations

1. User clicks "Open Scene"
2. MenuBar calls `window.electronAPI.loadScene()`
3. IPC call goes through preload.cjs
4. main.cjs handles file system operation
5. Returns scene package JSON
6. App.tsx updates `scenePath` state
7. HistoryContext receives scene package
8. All contexts update with new data

## IPC (Inter-Process Communication)

### Security Model

- **Context Isolation**: Renderer process cannot directly access Node.js
- **Preload Script**: Exposes safe IPC methods to renderer
- **Main Process**: Handles all file system and OS operations

### API Surface

**Dialog Operations**
- `selectDirectory()` - Pick folder
- `dialog.showOpenDialog(options)` - Advanced file picker

**Scene Operations**
- `createScene(path, name)` - Create new scene
- `loadScene(path)` - Load existing scene
- `saveScene(path, package)` - Save scene

**Asset Operations**
- `importAsset(path, type)` - Import single asset
- `importFiles(path, type, files)` - Batch import
- `deleteAsset(path, type, assetPath)` - Delete asset
- `moveAsset(path, type, source, target)` - Move asset
- `createSubdirectory(path, type, name)` - Create folder
- `listDirectoryTree(path, type)` - Get file tree

**Shell Operations**
- `openPath(path)` - Open in file explorer

## Key Design Decisions

### 1. Why Contexts Over Redux?

- **Simpler**: No boilerplate, less configuration
- **Built-in**: No external dependencies
- **Scoped**: Each context manages a specific domain
- **Performance**: Fine-grained subscriptions with multiple contexts

### 2. Why Feature Slices?

- **Scalability**: Easy to add new features
- **Maintainability**: Related code stays together
- **Testing**: Actions are pure functions
- **Reusability**: Actions can be shared

### 3. Why Immutable Updates?

- **Undo/Redo**: History stack requires snapshots
- **Predictability**: No unexpected mutations
- **React Optimization**: Easy to detect changes
- **Debugging**: Clear data flow

### 4. Independent ResourceBrowser

ResourceBrowser is intentionally decoupled from scene package:
- Shows filesystem state (images/, audio/ folders)
- No scene package manipulation
- Asset registration happens on-demand (when used in timeline)
- Users can manage files independently

## Performance Considerations

### Optimization Strategies

1. **Context Splitting**: Multiple small contexts instead of one large context
2. **Memoization**: useMemo/useCallback for expensive operations
3. **Virtual Scrolling**: For long timeline/layer lists (future)
4. **Lazy Loading**: Components loaded on-demand
5. **Asset Caching**: Preloaded images cached in memory

### Render Optimization

- Canvas uses requestAnimationFrame for smooth playback
- Timeline only re-renders visible items
- Properties panel only renders for selected items

## Testing Strategy

### Unit Tests
- Services (pure functions)
- Actions (business logic)
- Hooks (custom React hooks)

### Integration Tests
- Context interactions
- Feature slices
- IPC communication

### E2E Tests
- Complete workflows (create → edit → export)
- File operations
- Undo/redo

## Future Enhancements

### Planned Improvements

1. **Plugin System**: Extensible effects and transitions
2. **Multi-scene Projects**: Manage multiple scenes in one project
3. **Asset Library**: Reusable asset collections
4. **Collaboration**: Cloud save and sharing
5. **Performance Profiler**: Identify bottlenecks in complex scenes
6. **Timeline Markers**: Named markers for key moments
7. **Audio Waveforms**: Visual audio editing

### Architecture Evolution

- Consider Web Workers for heavy computations
- Implement virtual DOM diffing for timeline
- Add state persistence (auto-save)
- Migrate to modern IPC patterns (contextBridge improvements)

## Troubleshooting

### Common Issues

**Hot Reload Not Working**
- Check Vite dev server is running on port 5174
- Verify VITE_DEV_SERVER_URL environment variable
- Check for TypeScript errors blocking builds

**IPC Calls Failing**
- Verify method exists in preload.cjs
- Check handler exists in main.cjs
- Ensure types match in electron.d.ts

**Context Not Updating**
- Verify component is within provider tree
- Check for reference equality issues (use spread operator)
- Ensure updateScene is called with new object

**Undo/Redo Not Working**
- Verify HistoryContext is at top of provider tree
- Check keyboard event listeners are attached
- Ensure scene updates go through updateScene()

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [React Context API](https://react.dev/reference/react/useContext)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook)
- [Vite Guide](https://vitejs.dev/guide/)
