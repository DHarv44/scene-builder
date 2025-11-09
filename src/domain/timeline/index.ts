/**
 * Timeline Domain Layer
 * Pure business logic with no external dependencies
 */

// Core types
export { Result, Success, Failure } from './Result';

// Errors
export {
  DomainError,
  ValidationError,
  ItemPlacementError,
  LayerNotFoundError,
  ItemNotFoundError,
  ItemOverlapError,
  InvalidTimeRangeError
} from './errors';

// Domain services
export {
  calculateItemPosition,
  calculateItemResize,
  findParentSceneForItem,
  pixelsToTime,
  timeToPixels,
  snapToGrid,
  type PositionConstraints,
  type PositionCalculation,
  type ResizeCalculation
} from './ItemPositioner';

// Ports (interfaces only)
export type {
  SceneRepositoryPort,
  AssetManagerPort,
  ClockPort,
  IdGeneratorPort,
  LoggerPort
} from './ports';
