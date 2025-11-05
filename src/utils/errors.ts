/**
 * Custom error classes for the Replit MCP server
 */

import { AuthError } from '../types/auth.js';

export class ReplitMCPServerError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'ReplitMCPServerError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ReplitMCPServerError);
    }
  }
}

export class AuthenticationError extends ReplitMCPServerError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHENTICATION_ERROR', details);
    this.name = 'AuthenticationError';
  }
}

export class TokenError extends ReplitMCPServerError {
  constructor(message: string, details?: any) {
    super(message, 'TOKEN_ERROR', details);
    this.name = 'TokenError';
  }
}

export class ReplitAPIError extends ReplitMCPServerError {
  constructor(message: string, details?: any) {
    super(message, 'REPLIT_API_ERROR', details);
    this.name = 'ReplitAPIError';
  }
}

export class MCPServerError extends ReplitMCPServerError {
  constructor(message: string, details?: any) {
    super(message, 'MCP_SERVER_ERROR', details);
    this.name = 'MCPServerError';
  }
}

/**
 * Convert any error to a standard error response for MCP
 */
export function createMCPError(error: unknown): {
  content: Array<{ type: string; text: string }>;
} {
  if (error instanceof ReplitMCPServerError) {
    return {
      content: [{
        type: 'text',
        text: `${error.name}: ${error.message}${error.details ? `\n\nDetails: ${JSON.stringify(error.details, null, 2)}` : ''}`
      }]
    };
  }

  if (error instanceof Error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }]
    };
  }

  return {
    content: [{
      type: 'text',
      text: `Unknown error: ${String(error)}`
    }]
  };
}

/**
 * Wrap async functions with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const logger = await import('./logger.js').then(m => m.logger);

      if (context) {
        logger.error(`Error in ${context}`, error as Error);
      } else {
        logger.error('Unexpected error', error as Error);
      }

      throw error;
    }
  };
}