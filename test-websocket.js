#!/usr/bin/env node

import WebSocket from 'ws';

console.log('🧪 Testing WebSocket connection to ngrok tunnel...');

const ws = new WebSocket('wss://5c920f0293a4.ngrok-free.app');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server through ngrok!');

  // Send a test message
  ws.send(JSON.stringify({
    id: 'test-123',
    action: 'ping',
    timestamp: new Date().toISOString()
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('📨 Received message:', JSON.stringify(message, null, 2));

  if (message.action === 'pong') {
    console.log('✅ Ping-pong test successful!');
    ws.close();
  }
});

ws.on('close', () => {
  console.log('🔌 Connection closed');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

// Timeout after 5 seconds
setTimeout(() => {
  console.log('⏰ Test timed out');
  ws.close();
  process.exit(1);
}, 5000);