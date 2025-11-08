# Scene Builder Refactoring History

## Major Refactors

This document tracks significant architectural changes to Scene Builder.

---

## Refactor #1: App.tsx Architecture Redesign (2025-10-20)

### Problem

App.tsx had grown to 285 lines with multiple responsibilities:
- Layout rendering
- Business logic (undo/redo)
- Keyboard shortcuts
- File operations
- Component composition
- State management
- Inline event handlers

This violated single responsibility principle and made the codebase hard to maintain.

### Solution

Complete architectural redesign following feature-slice pattern and context-based state management.

### Changes

#### New Components Created

**Layout Components**
- `components/Layout/MainLayout.tsx` - 3-column grid layout manager
- `components/Layout/LeftPanel.tsx` - SceneLayers + ResourceBrowser container
- `components/Layout/MiddlePanel.tsx` - Canvas + Timeline container

**UI Components**
- `components/MenuBar/MenuBar.tsx` - File operations menu bar
- `components/WelcomeScreen/WelcomeScreen.tsx` - Landing screen

#### New Contexts

**HistoryContext** (`context/HistoryContext.tsx`)
- Manages undo/redo state using useHistory hook
- Handles keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
- Provides: `scenePackage`, `updateScene`, `undo`, `redo`, `canUndo`, `canRedo`
- Auto-saves after undo/redo operations

#### Refactored Components

**App.tsx**
- **Before**: 285 lines, monolithic
- **After**: 113 lines (~60% reduction)
- **Responsibilities**: Context setup, file operations, routing only

**ResourceBrowser**
- Made completely independent from scene package
- Pure filesystem browser (no scene coupling)
- Manages `images/` and `audio/` folders only

#### New IPC APIs

Added to support refactored components:

**Dialog Operations**
```typescript
dialog.showOpenDialog(options) => { canceled, filePaths }
```

**Asset Operations**
```typescript
deleteAsset(scenePath, assetType, assetPath) => { success, error }
```

### File Structure Before/After

**Before**
```
App.tsx (285 lines)
├── Inline layout
├── Inline business logic
├── Inline keyboard handlers
└── All component wiring
```

**After**
```
App.tsx (113 lines)
└── Contexts
    ├── HistoryContext (undo/redo + shortcuts)
    ├── SceneContext (scene data)
    ├── SelectionContext (selection state)
    ├── PlaybackContext (playback)
    └── LayoutContext (UI layout)
        └── Layout Components
            ├── MenuBar
            ├── MainLayout
            │   ├── LeftPanel
            │   ├── MiddlePanel
            │   └── PropertiesPanel
            └── WelcomeScreen
```

### Benefits

1. **Separation of Concerns**
   - Each component has single responsibility
   - Business logic separated from UI
   - State management centralized in contexts

2. **Testability**
   - Contexts can be tested independently
   - Layout components are pure presentation
   - Easy to mock contexts in tests

3. **Maintainability**
   - Clear code organization
   - Easy to locate functionality
   - Self-documenting structure

4. **Reusability**
   - Layout components can be reused
   - Contexts provide app-wide state
   - No prop drilling

5. **Performance**
   - Fine-grained context subscriptions
   - Components only re-render when needed
   - Better React DevTools visibility

### Migration Notes

**Breaking Changes**: None (internal refactor only)

**New Dependencies**: None

**API Changes**:
- Added `dialog.showOpenDialog()` to ElectronAPI
- Added `deleteAsset()` to ElectronAPI

### Lessons Learned

1. **Start with Contexts**: Context-first architecture scales better than prop drilling
2. **Feature Slices Work**: Separating UI and actions improves maintainability
3. **Layout Components**: Dedicated layout components simplify complex grids
4. **Independent Components**: ResourceBrowser independence reduces coupling
5. **Incremental Refactoring**: One component at a time prevents regressions

### Related Files

**Modified**
- `src/renderer/App.tsx`
- `src/renderer/components/Resources/ResourceBrowserTree.tsx`
- `src/types/electron.d.ts`
- `preload.cjs`
- `main.cjs`

**Created**
- `src/renderer/components/Layout/MainLayout.tsx`
- `src/renderer/components/Layout/LeftPanel.tsx`
- `src/renderer/components/Layout/MiddlePanel.tsx`
- `src/renderer/components/MenuBar/MenuBar.tsx`
- `src/renderer/components/WelcomeScreen/WelcomeScreen.tsx`
- `src/renderer/context/HistoryContext.tsx`
- `src/renderer/components/Layout/*.css` (3 files)
- `src/renderer/components/MenuBar/MenuBar.css`
- `src/renderer/components/WelcomeScreen/WelcomeScreen.css`

