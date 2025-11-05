#!/usr/bin/env node

/**
 * Simple test script to verify MCP server is working
 * Run with: node test-mcp.js
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

console.log('🚀 Starting Replit MCP Server test...\n');

// Start the MCP server
const serverProcess = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    // Make sure to set your actual credentials here for testing
    // REPLIT_CLIENT_ID: 'your_client_id_here',
    // REPLIT_CLIENT_SECRET: 'your_client_secret_here',
  }
});

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// Handle server output
serverProcess.stdout.on('data', (data) => {
  console.log('Server:', data.toString().trim());
});

serverProcess.stderr.on('data', (data) => {
  console.error('Server Error:', data.toString().trim());
});

// Send a test request
setTimeout(() => {
  console.log('\n📤 Sending test request...');

  // Initialize request
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {}
      },
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');

  // List tools request
  setTimeout(() => {
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };

    serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');

    // Close after response
    setTimeout(() => {
      console.log('\n✅ Test complete!');
      serverProcess.kill();
      process.exit(0);
    }, 2000);
  }, 1000);
}, 1000);

serverProcess.on('close', (code) => {
  console.log(`\nServer process exited with code ${code}`);
});