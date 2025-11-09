/**
 * Domain errors for timeline operations
 * All domain errors extend DomainError for type discrimination
 */

export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Validation errors - business rule violations
 */
export class ValidationError extends DomainError {
  readonly code: string = 'VALIDATION_ERROR';

  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message);
  }
}

/**
 * Item placement validation errors
 */
export class ItemPlacementError extends ValidationError {
  readonly code = 'ITEM_PLACEMENT_ERROR';

  constructor(
    message: string,
    public readonly itemId: string,
    public readonly layerId: string
  ) {
    super(message, 'item', itemId);
  }
}

/**
 * Layer not found
 */
export class LayerNotFoundError extends DomainError {
  readonly code = 'LAYER_NOT_FOUND';

  constructor(public readonly layerId: string) {
    super(`Layer not found: ${layerId}`);
  }
}

/**
 * Item not found
 */
export class ItemNotFoundError extends DomainError {
  readonly code = 'ITEM_NOT_FOUND';

  constructor(public readonly itemId: string) {
    super(`Item not found: ${itemId}`);
  }
}

/**
 * Item overlap error
 */
export class ItemOverlapError extends ValidationError {
  readonly code = 'ITEM_OVERLAP';

  constructor(
    public readonly itemId: string,
    public readonly overlappingItemId: string,
    public readonly layerId: string
  ) {
    super(
      `Item ${itemId} overlaps with ${overlappingItemId} on layer ${layerId}`,
      'startTime',
      itemId
    );
  }
}

/**
 * Invalid time range
 */
export class InvalidTimeRangeError extends ValidationError {
  readonly code = 'INVALID_TIME_RANGE';

  constructor(
    public readonly startTime: number,
    public readonly duration: number
  ) {
    super(
      `Invalid time range: startTime=${startTime}, duration=${duration}`,
      'duration',
      duration
    );
  }
}
