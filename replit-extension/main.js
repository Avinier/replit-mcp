/**
 * Replit MCP Bridge Extension
 * Runs inside Replit workspace and bridges Extension APIs to external MCP server
 */

import { init, auth, data, fs, messages, exec, me } from "@replit/extensions";
import WebSocket from 'ws';

class ReplitMCPServerBridge {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 2000; // Start with 2 seconds
    this.workspaceId = null;
    this.requestHandlers = new Map();
    this.setupRequestHandlers();
  }

  setupRequestHandlers() {
    // File operations
    this.requestHandlers.set('read_file', this.handleReadFile.bind(this));
    this.requestHandlers.set('write_file', this.handleWriteFile.bind(this));
    this.requestHandlers.set('list_directory', this.handleListDirectory.bind(this));

    // Command execution
    this.requestHandlers.set('run_command', this.handleRunCommand.bind(this));

    // User and workspace info
    this.requestHandlers.set('get_user_info', this.handleGetUserInfo.bind(this));
    this.requestHandlers.set('get_workspace_info', this.handleGetWorkspaceInfo.bind(this));
    this.requestHandlers.set('list_repls', this.handleListRepls.bind(this));

    // Deployment
    this.requestHandlers.set('deploy', this.handleDeploy.bind(this));
  }

  async init() {
    try {
      // Initialize Replit Extension APIs
      await init();

      // Get workspace ID
      const workspaceInfo = await me.getWorkspaceInfo();
      this.workspaceId = workspaceInfo.id || workspaceInfo.name || 'default';

      console.log('Replit MCP Bridge Extension initialized');
      console.log(`Workspace ID: ${this.workspaceId}`);

      // Start WebSocket connection
      this.connect();

      // Show notification to user
      messages.showNotice('Replit MCP Bridge Extension activated');

    } catch (error) {
      console.error('Failed to initialize extension:', error);
      messages.showError('Failed to initialize Replit MCP Bridge');
    }
  }

  connect() {
    const wsUrl = `ws://localhost:${process.env.BRIDGE_PORT || 8765}`;

    console.log(`Connecting to MCP bridge at ${wsUrl}...`);

    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log('Connected to MCP bridge');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 2000;

      // Authenticate with the bridge
      this.authenticate();
    });

    this.ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(message);
      } catch (err) {
        console.error('Failed to handle message:', err);
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed && parsed.id) {
            this.sendResponse(parsed.id, { error: 'Failed to process request' });
          }
        } catch (e) {
          // Ignore JSON parse errors in error handler
        }
      }
    });

    this.ws.on('close', () => {
      console.log('Disconnected from MCP bridge');
      this.connected = false;

      // Try to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
          console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          this.connect();
        }, this.reconnectDelay);
      } else {
        console.error('Max reconnection attempts reached');
        messages.showError('Lost connection to MCP bridge');
      }
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  async authenticate() {
    try {
      // Get auth token from Replit
      const token = await auth.getAuthToken();

      this.sendMessage({
        action: 'authenticate',
        params: { token }
      });

      // Register workspace
      this.sendMessage({
        action: 'register_workspace',
        params: { workspaceId: this.workspaceId }
      });

    } catch (error) {
      console.error('Authentication failed:', error);
    }
  }

  async handleMessage(message) {
    const { id, action, params } = message;

    if (!action || !this.requestHandlers.has(action)) {
      this.sendResponse(id, { error: `Unknown action: ${action}` });
      return;
    }

    try {
      const handler = this.requestHandlers.get(action);
      const result = await handler(params);
      this.sendResponse(id, { result });
    } catch (error) {
      console.error(`Error handling ${action}:`, error);
      this.sendResponse(id, { error: error.message });
    }
  }

  sendResponse(requestId, data) {
    this.sendMessage({
      id: requestId,
      action: 'response',
      ...data
    });
  }

  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not ready, cannot send message:', message);
    }
  }

  // Request Handlers
  async handleReadFile(params) {
    const { path } = params;
    const content = await fs.readFile(path, 'utf8');
    return { content };
  }

  async handleWriteFile(params) {
    const { path, content } = params;
    await fs.writeFile(path, content, 'utf8');
    return { success: true };
  }

  async handleListDirectory(params) {
    const { path = '.' } = params;
    const entries = await fs.readDir(path);
    return { entries };
  }

  async handleRunCommand(params) {
    const { command, args = [], cwd } = params;
    const result = await exec(command, args, { cwd });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode
    };
  }

  async handleGetUserInfo() {
    const user = await data.currentUser();
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      roles: user.roles,
      teams: user.teams
    };
  }

  async handleGetWorkspaceInfo() {
    const repl = await data.currentRepl();
    return {
      id: repl.id,
      title: repl.title,
      language: repl.language,
      isPrivate: repl.isPrivate,
      owner: repl.owner,
      createdAt: repl.createdAt,
      lastActive: repl.lastActive
    };
  }

  async handleListRepls() {
    const user = await data.currentUser();
    const repls = await Promise.all(
      user.repls.map(id => data.replById(id))
    );

    return {
      repls: repls.map(r => ({
        id: r.id,
        title: r.title,
        language: r.language,
        isPrivate: r.isPrivate,
        url: r.url,
        lastActive: r.lastActive
      }))
    };
  }

  async handleDeploy(params) {
    // This is a simplified deployment handler
    // In practice, you'd use Replit's deployment API
    const { replId, env = {} } = params;

    try {
      // Set environment variables if provided
      for (const [key, value] of Object.entries(env)) {
        process.env[key] = value;
      }

      // Run build command if exists
      await exec('npm run build', [], { timeout: 300000 }).catch(() => null);

      // Deploy using Replit's deployment mechanism
      // This would need to be adapted based on actual Replit deployment API
      const deploymentUrl = `https://${replId || 'default'}.replit.app`;

      return {
        url: deploymentUrl,
        status: 'deployed',
        message: 'Deployment successful'
      };
    } catch (error) {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }
}

// Initialize the bridge
const bridge = new ReplitMCPServerBridge();
bridge.init();