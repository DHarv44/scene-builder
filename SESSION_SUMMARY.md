# Scene Builder - Session Summary
**Date:** 2025-10-18

## What We Built

Created **Low Sun Scene Builder** - a standalone Electron application for visually creating timeline-based cutscenes. This transforms scene creation from hardcoded TypeScript classes into data-driven JSON packages.

---

## Project Vision

### The Problem
Currently, creating a cutscene in Low Sun requires:
- Writing 700+ line TypeScript scene classes
- Hardcoding timing logic with magic numbers
- Manual alpha/fade calculations for every layer
- Recompilation for every timing tweak

### The Solution
Scene Builder provides:
- Visual timeline editor (Unity Timeline / After Effects style)
- Drag-and-drop asset management
- Keyframe-based animation
- Real-time canvas preview
- Export to scene packages (JSON + assets)
- Drop packages into game → instant playback

---

## Files Created

### Core Project Files
```
tools/scene-builder/
├── SCENE_BUILDER_META_PROMPT.md    # Complete 6000+ line specification
├── SETUP.md                         # Setup and troubleshooting guide
├── SESSION_SUMMARY.md               # This file
├── README.md                        # Project overview
├── package.json                     # Dependencies and scripts
├── main.cjs                         # Electron main process
├── preload.cjs                      # IPC bridge
├── index.html                       # Entry HTML
├── vite.config.ts                   # Vite bundler config
├── tsconfig.json                    # TypeScript config
├── .gitignore                       # Git ignore rules
│
├── scripts/
│   └── run-electron.cjs            # Wrapper to unset ELECTRON_RUN_AS_NODE
│
└── src/
    ├── types/
    │   └── scenePackage.ts         # Complete TypeScript schema
    │
    └── renderer/                    # React UI
        ├── index.tsx               # React entry
        ├── App.tsx                 # Root component
        │
        ├── components/
        │   ├── Timeline/
        │   │   ├── Timeline.tsx    # Timeline editor with ruler/tracks
        │   │   └── Timeline.css
        │   │
        │   ├── Preview/
        │   │   ├── CanvasPreview.tsx      # Canvas preview (1920x1080)
        │   │   ├── CanvasPreview.css
        │   │   ├── PlaybackControls.tsx   # Play/pause/scrub
        │   │   └── PlaybackControls.css
        │   │
        │   └── Properties/
        │       ├── PropertiesPanel.tsx    # Properties editor
        │       └── PropertiesPanel.css
        │
        └── styles/
            ├── index.css           # Global styles
            └── App.css             # App layout styles
```

---

## Scene Package Schema

Defined complete TypeScript types for the scene package system:

```typescript
interface ScenePackage {
  metadata: SceneMetadata;        // ID, name, version, author
  timeline: Timeline;             // Multi-scene timeline
  assets: AssetManifest;          // Image/audio mappings
  nextScene?: string;             // Auto-transition scene
  skipToScene?: string;           // Skip destination
}

interface Timeline {
  duration: number;               // Total ms
  scenes: Scene[];                // Array of sub-scenes
}

interface Scene {
  id: string;
  startTime: number;              // Relative to timeline
  duration: number;
  layers: Layer[];                // Images with animations
  camera?: CameraTrack;           // Zoom/pan keyframes
  titleCards?: TitleCardGroup[];  // Text overlays
  transitions?: {                 // Fade in/out
    fadeIn?: FadeTransition;
    fadeOut?: FadeTransition;
  };
}

interface Layer {
  id: string;
  asset: string;                  // Asset key
  depth: number;                  // Z-order
  position?: { x: string | number; y: string | number };
  anchor?: 'center' | 'top-left' | 'bottom-center' | 'bottom-left';
  opacity?: KeyframeTrack;        // Animated opacity
  // ... more properties
}

interface KeyframeTrack {
  keyframes: Array<{
    time: number;
    value: number;
    easing?: EasingType;
  }>;
}
```

