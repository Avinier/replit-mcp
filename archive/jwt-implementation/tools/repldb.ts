/**
 * MCP Tools for Replit Database API (ReplDB)
 * Provides tools to interact with Replit's key-value storage system
 */

import { z } from 'zod';
import { replDb } from '@replit/extensions';
import { logger } from '../utils/logger.js';

/**
 * Tool to set a key-value pair in ReplDB
 */
export const replDbSet = {
  name: 'replit_db_set',
  description: 'Set a key-value pair in ReplDB',
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'Key to set'
      },
      value: {
        description: 'Value to store (can be any JSON-serializable value)'
      },
      namespace: {
        type: 'string',
        description: 'Optional namespace prefix for the key',
        default: ''
      }
    },
    required: ['key', 'value']
  }
};

/**
 * Tool to get a value from ReplDB
 */
export const replDbGet = {
  name: 'replit_db_get',
  description: 'Get a value from ReplDB by key',
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'Key to retrieve'
      },
      namespace: {
        type: 'string',
        description: 'Optional namespace prefix for the key',
        default: ''
      },
      parseJson: {
        type: 'boolean',
        description: 'Parse the value as JSON if true',
        default: true
      }
    },
    required: ['key']
  }
};

/**
 * Tool to list keys in ReplDB
 */
export const replDbList = {
  name: 'replit_db_list',
  description: 'List keys in ReplDB with optional prefix filtering',
  inputSchema: {
    type: 'object',
    properties: {
      prefix: {
        type: 'string',
        description: 'Filter keys that start with this prefix'
      },
      namespace: {
        type: 'string',
        description: 'Namespace to filter keys',
        default: ''
      },
      limit: {
        type: 'number',
        description: 'Maximum number of keys to return',
        default: 100
      }
    }
  }
};

/**
 * Tool to delete a key from ReplDB
 */
export const replDbDelete = {
  name: 'replit_db_delete',
  description: 'Delete a key from ReplDB',
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'Key to delete'
      },
      namespace: {
        type: 'string',
        description: 'Optional namespace prefix for the key',
        default: ''
      }
    },
    required: ['key']
  }
};

/**
 * Tool to set multiple key-value pairs in a batch
 */
export const replDbSetBatch = {
  name: 'replit_db_set_batch',
  description: 'Set multiple key-value pairs in a batch operation',
  inputSchema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            value: {},
            namespace: { type: 'string', default: '' }
          },
          required: ['key', 'value']
        },
        description: 'Array of key-value pairs to set'
      },
      namespace: {
        type: 'string',
        description: 'Default namespace for all items',
        default: ''
      }
    },
    required: ['items']
  }
};

/**
 * Tool to get multiple values in a batch
 */
export const replDbGetBatch = {
  name: 'replit_db_get_batch',
  description: 'Get multiple values from ReplDB in a batch operation',
  inputSchema: {
    type: 'object',
    properties: {
      keys: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of keys to retrieve'
      },
      namespace: {
        type: 'string',
        description: 'Namespace prefix for all keys',
        default: ''
      },
      parseJson: {
        type: 'boolean',
        description: 'Parse values as JSON if true',
        default: true
      }
    },
    required: ['keys']
  }
};

/**
 * Tool to delete multiple keys in a batch
 */
export const replDbDeleteBatch = {
  name: 'replit_db_delete_batch',
  description: 'Delete multiple keys from ReplDB in a batch operation',
  inputSchema: {
    type: 'object',
    properties: {
      keys: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of keys to delete'
      },
      namespace: {
        type: 'string',
        description: 'Namespace prefix for all keys',
        default: ''
      }
    },
    required: ['keys']
  }
};

/**
 * Tool to clear all keys with a specific prefix
 */
export const replDbClearPrefix = {
  name: 'replit_db_clear_prefix',
  description: 'Delete all keys with a specific prefix',
  inputSchema: {
    type: 'object',
    properties: {
      prefix: {
        type: 'string',
        description: 'Prefix to match keys for deletion'
      },
      namespace: {
        type: 'string',
        description: 'Namespace to operate in',
        default: ''
      },
      confirm: {
        type: 'boolean',
        description: 'Confirmation required for destructive operation',
        default: false
      }
    },
    required: ['prefix', 'confirm']
  }
};

/**
 * Tool to get database statistics
 */
export const replDbStats = {
  name: 'replit_db_stats',
  description: 'Get statistics about ReplDB usage',
  inputSchema: {
    type: 'object',
    properties: {
      namespace: {
        type: 'string',
        description: 'Namespace to get stats for',
        default: ''
      },
      includeSizes: {
        type: 'boolean',
        description: 'Include size estimates (slower operation)',
        default: false
      }
    }
  }
};

/**
 * Tool to backup or export database data
 */
export const replDbExport = {
  name: 'replit_db_export',
  description: 'Export database data as JSON',
  inputSchema: {
    type: 'object',
    properties: {
      prefix: {
        type: 'string',
        description: 'Export only keys with this prefix'
      },
      namespace: {
        type: 'string',
        description: 'Namespace to export',
        default: ''
      },
      format: {
        type: 'string',
        enum: ['json', 'csv', 'env'],
        description: 'Export format',
        default: 'json'
      },
      includeMetadata: {
        type: 'boolean',
        description: 'Include export metadata',
        default: true
      }
    }
  }
};

/**
 * Tool to import database data
 */
export const replDbImport = {
  name: 'replit_db_import',
  description: 'Import data into ReplDB from JSON or other formats',
  inputSchema: {
    type: 'object',
    properties: {
      data: {
        description: 'Data to import (JSON object or array)'
      },
      format: {
        type: 'string',
        enum: ['json', 'keyvalue', 'env'],
        description: 'Format of the input data',
        default: 'json'
      },
      namespace: {
        type: 'string',
        description: 'Namespace to import into',
        default: ''
      },
      overwrite: {
        type: 'boolean',
        description: 'Overwrite existing keys',
        default: false
      },
      batchSize: {
        type: 'number',
        description: 'Batch size for import operations',
        default: 50
      }
    },
    required: ['data']
  }
};

/**
 * Export all ReplDB tools
 */
export const replDbTools = [
  replDbSet,
  replDbGet,
  replDbList,
  replDbDelete,
  replDbSetBatch,
  replDbGetBatch,
  replDbDeleteBatch,
  replDbClearPrefix,
  replDbStats,
  replDbExport,
  replDbImport
];