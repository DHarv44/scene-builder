/**
 * Result type for explicit error handling
 * Replaces throwing exceptions with type-safe error returns
 */

export type Result<E, T> = Success<T> | Failure<E>;

export class Success<T> {
  readonly isSuccess = true;
  readonly isFailure = false;

  constructor(public readonly value: T) {}

  static of<T>(value: T): Success<T> {
    return new Success(value);
  }
}

export class Failure<E> {
  readonly isSuccess = false;
  readonly isFailure = true;

  constructor(public readonly error: E) {}

  static of<E>(error: E): Failure<E> {
    return new Failure(error);
  }
}

export const Result = {
  ok<T>(value: T): Result<never, T> {
    return new Success(value);
  },

  err<E>(error: E): Result<E, never> {
    return new Failure(error);
  },

  isSuccess<E, T>(result: Result<E, T>): result is Success<T> {
    return result.isSuccess;
  },

  isFailure<E, T>(result: Result<E, T>): result is Failure<E> {
    return result.isFailure;
  },
};
