import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { WebSocketServer } from "./websocket-server.js";
import { Logger } from "./logger.js";

export class ReplitMCPServer {
  private mcpServer: McpServer;
  private wsServer: WebSocketServer;
  private logger = new Logger('ReplitMCPServer');
  private currentWorkspaceId?: string;

  constructor() {
    // Initialize WebSocket server
    this.wsServer = new WebSocketServer(
      parseInt(process.env.BRIDGE_PORT || '8765'),
      process.env.BRIDGE_SECRET
    );

    // Initialize MCP server
    this.mcpServer = new McpServer({
      name: "replit-mcp-server",
      version: "1.0.0"
    });

    this.setupTools();
    this.setupResources();
    this.setupPrompts();
  }

  private setupTools() {
    // Authentication tools
    this.mcpServer.tool(
      "replit_connect",
      {
        workspaceId: z.string().optional().describe("Workspace ID to connect to (if omitted, uses most recent)")
      },
      async ({ workspaceId }) => {
        try {
          const activeWorkspaces = this.wsServer.getActiveWorkspaces();

          if (activeWorkspaces.length === 0) {
            return {
              content: [{
                type: "text",
                text: "❌ No Replit extensions are currently connected. Please:\n" +
                      "1. Open your Replit workspace\n" +
                      "2. Install the Replit MCP extension\n" +
                      "3. Reload the extension",
                isError: true
              }]
            };
          }

          let targetWorkspace = workspaceId;

          if (!targetWorkspace) {
            // Use the most recently active workspace
            targetWorkspace = activeWorkspaces[activeWorkspaces.length - 1];
          }

          if (!activeWorkspaces.includes(targetWorkspace)) {
            return {
              content: [{
                type: "text",
                text: `❌ Workspace ${targetWorkspace} is not connected. ` +
                      `Active workspaces: ${activeWorkspaces.join(', ')}`,
                isError: true
              }]
            };
          }

          this.currentWorkspaceId = targetWorkspace;

          // Test the connection
          const userInfo = await this.wsServer.sendToExtension(
            targetWorkspace,
            'get_user_info'
          );

          return {
            content: [{
              type: "text",
              text: `✅ Connected to Replit workspace: ${targetWorkspace}\n` +
                    `User: ${userInfo.displayName} (@${userInfo.username})\n` +
                    `Ready to use Replit tools!`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `❌ Failed to connect: ${error.message}`,
              isError: true
            }]
          };
        }
      }
    );

    // File operations
    this.mcpServer.tool(
      "replit_read_file",
      {
        path: z.string().describe("File path relative to workspace root"),
        workspaceId: z.string().optional().describe("Workspace ID (overrides current connection)")
      },
      async ({ path, workspaceId }) => {
        try {
          const targetWorkspace = workspaceId || this.currentWorkspaceId;

          if (!targetWorkspace) {
            throw new Error("Not connected to any workspace. Use replit_connect first.");
          }

          const result = await this.wsServer.sendToExtension(
            targetWorkspace,
            'read_file',
            { path }
          );

          return {
            content: [{
              type: "text",
              text: result.content
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `❌ Failed to read file: ${error.message}`,
              isError: true
            }]
          };
        }
      }
    );

    this.mcpServer.tool(
      "replit_write_file",
      {
        path: z.string().describe("File path relative to workspace root"),
        content: z.string().describe("File content"),
        workspaceId: z.string().optional().describe("Workspace ID (overrides current connection)")
      },
      async ({ path, content, workspaceId }) => {
        try {
          const targetWorkspace = workspaceId || this.currentWorkspaceId;

          if (!targetWorkspace) {
            throw new Error("Not connected to any workspace. Use replit_connect first.");
          }

          await this.wsServer.sendToExtension(
            targetWorkspace,
            'write_file',
            { path, content }
          );

          return {
            content: [{
              type: "text",
              text: `✅ Successfully wrote to ${path}`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `❌ Failed to write file: ${error.message}`,
              isError: true
            }]
          };
        }
      }
    );

    this.mcpServer.tool(
      "replit_list_directory",
      {
        path: z.string().optional().default(".").describe("Directory path to list"),
        workspaceId: z.string().optional().describe("Workspace ID (overrides current connection)")
      },
      async ({ path, workspaceId }) => {
        try {
          const targetWorkspace = workspaceId || this.currentWorkspaceId;

          if (!targetWorkspace) {
            throw new Error("Not connected to any workspace. Use replit_connect first.");
          }

          const result = await this.wsServer.sendToExtension(
            targetWorkspace,
            'list_directory',
            { path }
          );

          const formatted = result.entries.map((entry: any) => {
            const icon = entry.isDirectory ? "📁" : "📄";
            return `${icon} ${entry.name}${entry.isDirectory ? "/" : ""}`;
          }).join("\n");

          return {
            content: [{
              type: "text",
              text: `Contents of ${path}:\n\n${formatted}`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `❌ Failed to list directory: ${error.message}`,
              isError: true
            }]
          };
        }
      }
    );

    // Command execution
    this.mcpServer.tool(
      "replit_run_command",
      {
        command: z.string().describe("Command to execute"),
        args: z.array(z.string()).optional().describe("Command arguments"),
        cwd: z.string().optional().describe("Working directory"),
        workspaceId: z.string().optional().describe("Workspace ID (overrides current connection)")
      },
      async ({ command, args = [], cwd, workspaceId }) => {
        try {
          const targetWorkspace = workspaceId || this.currentWorkspaceId;

          if (!targetWorkspace) {
            throw new Error("Not connected to any workspace. Use replit_connect first.");
          }

          const result = await this.wsServer.sendToExtension(
            targetWorkspace,
            'run_command',
            { command, args, cwd },
            60000 // 60 second timeout for commands
          );

          let output = "";
          if (result.stdout) output += `Output:\n${result.stdout}\n`;
          if (result.stderr) output += `Errors:\n${result.stderr}\n`;
          if (result.exitCode !== 0) output += `Exit code: ${result.exitCode}`;

          return {
            content: [{
              type: "text",
              text: output || "Command executed with no output"
            }],
            isError: result.exitCode !== 0
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `❌ Failed to run command: ${error.message}`,
              isError: true
            }]
          };
        }
      }
    );

    // Project management
    this.mcpServer.tool(
      "replit_list_repls",
      {},
      async () => {
        try {
          if (!this.currentWorkspaceId) {
            throw new Error("Not connected to any workspace. Use replit_connect first.");
          }

          const result = await this.wsServer.sendToExtension(
            this.currentWorkspaceId,
            'list_repls'
          );

          const formatted = result.repls.map((repl: any) => {
            const privacy = repl.isPrivate ? "🔒" : "🌐";
            const language = repl.language || "unknown";
            return `${privacy} ${repl.title} (${language}) - ${repl.id}\n   ${repl.url || ''}`;
          }).join("\n\n");

          return {
            content: [{
              type: "text",
              text: `Your Repls:\n\n${formatted}`
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `❌ Failed to list Repls: ${error.message}`,
              isError: true
            }]
          };
        }
      }
    );

    // Workspace status
    this.mcpServer.tool(
      "replit_status",
      {},
      async () => {
        try {
          const stats = this.wsServer.getConnectionStats();
          const activeWorkspaces = this.wsServer.getActiveWorkspaces();

          let status = "🔌 Replit MCP Bridge Status\n\n";
          status += `📊 Connections:\n`;
          status += `   Total: ${stats.totalConnections}\n`;
          status += `   Authenticated: ${stats.authenticatedConnections}\n`;
          status += `   Active Workspaces: ${stats.activeWorkspaces}\n`;
          status += `   Pending Requests: ${stats.pendingRequests}\n\n`;

          if (activeWorkspaces.length > 0) {
            status += `🚀 Active Workspaces:\n`;
            for (const workspaceId of activeWorkspaces) {
              const isCurrent = workspaceId === this.currentWorkspaceId ? " (current)" : "";
              status += `   • ${workspaceId}${isCurrent}\n`;
            }
          } else {
            status += `⚠️ No active workspaces. Make sure your Replit extension is connected.\n`;
          }

          if (this.currentWorkspaceId) {
            status += `\n✅ Currently connected to: ${this.currentWorkspaceId}\n`;
          } else {
            status += `\n❌ Not connected to any workspace. Use 'replit_connect' to connect.\n`;
          }

          return {
            content: [{
              type: "text",
              text: status
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `❌ Failed to get status: ${error.message}`,
              isError: true
            }]
          };
        }
      }
    );

    // Deployment
    this.mcpServer.tool(
      "replit_deploy",
      {
        replId: z.string().optional().describe("Repl ID to deploy (defaults to current workspace)"),
        env: z.record(z.string()).optional().describe("Environment variables for deployment")
      },
      async ({ replId, env }) => {
        try {
          if (!this.currentWorkspaceId) {
            throw new Error("Not connected to any workspace. Use replit_connect first.");
          }

          const result = await this.wsServer.sendToExtension(
            this.currentWorkspaceId,
            'deploy',
            { replId, env },
            120000 // 2 minute timeout for deployment
          );

          return {
            content: [{
              type: "text",
              text: `🚀 Deployment successful!\n\n` +
                    `URL: ${result.url}\n` +
                    `Status: ${result.status}\n` +
                    (result.message ? `Message: ${result.message}` : '')
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `❌ Deployment failed: ${error.message}`,
              isError: true
            }]
          };
        }
      }
    );
  }

  private setupResources() {
    // Workspace file resource
    this.mcpServer.resource(
      "replit-file",
      "replit://file/{path}",
      async (uri) => {
        // Extract path from URI: replit://file/some/path/file.txt
        const url = new URL(uri.href);
        const path = decodeURIComponent(url.pathname).replace(/^\/+/, '');
        try {
          if (!this.currentWorkspaceId) {
            throw new Error("Not connected to any workspace");
          }

          const result = await this.wsServer.sendToExtension(
            this.currentWorkspaceId,
            'read_file',
            { path }
          );

          return {
            contents: [{
              uri: uri.href,
              text: result.content,
              mimeType: this.getMimeType(path)
            }]
          };
        } catch (error: any) {
          return {
            contents: [{
              uri: uri.href,
              text: `Error reading file: ${error.message}`,
              isError: true
            }]
          };
        }
      }
    );

    // Workspace metadata resource
    this.mcpServer.resource(
      "replit-workspace",
      "replit://workspace",
      async (uri) => {
        try {
          if (!this.currentWorkspaceId) {
            throw new Error("Not connected to any workspace");
          }

          const [userInfo, workspaceInfo] = await Promise.all([
            this.wsServer.sendToExtension(this.currentWorkspaceId, 'get_user_info'),
            this.wsServer.sendToExtension(this.currentWorkspaceId, 'get_workspace_info')
          ]);

          return {
            contents: [{
              uri: uri.href,
              text: JSON.stringify({
                workspaceId: this.currentWorkspaceId,
                user: userInfo,
                workspace: workspaceInfo
              }, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            contents: [{
              uri: uri.href,
              text: `Error getting workspace info: ${error.message}`,
              isError: true
            }]
          };
        }
      }
    );
  }

  private setupPrompts() {
    // Code review prompt
    this.mcpServer.prompt(
      "replit_code_review",
      {
        files: z.string().describe("Comma-separated list of files to review")
      },
      async ({ files }) => {
        const fileList = files.split(',').map(f => f.trim());
        if (!this.currentWorkspaceId) {
          throw new Error("Not connected to any workspace");
        }

        const fileContents = await Promise.all(
          fileList.map(async (file: string) => {
            const result = await this.wsServer.sendToExtension(
              this.currentWorkspaceId!,
              'read_file',
              { path: file }
            );
            return { file, content: result.content };
          })
        );

        const reviewText = fileContents
          .map(({ file, content }: { file: string, content: string }) => `## ${file}\n\n\`\`\`\n${content}\n\`\`\``)
          .join('\n\n');

        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: `Please review the following code in the Replit workspace:\n\n${reviewText}\n\n` +
                    "Provide feedback on:\n" +
                    "1. Code quality and best practices\n" +
                    "2. Potential bugs or issues\n" +
                    "3. Performance considerations\n" +
                    "4. Security concerns\n" +
                    "5. Suggestions for improvement"
            }
          }]
        };
      }
    );

    // Project setup prompt
    this.mcpServer.prompt(
      "replit_project_setup",
      {
        template: z.enum(["node", "python", "react", "express", "fastapi"]),
        name: z.string().describe("Project name")
      },
      async ({ template, name }) => {
        const templates = {
          node: {
            description: "Node.js project with npm",
            files: {
              "package.json": JSON.stringify({
                name,
                version: "1.0.0",
                scripts: { start: "node index.js", test: "jest" },
                dependencies: {}
              }, null, 2),
              "index.js": "console.log('Hello, Node!');",
              "README.md": `# ${name}\n\nA Node.js project.`
            }
          },
          python: {
            description: "Python project with pip",
            files: {
              "requirements.txt": "# Add your Python dependencies here\n",
              "main.py": "print('Hello, Python!')",
              "README.md": `# ${name}\n\nA Python project.`
            }
          },
          react: {
            description: "React application",
            files: {
              "package.json": JSON.stringify({
                name,
                version: "1.0.0",
                scripts: { start: "react-scripts start", build: "react-scripts build" },
                dependencies: { "react": "^18.0.0", "react-dom": "^18.0.0", "react-scripts": "5.0.0" }
              }, null, 2),
              "public/index.html": "<!DOCTYPE html><html><head><title>React App</title></head><body><div id='root'></div></body></html>",
              "src/index.js": "import React from 'react';\nimport ReactDOM from 'react-dom';\nReactDOM.render(<h1>Hello, React!</h1>, document.getElementById('root'));",
              "README.md": `# ${name}\n\nA React application.`
            }
          },
          express: {
            description: "Express.js server",
            files: {
              "package.json": JSON.stringify({
                name,
                version: "1.0.0",
                scripts: { start: "node server.js", dev: "nodemon server.js" },
                dependencies: { "express": "^4.18.0" }
              }, null, 2),
              "server.js": "const express = require('express');\nconst app = express();\nconst port = 3000;\n\napp.get('/', (req, res) => {\n  res.send('Hello, Express!');\n});\n\napp.listen(port, () => {\n  console.log(`Server running at http://localhost:${port}`);\n});",
              "README.md": `# ${name}\n\nAn Express.js server.`
            }
          },
          fastapi: {
            description: "FastAPI application",
            files: {
              "requirements.txt": "fastapi==0.100.0\nuvicorn==0.23.0",
              "main.py": "from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get('/')\nasync def root():\n    return {'message': 'Hello, FastAPI!'}",
              "README.md": `# ${name}\n\nA FastAPI application.`
            }
          }
        };

        const config = templates[template];

        return {
          messages: [{
            role: "user",
            content: {
              type: "text",
              text: `Create a new ${config.description} named "${name}".\n\n` +
                    `Files to create:\n${Object.keys(config.files).map(f => `- ${f}`).join('\n')}\n\n` +
                    `After creating the files, run the appropriate setup commands:`
            }
          }]
        };
      }
    );
  }

  private getMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'json': 'application/json',
      'html': 'text/html',
      'css': 'text/css',
      'md': 'text/markdown',
      'py': 'text/x-python',
      'go': 'text/x-go',
      'rs': 'text/x-rust',
      'java': 'text/x-java',
      'cpp': 'text/x-c++',
      'c': 'text/x-c',
      'php': 'text/x-php',
      'rb': 'text/x-ruby',
      'sql': 'text/x-sql',
      'yaml': 'text/x-yaml',
      'yml': 'text/x-yaml',
      'xml': 'application/xml',
      'txt': 'text/plain',
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml'
    };

    return mimeTypes[ext || ''] || 'text/plain';
  }

  public async start() {
    // Start MCP server with stdio transport
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);

    this.logger.info("Replit MCP Server started");
    this.logger.info(`WebSocket bridge listening on port ${process.env.BRIDGE_PORT || 8765}`);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.logger.info("Shutting down...");
      this.wsServer.close();
      process.exit(0);
    });
  }
}