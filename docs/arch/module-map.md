# Module Map

**Last Updated:** 2025-11-08

## Purpose

This document maps all major modules in the codebase, their responsibilities, public APIs, and ownership.

---

## Domain Layer (`/src/domain`)

### `timeline`

**Purpose:** Core business logic for timeline operations (item positioning, validation)

**Exports:**
- `Result<E, T>` - Type-safe error handling
- `DomainError` and subclasses - Error taxonomy
- `calculateItemPosition()` - Pure item positioning logic
- `calculateItemResize()` - Pure resize logic
- Domain ports (interfaces): `SceneRepositoryPort`, `AssetManagerPort`

**Dependencies:** None (pure domain - only depends on `/types/scenePackage`)

**Owner:** Architecture team

**Status:** ✅ Active (PR#1)

**Tests:** `/src/domain/timeline/__tests__/ItemPositioner.test.ts`

---

## Presentation Layer (`/src/renderer/components`)

### `Timeline`

**Purpose:** Visual timeline editor for scenes, layers, and items

**Components:**
- `Timeline.tsx` - Main orchestrator component
- `LayerRow.tsx` - Individual layer row rendering
- `SceneLayerRow.tsx` - Scene child layer rows
- `SceneClip.tsx`, `ImageClip.tsx`, `AudioClip.tsx`, `EffectClip.tsx` - Item clips

**Dependencies:**
- Domain: `/src/domain/timeline`
- Types: `/src/types/scenePackage`
- Context: `/src/renderer/context`
- Utils: `Timeline.utils.tsx`
- Actions: `Timeline.actions.ts` (⚠️ to be refactored)
- Handlers: `Timeline.handlers.ts` (⚠️ to be refactored)

**Owner:** UI team

**Status:** ⚠️ In Refactor (reducing complexity)

---

## Infrastructure Layer (`/src/infrastructure` - planned)

### `timeline` (to be created in PR#3)

**Purpose:** Electron IPC adapters for scene persistence and asset management

**Exports:**
- `ElectronSceneRepository` implements `SceneRepositoryPort`
- `FileSystemAssetManager` implements `AssetManagerPort`

**Dependencies:** `electron` APIs

**Owner:** Infrastructure team

**Status:** 🚧 Planned (PR#3)

---

## Application Layer (`/src/application` - planned)

### `timeline` (to be created in PR#2)

**Purpose:** Use case orchestration and command handling

**Exports:**
- Commands: `AddItemCommand`, `MoveItemCommand`, `ResizeItemCommand`
- Queries: `GetTimelineQuery`
- Controller: `TimelineController`

**Dependencies:**
- Domain: `/src/domain/timeline`
- Infrastructure ports (injected)

**Owner:** Application team

**Status:** 🚧 Planned (PR#2)

---

## Shared Types (`/src/types`)

### `scenePackage`

**Purpose:** Core data structures for scenes, layers, and items

**Exports:**
- `ScenePackage`, `Timeline`, `TimelineLayer`, `TimelineItem`
- Concrete item types: `TimelineImage`, `TimelineAudio`, `TimelineScene`, `TimelineEffect`

**Dependencies:** None

**Owner:** Architecture team

**Status:** ✅ Stable (not changing in this refactor)

---

## Legend

- ✅ Active - Fully implemented and stable
- ⚠️ In Refactor - Currently being improved
- 🚧 Planned - Scheduled for future PR
- ❌ Deprecated - Scheduled for removal

---

## Import Rules

### Allowed Dependencies

```
Presentation → Application → Domain → Types
Presentation → Infrastructure (only for injection)
Infrastructure → Domain (only ports)
```

### Forbidden Dependencies

```
Domain ↛ Infrastructure
Domain ↛ Presentation
Domain ↛ Application
Application ↛ Presentation
```

**Enforcement:** ESLint `import/no-restricted-paths` (to be configured in PR#1)
