/**
 * MCP Resources for Replit Authentication API
 * Resources provide access to data that the MCP client can read
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { getAuthState, getAuthToken } from '../replit/auth.js';
import { logger } from '../utils/logger.js';
import { createMCPError } from '../utils/errors.js';

/**
 * Resource definitions
 */
export const authResources: Resource[] = [
  {
    uri: 'replit://auth/user',
    name: 'Replit User Profile',
    description: 'Current authenticated user information',
    mimeType: 'application/json'
  },
  {
    uri: 'replit://auth/token',
    name: 'Replit Auth Token',
    description: 'Current JWT authentication token (truncated for security)',
    mimeType: 'application/json'
  },
  {
    uri: 'replit://auth/state',
    name: 'Replit Auth State',
    description: 'Current authentication state and session information',
    mimeType: 'application/json'
  }
];

/**
 * Resource handlers
 */
export const authResourceHandlers = {
  /**
   * Handle user profile resource
   */
  async 'replit://auth/user'(uri: URL) {
    try {
      logger.debug('Fetching user profile resource');

      const state = await getAuthState();

      if (!state.isAuthenticated) {
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({
              error: 'User not authenticated',
              authenticated: false
            }, null, 2),
            mimeType: 'application/json'
          }]
        };
      }

      const userProfile = {
        authenticated: true,
        user: state.user,
        installation: state.installation,
        tokenInfo: state.token ? {
          expiresAt: state.expiresAt ? new Date(state.expiresAt * 1000).toISOString() : null,
          hasToken: true
        } : null
      };

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(userProfile, null, 2),
          mimeType: 'application/json'
        }]
      };
    } catch (error) {
      logger.error('Failed to fetch user profile resource', error as Error);
      return createMCPError(error);
    }
  },

  /**
   * Handle token resource (truncated for security)
   */
  async 'replit://auth/token'(uri: URL) {
    try {
      logger.debug('Fetching auth token resource');

      const state = await getAuthState();

      if (!state.isAuthenticated || !state.token) {
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify({
              error: 'No valid authentication token available',
              authenticated: false
            }, null, 2),
            mimeType: 'application/json'
          }]
        };
      }

      // Return only token metadata for security
      const tokenInfo = {
        authenticated: true,
        tokenPreview: state.token.substring(0, 10) + '...' + state.token.substring(state.token.length - 10),
        tokenLength: state.token.length,
        expiresAt: state.expiresAt ? new Date(state.expiresAt * 1000).toISOString() : null,
        isExpired: state.expiresAt ? state.expiresAt < Math.floor(Date.now() / 1000) : false
      };

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(tokenInfo, null, 2),
          mimeType: 'application/json'
        }]
      };
    } catch (error) {
      logger.error('Failed to fetch auth token resource', error as Error);
      return createMCPError(error);
    }
  },

  /**
   * Handle auth state resource
   */
  async 'replit://auth/state'(uri: URL) {
    try {
      logger.debug('Fetching auth state resource');

      const state = await getAuthState();

      const authStateInfo = {
        authenticated: state.isAuthenticated,
        timestamp: new Date().toISOString(),
        user: state.user || null,
        installation: state.installation || null,
        tokenInfo: state.token ? {
          hasToken: true,
          expiresAt: state.expiresAt ? new Date(state.expiresAt * 1000).toISOString() : null,
          isExpired: state.expiresAt ? state.expiresAt < Math.floor(Date.now() / 1000) : null
        } : {
          hasToken: false
        }
      };

      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(authStateInfo, null, 2),
          mimeType: 'application/json'
        }]
      };
    } catch (error) {
      logger.error('Failed to fetch auth state resource', error as Error);
      return createMCPError(error);
    }
  }
};