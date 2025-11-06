# Replit MCP WebSocket Bridge

UPSURGE LABS ROCKSSS!

> **⚠️ Important Notice**: This extension has not been published to the Replit Extension Marketplace yet, as we are working through Replit's approval process. Currently, you'll need to manually install the extension in your Replit workspace following the setup instructions below.

A Model Context Protocol (MCP) server that bridges Cursor IDE with Replit's ecosystem through a WebSocket connection. This innovative solution enables AI assistants to interact with your Replit workspace, files, and services directly from Cursor, regardless of network boundaries.

## 🌟 Architecture Overview

This implementation uses a three-component architecture:

1. **MCP Server** (`replit-mcp-assignment/`) - Runs on your local machine, communicates with Cursor via MCP protocol
2. **WebSocket Bridge** - A secure tunnel that forwards commands between MCP server and Replit
3. **Replit Extension** (`replit-extension-code/`) - Runs in your Replit workspace, executes actual Replit API calls

```
┌─────────────┐    MCP/stdio    ┌──────────────┐    WebSocket    ┌─────────────┐    Replit API    ┌──────────┐
│   Cursor    │ ◄────────────► │ MCP Server   │ ◄────────────► │ Replit Ext  │ ◄────────────► │ Replit   │
│    IDE      │                │ (local)      │  (ngrok tunnel)│ (workspace) │                │ Services │
└─────────────┘                └──────────────┘                └─────────────┘                └──────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed locally
- A Replit account
- Cursor IDE
- ngrok account (for tunneling)

### 1. Setup the MCP Server

```bash
# Clone this repository
git clone <repository-url>
cd replit-mcp-assignment

# Install dependencies
npm install

