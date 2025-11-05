/**
 * MCP Tools for Replit Commands API
 * Provides tools to register and manage custom commands for the CLUI command bar
 */

import { z } from 'zod';
import { commands } from '@replit/extensions';
import { logger } from '../utils/logger.js';
import { replDb } from '../database/client.js';

// Command storage
export const registeredCommands = new Map<string, any>();

/**
 * Tool to register a new command in Replit's CLUI
 */
export const replitAddCommand = {
  name: 'replit_add_command',
  description: 'Register a new command in Replit\'s command bar (CLUI)',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Unique identifier for the command'
      },
      name: {
        type: 'string',
        description: 'Display name of the command'
      },
      description: {
        type: 'string',
        description: 'Description of what the command does'
      },
      handler: {
        type: 'string',
        description: 'JavaScript code to execute when command is run'
      },
      category: {
        type: 'string',
        description: 'Category to group the command under',
        enum: ['file', 'edit', 'view', 'navigate', 'tools', 'help', 'custom'],
        default: 'custom'
      },
      icon: {
        type: 'string',
        description: 'Icon name or emoji for the command',
        default: '⚡'
      },
      keybinding: {
        type: 'string',
        description: 'Keyboard shortcut for the command (e.g., "ctrl+shift+a")'
      },
      context: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Context where command is available (e.g., ["editor", "terminal"])',
        default: ['editor']
      },
      when: {
        type: 'string',
        description: 'Condition when command should be available'
      }
    },
    required: ['id', 'name', 'description', 'handler']
  }
};

/**
 * Tool to list all registered commands
 */
export const replitListCommands = {
  name: 'replit_list_commands',
  description: 'List all registered custom commands',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Filter by category'
      },
      includeBuiltIn: {
        type: 'boolean',
        description: 'Include built-in Replit commands',
        default: false
      }
    }
  }
};

/**
 * Tool to execute a registered command
 */
export const replitExecuteCommand = {
  name: 'replit_execute_command',
  description: 'Execute a registered command by ID',
  inputSchema: {
    type: 'object',
    properties: {
      commandId: {
        type: 'string',
        description: 'ID of the command to execute'
      },
      args: {
        type: 'object',
        description: 'Arguments to pass to the command handler',
        default: {}
      }
    },
    required: ['commandId']
  }
};

/**
 * Tool to remove a registered command
 */
export const replitRemoveCommand = {
  name: 'replit_remove_command',
  description: 'Remove a registered command',
  inputSchema: {
    type: 'object',
    properties: {
      commandId: {
        type: 'string',
        description: 'ID of the command to remove'
      }
    },
    required: ['commandId']
  }
};

/**
 * Tool to update an existing command
 */
export const replitUpdateCommand = {
  name: 'replit_update_command',
  description: 'Update an existing command',
  inputSchema: {
    type: 'object',
    properties: {
      commandId: {
        type: 'string',
        description: 'ID of the command to update'
      },
      updates: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          handler: { type: 'string' },
          category: {
            type: 'string',
            enum: ['file', 'edit', 'view', 'navigate', 'tools', 'help', 'custom']
          },
          icon: { type: 'string' },
          keybinding: { type: 'string' },
          context: {
            type: 'array',
            items: { type: 'string' }
          },
          when: { type: 'string' }
        }
      }
    },
    required: ['commandId', 'updates']
  }
};

/**
 * Tool to create command shortcuts and aliases
 */
export const replitCreateCommandAlias = {
  name: 'replit_create_command_alias',
  description: 'Create an alias for an existing command',
  inputSchema: {
    type: 'object',
    properties: {
      alias: {
        type: 'string',
        description: 'Alias name'
      },
      targetCommandId: {
        type: 'string',
        description: 'ID of the target command'
      },
      description: {
        type: 'string',
        description: 'Description for the alias'
      }
    },
    required: ['alias', 'targetCommandId']
  }
};

/**
 * Tool to search commands by name or description
 */
export const replitSearchCommands = {
  name: 'replit_search_commands',
  description: 'Search commands by name or description',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query'
      },
      category: {
        type: 'string',
        description: 'Filter by category'
      }
    },
    required: ['query']
  }
};

/**
 * Export all command tools
 */
export const commandTools = [
  replitAddCommand,
  replitListCommands,
  replitExecuteCommand,
  replitRemoveCommand,
  replitUpdateCommand,
  replitCreateCommandAlias,
  replitSearchCommands
];

/**
 * Save command to ReplDB for persistence
 */
export async function saveCommandToDB(command: any): Promise<void> {
  try {
    const commands = await replDb.get('custom_commands') || {};
    commands[command.id] = command;
    await replDb.set('custom_commands', commands);
    logger.debug(`Command saved to database: ${command.id}`);
  } catch (error) {
    logger.error('Failed to save command to database', error as Error);
  }
}

/**
 * Load commands from ReplDB
 */
async function loadCommandsFromDB(): Promise<void> {
  try {
    const commands = await replDb.get('custom_commands') || {};
    for (const [id, command] of Object.entries(commands)) {
      registeredCommands.set(id, command);
      // Re-register with Replit commands API
      await registerCommandWithAPI(command as any);
    }
    logger.info(`Loaded ${Object.keys(commands).length} commands from database`);
  } catch (error) {
    logger.error('Failed to load commands from database', error as Error);
  }
}

/**
 * Register command with Replit's commands API
 */
export async function registerCommandWithAPI(command: any): Promise<void> {
  try {
    // Create command function from handler string
    const commandFn = new Function('args', command.handler);

    // Register with Replit commands API
    // Note: The actual API structure might differ
    // This is a simplified version that will need adjustment
    // based on the actual Replit commands API
    // Since the commands API interface is not fully defined,
    // we'll use dynamic approach to register commands
    const commandArgs: any = {
      id: command.id,
      description: command.description,
      handler: commandFn
    };

    // Try to add the command with minimal properties first
    commands.add(commandArgs);

    logger.debug(`Command registered with API: ${command.id}`);
  } catch (error) {
    logger.error(`Failed to register command with API: ${command.id}`, error as Error);
    throw error;
  }
}

/**
 * Load persisted commands on startup
 */
loadCommandsFromDB().catch(error => {
  logger.error('Failed to load commands on startup', error);
});