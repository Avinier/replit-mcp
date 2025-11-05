/**
 * MCP Tools for Replit Authentication API (JWT-based)
 * These tools expose Replit authentication functionality to the MCP client
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  authenticate,
  getAuthToken,
  verifyAuthToken,
  getAuthState,
  clearAuthState,
  getUserFromToken
} from '../replit/auth.js';
import { logger } from '../utils/logger.js';
import { createMCPError } from '../utils/errors.js';

/**
 * Define input schemas for each tool
 */
const authenticateSchema = z.object({
  // No parameters needed for JWT flow - token comes from environment
});

const getTokenSchema = z.object({});

const verifyTokenSchema = z.object({
  token: z.string().describe('JWT token to verify')
});

const getAuthStateSchema = z.object({});

const logoutSchema = z.object({});

const getUserInfoSchema = z.object({});

/**
 * Tool definitions
 */
export const authTools: Tool[] = [
  {
    name: 'replit_authenticate',
    description: 'Authenticate with Replit using JWT token from environment',
    inputSchema: {
      type: 'object',
      properties: {},
      description: 'No parameters required. Uses REPLIT_JWT_TOKEN environment variable.'
    }
  },

  {
    name: 'replit_get_token',
    description: 'Get the current JWT authentication token from environment',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  {
    name: 'replit_verify_token',
    description: 'Verify a JWT token and return decoded information',
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'JWT token to verify'
        }
      },
      required: ['token']
    }
  },

  {
    name: 'replit_get_auth_state',
    description: 'Get current authentication status and user information',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  {
    name: 'replit_logout',
    description: 'Clear current authentication state (note: JWT token remains in environment)',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  {
    name: 'replit_get_user_info',
    description: 'Get user information from the JWT token without full authentication',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

/**
 * Tool handlers
 */
export const authToolHandlers = {
  /**
   * Handle authentication
   */
  async replit_authenticate(args: any) {
    try {
      logger.info('Handling replit_authenticate request (JWT flow)');

      const parsed = authenticateSchema.parse(args);

      const result = await authenticate();

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Successfully authenticated with Replit using JWT token',
            user: {
              id: result.user.id,
              username: result.user.username,
              displayName: result.user.displayName
            },
            installation: result.installation ? {
              id: result.installation.id
            } : null,
            note: 'Authentication using JWT token from environment variable'
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error('Authentication failed in tool handler', error as Error);
      return createMCPError(error);
    }
  },

  /**
   * Handle get token
   */
  async replit_get_token(args: any) {
    try {
      logger.info('Handling replit_get_token request');

      const parsed = getTokenSchema.parse(args);

      const token = await getAuthToken();

      // Return a truncated version for security
      const displayToken = token.substring(0, 20) + '...' + token.substring(token.length - 20);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'JWT token retrieved from environment',
            token: displayToken,
            tokenLength: token.length,
            note: 'This is a truncated version of the token for security. The full token is used internally.',
            source: 'REPLIT_JWT_TOKEN environment variable'
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error('Failed to get token in tool handler', error as Error);
      return createMCPError(error);
    }
  },

  /**
   * Handle verify token
   */
  async replit_verify_token(args: any) {
    try {
      logger.info('Handling replit_verify_token request');

      const parsed = verifyTokenSchema.parse(args);

      const result = await verifyAuthToken(parsed.token);

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      const isExpired = result.payload.exp < now;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Token verified successfully',
            payload: {
              subject: result.payload.sub,
              issuedAt: new Date(result.payload.iat * 1000).toISOString(),
              expiresAt: new Date(result.payload.exp * 1000).toISOString(),
              issuer: result.payload.iss,
              audience: result.payload.aud,
              scope: result.payload.scope
            },
            header: {
              algorithm: result.protectedHeader.alg,
              type: result.protectedHeader.typ,
              keyId: result.protectedHeader.kid
            },
            isValid: !isExpired,
            isExpired,
            verification: 'decoded without signature verification (Replit secret key not available)'
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error('Failed to verify token in tool handler', error as Error);
      return createMCPError(error);
    }
  },

  /**
   * Handle get auth state
   */
  async replit_get_auth_state(args: any) {
    try {
      logger.info('Handling replit_get_auth_state request');

      const parsed = getAuthStateSchema.parse(args);

      const state = await getAuthState();

      const response: any = {
        success: true,
        message: state.isAuthenticated ? 'User is authenticated' : 'User is not authenticated',
        isAuthenticated: state.isAuthenticated,
        authMethod: 'JWT Token (Environment Variable)'
      };

      if (state.isAuthenticated) {
        response.user = state.user;
        response.installation = state.installation;
        response.expiresAt = state.expiresAt ? new Date(state.expiresAt * 1000).toISOString() : null;
        response.tokenPresent = !!state.token;
      } else {
        response.error = 'No valid JWT token found in REPLIT_JWT_TOKEN environment variable';
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };
    } catch (error) {
      logger.error('Failed to get auth state in tool handler', error as Error);
      return createMCPError(error);
    }
  },

  /**
   * Handle logout
   */
  async replit_logout(args: any) {
    try {
      logger.info('Handling replit_logout request');

      const parsed = logoutSchema.parse(args);

      clearAuthState();

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Cleared local authentication state',
            note: 'JWT token remains in environment variable. To fully logout, remove or clear REPLIT_JWT_TOKEN.',
            authMethod: 'JWT Token (Environment Variable)'
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error('Failed to logout in tool handler', error as Error);
      return createMCPError(error);
    }
  },

  /**
   * Handle get user info
   */
  async replit_get_user_info(args: any) {
    try {
      logger.info('Handling replit_get_user_info request');

      const parsed = getUserInfoSchema.parse(args);

      const user = await getUserFromToken();

      if (!user) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: 'No valid user information found in JWT token',
              error: 'Check REPLIT_JWT_TOKEN environment variable'
            }, null, 2)
          }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'User information retrieved from JWT token',
            user: {
              id: user.id,
              username: user.username,
              displayName: user.displayName
            },
            source: 'Decoded from REPLIT_JWT_TOKEN'
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error('Failed to get user info in tool handler', error as Error);
      return createMCPError(error);
    }
  }
};