# Build the server
npm run build
```

### 2. Setup the Replit Extension

1. Create a new Repl in your Replit account
2. Upload the `replit-extension-code/` directory to your Repl
3. Install dependencies in the Repl:
   ```bash
   cd replit-extension-code
   npm install
   ```

### 3. Start the WebSocket Bridge

You have two options to run the bridge:

#### Option A: Standalone Mode (Recommended)

```bash
# In your Replit terminal
cd replit-extension-code
node run-bridge.js
```

#### Option B: Full Extension Mode

```bash
# In your Replit terminal
cd replit-extension-code
npm run dev
```

The bridge will:
- Start a WebSocket server
- Connect to the local MCP server via ngrok
- Display connection status and authentication details

### 4. Configure Cursor

Add the MCP server to Cursor's settings (`settings.json`):

```json
{
  "mcpServers": {
    "replit-bridge": {
      "command": "node",
      "args": ["/path/to/replit-mcp-assignment/build/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 5. Start Using

1. Restart Cursor IDE
2. Open the MCP panel (Cmd+Shift+P → "MCP: Show Tools")
3. Look for "replit-bridge" in the available servers
4. Start using Replit tools directly in Cursor!

## 📋 Available Features

### Core Functionality

| Feature | Description | Status |
|---------|-------------|--------|
| **Authentication** | JWT-based auth with Replit | ✅ Implemented |
| **File Operations** | Read, write, list files in Replit | ✅ Implemented |
| **Command Execution** | Run shell commands in Replit | ✅ Implemented |
| **Real-time Communication** | WebSocket-based messaging | ✅ Implemented |
| **Ngrok Tunneling** | Secure remote connection | ✅ Implemented |

### MCP Tools Available

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `replit_list_files` | List files in a directory | `path?: string` |
| `replit_read_file` | Read file contents | `path: string` |
| `replit_write_file` | Write to a file | `path: string, content: string` |
| `replit_run_command` | Execute shell command | `command: string` |
| `replit_get_auth_status` | Check authentication status | - |
| `replit_get_workspace_info` | Get workspace details | - |

## 🔧 Configuration

### Environment Variables

The MCP server supports these environment variables:

```bash
# Node environment
NODE_ENV=development

# Enable debug logging
DEBUG=replit-mcp:*

# Custom ngrok URL (if running your own tunnel)
NGROK_URL=wss://your-tunnel.ngrok.io
```

### Custom Ngrok Setup

If you want to use your own ngrok tunnel:

1. Install ngrok locally
2. Create a tunnel:
   ```bash
   ngrok http 8765
   ```
3. Update the WebSocket URL in `replit-extension-code/src/bridge.ts`:
   ```typescript
   const wsUrl = `wss://your-ngrok-id.ngrok-free.app`;
   ```

## 🛠️ Development

### Local Development

```bash
# Development mode with watch
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Clean build artifacts
npm run clean
```

### Testing the Bridge

1. Start the bridge in your Replit
2. Verify connection status in the console
3. Test with Cursor's MCP tools
4. Check logs for debugging

### Debug Mode

Enable verbose logging:

```bash
# On the MCP server
DEBUG=replit-mcp:* npm start

# On the Replit extension
DEBUG=replit-bridge:* node run-bridge.js
```

## 📁 Project Structure

```
replit-mcp-assignment/
├── src/                          # MCP Server Source
│   ├── index.ts                  # MCP server entry point
│   ├── server.ts                 # Server configuration
│   ├── websocket-client.ts       # WebSocket client for bridge
│   ├── tools/                    # MCP tool implementations
│   │   ├── auth.ts              # Authentication tools
│   │   ├── filesystem.ts        # File operation tools
│   │   └── index.ts             # Tool registry
│   ├── types/                    # TypeScript definitions
│   │   ├── bridge.ts            # Bridge message types
│   │   └── replit.ts            # Replit API types
│   └── utils/                    # Utilities
│       ├── logger.ts            # Logging utilities
│       └── errors.ts            # Error handling
├── build/                        # Compiled JavaScript
├── replit-extension-code/        # Replit Extension Code
│   ├── src/
│   │   ├── bridge.ts            # WebSocket bridge implementation
│   │   └── extension.ts         # Replit extension logic
│   ├── run-bridge.js            # Standalone bridge runner
│   ├── package.json             # Extension dependencies
│   └── extension.json           # Extension manifest
└── README.md                     # This file
```

## 🔐 Security Considerations

### Authentication Flow

1. **Replit Extension** generates a JWT token using `auth.getAuthToken()`
2. **Bridge** sends the token to the MCP server for verification
3. **MCP Server** decodes and validates the token
4. **All commands** are executed with the authenticated user's permissions

### Security Features

- **JWT Authentication**: All requests require a valid Replit JWT token
- **Secure WebSocket**: Uses WSS (WebSocket Secure) for encrypted communication
- **Token Validation**: Automatic expiration checking and token refresh
- **Local Execution**: MCP server runs locally, no cloud dependencies
- **Permission Boundaries**: The bridge can only access what the user can access

### Best Practices

- Never share your ngrok URL publicly
- Regenerate JWT tokens periodically
- Monitor bridge connection logs
- Use HTTPS for all communication
- Keep dependencies updated

## 🚨 Troubleshooting

### Common Issues

#### 1. "WebSocket connection failed"
```bash
# Check if ngrok is running
curl https://5c920f0293a4.ngrok-free.app/health

# Restart the bridge in your Replit
node run-bridge.js
```

#### 2. "Authentication failed"
```bash
# Check JWT token in Replit
# Run this in your Replit console
import { auth } from '@replit/extensions';
await auth.init();
const token = await auth.getAuthToken();
console.log('Token valid:', token ? 'Yes' : 'No');
```

#### 3. "MCP server not found in Cursor"
- Verify the path in Cursor settings
- Check that the server builds successfully: `npm run build`
- Restart Cursor after updating settings

#### 4. "Commands timing out"
- Check your Replit's internet connection
- Verify ngrok tunnel is active
- Check Replit extension logs for errors

### Debug Commands

```bash
# Test WebSocket connection
wscat -c wss://5c920f0293a4.ngrok-free.app

# Check MCP server
npm run build && node build/index.js

# Enable full debug
DEBUG=* npm start
```

## 🗺️ Roadmap

### Phase 1: Core Bridge ✅
- [x] WebSocket communication
- [x] JWT authentication
- [x] Basic file operations
- [x] Command execution
- [x] Ngrok tunneling

### Phase 2: Enhanced Features (In Progress)
- [ ] Batch file operations
- [ ] Directory watching
- [ ] Environment management
- [ ] Project templates

### Phase 3: Advanced Integration
- [ ] ReplDB database access
- [ ] Multi-repl management
- [ ] Team collaboration features
- [ ] Deployment pipelines

### Phase 4: Production Features
- [ ] Connection pooling
- [ ] Caching layer
- [ ] Rate limiting
- [ ] Metrics and monitoring

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes
4. **Test** thoroughly:
   ```bash
   npm run test
   npm run build
   ```
5. **Commit** your changes
6. **Push** to your fork
7. **Open** a Pull Request

### Development Setup

```bash
# Install all dependencies
npm install

# Run tests
npm test

# Start development mode
npm run dev

# Type checking
npm run type-check
```

## 📚 API Reference

### WebSocket Message Format

```typescript
interface BridgeMessage {
  id: string;          // Unique message ID
  action: string;      // Action to perform
  params?: any;        // Action parameters
  result?: any;        // Response data
  error?: string;      // Error message
  workspaceId?: string; // Replit workspace ID
}
```

### MCP Tool Signature

```typescript
// Example: Read a file
interface ReplitReadFileParams {
  path: string;
}

// Response
interface ReplitResponse {
  success: boolean;
  data?: any;
  error?: string;
}
```

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Links

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Cursor IDE](https://cursor.sh/)
- [Replit Extensions](https://docs.replit.com/extensions)
- [Replit Auth API](https://docs.replit.com/extensions/api/auth)
- [Ngrok Documentation](https://ngrok.com/docs)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 📞 Support

If you encounter issues:

1. **Check the logs** - Both MCP server and Replit extension provide detailed logs
2. **Verify connectivity** - Ensure ngrok tunnel is active
3. **Check authentication** - Verify JWT token is valid
4. **Create an issue** - Include:
   - Error messages from logs
   - OS and Cursor version
   - Steps to reproduce
   - Network environment details

## 🎯 Use Cases

### For Developers
- **Remote Development**: Work on Replit projects from your local Cursor IDE
- **Batch Operations**: Perform bulk file operations across multiple Repls
- **Automation**: Automate repetitive tasks in your Replit workspace
- **Integration**: Connect Replit with external tools and services

### For Teams
- **Code Reviews**: Review code without leaving Cursor
- **Onboarding**: Quickly set up new team members with project templates
- **Documentation**: Generate documentation from Replit projects
- **Deployments**: Manage deployments directly from Cursor

### For Educators
- **Teaching**: Demonstrate coding concepts live in Replit
- **Assignments**: Create and grade coding assignments
- **Collaboration**: Enable real-time student collaboration
- **Progress Tracking**: Monitor student progress across Repls