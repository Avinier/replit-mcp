#!/usr/bin/env node

/**
 * Test script for the Replit MCP WebSocket Bridge
 * This simulates the extension to test the bridge functionality
 */

import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8765');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket bridge');

  // Simulate authentication
  ws.send(JSON.stringify({
    id: 'test-1',
    action: 'authenticate',
    params: {
      token: 'test-token-123'
    }
  }));

  // Register workspace
  setTimeout(() => {
    ws.send(JSON.stringify({
      id: 'test-2',
      action: 'register_workspace',
      params: {
        workspaceId: 'test-workspace-456'
      }
    }));
  }, 500);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 Received:', message);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('🔌 Connection closed');
  process.exit(0);
});

// Test sending a request as if it came from MCP
setTimeout(() => {
  console.log('\n🧪 Testing file read request...');
  ws.send(JSON.stringify({
    id: 'test-3',
    action: 'read_file',
    params: {
      path: 'package.json'
    }
  }));
}, 1500);

setTimeout(() => {
  console.log('\n🧪 Testing command execution...');
  ws.send(JSON.stringify({
    id: 'test-4',
    action: 'run_command',
    params: {
      command: 'node',
      args: ['-v']
    }
  }));
}, 2000);

setTimeout(() => {
  console.log('\n✅ Tests complete. Closing connection...');
  ws.close();
}, 3000);