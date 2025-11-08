# Scene Builder Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd tools/scene-builder
npm install
```

### 2. Run Scene Builder

```bash
npm run dev
```

This will:
- Start Vite dev server on port 5174
- Wait for Vite to be ready
- Launch Electron window
- Open DevTools automatically

### 3. What You'll See

- **Welcome Screen** - Click "New Scene" to create your first timeline
- **Menu Bar** - File operations (New/Open/Save/Export)
- **Canvas Preview** - 1920x1080 preview of your scene
- **Playback Controls** - Play/pause/scrub timeline
- **Timeline Editor** - Visual timeline with scenes and tracks
- **Properties Panel** - Edit selected items

## Development Workflow

### Hot Reload

The `npm run dev` command uses `concurrently` to run:
1. **Vite dev server** (port 5174) - Hot reload for React code
2. **Electron** - Waits for Vite, then launches window

Any changes to React components will hot reload instantly.

### Separate Processes (Alternative)

If you prefer to run them separately:

```bash
# Terminal 1
npm run vite:dev

# Terminal 2 (after Vite is ready)
npm run electron
```

## Project Structure

```
scene-builder/
├── main.cjs                  # Electron main process (Node.js)
├── preload.cjs               # IPC bridge (exposes APIs to renderer)
├── index.html                # HTML entry point
│
├── src/
│   ├── types/
│   │   └── scenePackage.ts   # ScenePackage TypeScript schema
│   │
│   └── renderer/             # React app (renderer process)
│       ├── index.tsx         # React entry
│       ├── App.tsx           # Root component
│       │
│       ├── components/
│       │   ├── Timeline/     # Timeline editor
│       │   ├── Preview/      # Canvas preview + controls
│       │   └── Properties/   # Properties panel
│       │
│       └── styles/           # CSS files
│
└── dist/                     # Build output (created by Vite)
```

## Key Differences from Low Sun Game

| Feature | Low Sun Game | Scene Builder |
|---------|-------------|---------------|
| Port | 5173 | 5174 |
| Window size | 1920x1080 | 1600x1000 |
| Menu bar | Hidden | Visible |
| DevTools | Auto-open | Auto-open |
| Background | Black | Dark gray (#1e1e1e) |
| Purpose | Play scenes | Create scenes |

## Next Steps

1. **Phase 1**: Build TimelineScene player in Low Sun game (validates JSON format)
2. **Phase 2**: Add asset import/export to Scene Builder
3. **Phase 3**: Implement keyframe editing
4. **Phase 4**: Real-time preview rendering

## Troubleshooting

### "Port 5174 already in use"

Another process is using port 5174. Either:
- Kill the other process
- Change port in `vite.config.ts`

### "Cannot find module 'electron-log'"

Run `npm install` in `tools/scene-builder/`

### Electron window blank

Check browser console in DevTools for errors. Vite dev server must be running on port 5174.

## Logs

Electron logs are saved to:
- Windows: `%USERPROFILE%\AppData\Roaming\low-sun-scene-builder\logs\`
- macOS: `~/Library/Logs/low-sun-scene-builder/`
- Linux: `~/.config/low-sun-scene-builder/logs/`

Check `main.log` for startup issues.
