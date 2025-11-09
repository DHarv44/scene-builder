# Architecture Documentation

This directory contains architecture decision records (ADRs), refactoring plans, and module documentation for the Scene Builder project.

---

## Quick Links

- **[Refactor Plan](./0001-timeline-refactor-plan.md)** - 3-PR plan to clean up Timeline component
- **[Module Map](./module-map.md)** - Complete module ownership and boundaries
- **[PR#1: Domain Layer](./PR-0001-domain-layer.md)** - Extract pure business logic

---

## Current Refactoring Status

### Timeline Component Refactor (In Progress)

**Goal:** Reduce Timeline.tsx from 831 lines to <200 lines by extracting domain, application, and infrastructure layers.

**Progress:**
- ✅ PR#1: Domain layer extracted (Result type, ItemPositioner, ports)
- 🚧 PR#2: Command pattern for mutations (planned)
- 🚧 PR#3: Repository abstraction + hooks (planned)

**Target Outcomes:**
- Timeline.tsx < 200 lines
- Domain layer 80%+ test coverage
- Zero direct electronAPI calls from Timeline
- Enforced layer boundaries via ESLint

---

## Architecture Principles

### Hex/Onion Layers

```
┌──────────────────────────────┐
│     Presentation (React)     │  ← User interaction
├──────────────────────────────┤
│     Application (Use Cases)  │  ← Orchestration
├──────────────────────────────┤
│     Domain (Business Logic)  │  ← Pure functions
├──────────────────────────────┤
│   Infrastructure (Electron)  │  ← External dependencies
└──────────────────────────────┘
```

**Dependency Rule:** Inner layers never depend on outer layers.

### Domain-Driven Design

- **Entities & Value Objects:** Core domain concepts (Timeline, Layer, Item)
- **Domain Services:** Pure business logic (ItemPositioner, LayerValidator)
- **Ports:** Interfaces for external dependencies (SceneRepositoryPort)
- **Errors:** Type-safe error taxonomy (ValidationError, NotFoundError)

### Result Type Pattern

All domain functions return `Result<E, T>` instead of throwing:

```typescript
// ❌ Bad: throws exceptions
function calculate(x: number): number {
  if (x < 0) throw new Error('negative');
  return x * 2;
}

// ✅ Good: returns Result
function calculate(x: number): Result<ValidationError, number> {
  if (x < 0) return Result.err(new ValidationError('negative'));
  return Result.ok(x * 2);
}
```

---

## File Organization

```
src/
├── domain/              # Pure business logic (no I/O)
│   └── timeline/
│       ├── Result.ts
│       ├── errors.ts
│       ├── ItemPositioner.ts
│       ├── ports.ts
│       └── __tests__/
├── application/         # Use cases & commands (planned)
│   └── timeline/
│       ├── commands/
│       └── queries/
├── infrastructure/      # External adapters (planned)
│   └── timeline/
│       ├── ElectronSceneRepository.ts
│       └── FileSystemAssetManager.ts
└── renderer/
    ├── components/      # Presentation (React)
    │   └── Timeline/
    ├── hooks/           # Custom hooks (planned)
    └── context/         # React context
```

---

## Testing Strategy

### Domain Layer (Unit Tests)

- **Framework:** Vitest
- **Coverage Target:** 80%+
- **Focus:** Pure functions, edge cases, error paths

```bash
npm test                 # Run tests
npm run test:coverage    # Generate coverage report
```

### Application Layer (Integration Tests - Planned)

- **Focus:** Command execution, use case flows
- **Mocks:** Repository ports, external APIs

### Presentation Layer (E2E Tests - Future)

- **Framework:** Playwright/Cypress
- **Focus:** User workflows, visual regression

---

## Import Rules

### Allowed Dependencies

```
✅ Presentation → Application → Domain
✅ Infrastructure → Domain (ports only)
```

### Forbidden Dependencies

```
❌ Domain ↛ Infrastructure
❌ Domain ↛ Presentation
❌ Application ↛ Presentation
```

**Enforcement:** ESLint `import/no-restricted-paths` (configured in PR#1)

---

## Adding New Features

### 1. Start with Domain

Define entities, value objects, and domain services:

```typescript
// src/domain/timeline/LayerValidator.ts
export function validateLayerName(name: string): Result<ValidationError, string> {
  if (name.length === 0) {
    return Result.err(new ValidationError('Layer name cannot be empty'));
  }
  return Result.ok(name);
}
```

### 2. Create Application Command

Orchestrate domain logic with infrastructure:

```typescript
// src/application/timeline/commands/RenameLayerCommand.ts
export class RenameLayerCommand {
  constructor(
    private repo: SceneRepositoryPort,
    private logger: LoggerPort
  ) {}

  async execute(layerId: string, newName: string): Promise<Result<DomainError, void>> {
    const validation = validateLayerName(newName);
    if (Result.isFailure(validation)) {
      return validation;
    }

    // ... update scene package
    const saveResult = await this.repo.save(scenePath, updated);
    return saveResult;
  }
}
```

### 3. Wire in Presentation

Use hooks to manage React state:

```typescript
// src/renderer/components/Timeline/Timeline.tsx
const controller = useTimelineController();

const handleRenameLayer = async (layerId: string, newName: string) => {
  const result = await controller.renameLayer(layerId, newName);
  if (Result.isFailure(result)) {
    showError(result.error.message);
  }
};
```

---

## ADR Process

When making architectural decisions, create an ADR:

1. Copy `docs/arch/template.md` → `docs/arch/NNNN-title.md`
2. Fill in: Context, Decision, Consequences
3. Link from this README
4. Get review before merging

---

## Common Patterns

### Error Handling

```typescript
const result = await controller.doSomething();

if (Result.isFailure(result)) {
  // Handle error
  console.error(result.error.code, result.error.message);
  return;
}

// Success path
const value = result.value;
```

### Dependency Injection

```typescript
// Composition root (main.ts or hook)
const repo = new ElectronSceneRepository();
const controller = new TimelineController(repo);

// Use in components
<Timeline controller={controller} />
```

### Domain Events (Future)

```typescript
// Domain emits events
class Timeline {
  addItem(item: Item) {
    // ...
    this.emit(new ItemAddedEvent(item));
  }
}

// Application subscribes
controller.on('ItemAdded', (event) => {
  logger.info('Item added', { itemId: event.item.id });
});
```

---

## Resources

- [Clean Architecture (Uncle Bob)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hex Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Result Type Pattern](https://adambennett.dev/2020/05/the-result-monad/)
- [Dependency Rule](https://khalilstemmler.com/articles/software-design-architecture/organizing-app-logic/)

---

## Questions?

Reach out to the architecture team or create an issue in GitHub.