### Future Improvements

1. **Timeline Refactor**: Apply same pattern to Timeline component
2. **PropertiesPanel Refactor**: Extract to feature slice
3. **Context Optimization**: Add memoization where needed
4. **Unit Tests**: Add tests for new contexts and components
5. **Documentation**: Add JSDoc comments to public APIs

---

## Previous Refactors

### Canvas and SceneLayers Feature Slices

**Date**: 2025-10-19

Extracted Canvas and SceneLayers into feature slices with:
- Dedicated action files for business logic
- Context usage instead of prop drilling
- ScenePackageService for centralized mutations

**Key Files**:
- `features/canvas/CanvasPreview.tsx`
- `features/canvas/Canvas.actions.ts`
- `features/sceneLayers/SceneLayers.tsx`
- `features/sceneLayers/SceneLayers.actions.ts`
- `services/scenePackageService.ts`

### Timeline Context Menu System

**Date**: 2025-10-18

Unified context menu system for Timeline with:
- Centralized menu definitions
- Keyboard shortcut integration
- Copy/paste/delete operations

---

## Refactoring Guidelines

When refactoring Scene Builder code, follow these principles:

### 1. Feature Slice Pattern

For complex components:
```
features/
└── feature-name/
    ├── FeatureName.tsx          # UI component
    ├── FeatureName.actions.ts   # Business logic
    └── FeatureName.css           # Styles
```

### 2. Context Over Props

Use contexts for:
- Global state (scene package, selection, playback)
- Cross-cutting concerns (history, layout)
- State that changes frequently

Avoid contexts for:
- Static configuration
- Component-specific state
- Performance-critical paths (use local state)

### 3. Service Layer

Services should:
- Be pure functions (no side effects)
- Return new objects (immutable)
- Have descriptive names
- Be thoroughly tested

Example:
```typescript
// Good
static updateLayerProperties(
  scenePackage: ScenePackage,
  sceneId: string,
  updates: Map<string, Partial<Layer>>
): ScenePackage {
  const updated = JSON.parse(JSON.stringify(scenePackage));
  // ... mutations ...
  return updated;
}

// Bad (mutates input)
static updateLayerProperties(scenePackage, sceneId, updates) {
  scenePackage.timeline.layers.forEach(layer => {
    // direct mutation
  });
}
```

### 4. Component Responsibilities

**Components should**:
- Render UI
- Handle user interactions
- Call actions from `.actions.ts`
- Use contexts for state

**Components should NOT**:
- Contain business logic
- Mutate state directly
- Make IPC calls directly
- Know about other components' internals

### 5. When to Refactor

Refactor when:
- Component exceeds 200 lines
- Multiple responsibilities identified
- Prop drilling becomes excessive (>3 levels)
- Business logic mixed with UI
- Testing becomes difficult

### 6. Refactoring Process

1. **Identify** boundaries and responsibilities
2. **Plan** new structure (contexts, components, services)
3. **Create** new files alongside old code
4. **Migrate** incrementally (one feature at a time)
5. **Test** each step
6. **Document** changes
7. **Remove** old code

### 7. Code Review Checklist

- [ ] Single Responsibility Principle followed
- [ ] No prop drilling (use contexts)
- [ ] Business logic in `.actions.ts` or services
- [ ] Types updated in `electron.d.ts`
- [ ] CSS modular and scoped
- [ ] No inline styles (except dynamic values)
- [ ] Contexts properly nested
- [ ] IPC methods use context bridge
- [ ] File operations in main process
- [ ] Documentation updated

---

## Performance Monitoring

After refactoring, monitor:

1. **Bundle Size**: Check `npm run dist` output
2. **Render Performance**: React DevTools Profiler
3. **Memory Usage**: Chrome DevTools Memory
4. **Context Updates**: Ensure minimal re-renders

Target metrics:
- Initial load: < 2 seconds
- Scene load: < 1 second
- UI interactions: < 16ms (60 FPS)
- Memory: < 200MB for typical scenes

---

## Rollback Plan

If refactoring causes issues:

1. Identify breaking commit: `git log --oneline`
2. Create backup branch: `git branch backup-refactor`
3. Revert specific commits: `git revert <commit-hash>`
4. Test thoroughly before push
5. Document rollback reason

---

## Questions?

For refactoring questions or suggestions:
1. Check this document first
2. Review ARCHITECTURE.md
3. Look at existing feature slices as examples
4. Document new patterns here
