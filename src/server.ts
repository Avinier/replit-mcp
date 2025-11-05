/**
 * MCP Server Configuration for Replit Extensions (JWT-based)
 * Configures the MCP server with tools, resources, and capabilities
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { authTools, authToolHandlers } from './tools/index.js';
import { authResources, authResourceHandlers } from './resources/index.js';
import { logger } from './utils/logger.js';

/**
 * Create and configure the MCP server
 */
export async function createServer(): Promise<Server> {
  logger.info('Creating Replit MCP Server (JWT-based authentication)');

  // Create MCP server instance
  const server = new Server(
    {
      name: 'replit-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      }
    }
  );

  // Register tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: authTools.map(tool => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema
      }))
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const toolName = request.params.name;
    const args = request.params.arguments || {};

    const handler = authToolHandlers[toolName as keyof typeof authToolHandlers];
    if (!handler) {
      throw new Error(`No handler found for tool: ${toolName}`);
    }

    try {
      // Call the handler
      const result = await handler(args);

      // Log tool usage
      logger.info(`Tool executed: ${toolName}`, {
        args: Object.keys(args),
        success: !('isError' in result && result.isError)
      });

      return result;
    } catch (error) {
      logger.error(`Tool ${toolName} failed`, error as Error);
      throw error;
    }
  });

  // Register resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: authResources
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
    const uri = request.params.uri;
    const handler = authResourceHandlers[uri as keyof typeof authResourceHandlers];

    if (!handler) {
      throw new Error(`No handler found for resource: ${uri}`);
    }

    try {
      // Call the handler
      const result = await handler(new URL(uri));

      // Log resource access
      logger.debug(`Resource accessed: ${uri}`, {
        uri: uri
      });

      return result;
    } catch (error) {
      logger.error(`Resource ${uri} failed`, error as Error);
      throw error;
    }
  });

  logger.info('MCP Server configured successfully', {
    tools: authTools.map(t => t.name),
    resources: authResources.map(r => r.uri),
    authMethod: 'JWT Token (Environment Variable)'
  });

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startServer(): Promise<void> {
  try {
    logger.info('Starting Replit MCP Server...');

    const server = await createServer();
    const transport = new StdioServerTransport();

    // Connect the server to the transport
    await server.connect(transport);

    logger.info('Replit MCP Server started and listening on stdio');
    logger.info('Using JWT-based authentication from REPLIT_JWT_TOKEN environment variable');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await server.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}