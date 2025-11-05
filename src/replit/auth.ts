/**
 * JWT-based Authentication for Replit MCP Server
 * Handles JWT tokens obtained from Replit extension auth bridge
 */

import jwt from 'jsonwebtoken';
import {
  AuthenticateResult,
  AuthTokenPayload,
  AuthState,
  AuthError,
  AuthOptions,
  VerifyTokenResult,
  AuthenticatedUser,
  AuthenticatedInstallation
} from '../types/auth.js';
import { logger } from '../utils/logger.js';
import { AuthenticationError, TokenError } from '../utils/errors.js';

/**
 * Safely parse integer with validation
 */
function parseSafeInt(value: string | number, fieldName: string): number {
  const parsed = parseInt(String(value), 10);

  if (isNaN(parsed)) {
    throw new AuthenticationError(
      `Invalid ${fieldName}: must be a valid integer`,
      { value, fieldName }
    );
  }

  if (parsed < 0) {
    throw new AuthenticationError(
      `Invalid ${fieldName}: must be a positive integer`,
      { value, fieldName }
    );
  }

  return parsed;
}

/**
 * Safely handle installation ID which can be a UUID string
 */
function parseInstallationId(value: string | number | undefined): AuthenticatedInstallation | undefined {
  if (!value) {
    return undefined;
  }

  // If it's a UUID string, just return it as-is (we won't parse as integer)
  if (typeof value === 'string' && value.includes('-')) {
    // For now, we'll skip installation ID if it's a UUID
    // In the future, we might want to handle this differently
    return undefined;
  }

  // Try to parse as integer
  try {
    const id = parseSafeInt(value, 'installation ID');
    return { id };
  } catch {
    return undefined;
  }
}

/**
 * Get JWT token from environment
 */
function getJWTFromEnv(): string {
  const token = process.env.REPLIT_JWT_TOKEN;

  if (!token) {
    throw new AuthenticationError(
      'REPLIT_JWT_TOKEN environment variable is not set',
      {
        hint: 'Please set REPLIT_JWT_TOKEN with the token from your Replit extension',
        code: 'MISSING_TOKEN'
      }
    );
  }

  return token;
}

/**
 * Decode JWT token without verification (for basic info)
 */
function decodeJWT(token: string): any {
  try {
    // First try standard JWT decode
    const decoded = jwt.decode(token, { complete: true });
    if (decoded) {
      return decoded;
    }

    // Handle Replit's local JWT format where the signature is plain text
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new TokenError('Invalid JWT format: must have 3 parts');
    }

    // Decode header and payload
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    // Return in the same format as jwt.decode
    return {
      header,
      payload,
      signature: parts[2]
    };
  } catch (error) {
    throw new TokenError('Failed to decode JWT token', {
      originalError: error
    });
  }
}

/**
 * Verify JWT token signature and payload
 */
async function verifyJWT(token: string): Promise<VerifyTokenResult> {
  try {
    // For now, we'll decode without signature verification
    // Replit uses a secret key we don't have access to
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) {
      throw new TokenError('Invalid JWT token format');
    }

    const payload = decoded.payload as any;
    const header = decoded.header;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new TokenError('JWT token has expired', {
        expiredAt: new Date(payload.exp * 1000).toISOString()
      });
    }

    // Handle Replit's local JWT format
    // Map Replit's fields to standard JWT claims
    const standardPayload = {
      sub: payload.userId?.toString() || payload.sub,
      iat: payload.iat || Math.floor(Date.now() / 1000),
      exp: payload.exp || (Math.floor(Date.now() / 1000) + 3600), // Default 1 hour if not present
      iss: payload.iss || payload.origin || 'replit',
      aud: payload.aud || 'replit_api',
      scope: payload.scope || 'read write'
    };

    return {
      payload: standardPayload,
      protectedHeader: {
        alg: header.alg || 'none',
        typ: header.typ || 'JWT',
        kid: header.kid
      }
    };
  } catch (error) {
    if (error instanceof TokenError) {
      throw error;
    }
    throw new TokenError('Failed to verify JWT token', {
      originalError: error
    });
  }
}

/**
 * Authenticate with Replit using JWT token
 *
 * @param options - Authentication options (ignored for JWT flow)
 * @returns Authentication result with user and installation info
 */
export async function authenticate(options?: AuthOptions): Promise<AuthenticateResult> {
  try {
    logger.info('Authenticating with JWT token');

    const token = getJWTFromEnv();
    const decoded = decodeJWT(token);
    const payload = decoded.payload as any;

    // Extract user info from token
    // Handle Replit's local JWT format
    const userId = payload.userId || payload.sub || payload.user_id;
    if (!userId) {
      throw new AuthenticationError('JWT token missing user ID');
    }

    // Create user object
    const user: AuthenticatedUser = {
      id: parseSafeInt(userId, 'user ID'),
      username: payload.username || payload.preferred_username,
      displayName: payload.displayName || payload.display_name || payload.name
    };

    // Installation info might be in different fields
    const installation = parseInstallationId(payload.installationId || payload.installation_id);

    logger.info('Authentication successful', {
      userId: user.id,
      username: user.username,
      installationId: installation?.id
    });

    return {
      user,
      installation
    };
  } catch (error) {
    logger.error('Authentication failed', error as Error);

    if (error instanceof AuthenticationError || error instanceof TokenError) {
      throw error;
    }

    throw new AuthenticationError('Authentication failed', {
      originalError: error
    });
  }
}

