# Low Sun Scene Builder

Visual timeline editor for creating cutscenes for the Low Sun game.

## Overview

Scene Builder is a standalone Electron application that allows you to visually create timeline-based cutscenes without writing code. It exports self-contained scene packages (JSON + assets) that can be dropped into the Low Sun game for instant playback.

## Features

### Implemented

- ✅ **Visual Timeline Editor** - Multi-track timeline with drag-and-drop
- ✅ **Real-time Preview** - Canvas preview with playback controls
- ✅ **Layer System** - Multi-layer images with depth sorting and z-index controls
- ✅ **Scene Layers Panel** - Visual layer management with drag reordering
- ✅ **Resource Browser** - File system browser for images and audio
- ✅ **Context Menus** - Right-click operations for layers and timeline items
- ✅ **Undo/Redo** - Full history with keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- ✅ **Asset Import** - Drag-and-drop or file picker for images/audio
- ✅ **Layer Transformations** - Position, scale, and depth control
- ✅ **Playback Controls** - Play, pause, seek with timeline scrubbing

### Planned

- ⏳ **Camera Animation** - Keyframe-based zoom and pan
- ⏳ **Opacity Animation** - Fade effects with keyframes
- ⏳ **Title Cards** - Text overlays with timing control
- ⏳ **Export Packages** - Self-contained scene bundles
- ⏳ **Multiple Scenes** - Scene selection and management
- ⏳ **Audio Timeline** - Audio track visualization and editing

## Project Structure

```
scene-builder/
├── main.cjs                    # Electron main process
├── preload.cjs                 # IPC bridge (secure)
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── vite.config.ts              # Vite bundler
├── index.html                  # Entry HTML
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md         # Architecture guide
│   ├── REFACTORING.md          # Refactoring history
│   └── SCENE_BUILDER_META_PROMPT.md
│
├── src/
│   ├── types/                  # TypeScript definitions
│   │   ├── scenePackage.ts     # Core data types
│   │   └── electron.d.ts       # Electron API types
│   │
│   └── renderer/               # React UI
│       ├── index.tsx           # React entry
│       ├── App.tsx             # Root component (113 lines)
│       │
│       ├── components/         # UI components
│       │   ├── Layout/         # Layout system
│       │   ├── MenuBar/        # Top menu
│       │   ├── Timeline/       # Timeline editor
│       │   ├── Properties/     # Properties panel
│       │   ├── Resources/      # File browser
│       │   ├── WelcomeScreen/  # Initial screen
│       │   └── Dialogs/        # Modal dialogs
│       │
│       ├── features/           # Feature slices
│       │   ├── canvas/         # Canvas editor
│       │   └── sceneLayers/    # Scene layers
│       │
│       ├── context/            # React contexts
│       │   ├── HistoryContext.tsx
│       │   ├── SceneContext.tsx
│       │   ├── SelectionContext.tsx
│       │   ├── PlaybackContext.tsx
│       │   └── LayoutContext.tsx
│       │
│       ├── services/           # Business logic
│       │   ├── scenePackageService.ts
│       │   ├── timelinePlayer.ts
│       │   └── canvasEditor.ts
│       │
│       ├── hooks/              # Custom hooks
│       │   └── useHistory.ts
│       │
│       └── styles/             # Global styles
│           └── App.css
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install Dependencies

```bash
cd tools/scene-builder
npm install
```

### Development

```bash
# Run dev server + Electron (recommended)
npm run dev

# Or run separately:
npm run vite:dev  # Terminal 1: Vite dev server
npm run electron  # Terminal 2: Electron window
```

Hot reload is enabled - changes to React components update instantly.

### Build for Production

```bash
# Build distributable
npm run dist

