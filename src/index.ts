/**
 * Replit MCP Server - Main Entry Point
 * Bridges Cursor IDE with Replit's ecosystem through the Model Context Protocol
 */

import { ReplitMCPServer } from './mcp-server.js';

// Start the server
async function startServer() {
  const server = new ReplitMCPServer();
  await server.start();
}

startServer().catch((error) => {
  console.error('Failed to start Replit MCP Server:', error);
  process.exit(1);
});