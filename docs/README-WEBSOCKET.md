# Replit MCP Server with WebSocket Bridge

A Model Context Protocol (MCP) server that bridges Cursor IDE with Replit's ecosystem through a WebSocket connection. This enables Claude (via Cursor) to access Replit Extension APIs that only work inside Replit workspaces.

## Architecture

```
┌─────────────┐     MCP     ┌──────────────────┐     WebSocket     ┌────────────────┐
│   Cursor    │ ◄─────────► │  MCP Server      │ ◄────────────────► │ Replit Extension│
│   IDE       │   (stdio)   │  (outside Replit)│     (8765)        │ (inside Replit) │
└─────────────┘            └──────────────────┘                    └────────────────┘
                                     ▲
                                     │
                               WebSocket Server
```

## Features

### MCP Tools
- `replit_connect` - Connect to a Replit workspace
- `replit_read_file` - Read files from Replit workspace
- `replit_write_file` - Write files to Replit workspace
- `replit_list_directory` - List directory contents
- `replit_run_command` - Execute shell commands in Replit
- `replit_list_repls` - List user's Repls
- `replit_deploy` - Deploy Repl to production
- `replit_status` - Check connection status

### MCP Resources
- `replit://file/{path}` - Access any file in the workspace
- `replit://workspace` - Get workspace metadata

### MCP Prompts
- `replit_code_review` - Review code in multiple files
- `replit_project_setup` - Setup new project templates

## Setup

### 1. MCP Server (outside Replit)

```bash
# Install dependencies
npm install

# Build the project
npm run build

# The server runs on stdio and WebSocket port 8765
```

### 2. Cursor Configuration

Add to your Cursor `settings.json`:

```json
{
  "mcpServers": {
    "replit": {
      "command": "node",
      "args": ["/absolute/path/to/replit-mcp-assignment/build/index.js"],
      "env": {
        "BRIDGE_PORT": "8765",
        "BRIDGE_SECRET": "your-optional-secret",
        "DEBUG": "true"
      }
    }
  }
}
```

### 3. Replit Extension (inside Replit)

1. Create a new Repl in Replit
2. Upload the `replit-extension/` folder
3. Run the extension:
   ```bash
   cd replit-extension
   node main.js
   ```

The extension will automatically:
- Connect to your WebSocket bridge
- Authenticate with Replit
- Register the workspace
- Handle requests from the MCP server

## Usage Workflow

1. Start the MCP server (it will listen for WebSocket connections)
2. Install and run the Replit extension in your workspace
3. Use Cursor's MCP tools:
   - Type `Cmd+Shift+P` → "Replit: Connect to workspace"
   - Use tools like `replit_read_file`, `replit_run_command`, etc.
   - Access resources via `replit://file/...`

## Example Usage

```bash
# In Cursor's chat
"Connect to my Replit workspace"
→ Use replit_connect tool

"Read the package.json file"
→ Uses replit_read_file tool

"List all files in the src directory"
→ Uses replit_list_directory tool

"Run npm test in the project"
→ Uses replit_run_command tool

"Deploy this to production"
→ Uses replit_deploy tool
```

## Security

- The WebSocket server only accepts connections from localhost
- Extensions authenticate using Replit's JWT tokens
- Optional shared secret for additional security
- All communication is local and never exposed to the internet

## Development

### Running Tests

```bash
# Test the WebSocket bridge
node test-bridge.js

# Build the project
npm run build

# Start with debug output
DEBUG=true npm start
```

### Architecture Details

The bridge consists of three main components:

1. **WebSocket Server** (`src/websocket-server.ts`)
   - Listens for extension connections
   - Manages authentication and routing
   - Tracks active workspaces

2. **MCP Server** (`src/mcp-server.ts`)
   - Implements MCP protocol
   - Exposes Replit functionality as tools/resources
   - Routes requests through WebSocket bridge

3. **Replit Extension** (`replit-extension/main.js`)
   - Runs inside Replit workspace
   - Connects to WebSocket bridge
   - Handles Replit API calls

## Troubleshooting

### "No Replit extensions are currently connected"
- Make sure the extension is running in your Replit workspace
- Check that the WebSocket bridge port matches (default: 8765)
- Verify the extension shows "Connected to MCP bridge" message

### "Authentication failed"
- Ensure the extension has proper permissions in Replit
- Check that `@replit/extensions` is properly imported
- Verify the JWT token is valid

### "Connection timeout"
- Check if your firewall allows localhost connections
- Verify the WebSocket server is running
- Try restarting both the server and extension

## License

MIT