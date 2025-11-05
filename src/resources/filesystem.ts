/**
 * Filesystem Resources for Replit MCP Server
 * Exposes files and directories as MCP resources
 */

import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { getAPI, initializeExtensions } from '../replit/extensions.js';
import { logger } from '../utils/logger.js';

// Store active watchers for resource updates
const resourceWatchers = new Map<string, any>();

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

// Filesystem resource definitions
export const filesystemResources: Resource[] = [
  {
    uri: 'replit://file/{path}',
    name: 'Replit File',
    description: 'Access any file in the Replit filesystem',
    mimeType: 'application/octet-stream'
  },
  {
    uri: 'replit://directory/{path}',
    name: 'Replit Directory',
    description: 'List contents of any directory in the Replit filesystem',
    mimeType: 'application/json'
  },
  {
    uri: 'replit://watchers',
    name: 'Active File Watchers',
    description: 'List all active file and directory watchers',
    mimeType: 'application/json'
  }
];

// Filesystem resource handlers
export const filesystemResourceHandlers: Record<string, (uri: URL) => Promise<any>> = {
  'replit://file/{path}': async (uri: URL) => {
    try {
      const pathname = decodeURIComponent(uri.pathname);
      const path = pathname.startsWith('/') ? pathname.slice(1) : pathname;

      if (!path) {
        throw new Error('File path is required');
      }

      const fs = await getFS();
      const result = await fs.readFile(path, 'utf8');

      if ('error' in result) {
        throw new Error(`Failed to read file: ${result.error}`);
      }

      // Determine MIME type based on file extension
      const ext = path.split('.').pop()?.toLowerCase();
      const mimeType = getMimeType(ext || '');

      return {
        contents: [{
          uri: uri.href,
          mimeType: mimeType,
          text: result.content || ''
        }]
      };
    } catch (error) {
      logger.error('Failed to read file resource', error as Error);
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'text/plain',
          text: `Error: ${(error as Error).message}`
        }]
      };
    }
  },

  'replit://directory/{path}': async (uri: URL) => {
    try {
      const pathname = decodeURIComponent(uri.pathname);
      const path = pathname.startsWith('/') ? pathname.slice(1) : pathname || '/';

      const fs = await getFS();
      const result = await fs.readDir(path);

      if ('error' in result) {
        throw new Error(`Failed to read directory: ${result.error}`);
      }

      const directoryInfo = {
        path,
        children: result.children || [],
        timestamp: new Date().toISOString()
      };

      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(directoryInfo, null, 2)
        }]
      };
    } catch (error) {
      logger.error('Failed to read directory resource', error as Error);
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({
            error: (error as Error).message,
            path: decodeURIComponent(uri.pathname)
          }, null, 2)
        }]
      };
    }
  },

  'replit://watchers': async (uri: URL) => {
    try {
      // Import the activeWatchers map
      const fsModule = await import('../tools/filesystem.js');
      const activeWatchers = (fsModule as any).activeWatchers;

      const watchersInfo = Array.from(activeWatchers.entries() as [string, any][]).map(([id, watcher]) => ({
        id,
        type: watcher.type,
        path: watcher.path,
        changesCount: watcher.changes?.length || 0,
        recentChanges: watcher.changes?.slice(-5) || []
      }));

      const watchersData = {
        activeWatchers: watchersInfo,
        totalWatchers: watchersInfo.length,
        timestamp: new Date().toISOString()
      };

      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(watchersData, null, 2)
        }]
      };
    } catch (error) {
      logger.error('Failed to get watchers resource', error as Error);
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({
            error: (error as Error).message
          }, null, 2)
        }]
      };
    }
  }
};

// Helper function to determine MIME type based on file extension
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    'txt': 'text/plain',
    'md': 'text/markdown',
    'json': 'application/json',
    'js': 'application/javascript',
    'ts': 'application/typescript',
    'jsx': 'application/javascript',
    'tsx': 'application/typescript',
    'html': 'text/html',
    'htm': 'text/html',
    'css': 'text/css',
    'scss': 'text/x-scss',
    'sass': 'text/x-sass',
    'less': 'text/x-less',
    'xml': 'application/xml',
    'yaml': 'application/x-yaml',
    'yml': 'application/x-yaml',
    'py': 'application/x-python',
    'java': 'text/x-java-source',
    'c': 'text/x-c',
    'cpp': 'text/x-c++',
    'cc': 'text/x-c++',
    'cxx': 'text/x-c++',
    'h': 'text/x-c',
    'hpp': 'text/x-c++',
    'go': 'text/x-go',
    'rs': 'text/x-rust',
    'php': 'application/x-httpd-php',
    'rb': 'application/x-ruby',
    'swift': 'text/x-swift',
    'kt': 'text/x-kotlin',
    'scala': 'text/x-scala',
    'sh': 'application/x-sh',
    'bash': 'application/x-sh',
    'zsh': 'application/x-sh',
    'fish': 'application/x-fish',
    'ps1': 'application/x-powershell',
    'sql': 'application/sql',
    'csv': 'text/csv',
    'tsv': 'text/tab-separated-values',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject'
  };

  return mimeTypes[extension.toLowerCase()] || 'text/plain';
}