# Low Sun Scene Builder - Meta Prompt

## Project Vision

**Low Sun Scene Builder** is a standalone Electron application for visually creating timeline-based cutscenes for the Low Sun game. It transforms scene creation from hardcoded TypeScript classes into data-driven JSON packages that can be dropped into the game runtime.

---

## Core Concept

### The Problem
Currently, creating a cutscene in Low Sun requires:
- Writing a 700+ line TypeScript scene class
- Hardcoding timing logic with magic numbers (`dt * 0.000142857`)
- Manual alpha/fade calculations for every layer
- Tight coupling between scene data and playback logic
- Recompilation for every timing tweak

### The Solution
**Scene Builder** provides:
- Visual timeline editor (like Unity Timeline or Adobe After Effects)
- Drag-and-drop asset management
- Keyframe-based animation for opacity, camera, and effects
- Real-time preview with audio sync
- Export to self-contained scene packages (JSON + assets)
- Drop packages into game → instant playback via generic `TimelineScene` runtime

---

## Architecture Overview

### Two-Part System

#### 1. Scene Builder (this tool - Electron dev app)
- Visual timeline editor for creating cutscenes
- Asset browser (images, audio)
- Keyframe editors (camera zoom/pan, layer opacity)
- Title card designer
- Real-time canvas preview
- Export scene packages

#### 2. Game Runtime (Low Sun game - separate app)
- Generic `TimelineScene` class (plays any timeline JSON)
- Scene package loader (auto-discovers `public/scenes/`)
- No hardcoded cutscenes - everything data-driven
- Hot reload support during development

---

## Scene Package System

### Package Structure
```
scenes/
├── intro/
│   ├── scene.json          # Timeline definition (schema below)
│   ├── metadata.json       # Scene metadata (id, type, version)
│   └── assets/
│       ├── burning-house-far.png
│       ├── tree-man.png
│       └── dying-sun.wav
│
├── chapter1-opener/
│   ├── scene.json
│   ├── metadata.json
│   └── assets/
│
└── level1-intro/
    ├── scene.json
    ├── metadata.json
    └── assets/
```

### Scene JSON Schema (Data Format)

