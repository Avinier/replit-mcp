/**
 * Handlers for Replit Database API (ReplDB) Tools
 * Implements the actual logic for database operations
 */

import { replDb } from '@replit/extensions';
import { logger } from '../utils/logger.js';
import { isReplDbError, extractReplDbValue, extractReplDbError, safeJsonParse, safeJsonStringify } from '../utils/repldb-types.js';

/**
 * Helper to create a namespaced key
 */
function createNamespacedKey(key: string, namespace: string): string {
  return namespace ? `${namespace}:${key}` : key;
}


/**
 * Handler for setting a key-value pair
 */
export async function handleReplDbSet(args: {
  key: string;
  value: any;
  namespace?: string;
}) {
  try {
    const fullKey = createNamespacedKey(args.key, args.namespace || '');
    const stringValue = safeJsonStringify(args.value);

    await replDb.set({ key: fullKey, value: stringValue });

    logger.info(`ReplDB: Set key ${fullKey}`);

    return {
      content: [{
        type: 'text',
        text: `✅ Successfully set key: \`${args.key}\`${args.namespace ? ` in namespace: \`${args.namespace}\`` : ''}\n\n` +
              `📊 Value type: ${typeof args.value}\n` +
              `📏 Size: ${stringValue.length} characters`
      }]
    };
  } catch (error) {
    logger.error('Failed to set ReplDB value', error as Error);
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to set key: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Handler for getting a value
 */
export async function handleReplDbGet(args: {
  key: string;
  namespace?: string;
  parseJson?: boolean;
}) {
  try {
    const fullKey = createNamespacedKey(args.key, args.namespace || '');
    const result = await replDb.get({ key: fullKey });

    if (isReplDbError(result)) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error getting key: ${extractReplDbError(result)}`,
          isError: true
        }],
        isError: true
      };
    }

    const value = extractReplDbValue(result) || '';
    const parsedValue = args.parseJson !== false ? safeJsonParse(value) : value;

    logger.info(`ReplDB: Got key ${fullKey}`);

    return {
      content: [{
        type: 'text',
        text: `📦 Value for key \`${args.key}\`${args.namespace ? ` in namespace: \`${args.namespace}\`` : ''}:\n\n` +
              `\`\`\`${typeof parsedValue === 'object' ? 'json' : ''}\n${JSON.stringify(parsedValue, null, 2)}\n\`\`\`\n\n` +
              `📏 Size: ${value.length} characters\n` +
              `🏷️  Type: ${typeof parsedValue}`
      }]
    };
  } catch (error) {
    logger.error('Failed to get ReplDB value', error as Error);
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to get key: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Handler for listing keys
 */
export async function handleReplDbList(args: {
  prefix?: string;
  namespace?: string;
  limit?: number;
}) {
  try {
    const prefix = args.prefix || '';
    const fullPrefix = args.namespace ? `${args.namespace}:${prefix}` : prefix;
    const limit = args.limit || 100;

    const result = await replDb.list({ prefix: fullPrefix });

    if (isReplDbError(result)) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error listing keys: ${extractReplDbError(result)}`,
          isError: true
        }],
        isError: true
      };
    }

    const keysData = extractReplDbValue(result) as { keys: string[] };
    let keys = keysData?.keys || [];

    // Apply limit
    if (keys.length > limit) {
      keys = keys.slice(0, limit);
    }

    // Remove namespace prefix if present
    const displayKeys = args.namespace
      ? keys.map(key => key.replace(`${args.namespace}:`, ''))
      : keys;

    logger.info(`ReplDB: Listed ${keys.length} keys with prefix ${fullPrefix}`);

    let output = `📋 Found ${keysData.keys.length} keys${args.prefix ? ` with prefix \`${args.prefix}\`` : ''}${args.namespace ? ` in namespace \`${args.namespace}\`` : ''}`;

    if (keysData.keys.length > limit) {
      output += ` (showing first ${limit})`;
    }

    if (keys.length > 0) {
      output += '\n\n';

      // Group keys by common prefixes
      const grouped = displayKeys.reduce((acc: Record<string, string[]>, key: string) => {
        const parts = key.split(':');
        const group = parts.length > 1 ? parts[0] : '[root]';
        if (!acc[group]) acc[group] = [];
        acc[group].push(key);
        return acc;
      }, {});

      for (const [group, groupKeys] of Object.entries(grouped)) {
        output += `**${group}** (${groupKeys.length} keys)\n`;
        groupKeys.slice(0, 10).forEach(key => {
          output += `  \`${key}\`\n`;
        });
        if (groupKeys.length > 10) {
          output += `  ... and ${groupKeys.length - 10} more\n`;
        }
        output += '\n';
      }
    }

    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  } catch (error) {
    logger.error('Failed to list ReplDB keys', error as Error);
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to list keys: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Handler for deleting a key
 */
export async function handleReplDbDelete(args: {
  key: string;
  namespace?: string;
}) {
  try {
    const fullKey = createNamespacedKey(args.key, args.namespace || '');

    // Check if key exists first
    const exists = await replDb.get({ key: fullKey });
    if (isReplDbError(exists)) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ Key \`${args.key}\` does not exist${args.namespace ? ` in namespace \`${args.namespace}\`` : ''}`,
          isError: true
        }],
        isError: true
      };
    }

    await replDb.del({ key: fullKey });

    logger.info(`ReplDB: Deleted key ${fullKey}`);

    return {
      content: [{
        type: 'text',
        text: `🗑️  Successfully deleted key: \`${args.key}\`${args.namespace ? ` from namespace: \`${args.namespace}\`` : ''}`
      }]
    };
  } catch (error) {
    logger.error('Failed to delete ReplDB key', error as Error);
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to delete key: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Handler for batch set operations
 */
export async function handleReplDbSetBatch(args: {
  items: Array<{ key: string; value: any; namespace?: string }>;
  namespace?: string;
}) {
  try {
    const defaultNamespace = args.namespace || '';
    const results = [];

    for (const item of args.items) {
      const namespace = item.namespace !== undefined ? item.namespace : defaultNamespace;
      const fullKey = createNamespacedKey(item.key, namespace);
      const stringValue = safeJsonStringify(item.value);

      await replDb.set({ key: fullKey, value: stringValue });
      results.push({ key: item.key, namespace, success: true });
    }

    logger.info(`ReplDB: Batch set ${args.items.length} keys`);

    return {
      content: [{
        type: 'text',
        text: `✅ Successfully set ${args.items.length} key-value pairs:\n\n` +
              results.map(r => `  ✓ \`${r.key}\`${r.namespace ? ` (${r.namespace})` : ''}`).join('\n')
      }]
    };
  } catch (error) {
    logger.error('Failed to batch set ReplDB values', error as Error);
    return {
      content: [{
        type: 'text',
        text: `❌ Batch set failed: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Handler for batch get operations
 */
export async function handleReplDbGetBatch(args: {
  keys: string[];
  namespace?: string;
  parseJson?: boolean;
}) {
  try {
    const namespace = args.namespace || '';
    const results = [];

    for (const key of args.keys) {
      const fullKey = createNamespacedKey(key, namespace);
      const result = await replDb.get({ key: fullKey });

      if (isReplDbError(result)) {
        results.push({ key, value: null, error: extractReplDbError(result) });
      } else {
        const value = extractReplDbValue(result) || '';
        const parsedValue = args.parseJson !== false ? safeJsonParse(value) : value;
        results.push({ key, value: parsedValue, size: value.length });
      }
    }

    logger.info(`ReplDB: Batch get ${args.keys.length} keys`);

    const successful = results.filter(r => !r.error);
    const failed = results.filter(r => r.error);

    let output = `📦 Batch retrieval complete:\n\n`;
    output += `✅ Successful: ${successful.length}/${args.keys.length} keys\n`;

    if (failed.length > 0) {
      output += `❌ Failed: ${failed.length} keys\n\n`;
    }

    if (successful.length > 0) {
      output += '\n**Retrieved Values:**\n\n';
      successful.forEach(r => {
        output += `- \`${r.key}\`: ${JSON.stringify(r.value).substring(0, 100)}${JSON.stringify(r.value).length > 100 ? '...' : ''}\n`;
      });
    }

    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  } catch (error) {
    logger.error('Failed to batch get ReplDB values', error as Error);
    return {
      content: [{
        type: 'text',
        text: `❌ Batch get failed: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Handler for batch delete operations
 */
export async function handleReplDbDeleteBatch(args: {
  keys: string[];
  namespace?: string;
}) {
  try {
    const namespace = args.namespace || '';
    const results = [];

    for (const key of args.keys) {
      const fullKey = createNamespacedKey(key, namespace);

      try {
        await replDb.del({ key: fullKey });
        results.push({ key, success: true });
      } catch (error) {
        results.push({ key, success: false, error: (error as Error).message });
      }
    }

    logger.info(`ReplDB: Batch delete ${args.keys.length} keys`);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    let output = `🗑️  Batch delete complete:\n\n`;
    output += `✅ Successfully deleted: ${successful.length}/${args.keys.length} keys\n`;

    if (failed.length > 0) {
      output += `❌ Failed to delete: ${failed.length} keys\n\n`;
      failed.forEach(r => {
        output += `- \`${r.key}\`: ${r.error}\n`;
      });
    }

    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  } catch (error) {
    logger.error('Failed to batch delete ReplDB keys', error as Error);
    return {
      content: [{
        type: 'text',
        text: `❌ Batch delete failed: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Handler for clearing keys with prefix
 */
export async function handleReplDbClearPrefix(args: {
  prefix: string;
  namespace?: string;
  confirm: boolean;
}) {
  try {
    if (!args.confirm) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ **Confirmation Required**\n\n` +
                `This will delete all keys with prefix \`${args.prefix}\`${args.namespace ? ` in namespace \`${args.namespace}\`` : ''}.\n\n` +
                `Please set \`confirm: true\` to proceed.`,
          isError: true
        }],
        isError: true
      };
    }

    const fullPrefix = createNamespacedKey(args.prefix, args.namespace || '');

    // First, list all keys with the prefix
    const listResult = await replDb.list({ prefix: fullPrefix });

    if ('error' in listResult && listResult.error) {
      throw new Error(listResult.error);
    }

    const keysData = listResult as { keys: string[] };
    const keysToDelete = keysData.keys;

    if (keysToDelete.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `ℹ️  No keys found with prefix \`${args.prefix}\`${args.namespace ? ` in namespace \`${args.namespace}\`` : ''}`
        }]
      };
    }

    // Delete all keys
    for (const key of keysToDelete) {
      await replDb.del({ key });
    }

    logger.info(`ReplDB: Cleared ${keysToDelete.length} keys with prefix ${fullPrefix}`);

    return {
      content: [{
        type: 'text',
        text: `🗑️  Successfully deleted ${keysToDelete.length} keys with prefix \`${args.prefix}\`${args.namespace ? ` in namespace \`${args.namespace}\`` : ''}\n\n` +
              `**Cleared keys:**\n` +
              keysToDelete.slice(0, 10).map(k => `  \`${k}\``).join('\n') +
              (keysToDelete.length > 10 ? `\n  ... and ${keysToDelete.length - 10} more` : '')
      }]
    };
  } catch (error) {
    logger.error('Failed to clear ReplDB prefix', error as Error);
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to clear prefix: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Handler for getting database statistics
 */
export async function handleReplDbStats(args: {
  namespace?: string;
  includeSizes?: boolean;
}) {
  try {
    const namespace = args.namespace || '';
    const prefix = namespace ? `${namespace}:` : '';

    // List all keys in namespace
    const result = await replDb.list({ prefix });

    if (isReplDbError(result)) {
      throw new Error(extractReplDbError(result) || 'Unknown error');
    }

    const keysData = extractReplDbValue(result) as { keys: string[] };
    const keys = keysData?.keys || [];

    let totalSize = 0;
    let keyTypeStats: Record<string, number> = {};

    if (args.includeSizes && keys.length > 0) {
      // Get sizes for a sample of keys (to avoid too many operations)
      const sampleSize = Math.min(keys.length, 50);
      const sampleKeys = keys.slice(0, sampleSize);

      for (const key of sampleKeys) {
        const valueResult = await replDb.get({ key });
        if (!isReplDbError(valueResult)) {
          const value = extractReplDbValue(valueResult) || '';
          const size = value.length;
          totalSize += size;

          // Try to parse as JSON to determine type
          try {
            const parsed = JSON.parse(value);
            const type = Array.isArray(parsed) ? 'array' : typeof parsed;
            keyTypeStats[type] = (keyTypeStats[type] || 0) + 1;
          } catch {
            keyTypeStats['string'] = (keyTypeStats['string'] || 0) + 1;
          }
        }
      }

      // Estimate total size if we only sampled
      if (keys.length > sampleSize) {
        totalSize = Math.round((totalSize / sampleSize) * keys.length);
      }
    }

    // Group keys by prefixes for analysis
    const prefixes = keys.reduce((acc: Record<string, number>, key: string) => {
      const parts = key.split(':');
      const prefix = parts.length > 1 ? parts[0] : '[no prefix]';
      acc[prefix] = (acc[prefix] || 0) + 1;
      return acc;
    }, {});

    logger.info(`ReplDB: Generated stats for ${keys.length} keys`);

    let output = `📊 ReplDB Statistics${namespace ? ` for namespace \`${namespace}\`` : ''}\n\n`;
    output += `🔑 Total keys: ${keys.length}\n`;

    if (args.includeSizes && keys.length > 0) {
      output += `📏 Estimated total size: ${Math.round(totalSize / 1024)} KB\n`;
      output += `📦 Average key size: ${Math.round(totalSize / keys.length)} characters\n`;
    }

    output += `\n**Top Prefixes:**\n`;
    const sortedPrefixes = Object.entries(prefixes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    sortedPrefixes.forEach(([prefix, count]) => {
      output += `  \`${prefix}\`: ${count} keys (${Math.round(count / keys.length * 100)}%)\n`;
    });

    if (args.includeSizes && Object.keys(keyTypeStats).length > 0) {
      output += `\n**Value Types (sample):**\n`;
      Object.entries(keyTypeStats).forEach(([type, count]) => {
        output += `  ${type}: ${count} keys\n`;
      });
    }

    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  } catch (error) {
    logger.error('Failed to get ReplDB stats', error as Error);
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to get stats: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Handler for exporting database data
 */
export async function handleReplDbExport(args: {
  prefix?: string;
  namespace?: string;
  format?: 'json' | 'csv' | 'env';
  includeMetadata?: boolean;
}) {
  try {
    const namespace = args.namespace || '';
    const prefix = args.prefix || '';
    const fullPrefix = createNamespacedKey(prefix, namespace);
    const format = args.format || 'json';

    // List all keys to export
    const listResult = await replDb.list({ prefix: fullPrefix });

    if (isReplDbError(listResult)) {
      throw new Error(extractReplDbError(listResult) || 'Unknown error');
    }

    const keysData = extractReplDbValue(listResult) as { keys: string[] };
    const keys = keysData?.keys || [];

    // Get all values
    const data: Record<string, any> = {};

    for (const fullKey of keys) {
      const valueResult = await replDb.get({ key: fullKey });

      if (!isReplDbError(valueResult)) {
        // Remove namespace prefix for export
        const displayKey = namespace ? fullKey.replace(`${namespace}:`, '') : fullKey;
        data[displayKey] = safeJsonParse(extractReplDbValue(valueResult) || '');
      }
    }

    // Format output
    let output = '';
    let filename = '';

    switch (format) {
      case 'json':
        const exportData = args.includeMetadata ? {
          metadata: {
            exportedAt: new Date().toISOString(),
            namespace: namespace || 'default',
            keyCount: keys.length,
            prefix: prefix || 'all'
          },
          data
        } : data;

        output = JSON.stringify(exportData, null, 2);
        filename = `repldb-export-${Date.now()}.json`;
        break;

      case 'csv':
        output = 'key,value\n';
        Object.entries(data).forEach(([key, value]) => {
          const csvValue = typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : JSON.stringify(value);
          output += `${key},${csvValue}\n`;
        });
        filename = `repldb-export-${Date.now()}.csv`;
        break;

      case 'env':
        Object.entries(data).forEach(([key, value]) => {
          const envKey = key.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
          const envValue = typeof value === 'string' ? value : JSON.stringify(value);
          output += `${envKey}=${envValue}\n`;
        });
        filename = `repldb-export-${Date.now()}.env`;
        break;
    }

    logger.info(`ReplDB: Exported ${keys.length} keys in ${format} format`);

    return {
      content: [{
        type: 'text',
        text: `📤 Export complete!\n\n` +
              `📁 Format: \`${format.toUpperCase()}\`\n` +
              `📊 Keys exported: ${keys.length}\n` +
              `📝 Filename: \`${filename}\`\n\n` +
              `**Exported Data:**\n\n` +
              `\`\`\`${format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'env'}\n` +
              output.substring(0, 2000) +
              (output.length > 2000 ? '\n... (truncated for display)' : '') +
              `\n\`\`\`\n\n` +
              `💡 Tip: Save this content to a file named \`${filename}\``
      }]
    };
  } catch (error) {
    logger.error('Failed to export ReplDB data', error as Error);
    return {
      content: [{
        type: 'text',
        text: `❌ Export failed: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Handler for importing database data
 */
export async function handleReplDbImport(args: {
  data: any;
  format?: 'json' | 'keyvalue' | 'env';
  namespace?: string;
  overwrite?: boolean;
  batchSize?: number;
}) {
  try {
    const namespace = args.namespace || '';
    const format = args.format || 'json';
    const batchSize = args.batchSize || 50;
    let importData: Record<string, any> = {};

    // Parse input data based on format
    switch (format) {
      case 'json':
        if (typeof args.data === 'object' && args.data.data) {
          // Handle export format with metadata
          importData = args.data.data;
        } else if (typeof args.data === 'object') {
          importData = args.data;
        } else {
          throw new Error('Invalid JSON data format');
        }
        break;

      case 'keyvalue':
        if (Array.isArray(args.data)) {
          importData = args.data.reduce((acc, item) => {
            if (item.key && item.value !== undefined) {
              acc[item.key] = item.value;
            }
            return acc;
          }, {});
        } else {
          throw new Error('Invalid key-value format. Expected array of {key, value} objects.');
        }
        break;

      case 'env':
        if (typeof args.data === 'string') {
          const lines = args.data.split('\n');
          importData = lines.reduce((acc: Record<string, any>, line) => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
              const key = match[1].toLowerCase().replace(/_/g, ':');
              let value: string | number | boolean = match[2];

              // Try to parse as JSON or number
              if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
              } else if (!isNaN(Number(value))) {
                value = Number(value);
              } else if (value === 'true' || value === 'false') {
                value = value === 'true';
              } else {
                try {
                  value = JSON.parse(value);
                } catch {
                  // Keep as string
                }
              }

              acc[key] = value;
            }
            return acc;
          }, {});
        } else {
          throw new Error('Invalid ENV format. Expected string with KEY=value lines.');
        }
        break;
    }

    const entries = Object.entries(importData);
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);

      for (const [key, value] of batch) {
        try {
          const fullKey = createNamespacedKey(key, namespace);

          // Check if key exists and overwrite is false
          if (!args.overwrite) {
            const existingValue = await replDb.get({ key: fullKey });
            if (!isReplDbError(existingValue)) {
              skipped++;
              continue;
            }
          }

          await replDb.set({
            key: fullKey,
            value: safeJsonStringify(value)
          });
          imported++;
        } catch (error) {
          failed++;
          logger.error(`Failed to import key ${key}`, error as Error);
        }
      }
    }

    logger.info(`ReplDB: Imported ${imported} keys, skipped ${skipped}, failed ${failed}`);

    return {
      content: [{
        type: 'text',
        text: `📥 Import complete!\n\n` +
              `✅ Successfully imported: ${imported} keys\n` +
              `⏭️  Skipped (already exists): ${skipped} keys\n` +
              `❌ Failed: ${failed} keys\n` +
              `📊 Total processed: ${entries.length} entries\n` +
              `📁 Namespace: \`${namespace || 'default'}\`\n` +
              `🔄 Overwrite: ${args.overwrite ? 'Enabled' : 'Disabled'}\n` +
              `📦 Batch size: ${batchSize}`
      }]
    };
  } catch (error) {
    logger.error('Failed to import ReplDB data', error as Error);
    return {
      content: [{
        type: 'text',
        text: `❌ Import failed: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Export all handlers
 */
export const replDbToolHandlers = {
  replit_db_set: handleReplDbSet,
  replit_db_get: handleReplDbGet,
  replit_db_list: handleReplDbList,
  replit_db_delete: handleReplDbDelete,
  replit_db_set_batch: handleReplDbSetBatch,
  replit_db_get_batch: handleReplDbGetBatch,
  replit_db_delete_batch: handleReplDbDeleteBatch,
  replit_db_clear_prefix: handleReplDbClearPrefix,
  replit_db_stats: handleReplDbStats,
  replit_db_export: handleReplDbExport,
  replit_db_import: handleReplDbImport
};