/**
 * Filesystem API Tools for Replit MCP Server
 * Provides file and directory operations as MCP tools
 */

import { z } from 'zod';
import { getAPI, initializeExtensions } from '../replit/extensions.js';
import { logger } from '../utils/logger.js';

// Store active watchers
export const activeWatchers = new Map<string, any>();

// Initialize extensions if needed
async function ensureInitialized(): Promise<void> {
  const { isExtensionsInitialized } = await import('../replit/extensions.js');
  if (!isExtensionsInitialized()) {
    await initializeExtensions();
  }
}

// Get the filesystem API
async function getFS() {
  await ensureInitialized();
  return getAPI('fs');
}

// Filesystem tool definitions
export const filesystemTools = [
  {
    name: 'replit_read_file',
    description: 'Read a file from the Replit filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to read'
        },
        encoding: {
          type: 'string',
          enum: ['utf8', 'binary'],
          default: 'utf8',
          description: 'File encoding (default: utf8)'
        }
      },
      required: ['path']
    }
  },

  {
    name: 'replit_write_file',
    description: 'Write content to a file in the Replit filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to write'
        },
        content: {
          type: 'string',
          description: 'Content to write to the file'
        },
        encoding: {
          type: 'string',
          enum: ['utf8', 'binary'],
          default: 'utf8',
          description: 'File encoding (default: utf8)'
        }
      },
      required: ['path', 'content']
    }
  },

  {
    name: 'replit_read_dir',
    description: 'List contents of a directory in the Replit filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the directory to read',
          default: '/'
        }
      },
      required: []
    }
  },

  {
    name: 'replit_create_dir',
    description: 'Create a directory in the Replit filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path of the directory to create'
        }
      },
      required: ['path']
    }
  },

  {
    name: 'replit_delete_file',
    description: 'Delete a file from the Replit filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to delete'
        }
      },
      required: ['path']
    }
  },

  {
    name: 'replit_delete_dir',
    description: 'Delete a directory from the Replit filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the directory to delete'
        }
      },
      required: ['path']
    }
  },

  {
    name: 'replit_move',
    description: 'Move a file or directory in the Replit filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          description: 'Current path of the file or directory'
        },
        to: {
          type: 'string',
          description: 'New path for the file or directory'
        }
      },
      required: ['from', 'to']
    }
  },

  {
    name: 'replit_copy_file',
    description: 'Copy a file in the Replit filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          description: 'Path of the source file'
        },
        to: {
          type: 'string',
          description: 'Path of the destination file'
        }
      },
      required: ['from', 'to']
    }
  },

  {
    name: 'replit_watch_file',
    description: 'Watch a file for changes in the Replit filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to watch'
        },
        encoding: {
          type: 'string',
          enum: ['utf8', 'binary'],
          default: 'utf8',
          description: 'File encoding (default: utf8)'
        }
      },
      required: ['path']
    }
  },

  {
    name: 'replit_watch_dir',
    description: 'Watch a directory for changes in the Replit filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the directory to watch'
        }
      },
      required: ['path']
    }
  },

  {
    name: 'replit_unwatch',
    description: 'Stop watching a file or directory',
    inputSchema: {
      type: 'object',
      properties: {
        watcherId: {
          type: 'string',
          description: 'ID of the watcher to dispose'
        }
      },
      required: ['watcherId']
    }
  }
];

