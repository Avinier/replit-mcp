#!/usr/bin/env node

/**
 * Test script for MCP tools using the MCP Inspector
 * This tests the actual MCP protocol with the WebSocket bridge
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

console.log('🧪 Testing Replit MCP Server with WebSocket Bridge\n');

// Start the MCP server
const serverProcess = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, DEBUG: 'true' }
});

const rl = createInterface({
  input: serverProcess.stdout,
  output: serverProcess.stdin,
  terminal: false
});

// Log server output
serverProcess.stderr.on('data', (data) => {
  console.error('Server stderr:', data.toString());
});

// Test MCP protocol messages
async function testMCP() {
  console.log('📡 Sending MCP initialization...');

  // Send initialize request
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
        resources: {}
      },
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };

  serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');

  // Wait a bit for response
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('🔧 Requesting tools list...');

  // Request tools list
  const toolsRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
  };

  serverProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');

  // Wait a bit for response
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('📊 Requesting resources list...');

  // Request resources list
  const resourcesRequest = {
    jsonrpc: "2.0",
    id: 3,
    method: "resources/list",
    params: {}
  };

  serverProcess.stdin.write(JSON.stringify(resourcesRequest) + '\n');

  // Wait a bit for response
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('📊 Testing status tool...');

  // Call replit_status tool
  const statusRequest = {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "replit_status",
      arguments: {}
    }
  };

  serverProcess.stdin.write(JSON.stringify(statusRequest) + '\n');

  // Wait for final response
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n✅ Test complete. Shutting down server...');
  serverProcess.kill();
}

// Parse MCP responses
rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    console.log('📨 MCP Response:', JSON.stringify(response, null, 2));
  } catch (e) {
    console.log('📨 Server output:', line);
  }
});

// Start the test
testMCP().catch(console.error);