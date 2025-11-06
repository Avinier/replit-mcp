import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { Logger } from './logger.js';

export interface ExtensionConnection {
  id: string;
  ws: WebSocket;
  workspaceId: string;
  userId?: string;
  isAuthenticated: boolean;
  lastPing: number;
}

export interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeout: NodeJS.Timeout;
}

export interface BridgeMessage {
  id: string;
  action: string;
  params?: any;
  result?: any;
  error?: string;
  workspaceId?: string;
}

export class WebSocketServer {
  private wss: WSServer;
  private connections = new Map<string, ExtensionConnection>();
  private pendingRequests = new Map<string, PendingRequest>();
  private logger = new Logger('WebSocketServer');
  private port: number;
  private secret?: string;

  constructor(port: number = 8765, secret?: string) {
    this.port = port;
    this.secret = secret;
    this.wss = new WSServer({
      port,
      verifyClient: this.verifyClient.bind(this)
    });

    this.setupServer();
    this.startCleanupInterval();
  }

  private setupServer() {
    this.wss.on('connection', this.handleConnection.bind(this));

    this.wss.on('error', (error: any) => {
      this.logger.error('WebSocket server error:', error);
    });

    this.logger.info(`WebSocket server listening on port ${this.port}`);
  }

  private async verifyClient(info: {
    origin: string;
    secure: boolean;
    req: IncomingMessage;
  }): Promise<boolean> {
    // Only allow connections from localhost in development
    if (process.env.NODE_ENV !== 'production') {
      const allowedOrigins = ['localhost', '127.0.0.1'];
      const origin = info.req.headers.origin || '';
      const host = info.req.headers.host || '';

      const isAllowed = allowedOrigins.some(allowed =>
        origin.includes(allowed) || host.includes(allowed)
      );

      if (!isAllowed) {
        this.logger.warn(`Rejected connection from origin: ${origin}, host: ${host}`);
        return false;
      }
    }

    return true;
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    const connectionId = this.generateConnectionId();

    this.logger.info(`New connection attempt: ${connectionId}`);

    const connection: ExtensionConnection = {
      id: connectionId,
      ws,
      workspaceId: '',
      isAuthenticated: false,
      lastPing: Date.now()
    };

    this.connections.set(connectionId, connection);

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const message: BridgeMessage = JSON.parse(data.toString());
        this.handleMessage(connectionId, message);
      } catch (error) {
        this.logger.error(`Failed to parse message from ${connectionId}:`, error);
        this.sendError(connectionId, 'Invalid message format');
      }
    });

    ws.on('pong', () => {
      const conn = this.connections.get(connectionId);
      if (conn) {
        conn.lastPing = Date.now();
      }
    });

    ws.on('close', () => {
      this.logger.info(`Connection closed: ${connectionId}`);
      this.connections.delete(connectionId);
      this.rejectPendingRequests(connectionId, 'Connection closed');
    });

    ws.on('error', (error) => {
      this.logger.error(`Connection error for ${connectionId}:`, error);
      this.connections.delete(connectionId);
      this.rejectPendingRequests(connectionId, 'Connection error');
    });

    // Start heartbeat
    ws.ping();
  }

  private async handleMessage(connectionId: string, message: BridgeMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    this.logger.debug(`Message from ${connectionId}:`, message.action);

    switch (message.action) {
      case 'authenticate':
        await this.handleAuthenticate(connectionId, message);
        break;

      case 'register_workspace':
        await this.handleRegisterWorkspace(connectionId, message);
        break;

      case 'response':
        this.handleResponse(message);
        break;

      case 'ping':
        this.sendToConnection(connectionId, { id: message.id, action: 'pong' });
        break;

      default:
        if (message.id && this.pendingRequests.has(message.id)) {
          this.handleResponse(message);
        } else {
          this.logger.warn(`Unknown action: ${message.action}`);
          this.sendError(connectionId, `Unknown action: ${message.action}`, message.id);
        }
    }
  }

  private async handleAuthenticate(connectionId: string, message: BridgeMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      const { token } = message.params || {};

      if (!token) {
        this.sendError(connectionId, 'No authentication token provided', message.id);
        return;
      }

      // Verify JWT token (this would be Replit's JWT)
      const decoded = jwt.verify(token, this.secret || 'fallback-secret') as any;

      connection.userId = decoded.sub;
      connection.isAuthenticated = true;

      this.logger.info(`Connection ${connectionId} authenticated for user: ${decoded.sub}`);

      this.sendToConnection(connectionId, {
        id: message.id,
        action: 'authenticated',
        result: { success: true, userId: decoded.sub }
      });
    } catch (error) {
      this.logger.error(`Authentication failed for ${connectionId}:`, error);
      this.sendError(connectionId, 'Invalid authentication token', message.id);
    }
  }

  private async handleRegisterWorkspace(connectionId: string, message: BridgeMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    if (!connection.isAuthenticated) {
      this.sendError(connectionId, 'Not authenticated', message.id);
      return;
    }

    const { workspaceId } = message.params || {};
    if (!workspaceId) {
      this.sendError(connectionId, 'No workspace ID provided', message.id);
      return;
    }

    connection.workspaceId = workspaceId;
    this.logger.info(`Connection ${connectionId} registered to workspace: ${workspaceId}`);

    this.sendToConnection(connectionId, {
      id: message.id,
      action: 'workspace_registered',
      result: { success: true, workspaceId }
    });
  }

  private handleResponse(message: BridgeMessage) {
    const pending = this.pendingRequests.get(message.id);
    if (!pending) return;

    this.pendingRequests.delete(message.id);
    clearTimeout(pending.timeout);

    if (message.error) {
      pending.reject(new Error(message.error));
    } else {
      pending.resolve(message.result);
    }
  }

  public async sendToExtension(
    workspaceId: string,
    action: string,
    params?: any,
    timeout: number = 30000
  ): Promise<any> {
    // Find connection for workspace
    const connection = Array.from(this.connections.values())
      .find(conn => conn.workspaceId === workspaceId && conn.isAuthenticated);

    if (!connection) {
      throw new Error(`No authenticated extension found for workspace: ${workspaceId}`);
    }

    const requestId = this.generateRequestId();

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${action}`));
      }, timeout);

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutHandle
      });

      this.sendToConnection(connection.id, {
        id: requestId,
        action,
        params,
        workspaceId
      });
    });
  }

  private sendToConnection(connectionId: string, message: BridgeMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      connection.ws.send(JSON.stringify(message));
    } catch (error) {
      this.logger.error(`Failed to send message to ${connectionId}:`, error);
    }
  }

  private sendError(connectionId: string, error: string, requestId?: string) {
    this.sendToConnection(connectionId, {
      id: requestId || this.generateRequestId(),
      action: 'error',
      error
    });
  }

  private rejectPendingRequests(connectionId: string, reason: string) {
    // Reject all pending requests for this connection
    for (const [requestId, pending] of this.pendingRequests.entries()) {
      // Check if the request belongs to this connection
      // This is a simplified check - in practice you'd want to track which connection made which request
      pending.reject(new Error(reason));
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(requestId);
    }
  }

  private startCleanupInterval() {
    // Clean up dead connections every 30 seconds
    setInterval(() => {
      const now = Date.now();
      const deadConnections: string[] = [];

      for (const [id, connection] of this.connections.entries()) {
        if (connection.ws.readyState !== WebSocket.OPEN) {
          deadConnections.push(id);
          continue;
        }

        // Check if connection is stale (no pong for 60 seconds)
        if (now - connection.lastPing > 60000) {
          this.logger.warn(`Connection ${id} is stale, terminating`);
          connection.ws.terminate();
          deadConnections.push(id);
        } else {
          // Send ping to keep connection alive
          connection.ws.ping();
        }
      }

      deadConnections.forEach(id => {
        this.connections.delete(id);
        this.rejectPendingRequests(id, 'Connection terminated');
      });
    }, 30000);
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getActiveWorkspaces(): string[] {
    return Array.from(this.connections.values())
      .filter(conn => conn.isAuthenticated && conn.workspaceId)
      .map(conn => conn.workspaceId);
  }

  public getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      authenticatedConnections: Array.from(this.connections.values())
        .filter(conn => conn.isAuthenticated).length,
      activeWorkspaces: this.getActiveWorkspaces().length,
      pendingRequests: this.pendingRequests.size
    };
  }

  public close() {
    this.logger.info('Closing WebSocket server...');

    // Close all connections
    for (const [id, connection] of this.connections.entries()) {
      connection.ws.close();
    }

    // Clear pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Server shutting down'));
    }

    this.wss.close();
  }
}