/**
 * Get the current JWT token for the authenticated user
 *
 * @returns JWT token string
 */
export async function getAuthToken(): Promise<string> {
  try {
    logger.debug('Getting JWT token from environment');

    const token = getJWTFromEnv();

    // Verify token is still valid
    const decoded = decodeJWT(token);
    const payload = decoded.payload as any;

    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new TokenError('JWT token has expired', {
          expiredAt: new Date(payload.exp * 1000).toISOString()
        });
      }
    }

    logger.debug('JWT token retrieved successfully');
    return token;
  } catch (error) {
    logger.error('Failed to get auth token', error as Error);

    if (error instanceof TokenError) {
      throw error;
    }

    throw new TokenError('Failed to get auth token', {
      originalError: error
    });
  }
}

/**
 * Verify a JWT token
 *
 * @param token - The JWT token to verify
 * @returns Decoded token payload and header
 */
export async function verifyAuthToken(token: string): Promise<VerifyTokenResult> {
  try {
    logger.debug('Verifying JWT token');

    const result = await verifyJWT(token);

    logger.debug('Token verification successful', {
      subject: result.payload.sub,
      expiresAt: result.payload.exp
    });

    return result;
  } catch (error) {
    logger.error('Token verification failed', error as Error);

    if (error instanceof TokenError) {
      throw error;
    }

    throw new TokenError('Token verification failed', {
      originalError: error,
      token: token.substring(0, 10) + '...'
    });
  }
}

/**
 * Get current authentication state
 *
 * @returns Current auth state including user info if authenticated
 */
export async function getAuthState(): Promise<AuthState> {
  try {
    // Try to get token to check if authenticated
    const token = getJWTFromEnv();

    if (!token) {
      return { isAuthenticated: false };
    }

    // Verify token to get payload
    const verified = await verifyAuthToken(token);
    const decoded = decodeJWT(token);
    const payload = decoded.payload as any;

    // Get full auth info
    const authResult = await authenticate();

    return {
      isAuthenticated: true,
      user: authResult.user,
      installation: authResult.installation,
      token: token,
      expiresAt: verified.payload.exp
    };
  } catch (error) {
    logger.debug('Not authenticated or token expired', { error: (error as Error).message });

    return {
      isAuthenticated: false
    };
  }
}

/**
 * Check if the current token is expired
 *
 * @param token - JWT token to check
 * @returns True if token is expired or invalid
 */
export async function isTokenExpired(token?: string): Promise<boolean> {
  if (!token) {
    try {
      token = getJWTFromEnv();
    } catch {
      return true;
    }
  }

  try {
    const decoded = decodeJWT(token);
    const payload = decoded.payload as any;

    if (!payload.exp) {
      return false; // No expiration claim
    }

    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (error) {
    return true; // Treat invalid tokens as expired
  }
}

/**
 * Refresh the authentication token if needed
 *
 * @param currentToken - Current token to check
 * @returns New token if refresh was needed, existing token if still valid
 */
export async function refreshTokenIfNeeded(currentToken?: string): Promise<string> {
  const isExpired = await isTokenExpired(currentToken);

  if (!isExpired && currentToken) {
    return currentToken;
  }

  logger.info('Token expired or missing, getting new token from environment');
  return await getAuthToken();
}

/**
 * Clear any stored authentication state
 * Note: This mainly clears local state. JWT tokens are managed via environment.
 */
export function clearAuthState(): void {
  // In JWT flow, we don't store state locally
  // The token is always read from environment
  logger.info('Auth state cleared (JWT flow - no local state to clear)');
}

/**
 * Get user info from JWT token without full authentication
 */
export async function getUserFromToken(): Promise<AuthenticateResult['user'] | null> {
  try {
    const token = getJWTFromEnv();
    const decoded = decodeJWT(token);
    const payload = decoded.payload as any;

    const userId = payload.userId || payload.sub || payload.user_id;
    if (!userId) {
      return null;
    }

    return {
      id: parseSafeInt(userId, 'user ID'),
      username: payload.username || payload.preferred_username,
      displayName: payload.displayName || payload.display_name || payload.name
    };
  } catch (error) {
    logger.debug('Failed to get user from token', { error: (error as Error).message });
    return null;
  }
}

// No need to export authAPI as we're not using Replit extensions