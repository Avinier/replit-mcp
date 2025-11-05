# Replit MCP Server

A Model Context Protocol (MCP) server that bridges Cursor IDE with Replit's ecosystem using JWT-based authentication. This server enables AI assistants to interact with your Replit workspace, files, and services directly from Cursor.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Get JWT Token from Replit Extension

1. Create a new Repl in your Replit account
2. Create an auth bridge extension that displays the JWT token:
   ```javascript
   // In your Replit extension
   import { auth } from '@replit/extensions';
   await auth.init();
   const token = await auth.getAuthToken();
   console.log('JWT Token:', token);
   ```
3. Copy the JWT token displayed by the extension

### 3. Configure Environment

Create a `.env` file in the project root:

```bash
# Copy the JWT token from your Replit extension
REPLIT_JWT_TOKEN=your_actual_jwt_token_here

# Environment
NODE_ENV=development

# Enable debug logging (optional)
DEBUG=replit-mcp:*
```

### 4. Build the Server

```bash
npm run build
```

### 5. Configure Cursor

Add the MCP server to Cursor's settings (`settings.json`):

```json
{
  "mcpServers": {
    "replit": {
      "command": "node",
      "args": ["/path/to/replit-mcp-assignment/build/index.js"],
      "env": {
        "REPLIT_JWT_TOKEN": "your_actual_jwt_token_here"
      }
    }
  }
}
```

### 6. Restart Cursor

Restart Cursor to load the MCP server. You can now use Replit tools in Cursor!

## 📋 Available Tools

### Authentication Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `replit_authenticate` | Authenticate with Replit using JWT token | None (uses env) |
| `replit_get_token` | Get the current JWT token (truncated) | None |
| `replit_verify_token` | Verify and decode a JWT token | `token: string` |
| `replit_get_auth_state` | Get current authentication status | None |
| `replit_get_user_info` | Get user info from JWT token | None |
| `replit_logout` | Clear local auth state | None |

### Authentication Resources

| Resource | Description | URI |
|----------|-------------|-----|
| User Profile | Current authenticated user information | `replit://auth/user` |
| Token Info | JWT token metadata | `replit://auth/token` |
| Auth State | Current authentication state | `replit://auth/state` |

## 🔧 Development

### Build Commands

```bash
# Build the TypeScript project
npm run build

# Start the server (after building)
npm start

# Watch mode for development
npm run dev

# Clean build artifacts
npm run clean
```

### Testing the Server

You can test the MCP server by building and starting it:

```bash
# Build the server
npm run build

# Start the server
npm start
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=replit-mcp:* npm start
```

## 📁 Project Structure

```
src/
├── index.ts           # Entry point
├── server.ts          # MCP server configuration
├── replit/            # Replit API wrappers
│   ├── auth.ts        # JWT-based authentication
│   └── extensions.ts  # Extensions manager (for future APIs)
├── tools/             # MCP tools
│   ├── auth.ts        # Authentication tools
│   └── index.ts       # Tool exports
├── resources/         # MCP resources
│   ├── auth.ts        # Authentication resources
│   └── index.ts       # Resource exports
├── types/             # Type definitions
│   └── auth.ts        # Auth types
└── utils/             # Utilities
    ├── errors.ts      # Error handling
    └── logger.ts      # Logging utilities
```

## 🔐 Authentication Flow

This MCP server uses JWT tokens for authentication:

1. **Token Generation**: A Replit extension running in your workspace generates a JWT token
2. **Token Transfer**: You copy the token and set it as `REPLIT_JWT_TOKEN` environment variable
3. **Token Usage**: The MCP server uses this token to authenticate with Replit APIs
4. **Token Validation**: The server decodes and validates the token for each request

### Token Format

The JWT token contains:
- `sub`: User ID
- `username`: Replit username
- `display_name`: Display name
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp
- `iss`: Issuer (replit)
- `aud`: Audience (replit_api)

## 🚨 Security Notes

- **Never commit JWT tokens to version control**
- **JWT tokens are sensitive credentials** - treat them like passwords
- The server truncates token display for security
- Token expiration is automatically checked
- Tokens are decoded without signature verification (Replit's secret key is not accessible)

## 🛠️ Troubleshooting

### Common Issues

1. **"REPLIT_JWT_TOKEN environment variable is not set"**
   - Ensure you've set the JWT token in your `.env` file
   - Check that you're loading the environment variables in Cursor's config

2. **"JWT token has expired"**
   - Generate a new token from your Replit extension
   - Update the environment variable with the new token

3. **Server fails to start**
   - Check that all dependencies are installed: `npm install`
   - Ensure the project is built: `npm run build`
   - Check the logs for specific error messages

4. **Tools not showing in Cursor**
   - Verify the MCP server path in Cursor settings
   - Restart Cursor after updating settings
   - Check the MCP panel in Cursor for connection status

### Debug Commands

```bash
# Check if the server starts correctly
npm start

# Test MCP protocol communication
node test-mcp.js

# Enable verbose logging
DEBUG=replit-mcp:* npm start
```

## 📚 API Reference

### Authentication API

```typescript
// Authenticate and get user info
const authResult = await authenticate();
// Returns: { user: { id, username, displayName }, installation?: { id } }

// Get JWT token
const token = await getAuthToken();
// Returns: JWT string

// Verify token
const decoded = await verifyAuthToken(token);
// Returns: { payload: {...}, protectedHeader: {...} }

// Get auth state
const state = await getAuthState();
// Returns: { isAuthenticated: boolean, user?, installation?, token?, expiresAt? }
```

## 🗺️ Roadmap

### Phase 1: Authentication ✅
- [x] JWT-based authentication
- [x] Token verification and management
- [x] Auth tools and resources

### Phase 2: File Operations (Next)
- [ ] List files and directories
- [ ] Read file contents
- [ ] Write files
- [ ] Search files

### Phase 3: Project Management
- [ ] List user's Repls
- [ ] Create new Repls
- [ ] Switch between Repls
- [ ] Sync files

### Phase 4: Advanced Features
- [ ] Execute commands
- [ ] Database operations (ReplDB)
- [ ] Team collaboration
- [ ] Deployment management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

ISC License

## 🔗 Related Links

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Cursor IDE](https://cursor.sh/)
- [Replit Extensions](https://docs.replit.com/extensions)
- [Replit Auth API](https://docs.replit.com/extensions/api/auth)

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Enable debug logging for detailed error messages
3. Create an issue in the repository with:
   - Error messages from logs
   - Your OS and Cursor version
   - Steps to reproduce the issue