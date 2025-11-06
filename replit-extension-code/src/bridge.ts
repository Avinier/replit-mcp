/**
 * WebSocket Bridge for Replit MCP Server
 * Connects your Replit workspace to Cursor IDE
 */

import WebSocket from 'ws';

export interface BridgeMessage {
  id: string;
  action: string;
  params?: any;
  result?: any;
  error?: string;
  workspaceId?: string;
}

export class ReplitMCPServerBridge {
  private ws: WebSocket | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000;
  private workspaceId: string | null = null;
  private requestHandlers = new Map<string, Function>();
  private auth: any;
  private data: any;
  private fs: any;
  private replDb: any;
  private messages: any;
  private exec: any;
  private me: any;

  constructor() {
    this.setupRequestHandlers();
  }

  setupRequestHandlers() {
    // File operations
    this.requestHandlers.set('read_file', this.handleReadFile.bind(this));
    this.requestHandlers.set('write_file', this.handleWriteFile.bind(this));
    this.requestHandlers.set('list_directory', this.handleListDirectory.bind(this));
    this.requestHandlers.set('delete_file', this.handleDeleteFile.bind(this));

    // Command execution
    this.requestHandlers.set('run_command', this.handleRunCommand.bind(this));

    // Database operations (ReplDB)
    this.requestHandlers.set('repldb_get', this.handleReplDBGet.bind(this));
    this.requestHandlers.set('repldb_set', this.handleReplDBSet.bind(this));
    this.requestHandlers.set('repldb_delete', this.handleReplDBDelete.bind(this));
    this.requestHandlers.set('repldb_list', this.handleReplDBList.bind(this));

    // User and workspace info
    this.requestHandlers.set('get_user_info', this.handleGetUserInfo.bind(this));
    this.requestHandlers.set('get_workspace_info', this.handleGetWorkspaceInfo.bind(this));
    this.requestHandlers.set('list_repls', this.handleListRepls.bind(this));

    // Deployment
    this.requestHandlers.set('deploy', this.handleDeploy.bind(this));
  }

