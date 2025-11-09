import { test, expect } from 'vitest';
import { Result } from '../Result';

test('Result.ok creates success result', () => {
  const result = Result.ok(42);

  expect(result.isSuccess).toBe(true);
  expect(result.isFailure).toBe(false);

  if (result.isSuccess) {
    expect(result.value).toBe(42);
  }
});

test('Result.err creates failure result', () => {
  const error = new Error('test error');
  const result = Result.err(error);

  expect(result.isSuccess).toBe(false);
  expect(result.isFailure).toBe(true);

  if (result.isFailure) {
    expect(result.error).toBe(error);
  }
});

test('Result.isSuccess type guard works', () => {
  const success = Result.ok('value');

  if (Result.isSuccess(success)) {
    expect(success.value).toBe('value');
  }
});

test('Result.isFailure type guard works', () => {
  const failure = Result.err('error');

  if (Result.isFailure(failure)) {
    expect(failure.error).toBe('error');
  }
});
