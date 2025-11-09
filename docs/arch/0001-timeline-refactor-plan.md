# Timeline Refactor Plan

**Date:** 2025-11-08
**Status:** Initial Assessment
**Author:** Architecture Review

## Executive Summary

The Timeline component has grown to 831 lines with significant complexity. This plan outlines a 3-PR incremental refactor to establish clean boundaries between presentation, application logic, and domain concerns.

## Current State Analysis

### Hotspots (by complexity & size)

1. **Timeline.tsx** (831 lines)
   - Mixed concerns: rendering, state management, event handling
   - 20+ state variables in one component
   - Direct DOM manipulation and side effects
   - Cyclomatic complexity: ~40+

2. **Timeline.actions.ts** (549 lines)
   - Pure imperative mutations of scenePackage
   - No validation or error handling
   - Side effects (window.electronAPI, alerts)

3. **Timeline.handlers.ts** (525 lines)
   - DOM-coupled event handlers
   - Direct state mutations
   - No testable boundaries

### Dependency Graph (Current)

```
Timeline.tsx (831 LOC)
├── Timeline.actions.ts (549 LOC) → scenePackage mutations
├── Timeline.handlers.ts (525 LOC) → event handlers
├── Timeline.utils.tsx (134 LOC) → pure helpers ✓
├── Timeline.types.ts (22 LOC) → types ✓
├── LayerRow.tsx (112 LOC) → presentation ✓
├── SceneLayerRow.tsx (137 LOC) → presentation ✓
├── SceneClip.tsx (200 LOC)
├── ImageClip.tsx, AudioClip.tsx, EffectClip.tsx
├── sceneSaveService.ts → infrastructure
├── useTimelineNavigation → context
└── scenePackage types → domain
```

**Issues:**
- No clear domain layer (business rules scattered)
- Actions directly mutate and save (no commands/events)
- Handlers tightly coupled to React events
- No error boundaries or Result types
- Infra (electronAPI) mixed with application logic

### Violations

- ❌ Timeline.actions calls `window.electronAPI` directly (infra leak)
- ❌ Timeline.tsx has 20+ useState hooks (god component)
- ❌ No tests for core logic (item positioning, validation)
- ❌ Circular knowledge: handlers know about actions, actions know about handlers

---

## Target Architecture