```typescript
// ==========================================
// TOP-LEVEL PACKAGE
// ==========================================

interface ScenePackage {
  metadata: {
    id: string;              // Unique scene ID: "intro", "chapter1-opener"
    type: 'timeline';        // Scene type (timeline, combat, level - future)
    name: string;            // Display name: "Intro Cutscene"
    version: string;         // Semver: "1.0.0"
    author?: string;         // Creator name
    created: string;         // ISO timestamp
    modified: string;        // ISO timestamp
  };

  timeline: Timeline;

  assets: AssetManifest;     // Asset path mappings

  nextScene?: string;        // Auto-transition scene ID when complete
  skipToScene?: string;      // Scene ID to jump to if user skips
}

// ==========================================
// TIMELINE (Multi-Scene Container)
// ==========================================

interface Timeline {
  duration: number;          // Total timeline duration in ms
  scenes: Scene[];           // Array of sub-scenes (like intro's 4 scenes)
}

// ==========================================
// SCENE (Individual segment of timeline)
// ==========================================

interface Scene {
  id: string;                // Scene ID: "scene1", "burning-house"
  startTime: number;         // Start time relative to timeline (ms)
  duration: number;          // Scene duration (ms)

  background?: Background;   // Background color/gradient

  layers: Layer[];           // Image/sprite layers with animations
  camera?: CameraTrack;      // Camera zoom/pan keyframes
  titleCards?: TitleCardGroup[];  // Text overlays

  transitions?: {
    fadeIn?: FadeTransition;
    fadeOut?: FadeTransition;
  };
}

interface Background {
  type: 'color' | 'gradient';
  color?: string;            // Solid color: "#000000"
  gradient?: {
    type: 'linear' | 'radial';
    colors: string[];        // ["#000000", "#1a1a1a"]
    stops?: number[];        // [0, 1]
    angle?: number;          // Degrees (linear only)
  };
}

interface FadeTransition {
  duration: number;          // Fade duration (ms)
  startOffset?: number;      // Start N ms into scene (for fadeOut)
  color?: string;            // Fade color (default: "#000000")
  easing?: EasingType;
}

// ==========================================
// LAYER (Image with animations)
// ==========================================

interface Layer {
  id: string;                // Layer ID: "burning-house-bg"
  asset: string;             // Asset key (from AssetManifest)
  depth: number;             // Z-order (0=back, higher=front)

  // Static properties
  position?: {
    x: number | string;      // Pixels or "50%" or "calc(100% - 40px)"
    y: number | string;
  };
  anchor?: 'center' | 'top-left' | 'bottom-center' | 'bottom-left';
  scale?: number;            // Scale multiplier (1.0 = 100%)
  cover?: boolean;           // CSS background-size: cover behavior
  parallax?: number;         // Parallax strength (0=static, 0.02=slight)

  // Animated properties (keyframe tracks)
  opacity?: KeyframeTrack;   // Opacity over time
  x?: KeyframeTrack;         // Animated X position
  y?: KeyframeTrack;         // Animated Y position
  rotation?: KeyframeTrack;  // Rotation in degrees
  scaleX?: KeyframeTrack;    // Animated X scale
  scaleY?: KeyframeTrack;    // Animated Y scale
}

// ==========================================
// KEYFRAME TRACK (Animated Property)
// ==========================================

interface KeyframeTrack {
  keyframes: Keyframe[];
}

interface Keyframe {
  time: number;              // Time relative to scene start (ms)
  value: number;             // Property value at this time
  easing?: EasingType;       // Easing function TO this keyframe
}

type EasingType =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInOutSine';

// ==========================================
// CAMERA (Zoom/Pan Animation)
// ==========================================

interface CameraTrack {
  keyframes: CameraKeyframe[];
  enableMouseParallax?: boolean;  // Allow mouse parallax during camera moves
}

interface CameraKeyframe {
  time: number;              // Time relative to scene start (ms)
  x: number;                 // Pan X offset (pixels)
  y: number;                 // Pan Y offset (pixels)
  zoom: number;              // Zoom level (1.0=normal, 2.0=2x zoom)
  easing?: EasingType;
}

// ==========================================
// TITLE CARDS (Text Overlays)
// ==========================================

interface TitleCardGroup {
  id: string;
  position: {
    x: number | string;
    y: number | string;
  };
  textAlign?: 'left' | 'center' | 'right';
  fadeInStart: number;       // Time to start fade in (ms, scene-relative)
  fadeInDuration?: number;   // Default: 2000ms
  holdDuration: number;      // How long to display at full opacity
  fadeOutDuration?: number;  // Default: 6000ms

  cards: TitleCard[];        // Multiple text elements in group
}

interface TitleCard {
  text: string;
  fontSize: number;
  offsetY: number;           // Offset from group Y position
  letterSpacing?: number;    // Extra spacing between letters
  font?: string;             // Font family (default: "Cinzel, serif")
  color?: string;            // Text color (default: "#e9e2d0")
  outlineColor?: string;     // Outline color (default: "#0f0e0c")
  outlineWidth?: number;     // Outline width (default: 2)
}

// ==========================================
// ASSET MANIFEST
// ==========================================

interface AssetManifest {
  images: { [key: string]: string };  // "burning-house": "./assets/burning-house.png"
  audio: { [key: string]: string };   // "dying-sun": "./assets/dying-sun.wav"
}
```

### Example Scene JSON

