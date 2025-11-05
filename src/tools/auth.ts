/**
 * MCP Tools for Replit Authentication API
 * These tools expose Replit authentication functionality to the MCP client
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  authenticate,
  getAuthToken,
  verifyAuthToken,
  getAuthState,
  clearAuthState
} from '../replit/auth.js';
import { logger } from '../utils/logger.js';
import { createMCPError } from '../utils/errors.js';

/**
 * Define input schemas for each tool
 */
const authenticateSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  scopes: z.array(z.string()).optional().default(['profile', 'email'])
});

const getTokenSchema = z.object({});

const verifyTokenSchema = z.object({
  token: z.string().describe('JWT token to verify')
});

const getAuthStateSchema = z.object({});

const logoutSchema = z.object({});

/**
 * Tool definitions
 */
export const authTools: Tool[] = [
  {
    name: 'replit_authenticate',
    description: 'Authenticate with Replit and get user session information',
    inputSchema: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
          description: 'Replit client ID (optional, uses environment variable if not provided)'
        },
        clientSecret: {
          type: 'string',
          description: 'Replit client secret (optional, uses environment variable if not provided)'
        },
        scopes: {
          type: 'array',
          items: { type: 'string' },
          description: 'OAuth scopes to request',
          default: ['profile', 'email']
        }
      }
    }
  },

  {
    name: 'replit_get_token',
    description: 'Get the current JWT authentication token for Replit',
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
    description: 'Clear current authentication state',
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
      logger.info('Handling replit_authenticate request');

      const parsed = authenticateSchema.parse(args);

      // Set environment variables if provided
      if (parsed.clientId) {
        process.env.REPLIT_CLIENT_ID = parsed.clientId;
      }
      if (parsed.clientSecret) {
        process.env.REPLIT_CLIENT_SECRET = parsed.clientSecret;
      }

      const result = await authenticate({
        clientId: parsed.clientId,
        clientSecret: parsed.clientSecret,
        scopes: parsed.scopes,
        autoRefresh: true
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Successfully authenticated with Replit',
            user: {
              id: result.user.id
            },
            installation: result.installation ? {
              id: result.installation.id
            } : null
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
            message: 'JWT token retrieved successfully',
            token: displayToken,
            tokenLength: token.length,
            note: 'This is a truncated version of the token for security. The full token is used internally.'
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
            isExpired
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

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: state.isAuthenticated ? 'User is authenticated' : 'User is not authenticated',
            ...state
          }, null, 2)
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
            message: 'Successfully logged out and cleared authentication state'
          }, null, 2)
        }]
      };
    } catch (error) {
      logger.error('Failed to logout in tool handler', error as Error);
      return createMCPError(error);
    }
  }
};