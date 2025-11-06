/**
 * MCP Resources for Replit Database API (ReplDB)
 * Provides resource access to database contents and metadata
 */

import { replDb } from '@replit/extensions';
import { logger } from '../utils/logger.js';
import { isReplDbError, extractReplDbValue, extractReplDbError, safeJsonParse } from '../utils/repldb-types.js';

/**
 * ReplDB key resource - provides access to individual key-value pairs
 */
export const replDbKeyResource = {
  uri: 'replit://db/{namespace}/{key}',
  name: 'ReplDB Key',
  description: 'Access a specific key-value pair in ReplDB',
  mimeType: 'application/json'
};

/**
 * ReplDB namespace resource - lists all keys in a namespace
 */
export const replDbNamespaceResource = {
  uri: 'replit://db/{namespace}',
  name: 'ReplDB Namespace',
  description: 'List all keys in a namespace',
  mimeType: 'application/json'
};

/**
 * ReplDB root resource - provides database overview
 */
export const replDbRootResource = {
  uri: 'replit://db',
  name: 'ReplDB Database',
  description: 'Overview of ReplDB database',
  mimeType: 'application/json'
};

/**
 * Export all ReplDB resources
 */
export const replDbResources = [
  replDbKeyResource,
  replDbNamespaceResource,
  replDbRootResource
];

/**
 * Handler for ReplDB key resource
 */
export async function handleReplDbKeyResource(url: URL) {
  try {
    const namespace = url.pathname.split('/')[2] || '';
    const key = url.pathname.split('/')[3];

    if (!key) {
      throw new Error('Key is required');
    }

    const fullKey = namespace ? `${namespace}:${key}` : key;
    const result = await replDb.get({ key: fullKey });

    if (isReplDbError(result)) {
      throw new Error(extractReplDbError(result) || 'Unknown error');
    }

    const value = extractReplDbValue(result) || '';

    // Try to parse as JSON for proper MIME type
    let parsedValue = value;
    let mimeType = 'text/plain';

    try {
      parsedValue = JSON.parse(value);
      mimeType = 'application/json';
    } catch {
      // Keep as plain text
    }

    logger.debug(`ReplDB resource accessed: ${fullKey}`);

    return {
      contents: [{
        uri: url.href,
        mimeType,
        text: typeof parsedValue === 'object' ? JSON.stringify(parsedValue, null, 2) : String(parsedValue)
      }]
    };
  } catch (error) {
    logger.error(`ReplDB resource error: ${url.href}`, error as Error);
    return {
      contents: [{
        uri: url.href,
        mimeType: 'text/plain',
        text: `Error accessing ReplDB resource: ${(error as Error).message}`,
        isError: true
      }]
    };
  }
}

/**
 * Handler for ReplDB namespace resource
 */
export async function handleReplDbNamespaceResource(url: URL) {
  try {
    const namespace = url.pathname.split('/')[2] || '';

    // List all keys in namespace
    const prefix = namespace ? `${namespace}:` : '';
    const result = await replDb.list({ prefix });

    if (isReplDbError(result)) {
      throw new Error(extractReplDbError(result) || 'Unknown error');
    }

    const keysData = result as { keys: string[] };
    const keys = keysData.keys;

    // Get sample values for preview
    const sample = await Promise.all(
      keys.slice(0, 10).map(async (fullKey) => {
        const valueResult = await replDb.get({ key: fullKey });
        const key = namespace ? fullKey.replace(`${namespace}:`, '') : fullKey;

        if (isReplDbError(valueResult)) {
          return { key, error: extractReplDbError(valueResult) };
        }

        const value = extractReplDbValue(valueResult) || '';
        let parsedValue = value;
        let type = 'string';

        try {
          parsedValue = JSON.parse(value);
          type = Array.isArray(parsedValue) ? 'array' : typeof parsedValue;
        } catch {
          // Keep as string
        }

        return {
          key,
          value: parsedValue,
          type,
          size: value.length
        };
      })
    );

    const namespaceData = {
      namespace: namespace || 'default',
      totalKeys: keys.length,
      previewKeys: sample.length,
      keys: sample,
      lastUpdated: new Date().toISOString()
    };

    logger.debug(`ReplDB namespace resource accessed: ${namespace}`);

    return {
      contents: [{
        uri: url.href,
        mimeType: 'application/json',
        text: JSON.stringify(namespaceData, null, 2)
      }]
    };
  } catch (error) {
    logger.error(`ReplDB namespace resource error: ${url.href}`, error as Error);
    return {
      contents: [{
        uri: url.href,
        mimeType: 'text/plain',
        text: `Error accessing namespace: ${(error as Error).message}`,
        isError: true
      }]
    };
  }
}

/**
 * Handler for ReplDB root resource
 */
export async function handleReplDbRootResource(url: URL) {
  try {
    // Get all keys without prefix
    const result = await replDb.list({ prefix: '' });

    if (isReplDbError(result)) {
      throw new Error(extractReplDbError(result) || 'Unknown error');
    }

    const keysData = result as { keys: string[] };
    const keys = keysData.keys;

    // Analyze namespaces
    const namespaces: Record<string, number> = {};
    const types: Record<string, number> = {};

    // Sample first 50 keys for type analysis
    const sampleSize = Math.min(keys.length, 50);
    const sampleKeys = keys.slice(0, sampleSize);

    for (const fullKey of sampleKeys) {
      // Analyze namespaces
      const parts = fullKey.split(':');
      const namespace = parts.length > 1 ? parts[0] : '[no namespace]';
      namespaces[namespace] = (namespaces[namespace] || 0) + 1;

      // Analyze value types
      try {
        const valueResult = await replDb.get({ key: fullKey });
        if (!isReplDbError(valueResult)) {
          const value = extractReplDbValue(valueResult) || '';
          const parsed = JSON.parse(value);
          const type = Array.isArray(parsed) ? 'array' : typeof parsed;
          types[type] = (types[type] || 0) + 1;
        }
      } catch {
        types['string'] = (types['string'] || 0) + 1;
      }
    }

    const dbStats = {
      totalKeys: keys.length,
      namespaces: Object.entries(namespaces)
        .sort(([,a], [,b]) => b - a)
        .map(([name, count]) => ({ name, count, percentage: Math.round(count / keys.length * 100) })),
      valueTypes: types,
      sampleSize: sampleKeys.length,
      lastAnalyzed: new Date().toISOString()
    };

    logger.debug('ReplDB root resource accessed');

    return {
      contents: [{
        uri: url.href,
        mimeType: 'application/json',
        text: JSON.stringify(dbStats, null, 2)
      }]
    };
  } catch (error) {
    logger.error(`ReplDB root resource error: ${url.href}`, error as Error);
    return {
      contents: [{
        uri: url.href,
        mimeType: 'text/plain',
        text: `Error accessing database: ${(error as Error).message}`,
        isError: true
      }]
    };
  }
}

/**
 * Export all ReplDB resource handlers
 */
export const replDbResourceHandlers = {
  'replit://db/{namespace}/{key}': handleReplDbKeyResource,
  'replit://db/{namespace}': handleReplDbNamespaceResource,
  'replit://db': handleReplDbRootResource
};