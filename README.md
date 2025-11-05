# Replit MCP Server

A Model Context Protocol (MCP) server that bridges Cursor IDE with Replit's ecosystem, transforming AI from a text-only assistant into an integrated development companion with full contextual awareness of the user's entire Replit workspace.

## Features

### Currently Implemented
- **Authentication API Integration**: Secure OAuth authentication with Replit
- **JWT Token Management**: Get, verify, and manage authentication tokens
- **User Profile Access**: Retrieve user and installation information
- **Session Management**: Track and maintain authentication state

### Planned Features
- **Filesystem API**: Read, write, and manage files in Replit
- **Data API**: Access user info, Repl metadata, and social context
- **Exec API**: Execute shell commands and deploy applications
- **ReplDB API**: Persistent storage for caching and learning
- **Messages API**: Display notifications to users
- **Commands API**: Register custom commands
- **Debug API**: Logging and error tracking
- **Themes API**: Visual adaptation to user preferences

## Installation

### Prerequisites
- Node.js 18 or higher
- Replit Extension credentials (Client ID and Client Secret)

### Setup
1. Clone this repository
2. Install dependencies:
```bash
npm install
```

3. Copy the environment variables template:
```bash
cp .env.example .env
```

4. Edit `.env` with your Replit Extension credentials:
```env
REPLIT_CLIENT_ID=your_client_id_here
REPLIT_CLIENT_SECRET=your_client_secret_here
```

5. Build the project:
```bash
npm run build
```

## Cursor Integration

Add the Replit MCP server to Cursor's settings:

1. Open Cursor settings
2. Navigate to the MCP section
3. Add the following configuration:

```json
{
  "mcpServers": {
    "replit": {
      "command": "node",
      "args": ["/path/to/replit-mcp-assignment/build/index.js"],
      "env": {
        "REPLIT_CLIENT_ID": "your_client_id",
        "REPLIT_CLIENT_SECRET": "your_client_secret",
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Usage

Once connected to Cursor, you can use the following MCP tools:

### Authentication Tools

#### `replit_authenticate`
Authenticate with Replit and get user session information.

```typescript
// No parameters required if environment variables are set
// Optionally provide credentials:
await authenticate({
  clientId: "your_client_id",
  clientSecret: "your_client_secret",
  scopes: ["profile", "email"]
});
```

#### `replit_get_token`
Get the current JWT authentication token.

```typescript
// Returns the JWT token (truncated for security in the response)
const token = await getAuthToken();
```

#### `replit_verify_token`
Verify a JWT token and return decoded information.

```typescript
const result = await verifyAuthToken(token);
// Returns payload and header information
```

#### `replit_get_auth_state`
Get current authentication status and user information.

```typescript
const state = await getAuthState();
// Returns authentication state including user info if authenticated
```

#### `replit_logout`
Clear current authentication state.

```typescript
clearAuthState();
```

### Resources

The server also provides access to the following resources:

- `replit://auth/user` - Current user profile information
- `replit://auth/token` - Authentication token metadata (truncated for security)
- `replit://auth/state` - Current authentication state

## Development

### Scripts
- `npm run build` - Build TypeScript to JavaScript
- `npm run dev` - Build in watch mode
- `npm run start` - Start the built server
- `npm run clean` - Clean build output

### Project Structure
```
src/
├── index.ts              # Main entry point
├── server.ts             # MCP server configuration
├── replit/               # Replit Extensions integration
│   ├── extensions.ts     # Extensions manager
│   ├── auth.ts          # Auth API wrapper
│   └── index.ts         # Module exports
├── tools/               # MCP tools
│   ├── auth.ts          # Authentication tools
│   └── index.ts         # Tool exports
├── resources/           # MCP resources
│   ├── auth.ts          # Authentication resources
│   └── index.ts         # Resource exports
├── types/               # TypeScript definitions
│   ├── auth.ts          # Auth API types
│   └── index.ts         # Type exports
└── utils/               # Utilities
    ├── logger.ts        # Logging system
    └── errors.ts        # Error handling
```

## Security Considerations

- Never expose your client secret in client-side code
- JWT tokens are truncated in responses for security
- Use environment variables for sensitive configuration
- Token refresh is handled automatically when needed

## Troubleshooting

### Common Issues

1. **Authentication fails**
   - Check that your client ID and secret are correct
   - Ensure your extension has the proper permissions
   - Verify the scopes requested match your extension's configuration

2. **Server won't start**
   - Ensure all dependencies are installed
   - Check that Node.js version is 18 or higher
   - Verify environment variables are set correctly

3. **Can't connect from Cursor**
   - Make sure the server is built (`npm run build`)
   - Check the path in Cursor's MCP configuration
   - Ensure the server process has permission to run

### Debug Mode

Enable debug logging:
```bash
DEBUG=replit-mcp:* npm start
```

Or set in your environment:
```env
DEBUG=replit-mcp:*
NODE_ENV=development
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes with proper tests
4. Ensure all tests pass
5. Submit a pull request

## License

ISC License

## Roadmap

### Phase 1: Complete Auth API (Current)
- [x] Basic authentication
- [x] Token management
- [x] User profile access
- [ ] Token auto-refresh
- [ ] Session persistence

### Phase 2: Core APIs
- [ ] Filesystem API
- [ ] Data API (GraphQL)
- [ ] Exec API
- [ ] ReplDB API

### Phase 3: Enhanced Features
- [ ] Messages API
- [ ] Commands API
- [ ] Debug API
- [ ] Themes API

### Phase 4: Advanced Integration
- [ ] Multi-Repl management
- [ ] Team collaboration
- [ ] Deployment workflows
- [ ] Automation features

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the Replit Extensions documentation