// Filesystem tool handlers
export const filesystemToolHandlers = {
  replit_read_file: async (args: any) => {
    try {
      const { path, encoding = 'utf8' } = args;
      const fs = await getFS();

      // Call the readFile method
      const result = await fs.readFile(path, encoding as any);

      if ('error' in result) {
        return {
          content: [{
            type: 'text',
            text: `Error reading file: ${result.error}`,
            isError: true
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: 'text',
          text: result.content || ''
        }]
      };
    } catch (error) {
      logger.error('Failed to read file', error as Error);
      return {
        content: [{
          type: 'text',
          text: `Failed to read file: ${(error as Error).message}`,
          isError: true
        }],
        isError: true
      };
    }
  },

  replit_write_file: async (args: any) => {
    try {
      const { path, content } = args;
      const fs = await getFS();

      const result = await fs.writeFile(path, content);

      if ('error' in result) {
        return {
          content: [{
            type: 'text',
            text: `Error writing file: ${result.error}`,
            isError: true
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Successfully wrote to ${path}`
        }]
      };
    } catch (error) {
      logger.error('Failed to write file', error as Error);
      return {
        content: [{
          type: 'text',
          text: `Failed to write file: ${(error as Error).message}`,
          isError: true
        }],
        isError: true
      };
    }
  },

  replit_read_dir: async (args: any) => {
    try {
      const { path = '/' } = args;
      const fs = await getFS();

      const result = await fs.readDir(path);

      if ('error' in result) {
        return {
          content: [{
            type: 'text',
            text: `Error reading directory: ${result.error}`,
            isError: true
          }],
          isError: true
        };
      }

      // Format the directory listing
      const children = result.children || [];
      const formattedList = children.map((child: any) => {
        const icon = child.type === 'DIRECTORY' ? '📁' : '📄';
        return `${icon} ${child.filename}${child.type === 'DIRECTORY' ? '/' : ''}`;
      }).join('\n');

      return {
        content: [{
          type: 'text',
          text: `Contents of ${path}:\n\n${formattedList}`
        }]
      };
    } catch (error) {
      logger.error('Failed to read directory', error as Error);
      return {
        content: [{
          type: 'text',
          text: `Failed to read directory: ${(error as Error).message}`,
          isError: true
        }],
        isError: true
      };
    }
  },

  replit_create_dir: async (args: any) => {
    try {
      const { path } = args;
      const fs = await getFS();

      const result = await fs.createDir(path);

      if ('error' in result) {
        return {
          content: [{
            type: 'text',
            text: `Error creating directory: ${result.error}`,
            isError: true
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Successfully created directory: ${path}`
        }]
      };
    } catch (error) {
      logger.error('Failed to create directory', error as Error);
      return {
        content: [{
          type: 'text',
          text: `Failed to create directory: ${(error as Error).message}`,
          isError: true
        }],
        isError: true
      };
    }
  },

  replit_delete_file: async (args: any) => {
    try {
      const { path } = args;
      const fs = await getFS();

      const result = await fs.deleteFile(path);

      if ('error' in result) {
        return {
          content: [{
            type: 'text',
            text: `Error deleting file: ${result.error}`,
            isError: true
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Successfully deleted file: ${path}`
        }]
      };
    } catch (error) {
      logger.error('Failed to delete file', error as Error);
      return {
        content: [{
          type: 'text',
          text: `Failed to delete file: ${(error as Error).message}`,
          isError: true
        }],
        isError: true
      };
    }
  },

  replit_delete_dir: async (args: any) => {
    try {
      const { path } = args;
      const fs = await getFS();

      const result = await fs.deleteDir(path);

      if ('error' in result) {
        return {
          content: [{
            type: 'text',
            text: `Error deleting directory: ${result.error}`,
            isError: true
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Successfully deleted directory: ${path}`
        }]
      };
    } catch (error) {
      logger.error('Failed to delete directory', error as Error);
      return {
        content: [{
          type: 'text',
          text: `Failed to delete directory: ${(error as Error).message}`,
          isError: true
        }],
        isError: true
      };
    }
  },

  replit_move: async (args: any) => {
    try {
      const { from, to } = args;
      const fs = await getFS();

      const result = await fs.move(from, to);

      if ('error' in result) {
        return {
          content: [{
            type: 'text',
            text: `Error moving file/directory: ${result.error}`,
            isError: true
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Successfully moved ${from} to ${to}`
        }]
      };
    } catch (error) {
      logger.error('Failed to move file/directory', error as Error);
      return {
        content: [{
          type: 'text',
          text: `Failed to move file/directory: ${(error as Error).message}`,
          isError: true
        }],
        isError: true
      };
    }
  },

  replit_copy_file: async (args: any) => {
    try {
      const { from, to } = args;
      const fs = await getFS();

      const result = await fs.copyFile(from, to);

      if ('error' in result) {
        return {
          content: [{
            type: 'text',
            text: `Error copying file: ${result.error}`,
            isError: true
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Successfully copied ${from} to ${to}`
        }]
      };
    } catch (error) {
      logger.error('Failed to copy file', error as Error);
      return {
        content: [{
          type: 'text',
          text: `Failed to copy file: ${(error as Error).message}`,
          isError: true
        }],
        isError: true
      };
    }
  },

  replit_watch_file: async (args: any) => {
    try {
      const { path, encoding = 'utf8' } = args;
      const fs = await getFS();

      // Generate a unique watcher ID
      const watcherId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store changes in memory for retrieval
      const changes: any[] = [];

      // Set up listeners
      const listeners = {
        onChange: (newContent: any) => {
          changes.push({
            type: 'change',
            timestamp: new Date().toISOString(),
            content: newContent
          });
          logger.info(`File ${path} changed`);
        },
        onError: (error: string) => {
          changes.push({
            type: 'error',
            timestamp: new Date().toISOString(),
            error
          });
          logger.error(`Error watching file ${path}:`, new Error(error));
        },
        onMoveOrDelete: (event: any) => {
          changes.push({
            type: 'moveOrDelete',
            timestamp: new Date().toISOString(),
            event
          });
          logger.info(`File ${path} moved or deleted`);
        }
      };

      const dispose = await fs.watchFile(path, listeners, encoding as any);

      // Store the watcher and dispose function
      activeWatchers.set(watcherId, {
        type: 'file',
        path,
        dispose,
        changes
      });

      return {
        content: [{
          type: 'text',
          text: `Started watching file: ${path}\nWatcher ID: ${watcherId}\n\nUse 'replit_unwatch' with this ID to stop watching.`
        }]
      };
    } catch (error) {
      logger.error('Failed to watch file', error as Error);
      return {
        content: [{
          type: 'text',
          text: `Failed to watch file: ${(error as Error).message}`,
          isError: true
        }],
        isError: true
      };
    }
  },

  replit_watch_dir: async (args: any) => {
    try {
      const { path } = args;
      const fs = await getFS();

      // Generate a unique watcher ID
      const watcherId = `dir_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store changes in memory for retrieval
      const changes: any[] = [];

      // Set up listeners
      const listeners = {
        onChange: (children: any[]) => {
          changes.push({
            type: 'change',
            timestamp: new Date().toISOString(),
            children
          });
          logger.info(`Directory ${path} changed`);
        },
        onError: (error: Error, extraInfo: any) => {
          changes.push({
            type: 'error',
            timestamp: new Date().toISOString(),
            error: error.message,
            extraInfo
          });
          logger.error(`Error watching directory ${path}:`, error);
        },
        onMoveOrDelete: (event: any) => {
          changes.push({
            type: 'moveOrDelete',
            timestamp: new Date().toISOString(),
            event
          });
          logger.info(`Directory ${path} moved or deleted`);
        }
      };

      const dispose = await fs.watchDir(path, listeners);

      // Store the watcher and dispose function
      activeWatchers.set(watcherId, {
        type: 'directory',
        path,
        dispose,
        changes
      });

      return {
        content: [{
          type: 'text',
          text: `Started watching directory: ${path}\nWatcher ID: ${watcherId}\n\nUse 'replit_unwatch' with this ID to stop watching.`
        }]
      };
    } catch (error) {
      logger.error('Failed to watch directory', error as Error);
      return {
        content: [{
          type: 'text',
          text: `Failed to watch directory: ${(error as Error).message}`,
          isError: true
        }],
        isError: true
      };
    }
  },

  replit_unwatch: async (args: any) => {
    try {
      const { watcherId } = args;

      // Retrieve the watcher
      const watcher = activeWatchers.get(watcherId);

      if (!watcher) {
        return {
          content: [{
            type: 'text',
            text: `Watcher not found: ${watcherId}`,
            isError: true
          }],
          isError: true
        };
      }

      // Call the dispose function
      if (watcher.dispose && typeof watcher.dispose === 'function') {
        await watcher.dispose();
      }

      // Remove from active watchers
      activeWatchers.delete(watcherId);

      return {
        content: [{
          type: 'text',
          text: `Stopped watching: ${watcherId}\nPath: ${watcher.path}`
        }]
      };
    } catch (error) {
      logger.error('Failed to stop watching', error as Error);
      return {
        content: [{
          type: 'text',
          text: `Failed to stop watching: ${(error as Error).message}`,
          isError: true
        }],
        isError: true
      };
    }
  }
};