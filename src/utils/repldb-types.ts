/**
 * Type definitions and utilities for ReplDB API
 * Handles the ambiguous return types from ReplDB operations
 */

export interface ReplDbError {
  error: string | null;
}

export interface ReplDbKeys {
  keys: string[];
}

export type ReplDbResult<T = string> = T | ReplDbError;

/**
 * Type guard to check if result is an error
 */
export function isReplDbError<T>(result: ReplDbResult<T>): result is ReplDbError {
  return result != null && typeof result === 'object' && 'error' in result;
}

/**
 * Type guard to check if result is successful
 */
export function isReplDbSuccess<T>(result: ReplDbResult<T>): result is T {
  return !isReplDbError(result);
}

/**
 * Extract value from ReplDB result safely
 */
export function extractReplDbValue<T = string>(result: ReplDbResult<T>): T | null {
  if (isReplDbError(result)) {
    return null;
  }
  return result;
}

/**
 * Extract error from ReplDB result
 */
export function extractReplDbError(result: ReplDbResult<any>): string | null {
  if (isReplDbError(result)) {
    return result.error;
  }
  return null;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Safe JSON stringify
 */
export function safeJsonStringify(value: any): string {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}