```json
{
  "metadata": {
    "id": "intro",
    "type": "timeline",
    "name": "Intro Cutscene",
    "version": "1.0.0",
    "author": "Low Sun Team",
    "created": "2025-10-18T00:00:00Z",
    "modified": "2025-10-18T12:00:00Z"
  },

  "timeline": {
    "duration": 99600,
    "scenes": [
      {
        "id": "scene1",
        "startTime": 0,
        "duration": 20000,
        "background": {
          "type": "color",
          "color": "#000000"
        },
        "layers": [
          {
            "id": "burning-house-bg",
            "asset": "burning-house-far",
            "depth": 0,
            "position": { "x": "50%", "y": "50%" },
            "anchor": "center",
            "cover": true,
            "parallax": 0.02,
            "opacity": {
              "keyframes": [
                { "time": 0, "value": 0 },
                { "time": 3000, "value": 1, "easing": "easeInOutQuad" }
              ]
            }
          }
        ],
        "camera": {
          "keyframes": [
            { "time": 0, "x": 0, "y": 0, "zoom": 1.0, "easing": "linear" },
            { "time": 20000, "x": -252, "y": -400, "zoom": 2.5, "easing": "linear" }
          ],
          "enableMouseParallax": false
        },
        "titleCards": [
          {
            "id": "title1",
            "position": { "x": "50%", "y": "35%" },
            "textAlign": "center",
            "fadeInStart": 6000,
            "holdDuration": 4000,
            "cards": [
              {
                "text": "A Tale Conceived Beneath a Dying Sun",
                "fontSize": 36,
                "offsetY": 0
              }
            ]
          }
        ],
        "transitions": {
          "fadeIn": {
            "duration": 3000,
            "color": "#000000"
          },
          "fadeOut": {
            "duration": 7000,
            "startOffset": 13000,
            "color": "#000000"
          }
        }
      }
    ]
  },

  "assets": {
    "images": {
      "burning-house-far": "./assets/burning-house-far.png",
      "tree-man": "./assets/tree-man.png"
    },
    "audio": {
      "dying-sun": "./assets/dying-sun.wav"
    }
  },

  "nextScene": "title",
  "skipToScene": "title"
}
```

---

## Scene Builder UI Design

### Window Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  File  Edit  View  Scene  Playback                    [?] [_][□][×] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │              CANVAS PREVIEW                               │ │
│  │         (Shows current timeline frame)                    │ │
│  │                                                           │ │
│  │                    1920 × 1080                            │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ◄◄  ◄  ▶  ▶▶  [⏸]  00:15.250 / 01:39.600               Vol: ▓▓▓│
├─────────────────────────────────────────────────────────────────┤
│  0s ────────────── 30s ────────────── 60s ────────────── 90s   │
│  ├──── Scene 1 (0-20s) ────┤                                   │
│  │ 📷 Camera    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (zoom 1.0→2.5)           │
│  │ 🖼️  Layer 1   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (burning-house-far)      │
│  │ 🖼️  Layer 2   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (tree-man)               │
│  │ 📝 Title 1      ▓▓▓▓ (6s-10s)                              │
│  │ ⬛ Fade Out           ▓▓▓▓▓▓▓ (13s-20s)                    │
│  ├──── Scene 2 (20-46s) ───────────────────┤                  │
│  │ 📷 Camera    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (zoom 1.1→0.91)    │
│  │ 🖼️  Layer 1   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ (opacity animation) │
│     ...                                                        │
└─────────────────────────────────────────────────────────────────┘
│  PROPERTIES PANEL                                              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Selected: Layer 1 - burning-house-far.png              │  │
│  │                                                         │  │
│  │ Asset: [burning-house-far.png      ] [Browse...]       │  │
│  │ Depth: [0        ]                                      │  │
│  │ Position X: [50%     ]  Y: [50%     ]                   │  │
│  │ Anchor: [● Center  ○ Top-Left  ○ Bottom-Center]         │  │
│  │ Scale: [1.0      ]                                      │  │
│  │ ☑ Cover (CSS-like)  ☑ Parallax [0.02]                  │  │
│  │                                                         │  │
│  │ Opacity Animation:                                      │  │
│  │   [Keyframe Graph - visual curve editor]               │  │
│  │   0ms: 0.0   3000ms: 1.0  [+ Add Keyframe]             │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Key UI Components

