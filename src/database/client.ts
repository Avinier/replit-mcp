/**
 * ReplDB Client Wrapper
 * Provides a simple interface to Replit's persistent storage
 */

// Import Replit Extensions when available
// For now, using a mock implementation that can be replaced
let replDbClient: any = null;

/**
 * Initialize ReplDB client
 */
export async function initializeReplDB() {
  try {
    // Import Replit extensions lazily
    const { replDb } = await import('@replit/extensions');
    replDbClient = replDb;
    console.log('ReplDB client initialized');
  } catch (error) {
    console.warn('ReplDB not available, using fallback storage:', error);
    // Fallback to in-memory storage for development
    replDbClient = new Map();
  }
}

/**
 * ReplDB interface
 */
export const replDb = {
  async get(key: string): Promise<any> {
    if (!replDbClient) {
      await initializeReplDB();
    }

    if (replDbClient instanceof Map) {
      return replDbClient.get(key);
    }

    try {
      return await replDbClient.get(key);
    } catch (error) {
      console.error(`Failed to get key ${key}:`, error);
      return null;
    }
  },

  async set(key: string, value: any): Promise<void> {
    if (!replDbClient) {
      await initializeReplDB();
    }

    if (replDbClient instanceof Map) {
      replDbClient.set(key, value);
      return;
    }

    try {
      await replDbClient.set(key, value);
    } catch (error) {
      console.error(`Failed to set key ${key}:`, error);
      throw error;
    }
  },

  async delete(key: string): Promise<void> {
    if (!replDbClient) {
      await initializeReplDB();
    }

    if (replDbClient instanceof Map) {
      replDbClient.delete(key);
      return;
    }

    try {
      await replDbClient.delete(key);
    } catch (error) {
      console.error(`Failed to delete key ${key}:`, error);
      throw error;
    }
  },

  async list(prefix?: string): Promise<string[]> {
    if (!replDbClient) {
      await initializeReplDB();
    }

    if (replDbClient instanceof Map) {
      const keys = Array.from(replDbClient.keys());
      if (prefix) {
        return keys.filter(key => key.startsWith(prefix));
      }
      return keys;
    }

    try {
      // ReplDB might not have a list method, so we need to implement it
      // This is a placeholder implementation
      console.warn('ReplDB list method not implemented');
      return [];
    } catch (error) {
      console.error(`Failed to list keys:`, error);
      return [];
    }
  },

  async clear(): Promise<void> {
    if (!replDbClient) {
      await initializeReplDB();
    }

    if (replDbClient instanceof Map) {
      replDbClient.clear();
      return;
    }

    try {
      // ReplDB might not have a clear method
      console.warn('ReplDB clear method not implemented');
    } catch (error) {
      console.error(`Failed to clear storage:`, error);
      throw error;
    }
  }
};

// Initialize on import
initializeReplDB().catch(console.error);