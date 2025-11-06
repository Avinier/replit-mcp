/**
 * Standalone Bridge Runner
 * Run this in your Replit with: node run-bridge.js
 * This will start the bridge without the React UI
 */

// Import the bridge class directly
import { ReplitMCPServerBridge } from './src/bridge.ts';

console.log('🚀 Starting Replit MCP Bridge Extension (Standalone Mode)...\n');

// Create a new bridge instance
const bridge = new ReplitMCPServerBridge();

// Initialize with Replit extensions
import('@replit/extensions').then(({ init, auth, data, fs, replDb, messages, exec, me }) => {
  init({
    experimental: true
  }).then(() => {
    console.log('✅ Replit Extensions initialized\n');

    // Initialize the bridge
    bridge.init({
      auth,
      data,
      fs,
      replDb,
      messages,
      exec,
      me
    });
  }).catch(error => {
    console.error('❌ Failed to initialize Replit Extensions:', error);
    console.log('\n💡 Make sure you have the required permissions in extension.json');
  });
}).catch(error => {
  console.error('❌ Failed to import @replit/extensions:', error);
  console.log('\n💡 Please install dependencies: npm install @replit/extensions ws');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down bridge...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down bridge...');
  process.exit(0);
});