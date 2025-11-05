/**
 * Command Templates and Examples for Replit Commands API
 * Provides ready-to-use command templates for common workflows
 */

/**
 * Command templates for different categories
 */
export const commandTemplates = {
  // File operations
  file: {
    createNewFile: {
      id: 'create_new_file',
      name: 'Create New File',
      description: 'Create a new file with a specified name and template',
      handler: 'return { message: "File creation command executed" };',
      category: 'file',
      icon: '📄',
      keybinding: 'ctrl+alt+n'
    },

    duplicateFile: {
      id: 'duplicate_file',
      name: 'Duplicate Current File',
      description: 'Create a duplicate of the current file',
      handler: 'return { message: "File duplication command executed" };',
      category: 'file',
      icon: '📋',
      keybinding: 'ctrl+shift+d'
    },

    deleteCurrentFile: {
      id: 'delete_current_file',
      name: 'Delete Current File',
      description: 'Delete the currently active file',
      handler: 'return { message: "Delete file command executed" };',
      category: 'file',
      icon: '🗑️'
    }
  },

  // Code operations
  edit: {
    formatCode: {
      id: 'format_code',
      name: 'Format Code',
      description: 'Format the current file using appropriate formatter',
      handler: 'return { message: "Format code command executed" };',
      category: 'edit',
      icon: '✨',
      keybinding: 'ctrl+shift+f'
    },

    toggleComments: {
      id: 'toggle_comments',
      name: 'Toggle Comments',
      description: 'Toggle line comments for selected text or current line',
      handler: 'return { message: "Toggle comments command executed" };',
      category: 'edit',
      icon: '💬',
      keybinding: 'ctrl+/'
    },

    findAndReplace: {
      id: 'find_replace',
      name: 'Find and Replace',
      description: 'Find and replace text in current file',
      handler: 'return { message: "Find and replace command executed" };',
      category: 'edit',
      icon: '🔄',
      keybinding: 'ctrl+h'
    }
  },

  // Navigation
  navigate: {
    goToLine: {
      id: 'go_to_line',
      name: 'Go to Line',
      description: 'Jump to a specific line number',
      handler: 'return { message: "Go to line command executed" };',
      category: 'navigate',
      icon: '📍',
      keybinding: 'ctrl+g'
    },

    openTerminal: {
      id: 'open_terminal',
      name: 'Open Terminal',
      description: 'Open a new terminal panel',
      handler: 'return { message: "Open terminal command executed" };',
      category: 'navigate',
      icon: '💻',
      keybinding: 'ctrl+`'
    },

    switchFile: {
      id: 'switch_file',
      name: 'Switch File',
      description: 'Quick switch to another file in the project',
      handler: 'return { message: "Switch file command executed" };',
      category: 'navigate',
      icon: '📂',
      keybinding: 'ctrl+p'
    }
  },

  // Development tools
  tools: {
    runProject: {
      id: 'run_project',
      name: 'Run Project',
      description: 'Run the current project',
      handler: 'return { message: "Run project command executed" };',
      category: 'tools',
      icon: '▶️',
      keybinding: 'f5'
    },

    installDependencies: {
      id: 'install_deps',
      name: 'Install Dependencies',
      description: 'Install project dependencies',
      handler: 'return { message: "Install dependencies command executed" };',
      category: 'tools',
      icon: '📦',
      keybinding: 'ctrl+shift+i'
    },

    gitCommit: {
      id: 'git_commit',
      name: 'Git Commit',
      description: 'Quick git commit with message',
      handler: 'return { message: "Git commit command executed" };',
      category: 'tools',
      icon: '🔀',
      keybinding: 'ctrl+shift+c'
    },

    openDevTools: {
      id: 'open_devtools',
      name: 'Open DevTools',
      description: 'Open browser developer tools',
      handler: 'return { message: "Open devtools command executed" };',
      category: 'tools',
      icon: '🔧',
      keybinding: 'f12'
    }
  },

  // Help and documentation
  help: {
    showShortcuts: {
      id: 'show_shortcuts',
      name: 'Show Keyboard Shortcuts',
      description: 'Display all available keyboard shortcuts',
      handler: 'return { shortcuts: { "File": "Ctrl+N", "Edit": "Ctrl+E" } };',
      category: 'help',
      icon: '⌨️',
      keybinding: 'ctrl+?'
    },

    showCommandPalette: {
      id: 'show_palette',
      name: 'Show Command Palette',
      description: 'Show all available commands',
      handler: 'return { message: "Command palette opened" };',
      category: 'help',
      icon: '🎨',
      keybinding: 'ctrl+shift+p'
    },

    showDocumentation: {
      id: 'show_docs',
      name: 'Show Documentation',
      description: 'Open Replit MCP Server documentation',
      handler: 'return { message: "Documentation opened" };',
      category: 'help',
      icon: '📚',
      keybinding: 'f1'
    }
  },

  // Custom commands
  custom: {
    createSnippets: {
      id: 'create_snippet',
      name: 'Create Code Snippet',
      description: 'Save selected code as a reusable snippet',
      handler: 'return { message: "Create snippet command executed" };',
      category: 'custom',
      icon: '📝',
      keybinding: 'ctrl+shift+s'
    },

    insertSnippet: {
      id: 'insert_snippet',
      name: 'Insert Code Snippet',
      description: 'Insert a saved code snippet',
      handler: 'return { message: "Insert snippet command executed" };',
      category: 'custom',
      icon: '📋',
      keybinding: 'ctrl+alt+v'
    },

    deployToProduction: {
      id: 'deploy_prod',
      name: 'Deploy to Production',
      description: 'Deploy current project to production',
      handler: 'return { message: "Deploy to production command executed" };',
      category: 'custom',
      icon: '🚀'
    }
  }
};

/**
 * Create all template commands
 */
export async function createTemplateCommands() {
  const { commandToolHandlers } = await import('../tools/command-handlers.js');
  const created = [];

  for (const [category, commands] of Object.entries(commandTemplates)) {
    for (const [key, command] of Object.entries(commands)) {
      try {
        await commandToolHandlers.replit_add_command(command);
        created.push({ id: command.id, name: command.name, category });
      } catch (error) {
        console.error(`Failed to create template command ${command.id}:`, error);
      }
    }
  }

  return created;
}

/**
 * Get command template by ID
 */
export function getCommandTemplate(id: string) {
  for (const [category, commands] of Object.entries(commandTemplates)) {
    for (const [key, command] of Object.entries(commands)) {
      if (command.id === id) {
        return { ...command, category };
      }
    }
  }
  return null;
}

/**
 * List all template commands
 */
export function listTemplateCommands() {
  const list = [];
  for (const [category, commands] of Object.entries(commandTemplates)) {
    for (const [key, command] of Object.entries(commands)) {
      list.push({ ...command, category, templateKey: key });
    }
  }
  return list;
}