### Module Boundaries (Hex/Onion)

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  Timeline.tsx, LayerRow, SceneLayerRow  │
│  (React components, hooks, UI state)    │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│       Application Layer                 │
│  TimelineController, Commands, Queries  │
│  (use cases, orchestration)             │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│          Domain Layer                   │
│  TimelineModel, Layer, Item, Rules      │
│  (pure logic, validations, errors)      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Infrastructure Layer               │
│  ElectronSceneRepo, FileSystem          │
│  (persistence, IPC, external APIs)      │
└─────────────────────────────────────────┘
```

### Proposed Modules

#### 1. Domain (`/src/domain/timeline/`)
- **Entities:** `TimelineModel`, `Layer`, `SceneItem`, `ImageItem`, `AudioItem`
- **Value Objects:** `TimePosition`, `Duration`, `ItemId`, `LayerId`
- **Domain Services:** `ItemPositioner`, `LayerValidator`, `SceneNester`
- **Errors:** `ValidationError`, `LayerNotFoundError`, `OverlapError`
- **Ports:** `SceneRepositoryPort`, `AssetManagerPort`

**Rules:**
- No React imports
- No I/O (pure functions only)
- Return `Result<Error, Success>` from all domain operations

#### 2. Application (`/src/application/timeline/`)
- **Commands:** `AddItemCommand`, `MoveItemCommand`, `ResizeItemCommand`, `DeleteLayerCommand`
- **Queries:** `GetTimelineQuery`, `FindItemByIdQuery`
- **Controllers:** `TimelineController` (orchestrates commands/queries)
- **DTOs:** `AddItemDTO`, `MoveItemDTO`, etc.

#### 3. Presentation (`/src/renderer/components/Timeline/`)
- **Timeline.tsx** (<150 lines): orchestration, hooks, layout
- **LayerRow.tsx**: row rendering
- **SceneLayerRow.tsx**: scene child rows
- **Clips:** SceneClip, ImageClip, AudioClip, EffectClip (presentational only)
- **Hooks:** `useTimelineDragDrop`, `useTimelineResize`, `useTimelineSelection`

#### 4. Infrastructure (`/src/infrastructure/timeline/`)
- **ElectronSceneRepository**: implements `SceneRepositoryPort`
- **FileSystemAssetManager**: implements `AssetManagerPort`

---

## 3-PR Rollout Plan

### PR #1: Extract Domain Core (~300 LOC, 2-3 files)

**Goal:** Create domain layer with item positioning and validation logic.

**Files to create:**
- `src/domain/timeline/TimelineModel.ts`
- `src/domain/timeline/errors.ts`
- `src/domain/timeline/ports.ts`
- `src/domain/timeline/ItemPositioner.ts`
- `src/domain/timeline/__tests__/ItemPositioner.test.ts`

**Changes:**
- Extract pure item positioning logic from Timeline.handlers.ts
- Add validation for item overlaps, layer boundaries
- Return `Result<ValidationError, Position>` instead of throwing
- No React, no DOM, no I/O

**Tests:**
- Unit tests for `ItemPositioner.calculatePosition()`
- Unit tests for `TimelineModel.validateItemPlacement()`
- Coverage: 80%+ for domain layer

**Migration:**
- Keep Timeline.handlers.ts calling old code
- Add adapter shim that calls domain functions
- No user-facing changes (green build)

**Diff estimate:** +350 LOC, -0 LOC (purely additive)

---

### PR #2: Command Pattern for Mutations (~400 LOC, 4-5 files)

**Goal:** Replace imperative Timeline.actions with command pattern.

**Files to create:**
- `src/application/timeline/commands/AddItemCommand.ts`
- `src/application/timeline/commands/MoveItemCommand.ts`
- `src/application/timeline/commands/ResizeItemCommand.ts`
- `src/application/timeline/TimelineController.ts`
- `src/application/timeline/__tests__/AddItemCommand.test.ts`

**Changes:**
- Commands encapsulate intent + validation
- Controller dispatches commands and updates state
- Decouple from electronAPI (use port)
- Timeline.tsx calls controller instead of actions directly

**Tests:**
- Unit tests for each command
- Integration test: Timeline.tsx → Controller → Domain
- Coverage: 70%+ for application layer

**Migration:**
- Keep old Timeline.actions.ts
- Add adapter that maps old function calls to commands
- Cutover one action at a time
- Delete Timeline.actions.ts after full migration

**Diff estimate:** +450 LOC, -200 LOC (Timeline.actions shrinks)

---

### PR #3: Repository Abstraction + Hooks Extraction (~350 LOC, 5-6 files)

**Goal:** Isolate infrastructure and extract custom hooks.

**Files to create:**
- `src/infrastructure/timeline/ElectronSceneRepository.ts`
- `src/renderer/hooks/useTimelineDragDrop.ts`
- `src/renderer/hooks/useTimelineResize.ts`
- `src/renderer/hooks/useTimelineSelection.ts`
- `src/infrastructure/__tests__/ElectronSceneRepository.test.ts`

**Changes:**
- Timeline.tsx delegates drag/drop state to hooks
- Controller uses `SceneRepositoryPort` (no direct electronAPI)
- Timeline.tsx < 200 lines (just composition)
- Timeline.handlers.ts deleted (logic in hooks or domain)

**Tests:**
- Mock `SceneRepositoryPort` in command tests
- Integration test with fake repository
- E2E: verify existing scenes still load

**Migration:**
- Wire repository via composition root
- Remove global `sceneSaveService`
- Timeline.tsx uses hooks for all interaction state

**Diff estimate:** +400 LOC, -300 LOC (Timeline.handlers deleted)

---

## Enforcement & Tooling

### ESLint Rules (to add)

```json
{
  "rules": {
    "import/no-cycle": "error",
    "import/order": ["error", {
      "groups": ["builtin", "external", "internal", "parent", "sibling"],
      "pathGroups": [
        { "pattern": "@domain/**", "group": "internal", "position": "before" },
        { "pattern": "@application/**", "group": "internal" },
        { "pattern": "@infrastructure/**", "group": "internal", "position": "after" }
      ]
    }],
    "max-lines-per-file": ["warn", 300],
    "complexity": ["warn", 10]
  }
}
```

### Path Aliases (tsconfig.json)

```json
{
  "compilerOptions": {
    "paths": {
      "@domain/*": ["src/domain/*"],
      "@application/*": ["src/application/*"],
      "@infrastructure/*": ["src/infrastructure/*"]
    }
  }
}
```

### Boundary Rules (eslint-plugin-boundaries)

```js
// Prevent infra → domain imports
{
  "element": "src/infrastructure",
  "disallow": ["src/domain"]
}
```

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Break existing drag/drop | High | Keep old handlers until PR#3; extensive manual testing |
| Scene loading fails | High | Add golden-path E2E test before refactor |
| Performance regression | Medium | Benchmark item rendering before/after |
| Team unfamiliar with Result type | Low | Add ADR and code examples in PR#1 |

---

## Success Criteria

- [ ] Timeline.tsx < 200 lines
- [ ] 0 direct electronAPI calls from Timeline.tsx
- [ ] Domain layer has 80%+ test coverage
- [ ] CI enforces no cycles and boundary violations
- [ ] Existing scenes load and save without changes
- [ ] Build time unchanged (< 5% delta)

---

## Next Steps

1. **This session:** Generate PR#1 (domain layer extraction)
2. **Review:** Get approval on domain interfaces and tests
3. **Merge:** Deploy behind feature flag if needed
4. **Iterate:** PR#2 after PR#1 ships
