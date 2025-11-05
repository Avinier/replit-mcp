/**
 * Wrapper for Replit Auth API
 * Provides a clean interface for authentication operations
 */

import {
  AuthenticateResult,
  AuthTokenPayload,
  AuthState,
  AuthError,
  AuthOptions,
  VerifyTokenResult
} from '../types/auth.js';
import { logger } from '../utils/logger.js';
import { AuthenticationError, TokenError } from '../utils/errors.js';

// We'll use dynamic imports for Replit extensions since they need to be initialized first
let authAPI: any = null;
let initialized = false;

/**
 * Initialize the Auth API module
 */
async function initAuthAPI(): Promise<void> {
  if (initialized) return;

  try {
    // Import Replit extensions
    const extensions = await import('@replit/extensions');

    // Initialize extensions if not already done
    const replitExtensions = extensions as any;

    if (!replitExtensions.initialized) {
      await replitExtensions.init({
        // Pass any required configuration
        auth: {
          clientId: process.env.REPLIT_CLIENT_ID,
          clientSecret: process.env.REPLIT_CLIENT_SECRET,
        }
      });
    }

    // Access the experimental auth API
    authAPI = replitExtensions.experimental.auth;
    initialized = true;

    logger.info('Replit Auth API initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Replit Auth API', error as Error);
    throw new AuthenticationError(
      'Failed to initialize Replit Auth API',
      { originalError: error }
    );
  }
}

/**
 * Ensure the Auth API is initialized before use
 */
async function ensureInitialized(): Promise<void> {
  if (!initialized) {
    await initAuthAPI();
  }
}

/**
 * Authenticate with Replit and get user information
 *
 * @param options - Authentication options
 * @returns Authentication result with user and installation info
 */
export async function authenticate(options?: AuthOptions): Promise<AuthenticateResult> {
  await ensureInitialized();

  try {
    logger.info('Attempting authentication with Replit', { options });

    // Call the Replit auth API
    const result = await authAPI.authenticate();

    logger.info('Authentication successful', {
      userId: result.user.id,
      installationId: result.installation?.id
    });

    return result;
  } catch (error) {
    logger.error('Authentication failed', error as Error);

    if (error instanceof Error) {
      throw new AuthenticationError(
        `Authentication failed: ${error.message}`,
        { originalError: error.message }
      );
    }

    throw new AuthenticationError('Authentication failed', { originalError: error });
  }
}

/**
 * Get the current JWT token for the authenticated user
 *
 * @returns JWT token string
 */
export async function getAuthToken(): Promise<string> {
  await ensureInitialized();

  try {
    logger.debug('Requesting auth token');

    const token = await authAPI.getAuthToken();

    if (!token) {
      throw new TokenError('No authentication token available');
    }

    logger.debug('Auth token retrieved successfully');
    return token;
  } catch (error) {
    logger.error('Failed to get auth token', error as Error);

    if (error instanceof TokenError) {
      throw error;
    }

    throw new TokenError(
      `Failed to get auth token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: error }
    );
  }
}

/**
 * Verify a JWT token
 *
 * @param token - The JWT token to verify
 * @returns Decoded token payload and header
 */
export async function verifyAuthToken(token: string): Promise<VerifyTokenResult> {
  await ensureInitialized();

  try {
    logger.debug('Verifying auth token');

    const result = await authAPI.verifyAuthToken(token);

    logger.debug('Token verification successful', {
      subject: result.payload.sub,
      expiresAt: result.payload.exp
    });

    return result;
  } catch (error) {
    logger.error('Token verification failed', error as Error);

    throw new TokenError(
      `Token verification failed: ${error instanceof Error ? error.message : 'Invalid token'}`,
      { originalError: error, token: token.substring(0, 10) + '...' }
    );
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
    const token = await getAuthToken();

    if (!token) {
      return { isAuthenticated: false };
    }

    // Verify token to get payload
    const verified = await verifyAuthToken(token);

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
  if (!token) return true;

  try {
    const verified = await verifyAuthToken(token);
    const now = Math.floor(Date.now() / 1000);
    return verified.payload.exp < now;
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

  logger.info('Token expired or missing, requesting new token');
  return await getAuthToken();
}

/**
 * Clear any stored authentication state
 * Note: This mainly clears local state. Replit manages the actual auth state.
 */
export function clearAuthState(): void {
  // In a real implementation, you might clear local storage or cache
  logger.info('Auth state cleared');
  initialized = false;
  authAPI = null;
}

// Export the auth API object for advanced usage
export { authAPI as _authAPIInternal };