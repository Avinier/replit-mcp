/**
 * Handlers for Replit Commands API Tools
 * Implements the actual logic for command management operations
 */

import { commands } from '@replit/extensions';
import { logger } from '../utils/logger.js';
import { replDb } from '../database/client.js';
import { registeredCommands, saveCommandToDB, registerCommandWithAPI } from './commands.js';
import { commandTools } from './commands.js';

/**
 * Handler for adding a new command
 */
export async function handleAddCommand(args: {
  id: string;
  name: string;
  description: string;
  handler: string;
  category?: string;
  icon?: string;
  keybinding?: string;
  context?: string[];
  when?: string;
}) {
  try {
    // Validate command ID uniqueness
    if (registeredCommands.has(args.id)) {
      return {
        content: [{
          type: 'text',
          text: `Error: Command with ID '${args.id}' already exists`,
          isError: true
        }],
        isError: true
      };
    }

    // Create command object
    const command = {
      id: args.id,
      name: args.name,
      description: args.description,
      handler: args.handler,
      category: args.category || 'custom',
      icon: args.icon || '⚡',
      keybinding: args.keybinding,
      context: args.context || ['editor'],
      when: args.when,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Register in memory
    registeredCommands.set(args.id, command);

    // Register with Replit API
    await registerCommandWithAPI(command);

    // Save to database
    await saveCommandToDB(command);

    logger.info(`Command registered successfully: ${args.id}`);

    return {
      content: [{
        type: 'text',
        text: `✅ Command '${args.name}' (${args.id}) registered successfully!\n\n` +
              `📝 Description: ${command.description}\n` +
              `📂 Category: ${command.category}\n` +
              `🎯 Icon: ${command.icon}\n` +
              `⌨️  Keybinding: ${command.keybinding || 'None'}\n` +
              `📍 Context: ${command.context.join(', ')}\n\n` +
              `You can now run this command from Replit's command bar (Ctrl/Cmd + Shift + P)`
      }]
    };
  } catch (error) {
    logger.error('Failed to add command', error as Error);
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to register command: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Handler for listing all registered commands
 */
export async function handleListCommands(args: {
  category?: string;
  includeBuiltIn?: boolean;
}) {
  try {
    let commands = Array.from(registeredCommands.values());

    // Filter by category if specified
    if (args.category) {
      commands = commands.filter(cmd => cmd.category === args.category);
    }

    // Sort by category then name
    commands.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });

    let output = `📋 Registered Custom Commands (${commands.length} total)\n\n`;

    // Group by category
    const grouped = commands.reduce((acc: Record<string, any[]>, cmd: any) => {
      if (!acc[cmd.category]) {
        acc[cmd.category] = [];
      }
      acc[cmd.category].push(cmd);
      return acc;
    }, {});

    for (const [category, categoryCommands] of Object.entries(grouped)) {
      output += `## ${category.toUpperCase()}\n\n`;

      for (const cmd of categoryCommands) {
        output += `**${cmd.icon || '⚡'} ${cmd.name}** (\`${cmd.id}\`)\n`;
        output += `📝 ${cmd.description}\n`;
        if (cmd.keybinding) {
          output += `⌨️  Shortcut: \`${cmd.keybinding}\`\n`;
        }
        output += `📍 Available in: ${cmd.context.join(', ')}\n`;
        output += `\n`;
      }
    }

    // Add command statistics
    const stats = {
      total: commands.length,
      byCategory: grouped,
      recent: commands.slice(-3).map(c => ({ id: c.id, name: c.name }))
    };

    // Store stats in DB for analytics
    await replDb.set('command_stats', stats);

    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  } catch (error) {
    logger.error('Failed to list commands', error as Error);
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to list commands: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Handler for executing a command
 */
export async function handleExecuteCommand(args: {
  commandId: string;
  args?: any;
}) {
  try {
    const command = registeredCommands.get(args.commandId);

    if (!command) {
      return {
        content: [{
          type: 'text',
          text: `❌ Command not found: ${args.commandId}`,
          isError: true
        }],
        isError: true
      };
    }

    // Create command function and execute
    const commandFn = new Function('args', command.handler);

    logger.info(`Executing command: ${args.commandId}`);

    const result = await commandFn(args.args || {});

    // Log execution
    const executions = await replDb.get('command_executions') || [];
    executions.push({
      commandId: args.commandId,
      timestamp: new Date().toISOString(),
      success: true
    });
    await replDb.set('command_executions', executions);

    return {
      content: [{
        type: 'text',
        text: `✅ Command '${command.name}' executed successfully!\n\n` +
              `📊 Result: ${JSON.stringify(result, null, 2)}`
      }]
    };
  } catch (error) {
    logger.error(`Command execution failed: ${args.commandId}`, error as Error);

    // Log failed execution
    const executions = await replDb.get('command_executions') || [];
    executions.push({
      commandId: args.commandId,
      timestamp: new Date().toISOString(),
      success: false,
      error: (error as Error).message
    });
    await replDb.set('command_executions', executions);

    return {
      content: [{
        type: 'text',
        text: `❌ Command execution failed: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Handler for removing a command
 */
export async function handleRemoveCommand(args: {
  commandId: string;
}) {
  try {
    const command = registeredCommands.get(args.commandId);

    if (!command) {
      return {
        content: [{
          type: 'text',
          text: `❌ Command not found: ${args.commandId}`,
          isError: true
        }],
        isError: true
      };
    }

    // Remove from memory
    registeredCommands.delete(args.commandId);

    // Remove from database
    const commands = await replDb.get('custom_commands') || {};
    delete commands[args.commandId];
    await replDb.set('custom_commands', commands);

    // TODO: Unregister from Replit commands API (if API supports it)
    // Currently, the Replit commands API might not have an unregister method
    // We'll need to check the actual API implementation

    logger.info(`Command removed: ${args.commandId}`);

    return {
      content: [{
        type: 'text',
        text: `✅ Command '${command.name}' (${args.commandId}) removed successfully`
      }]
    };
  } catch (error) {
    logger.error('Failed to remove command', error as Error);
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to remove command: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Handler for updating a command
 */
export async function handleUpdateCommand(args: {
  commandId: string;
  updates: {
    name?: string;
    description?: string;
    handler?: string;
    category?: string;
    icon?: string;
    keybinding?: string;
    context?: string[];
    when?: string;
  };
}) {
  try {
    const existingCommand = registeredCommands.get(args.commandId);

    if (!existingCommand) {
      return {
        content: [{
          type: 'text',
          text: `❌ Command not found: ${args.commandId}`,
          isError: true
        }],
        isError: true
      };
    }

    // Update command properties
    const updatedCommand = {
      ...existingCommand,
      ...args.updates,
      updatedAt: new Date().toISOString()
    };

    // Update in memory
    registeredCommands.set(args.commandId, updatedCommand);

    // Re-register with Replit API
    await registerCommandWithAPI(updatedCommand);

    // Update in database
    const commands = await replDb.get('custom_commands') || {};
    commands[args.commandId] = updatedCommand;
    await replDb.set('custom_commands', commands);

    logger.info(`Command updated: ${args.commandId}`);

    const changes = Object.keys(args.updates).join(', ');

    return {
      content: [{
        type: 'text',
        text: `✅ Command '${updatedCommand.name}' updated successfully!\n\n` +
              `📝 Changed properties: ${changes}\n` +
              `⏰ Updated at: ${updatedCommand.updatedAt}`
      }]
    };
  } catch (error) {
    logger.error('Failed to update command', error as Error);
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to update command: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Handler for creating command aliases
 */
export async function handleCreateCommandAlias(args: {
  alias: string;
  targetCommandId: string;
  description?: string;
}) {
  try {
    const targetCommand = registeredCommands.get(args.targetCommandId);

    if (!targetCommand) {
      return {
        content: [{
          type: 'text',
          text: `❌ Target command not found: ${args.targetCommandId}`,
          isError: true
        }],
        isError: true
      };
    }

    // Create alias command
    const aliasCommand = {
      id: args.alias,
      name: args.alias,
      description: args.description || `Alias for: ${targetCommand.name}`,
      handler: `// Execute target command\nreturn await commands.execute('${args.targetCommandId}', args);`,
      category: targetCommand.category,
      icon: targetCommand.icon,
      isAlias: true,
      targetCommandId: args.targetCommandId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Register alias
    registeredCommands.set(args.alias, aliasCommand);
    await registerCommandWithAPI(aliasCommand);
    await saveCommandToDB(aliasCommand);

    logger.info(`Alias created: ${args.alias} -> ${args.targetCommandId}`);

    return {
      content: [{
        type: 'text',
        text: `✅ Alias '${args.alias}' created successfully!\n\n` +
              `🎯 Points to: ${targetCommand.name} (${args.targetCommandId})\n` +
              `📝 Description: ${aliasCommand.description}\n\n` +
              `You can now use '${args.alias}' as a shortcut for the target command.`
      }]
    };
  } catch (error) {
    logger.error('Failed to create command alias', error as Error);
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to create alias: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Handler for searching commands
 */
export async function handleSearchCommands(args: {
  query: string;
  category?: string;
}) {
  try {
    const query = args.query.toLowerCase();
    const results = Array.from(registeredCommands.values()).filter(cmd => {
      const matchesQuery =
        cmd.name.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query) ||
        cmd.id.toLowerCase().includes(query);

      const matchesCategory = !args.category || cmd.category === args.category;

      return matchesQuery && matchesCategory;
    });

    // Sort by relevance (exact name matches first)
    results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === query;
      const bExact = b.name.toLowerCase() === query;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.name.localeCompare(b.name);
    });

    let output = `🔍 Search Results for "${args.query}" (${results.length} found)\n\n`;

    if (results.length === 0) {
      output += "No commands found matching your search.";
    } else {
      for (const cmd of results) {
        output += `**${cmd.icon || '⚡'} ${cmd.name}** (\`${cmd.id}\`)\n`;
        output += `📝 ${cmd.description}\n`;
        output += `📂 Category: ${cmd.category}\n`;

        // Highlight matching parts
        if (cmd.name.toLowerCase().includes(query)) {
          output += `✅ Name match\n`;
        }
        if (cmd.description.toLowerCase().includes(query)) {
          output += `✅ Description match\n`;
        }
        if (cmd.id.toLowerCase().includes(query)) {
          output += `✅ ID match\n`;
        }

        output += `\n`;
      }
    }

    // Store search analytics
    const searches = await replDb.get('command_searches') || [];
    searches.push({
      query: args.query,
      category: args.category,
      resultCount: results.length,
      timestamp: new Date().toISOString()
    });
    await replDb.set('command_searches', searches);

    return {
      content: [{
        type: 'text',
        text: output
      }]
    };
  } catch (error) {
    logger.error('Failed to search commands', error as Error);
    return {
      content: [{
        type: 'text',
        text: `❌ Search failed: ${(error as Error).message}`,
        isError: true
      }],
      isError: true
    };
  }
}

/**
 * Export all handlers
 */
export const commandToolHandlers = {
  replit_add_command: handleAddCommand,
  replit_list_commands: handleListCommands,
  replit_execute_command: handleExecuteCommand,
  replit_remove_command: handleRemoveCommand,
  replit_update_command: handleUpdateCommand,
  replit_create_command_alias: handleCreateCommandAlias,
  replit_search_commands: handleSearchCommands
};