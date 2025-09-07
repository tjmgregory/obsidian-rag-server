/**
 * Result type for operations that can fail.
 * Inspired by Rust's Result type and functional error handling.
 *
 * This allows us to handle errors without throwing exceptions,
 * making error paths explicit and type-safe.
 */

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Create a successful result.
 */
export const Ok = <T>(value: T): Result<T, never> => ({
  ok: true,
  value,
});

/**
 * Create a failed result.
 */
export const Err = <E = Error>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

/**
 * Check if a result is successful.
 */
export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } =>
  result.ok === true;

/**
 * Check if a result is an error.
 */
export const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } =>
  result.ok === false;

/**
 * Map a successful result to a new value.
 * If the result is an error, return it unchanged.
 */
export const mapResult = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> => {
  if (result.ok) {
    return Ok(fn(result.value));
  }
  return result;
};

/**
 * Map an error result to a new error.
 * If the result is successful, return it unchanged.
 */
export const mapError = <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> => {
  if (!result.ok) {
    return Err(fn(result.error));
  }
  return result;
};

/**
 * Unwrap a result, throwing if it's an error.
 * Use sparingly - prefer handling errors explicitly.
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) {
    return result.value;
  }
  throw result.error;
};

/**
 * Unwrap a result with a default value if it's an error.
 */
export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  if (result.ok) {
    return result.value;
  }
  return defaultValue;
};

/**
 * Convert a Promise to a Result.
 * Catches any thrown errors and wraps them.
 */
export const fromPromise = async <T, E = Error>(promise: Promise<T>): Promise<Result<T, E>> => {
  try {
    const value = await promise;
    return Ok(value);
  } catch (error) {
    return Err(error as E);
  }
};

/**
 * Combine multiple results into a single result.
 * If any result is an error, return the first error.
 * Otherwise, return an array of all values.
 */
export const combineResults = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = [];

  for (const result of results) {
    if (!result.ok) {
      return result;
    }
    values.push(result.value);
  }

  return Ok(values);
};