---

## Technical Setup

### Development Workflow
- **Concurrently** runs Vite dev server + Electron
- **Port:** 5174 (different from game's 5173)
- **Hot reload** enabled for React components
- **DevTools** auto-open in development

### Key Dependencies
```json
{
  "dependencies": {
    "electron-log": "^5.4.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "concurrently": "^9.2.1",
    "cross-env": "^10.1.0",
    "electron": "^28.0.0",
    "vite": "^5.0.0",
    "wait-on": "^9.0.1"
  }
}
```

### Scripts
```bash
npm run dev          # Launch Vite + Electron with hot reload
npm run vite:dev     # Vite dev server only
npm run electron     # Electron window only
npm run vite:build   # Build TypeScript + Vite
npm run dist         # Build and package for distribution
```

---

## UI Layout

The Scene Builder features a professional timeline editor interface:

```
┌─────────────────────────────────────────────────────────┐
│  File  Edit  View  Scene  Playback           [?][_][□][×]│
├───────────────────────────────┬─────────────────────────┤
│                               │                         │
│   CANVAS PREVIEW              │   PROPERTIES PANEL      │
│   (1920x1080)                 │   - Scene settings      │
│                               │   - Layer properties    │
│                               │   - Keyframe editor     │
│                               │                         │
├───────────────────────────────┤                         │
│  ◄◄ ◄ ▶ ▶▶ [⏸] 00:15.250     │                         │
├───────────────────────────────┤                         │
│  TIMELINE                     │                         │
│  ─────0s─────30s─────60s───── │                         │
│  ├─ Scene 1 ──┤               │                         │
│  │ 📷 Camera   ▓▓▓▓▓▓▓       │                         │
│  │ 🖼️ Layer 1  ▓▓▓▓▓▓▓       │                         │
│  │ 📝 Title    ▓▓             │                         │
└───────────────────────────────┴─────────────────────────┘
```

---

## Current Status

### ✅ Completed (Phase 1 - Foundation)
- [x] Project structure and configuration
- [x] Electron + React + TypeScript setup
- [x] Complete TypeScript schema (ScenePackage)
- [x] UI layout (menu, preview, timeline, properties)
- [x] Timeline visualization with ruler and playhead
- [x] Playback controls (play/pause/scrub/skip)
- [x] Canvas preview placeholder
- [x] Development workflow (hot reload)
- [x] Logging system (electron-log)
- [x] ELECTRON_RUN_AS_NODE fix (run-electron.cjs wrapper)

### 🚧 Next Steps

**Phase 1: Game Runtime (1 week)**
Build the playback engine in Low Sun game first to validate JSON format:
1. Create `TimelineScene` class (generic scene player)
2. Manually convert IntroScene to JSON
3. Test playback in game
4. Validate schema works

**Phase 2: Scene Builder Features (2-3 weeks)**
1. Asset browser (drag-and-drop import)
2. Timeline editing (add/remove/resize scenes)
3. Keyframe editor (visual opacity/camera curves)
4. Export scene packages (JSON + copy assets)
5. Real-time preview rendering

**Phase 3: Advanced Features (1-2 months)**
- Title card visual editor
- Audio waveform display
- Bezier curve easing editor
- Visual layer positioning (drag on canvas)
- Undo/redo system
- Template library

---

## Design Decisions Made

### 1. Scene Package System
**Decision:** Copy assets into package (self-contained)
**Rationale:** Packages are portable, storage is cheap

### 2. Dev Workflow
**Decision:** Match Low Sun game pattern (concurrently + wait-on)
**Rationale:** Consistent developer experience

### 3. Port Assignment
**Decision:** Use port 5174 (game uses 5173)
**Rationale:** Run both apps simultaneously during development

### 4. ELECTRON_RUN_AS_NODE Fix
**Decision:** Use wrapper script (run-electron.cjs)
**Rationale:** Claude Code sets ELECTRON_RUN_AS_NODE, need to unset it

### 5. Data Format
**Decision:** JSON-based timeline (not TypeScript code)
**Rationale:** Data-driven, visual editing, no recompilation

---

## Architecture Overview

### Two-Part System

**1. Scene Builder (this tool)**
- Visual editor for creating timelines
- Exports scene packages (JSON + assets)
- Standalone Electron app

**2. Game Runtime (Low Sun)**
- Generic `TimelineScene` player
- Loads scene packages from `public/scenes/`
- No hardcoded cutscenes

### Data Flow
```
Scene Builder → Export Package → Drop into game/public/scenes/ → TimelineScene plays it
```

---

## Key Challenges Solved

### 1. ELECTRON_RUN_AS_NODE Issue
**Problem:** Claude Code sets this env var, breaks Electron
**Solution:** Created `run-electron.cjs` wrapper that deletes it

### 2. Port Conflicts
**Problem:** Multiple Vite instances on same port
**Solution:** Auto-increment port (5174 → 5177)

### 3. ES Module vs CommonJS
**Problem:** package.json has `"type": "module"`, broke require()
**Solution:** Named script `.cjs` to force CommonJS mode

---

## Testing Commands

```bash
# Navigate to Scene Builder
cd tools/scene-builder

# Install dependencies (first time only)
npm install

# Launch Scene Builder
npm run dev

# Check logs if issues
# Windows: %USERPROFILE%\AppData\Roaming\low-sun-scene-builder\logs\main.log
```

---

## Documentation

### Complete Specification
See [SCENE_BUILDER_META_PROMPT.md](./SCENE_BUILDER_META_PROMPT.md) for:
- Complete architecture details
- JSON schema reference
- UI component specs
- Implementation phases
- Design principles

### Setup Guide
See [SETUP.md](./SETUP.md) for:
- Quick start instructions
- Troubleshooting
- Project structure
- Development workflow

---

## Success Metrics

### Must Have (Phase 2 - MVP)
- [ ] Import images and audio
- [ ] Create timeline with multiple scenes
- [ ] Add layers with opacity keyframes
- [ ] Add camera zoom/pan keyframes
- [ ] Preview playback with scrubbing
- [ ] Export scene package (JSON + assets)
- [ ] Exported scene plays in game via `TimelineScene`

### Should Have (Phase 3)
- [ ] Title card editor
- [ ] Audio waveform display
- [ ] Visual layer positioning
- [ ] Keyframe curve editor (bezier)
- [ ] Undo/redo

### Nice to Have (Phase 4)
- [ ] Multi-window preview
- [ ] Template library
- [ ] Auto-save / crash recovery
- [ ] Packaged as .exe

---

## Future Vision

Once timeline editor is stable, expand Scene Builder to support:

1. **Level Editor** - Spatial scene editing (building placement)
2. **Combat Editor** - Card game layouts (enemy waves, decks)
3. **Dialogue Editor** - Branching conversations (node graphs)

**Scene Builder becomes the unified toolchain for all Low Sun content creation.**

---

## Session End State

✅ **Scene Builder is running successfully**
- Vite dev server: http://localhost:5177
- Electron window launched with DevTools
- UI rendering correctly (welcome screen visible)
- Hot reload working

🎯 **Ready for Phase 1: Build TimelineScene player in game**

---

## Notes for Future Development

1. **Shared Code:** Scene Builder will eventually need to import Low Sun's rendering code (`CanvasManager`, `CameraController`, etc.). Initially copy files, later extract to shared package.

2. **Asset Management:** Consider implementing asset caching and compression during export.

3. **Preview Rendering:** Timeline preview will reuse game's rendering pipeline for "what you see is what you get" accuracy.

4. **IPC Handlers:** preload.cjs currently has placeholder IPC methods - implement in main process when adding file I/O.

5. **Build Distribution:** When ready to package, ensure electron-builder includes all assets and scripts.

---

**End of Session Summary**
