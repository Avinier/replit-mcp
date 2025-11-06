# Quick Setup Guide for Replit MCP WebSocket Bridge

## Step 1: Build and Start the MCP Server

```bash
# Clone or navigate to the project
cd replit-mcp-assignment

# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

The server will start and listen on:
- **stdio** for MCP protocol communication with Cursor
- **Port 8765** for WebSocket connections from Replit extensions

## Step 2: Configure Cursor

Add this to your Cursor `settings.json`:

```json
{
    "mcpServers": {
      "replit": {
        "command": "node",
        "args": ["/Users/avinier/UpsurgeLabs/replit-mcp-assignment/build/index.js"],
        "env": {
          "BRIDGE_PORT": "8765",
          "DEBUG": "true"
        }
      }
    }
  }
```

**Important**: Use the full absolute path to the `build/index.js` file.

## Step 3: Set up Replit Extension

1. Create a new Repl in Replit (any language works, Node.js recommended)
2. Create a new file called `extension.json`:
   ```json
   {
     "name": "replit-mcp-bridge",
     "description": "Bridge for MCP server",
     "version": "1.0.0",
     "entry": "bridge.js",
     "permissions": ["auth", "data", "fs", "messages", "exec", "me"]
   }
   ```
3. Create a file called `bridge.js` with the content from `replit-extension/main.js`
4. Add the dependencies: `ws` package
5. Run the extension:
   ```bash
   node bridge.js
   ```

## Step 4: Use in Cursor

1. Restart Cursor after configuring the MCP server
2. Open a new chat or use Cmd+Shift+P
3. Try these commands:

   ```
   Connect to my Replit workspace
   List files in the current directory
   Read package.json
   Run the command "ls -la"
   ```

## Step 5: Verify Everything Works

The connection flow should be:
1. MCP server starts on your machine
2. Replit extension connects to WebSocket bridge
3. Extension authenticates with Replit
4. Cursor can now use Replit tools through MCP

You can check the status with:
- Use the `replit_status` tool in Cursor
- Check the server console for connection logs
- Check the Replit console for bridge connection logs

## Troubleshooting

### "No Replit extensions are connected"
- Make sure the extension is running in Replit
- Check that port 8765 is not blocked by firewall
- Verify the extension shows "Connected to MCP bridge"

### "Permission denied"
- Ensure the extension has all required permissions in `extension.json`
- Replit may prompt you to authorize the extension

### "Command not found"
- Make sure you're using the exact tool names as shown in the tools list
- Tools are available after successful connection to workspace

## Example Workflow

```bash
# 1. Start MCP server
npm start

# 2. In Replit, run the extension
node bridge.js

# 3. In Cursor, use the tools
> Connect to Replit workspace
✅ Connected to workspace-abc123

> List all JavaScript files
📄 src/index.js
📄 src/app.js
📄 test/main.js

> Run "npm test"
✅ Tests passed: 12/12
```

That's it! You now have a fully functional bridge between Cursor and Replit.