# Output: dist/Scene Builder Setup.exe (or .dmg on macOS)
```

### Other Commands

```bash
npm run vite:build    # Build renderer only
npm run electron:dev  # Start Electron in dev mode
npm run tsc           # Type check
```

## Usage

### Creating a Scene

1. Click **New Scene** or press `Ctrl+N`
2. Choose a directory for your scene
3. Enter scene name
4. Scene Builder creates folder structure:
   ```
   my-scene/
   ├── scene.json       # Scene package
   ├── images/          # Image assets
   └── audio/           # Audio assets
   ```

### Importing Assets

**Resource Browser:**
1. Click ➕ in Resources panel
2. Select images or audio files
3. Files are copied to scene folder

**Drag and Drop:**
1. Drag files from file explorer
2. Drop onto Resource Browser
3. Assets imported automatically

### Building Timeline

1. Select a scene from Scene Layers dropdown
2. Drag assets from Resources to Timeline
3. Adjust timing by dragging timeline items
4. Use context menu for layer operations:
   - Bring to Front / Send to Back
   - Bring Forward / Send Backward
   - Delete layer

### Layer Editing

**Canvas Editor:**
- Drag layers to reposition
- Scale with handles (when implemented)
- Right-click for z-index operations

**Scene Layers Panel:**
- View all layers in scene
- Drag to reorder depth
- Import assets directly to scene

### Playback

- Click ▶️ to play
- Drag playhead to scrub
- Timeline shows current time

### Keyboard Shortcuts

- `Ctrl+Z` - Undo
- `Ctrl+Y` or `Ctrl+Shift+Z` - Redo
- `Ctrl+N` - New scene
- `Ctrl+O` - Open scene
- `Ctrl+S` - Save scene
- `Space` - Play/Pause (planned)
- `Delete` - Delete selected item (planned)

## Architecture

Scene Builder follows a **context-based architecture** with **feature slices**:

- **Contexts** - Global state management (no prop drilling)
- **Feature Slices** - Self-contained features (UI + actions + styles)
- **Services** - Pure business logic (stateless, testable)
- **IPC Bridge** - Secure Electron communication

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.

## Data Format

### Scene Package Structure

```json
{
  "name": "My Scene",
  "version": "1.0",
  "duration": 10000,
  "assets": {
    "images": {
      "background": "./images/bg.png",
      "character": "./images/char.png"
    },
    "audio": {
      "bgm": "./audio/music.wav"
    }
  },
  "timeline": {
    "layers": [
      {
        "id": "scene-1",
        "name": "Opening",
        "type": "scene",
        "items": [
          {
            "id": "scene-1-item",
            "type": "scene",
            "startTime": 0,
            "duration": 10000,
            "layers": [
              {
                "name": "Background",
                "items": [
                  {
                    "id": "bg-layer",
                    "type": "image",
                    "assetKey": "background",
                    "x": 0,
                    "y": 0,
                    "scale": 1.0,
                    "depth": 0
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and design patterns
- [REFACTORING.md](./REFACTORING.md) - Refactoring history and guidelines
- [SCENE_BUILDER_META_PROMPT.md](./SCENE_BUILDER_META_PROMPT.md) - Complete specification

## Development Status

### Recently Completed

- ✅ App.tsx refactor - Reduced from 285 to 113 lines
- ✅ Context-based state management (5 contexts)
- ✅ Feature slice architecture (Canvas, SceneLayers)
- ✅ Layout component system (MainLayout, LeftPanel, MiddlePanel)
- ✅ Independent ResourceBrowser (filesystem-only)
- ✅ Unified context menu system
- ✅ Z-index operations (4 commands: Front, Forward, Backward, Back)
- ✅ Delete asset functionality
- ✅ Scene selector dropdown

### Current Focus

- Timeline refactor to use contexts
- PropertiesPanel refactor to use contexts
- Keyframe editing implementation
- Camera animation system

### Next Milestones

1. **Timeline V2** - Context-based timeline with improved performance
2. **Keyframe Editor** - Visual keyframe editing for opacity and camera
3. **Multi-scene Support** - Create and manage multiple scenes per project
4. **Export System** - Package scenes for Low Sun game integration
5. **Audio Timeline** - Waveform visualization and audio editing

## Contributing

When contributing:

1. Follow the **feature slice pattern** for new features
2. Use **contexts** for state management (no prop drilling)
3. Keep **business logic** in `.actions.ts` or services
4. Maintain **immutability** for all state updates
5. Update **types** in `electron.d.ts` for new IPC methods
6. Add **documentation** to ARCHITECTURE.md for new patterns

See [REFACTORING.md](./REFACTORING.md) for detailed guidelines.

## Troubleshooting

### Dev Server Won't Start

```bash
# Kill port 5174
npx kill-port 5174

# Restart
npm run dev
```

### TypeScript Errors

```bash
# Check for errors
npx tsc --noEmit

# Most unused variable warnings are harmless
```

### Hot Reload Not Working

1. Check Vite dev server is running
2. Verify `VITE_DEV_SERVER_URL=http://localhost:5174` in environment
3. Look for TypeScript errors blocking build

### Electron Won't Launch

1. Check logs: `%APPDATA%\low-sun-scene-builder\logs\main.log`
2. Verify all IPC handlers are registered in `main.cjs`
3. Check for syntax errors in main process files

## Performance

### Target Metrics

- **Initial Load**: < 2 seconds
- **Scene Load**: < 1 second
- **UI Interactions**: < 16ms (60 FPS)
- **Memory Usage**: < 200MB for typical scenes

### Optimization Tips

- Use Chrome DevTools for memory profiling
- React DevTools Profiler for render analysis
- Virtual scrolling for long timelines (planned)
- Asset caching for repeated images

## License

MIT

## Credits

Built for the Low Sun game project.