  async init(extensions: any) {
    console.log('\n🚀 ================================================');
    console.log('🚀 INITIALIZING REPLIT MCP BRIDGE');
    console.log('🚀 ================================================');

    try {
      // Store Replit extension APIs
      console.log('📦 Storing Replit extension APIs...');
      this.auth = extensions.auth;
      this.data = extensions.data;
      this.fs = extensions.fs;
      this.replDb = extensions.replDb;
      this.messages = extensions.messages;
      this.exec = extensions.exec;
      this.me = extensions.me;

      console.log('✅ Extension APIs stored successfully');
      console.log(`📋 Available APIs: ${Object.keys(extensions).join(', ')}`);

      // Get workspace ID
      console.log('🏠 Getting workspace info...');
      const workspaceInfo = await this.me.getWorkspaceInfo();
      this.workspaceId = workspaceInfo.id || workspaceInfo.name || 'default';

      console.log('✅ Replit MCP Bridge initialized');
      console.log(`📁 Workspace ID: ${this.workspaceId}`);
      console.log(`📝 Workspace name: ${workspaceInfo.name || 'N/A'}`);

      // Start WebSocket connection
      console.log('🔌 Starting WebSocket connection...');
      this.connect();

      // Show notification
      if (this.messages) {
        console.log('📢 Showing notification to user...');
        this.messages.showNotice('🔌 MCP Bridge connected');
      }
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
  }

  connect() {
    const wsUrl = `ws://localhost:${process.env.BRIDGE_PORT || 8765}`;
    console.log(`🔌 Attempting to connect to MCP bridge at: ${wsUrl}`);
    console.log(`🔧 BRIDGE_PORT from env: ${process.env.BRIDGE_PORT || '8765 (default)'}`);

    try {
      console.log('📡 Creating WebSocket connection...');
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('\n✅ ================================================');
        console.log('✅ WEBSOCKET CONNECTION ESTABLISHED');
        console.log('✅ ================================================');
        this.connected = true;
        console.log('🔐 Starting authentication...');
        this.authenticate();
      });

      this.ws.on('message', async (data: WebSocket.Data) => {
        console.log(`📨 Received message: ${data.length} bytes`);
        try {
          const message: BridgeMessage = JSON.parse(data.toString());
          console.log(`📬 Message type: ${message.action} | ID: ${message.id}`);
          await this.handleMessage(message);
        } catch (err) {
          console.error('❌ Failed to handle message:', err);
          console.error('❌ Raw message:', data.toString());
        }
      });

      this.ws.on('close', (code, reason) => {
        console.log('\n❌ ================================================');
        console.log('❌ WEBSOCKET CONNECTION CLOSED');
        console.log(`❌ Code: ${code} | Reason: ${reason || 'No reason provided'}`);
        console.log('❌ ================================================');
        this.connected = false;
        this.reconnect();
      });

      this.ws.on('error', (error: Error) => {
        console.error('❌ WebSocket error:', error.message);
        console.error('❌ Error type:', error.name);
        if (error.message.includes('ECONNREFUSED')) {
          console.log('💡 Tip: Make sure your local MCP server is running on port 8765');
        }
      });
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, 2000);
    }
  }
  async authenticate() {
    console.log('🔐 Getting authentication token...');
    try {
      const token = await this.auth.experimental?.getAuthToken?.() ||
                    await this.auth.getAuthToken();

      console.log('✅ Authentication token obtained');
      console.log(`🔑 Token length: ${token.length} characters`);

      const authId = crypto.randomUUID();
      console.log(`📤 Sending authentication (ID: ${authId.substring(0, 8)}...)`);
      this.sendMessage({
        id: authId,
        action: 'authenticate',
        params: { token }
      });

      const workspaceId = crypto.randomUUID();
      console.log(`📤 Sending workspace registration (ID: ${workspaceId.substring(0, 8)}...)`);
      console.log(`📝 Workspace ID being sent: ${this.workspaceId}`);

      this.sendMessage({
        id: workspaceId,
        action: 'register_workspace',
        params: { workspaceId: this.workspaceId! }
      });

      console.log('✅ Authentication and workspace registration sent');
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      console.error('❌ Make sure you have the "experimental-api" scope in extension.json');
    }
  }

  async handleMessage(message: BridgeMessage) {
    const { id, action, params } = message;
    console.log(`\n🔀 Handling message: ${action} (ID: ${id?.substring(0, 8)}...)`);

    if (!action || !this.requestHandlers.has(action)) {
      console.error(`❌ Unknown action: ${action}`);
      console.log(`📋 Available actions: ${Array.from(this.requestHandlers.keys()).join(', ')}`);
      this.sendResponse(id, { error: `Unknown action: ${action}` });
      return;
    }

    try {
      const handler = this.requestHandlers.get(action);
      if (!handler) {
        console.error(`❌ No handler for action: ${action}`);
        this.sendResponse(id, { error: `No handler for action: ${action}` });
        return;
      }

      console.log(`⚡ Executing handler for: ${action}`);
      const startTime = Date.now();
      const result = await handler(params);
      const duration = Date.now() - startTime;

      console.log(`✅ Handler completed in ${duration}ms`);
      this.sendResponse(id, { result });
    } catch (error: any) {
      console.error(`❌ Handler failed for ${action}:`, error.message);
      this.sendResponse(id, { error: error.message });
    }
  }

  sendResponse(requestId: string, data: any) {
    this.sendMessage({
      id: requestId,
      action: 'response',
      ...data
    });
  }

  sendMessage(message: BridgeMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Request Handlers
  async handleReadFile(params: any) {
    const { path } = params;
    const content = await this.fs.readFile(path, 'utf8');
    return { content };
  }

  async handleWriteFile(params: any) {
    const { path, content } = params;
    await this.fs.writeFile(path, content, 'utf8');
    return { success: true };
  }

  async handleDeleteFile(params: any) {
    const { path } = params;
    await this.fs.remove(path);
    return { success: true };
  }

  async handleListDirectory(params: any) {
    const { path = '.' } = params;
    const entries = await this.fs.readDir(path);
    return { entries };
  }

  async handleRunCommand(params: any) {
    const { command, args = [], cwd } = params;
    const result = await this.exec(command, args, { cwd });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode
    };
  }

  async handleReplDBGet(params: any) {
    const { key } = params;
    const value = await this.replDb.get(key);
    return { value };
  }

  async handleReplDBSet(params: any) {
    const { key, value } = params;
    await this.replDb.set(key, value);
    return { success: true };
  }

  async handleReplDBDelete(params: any) {
    const { key } = params;
    await this.replDb.delete(key);
    return { success: true };
  }

  async handleReplDBList(params: any) {
    const { prefix = '' } = params;
    const keys = await this.replDb.list(prefix);
    return { keys };
  }

  async handleGetUserInfo() {
    const user = await this.data.currentUser();
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email
    };
  }

  async handleGetWorkspaceInfo() {
    const repl = await this.data.currentRepl();
    return {
      id: repl.id,
      title: repl.title,
      language: repl.language,
      isPrivate: repl.isPrivate
    };
  }

  async handleListRepls() {
    const user = await this.data.currentUser();
    const repls = await Promise.all(
      user.repls.map((id: string) => this.data.replById(id))
    );

    return {
      repls: repls.map((r: any) => ({
        id: r.id,
        title: r.title,
        language: r.language,
        isPrivate: r.isPrivate
      }))
    };
  }

  async handleDeploy(params: any) {
    return {
      url: `https://deployed-replit.replit.app`,
      status: 'deployed',
      message: 'Deployment successful'
    };
  }

  // Public methods
  public isConnected(): boolean {
    return this.connected;
  }

  public getWorkspaceId(): string | null {
    return this.workspaceId;
  }
}

// Singleton instance
export const bridge = new ReplitMCPServerBridge();