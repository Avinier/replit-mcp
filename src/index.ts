/**
 * Replit MCP Server - Main Entry Point
 * Bridges Cursor IDE with Replit's ecosystem through the Model Context Protocol
 */

import { startServer } from './server.js';

// Start the server
startServer().catch((error) => {
  console.error('Failed to start Replit MCP Server:', error);
  process.exit(1);
});