#### 1. Canvas Preview
- Real-time rendering of current timeline frame
- Uses Low Sun's existing `CanvasManager` and rendering code
- Click to position playhead
- Drag layers to reposition (updates JSON)

#### 2. Timeline
- Horizontal scrollable timeline (like video editors)
- Tracks for: Camera, Layers, Title Cards, Effects
- Drag clips to reposition/resize
- Add keyframes by clicking on timeline
- Visual waveform for audio tracks

#### 3. Properties Panel
- Context-sensitive (shows selected layer/camera/title card)
- Numeric inputs for precise control
- Visual keyframe curve editor (opacity, position, etc.)
- Asset picker with thumbnails

#### 4. Asset Browser (separate panel)
- Drag-and-drop area for importing files
- Thumbnail grid of imported assets
- Right-click to manage/delete

#### 5. Playback Controls
- Play/pause/stop
- Skip forward/back by keyframe
- Scrub to any point
- Audio sync (WebAudio)

---

## Tech Stack

### Scene Builder App

#### Electron + React
- **Electron**: Desktop app, native file system access, multi-window
- **React**: Complex UI with timeline editor (component-based)
- **TypeScript**: Type safety, matches game codebase

#### Key Libraries
- **Timeline UI**: Custom-built (or `react-timeline-editor` as base)
- **Canvas Rendering**: Reuse Low Sun's `CanvasManager` (shared code)
- **File I/O**: Node.js `fs` module (Electron main process)
- **Audio**: WebAudio API for preview playback
- **Styling**: CSS/SCSS (match Low Sun's aesthetic)

#### Project Structure
```
tools/scene-builder/
├── main.cjs                 # Electron main process
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── vite.config.ts           # Vite bundler config
│
├── src/
│   ├── main/                # Main process (Node.js)
│   │   ├── index.ts         # Electron window setup
│   │   ├── fileSystem.ts    # File I/O, package export
│   │   └── ipc.ts           # IPC handlers (main ↔ renderer)
│   │
│   ├── renderer/            # Renderer process (React UI)
│   │   ├── index.tsx        # React app entry
│   │   ├── App.tsx          # Root component
│   │   │
│   │   ├── components/
│   │   │   ├── Timeline/
│   │   │   │   ├── Timeline.tsx
│   │   │   │   ├── Track.tsx
│   │   │   │   ├── Clip.tsx
│   │   │   │   └── Playhead.tsx
│   │   │   │
│   │   │   ├── Preview/
│   │   │   │   ├── CanvasPreview.tsx   # Reuse Low Sun's CanvasManager
│   │   │   │   └── PlaybackControls.tsx
│   │   │   │
│   │   │   ├── Properties/
│   │   │   │   ├── PropertiesPanel.tsx
│   │   │   │   ├── LayerProperties.tsx
│   │   │   │   ├── CameraProperties.tsx
│   │   │   │   └── KeyframeEditor.tsx
│   │   │   │
│   │   │   └── AssetBrowser/
│   │   │       ├── AssetBrowser.tsx
│   │   │       └── AssetThumbnail.tsx
│   │   │
│   │   ├── models/          # Data models (ScenePackage, Timeline, etc.)
│   │   │   ├── ScenePackage.ts
│   │   │   ├── Timeline.ts
│   │   │   ├── Scene.ts
│   │   │   └── Layer.ts
│   │   │
│   │   ├── services/        # Business logic
│   │   │   ├── timelinePlayer.ts      # Timeline playback engine
│   │   │   ├── exportService.ts       # Export scene packages
│   │   │   └── assetManager.ts        # Asset loading/caching
│   │   │
│   │   └── shared/          # Shared with Low Sun game
│   │       ├── CanvasManager.ts       # Copy from game
│   │       ├── CameraController.ts    # Copy from game
│   │       ├── easing.ts              # Copy from game
│   │       └── TitleCard.ts           # Copy from game
│   │
│   └── types/               # TypeScript types
│       ├── scenePackage.d.ts
│       └── timeline.d.ts
│
└── index.html               # Electron renderer entry
```

---

## Implementation Phases

### Phase 1: Timeline Runtime (Game Side - 1 week)
**Goal:** Prove the JSON format works by building the playback engine first.

#### Tasks:
1. **Define final JSON schema** (TypeScript interfaces)
2. **Build `TimelineScene` class** in Low Sun game:
   - Parse scene JSON
   - Load assets from package
   - Interpolate keyframe tracks (opacity, camera, etc.)
   - Render layers with depth sorting
   - Handle scene transitions
3. **Manually convert IntroScene** to JSON (test data)
4. **Test in game** - intro plays identically from JSON

#### Deliverables:
- `src/game/scenes/timeline/TimelineScene.ts` (in game repo)
- `public/scenes/intro/scene.json` (converted intro)
- Intro plays from JSON (validates data format)

---

### Phase 2: Scene Builder - Basic Editor (2-3 weeks)
**Goal:** Visual editing with export functionality.

#### Week 1: Foundation
- Set up Electron + React + TypeScript project
- Create window layout (preview, timeline, properties)
- Implement basic timeline UI (add scenes, visual tracks)
- Import Low Sun's rendering code (`CanvasManager`, `CameraController`)

#### Week 2: Core Features
- Asset browser (drag-and-drop image/audio import)
- Layer track editing (add/remove layers)
- Camera track editing (add/move keyframes)
- Properties panel (layer properties: position, scale, depth)
- Keyframe editor (visual graph for opacity animation)

#### Week 3: Playback & Export
- Timeline scrubbing (drag playhead)
- Play/pause preview (real-time rendering)
- Audio sync (play audio during preview)
- Export scene package (JSON + copy assets to folder)

#### Deliverables:
- Working Scene Builder app
- Can recreate intro scene visually
- Export scene package
- Drop exported package into game → plays correctly

---

### Phase 3: Advanced Features (1-2 months)
- Title card visual editor (drag to position text)
- Audio waveform display (sync visuals to music)
- Bezier curve easing editor
- Visual layer positioning (drag layers on canvas preview)
- Multi-window mode (editor + fullscreen preview)
- Template library (fade presets, camera move presets)
- Undo/redo system
- Auto-save / crash recovery

---

### Phase 4: Polish & Distribution (1-2 weeks)
- Package Scene Builder as standalone .exe
- User documentation
- Example scene templates
- Video tutorial

---

## Key Design Principles

### 1. Data-Driven Over Hardcoded
- **Bad:** `if (time > 13000) { alpha += dt * 0.00014; }`
- **Good:** `{ "fadeOut": { "startOffset": 13000, "duration": 7000 } }`

### 2. Visual Over Numeric
- **Bad:** Typing `"x": 523, "y": 891` in JSON
- **Good:** Dragging layer on canvas, auto-generates x/y

### 3. Real-Time Preview
- Every edit instantly reflected in canvas preview
- Scrub timeline to any point, see result immediately
- Audio synced to playhead

### 4. Export-Oriented
- Editor produces self-contained packages
- Drop into game folder → instant playback
- No manual JSON editing required

### 5. Reuse Game Code
- Share `CanvasManager`, `CameraController`, `TitleCard` classes
- Preview renders identically to game runtime
- What you see is what you get

---

## Success Criteria

### Must Have (Phase 2)
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
- [ ] Visual layer positioning (drag on canvas)
- [ ] Keyframe curve editor (bezier easing)
- [ ] Undo/redo

### Nice to Have (Phase 4)
- [ ] Multi-window preview
- [ ] Template library
- [ ] Auto-save
- [ ] Packaged as distributable .exe

---

## Known Challenges

### 1. Timeline UI Complexity
**Challenge:** Building a professional timeline editor is complex (tracks, clips, keyframes, scrubbing).

**Mitigation:**
- Start simple (basic track visualization, no drag/drop)
- Iterate based on usability
- Consider using `react-timeline-editor` as base

### 2. Shared Code Between Apps
**Challenge:** Scene Builder and game need to share rendering code (`CanvasManager`, etc.).

**Mitigation:**
- Copy files initially (simple, works)
- Later: Extract to shared npm package
- Use TypeScript path aliases for imports

### 3. Performance
**Challenge:** Real-time canvas rendering during timeline scrubbing.

**Mitigation:**
- Throttle render updates (60fps max)
- Pre-load all assets before preview
- Optimize layer rendering (skip offscreen layers)

### 4. Asset Management
**Challenge:** Handling large images/audio files, duplicates, etc.

**Mitigation:**
- Copy assets into package on export (self-contained)
- Compress images during export (optional)
- Show asset sizes in browser

---

## Future Extensions

### Beyond Timeline Editor
Once the timeline editor is stable, expand Scene Builder to support:

1. **Level Editor** (spatial scenes)
   - 2D canvas for building placement
   - Parallax layer editor
   - Exports level JSON packages

2. **Combat Scene Editor** (card game layouts)
   - Enemy wave designer
   - Card/deck configurator
   - Exports combat JSON packages

3. **Dialogue Editor** (branching conversations)
   - Node-based graph
   - Choice trees
   - Exports dialogue JSON packages

**Scene Builder becomes a unified toolchain for all Low Sun content creation.**

---

## Getting Started

### For Implementers

1. **Read this entire meta prompt** - Understand vision and architecture
2. **Review Low Sun's current scene system**:
   - `src/game/scenes/intro/introScene.ts` (hardcoded baseline)
   - `src/core/camera.ts` (keyframe system to replicate)
   - `src/render/titleCard.ts` (title card system to replicate)
3. **Start with Phase 1** (game runtime) to validate JSON format
4. **Build Phase 2** (basic editor) iteratively
5. **Test continuously** by exporting and playing in game

### Repository Structure
```
low-sun/
├── src/                    # Main game
├── public/
│   └── scenes/            # Scene packages (exported from Scene Builder)
│       ├── intro/
│       ├── chapter1/
│       └── ...
│
└── tools/
    └── scene-builder/     # Scene Builder app (this project)
        ├── src/
        ├── package.json
        └── README.md
```

---

## Questions to Resolve Before Starting

1. **Asset Management Strategy:**
   - Copy assets into package (self-contained) vs. shared asset pool?
   - **Recommendation:** Copy (portable packages)

2. **Shared Code Strategy:**
   - Copy files vs. npm package vs. git submodule?
   - **Recommendation:** Copy initially, refactor to package later

3. **Timeline UI Library:**
   - Build custom vs. use `react-timeline-editor`?
   - **Recommendation:** Custom (full control, simpler for MVP)

4. **Scene Discovery:**
   - Manual registration vs. auto-discovery?
   - **Recommendation:** Auto-discovery (scan `public/scenes/`)

5. **Transitions:**
   - Scene-defined (`nextScene` in JSON) vs. game-defined (hardcoded flow)?
   - **Recommendation:** Scene-defined (more flexible)

---

## Conclusion

**Low Sun Scene Builder** transforms cutscene creation from code to content. It empowers artists and designers to create cinematic experiences without writing TypeScript, while developers focus on building robust runtime systems.

This is not just a tool - it's the foundation of a modular game engine architecture where content (scenes, levels, combat) is decoupled from code (players, managers, renderers).

**Build the runtime first, editor second.** Validate the data format before investing in UI. This ensures the editor produces exactly what the game needs.

---

## Meta Prompt End

**This document is the single source of truth for Scene Builder development. Refer to it frequently. Update it as decisions are made.**
