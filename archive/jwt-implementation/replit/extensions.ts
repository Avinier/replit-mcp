/**
 * Replit Extensions Manager
 * Handles initialization and provides access to all Replit Extension APIs
 */

import { logger } from '../utils/logger.js';
import { ReplitAPIError } from '../utils/errors.js';

// Type for the Replit extensions module
interface ReplitExtensions {
  initialized: boolean;
  init: (options?: any) => Promise<void>;
  experimental: {
    auth: any;
    data: any;
    fs: any;
    exec: any;
    messages: any;
    replDb: any;
    themes: any;
    commands: any;
    debug: any;
    me: any;
    session: any;
  };
  // Standard APIs
  commands?: any;
  data?: any;
  fs?: any;
  exec?: any;
  messages?: any;
  replDb?: any;
  themes?: any;
  debug?: any;
  me?: any;
  session?: any;
}

class ExtensionsManager {
  private extensions: ReplitExtensions | null = null;
  private initializationPromise: Promise<void> | null = null;
  private config: any = null;

  /**
   * Initialize Replit extensions
   */
  async initialize(config?: any): Promise<void> {
    // Prevent multiple initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize(config);
    return this.initializationPromise;
  }

  private async _initialize(config?: any): Promise<void> {
    try {
      logger.info('Initializing Replit Extensions...');

      // Store config
      this.config = {
        clientId: process.env.REPLIT_CLIENT_ID,
        clientSecret: process.env.REPLIT_CLIENT_SECRET,
        ...config
      };

      // Dynamically import Replit extensions
      const replitExtensionsModule = await import('@replit/extensions');
      const replitExtensions = replitExtensionsModule as any;

      // Initialize if not already initialized
      if (!replitExtensions.initialized) {
        await replitExtensions.init(this.config);
      }

      this.extensions = replitExtensions;

      logger.info('Replit Extensions initialized successfully', {
        modules: Object.keys(this.extensions?.experimental || {})
      });
    } catch (error) {
      logger.error('Failed to initialize Replit Extensions', error as Error);
      throw new ReplitAPIError(
        `Failed to initialize Replit Extensions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error }
      );
    }
  }

  /**
   * Get the extensions module
   */
  getExtensions(): ReplitExtensions {
    if (!this.extensions) {
      throw new ReplitAPIError(
        'Replit Extensions not initialized. Call initialize() first.',
        { code: 'NOT_INITIALIZED' }
      );
    }

    return this.extensions;
  }

  /**
   * Get a specific API module
   */
  getAPI<T = any>(apiName: string): T {
    const extensions = this.getExtensions();

    // Check experimental APIs first
    if (apiName in extensions.experimental) {
      return extensions.experimental[apiName as keyof typeof extensions.experimental];
    }

    // Check standard APIs
    if (apiName in extensions) {
      return (extensions as any)[apiName];
    }

    throw new ReplitAPIError(
      `API '${apiName}' not found in Replit Extensions`,
      { availableAPIs: Object.keys(extensions.experimental) }
    );
  }

  /**
   * Check if extensions are initialized
   */
  isInitialized(): boolean {
    return this.extensions !== null;
  }

  /**
   * Get initialization status
   */
  getStatus(): {
    initialized: boolean;
    initializing: boolean;
    config: any;
  } {
    return {
      initialized: this.isInitialized(),
      initializing: this.initializationPromise !== null,
      config: this.config
    };
  }

  /**
   * Reset the manager (useful for testing or re-initialization)
   */
  reset(): void {
    logger.info('Resetting Extensions Manager');
    this.extensions = null;
    this.initializationPromise = null;
    this.config = null;
  }
}

// Export a singleton instance
export const extensionsManager = new ExtensionsManager();

// Export convenience functions
export const initializeExtensions = (config?: any) => extensionsManager.initialize(config);
export const getExtensions = () => extensionsManager.getExtensions();
export const getAPI = <T = any>(apiName: string) => extensionsManager.getAPI<T>(apiName);
export const isExtensionsInitialized = () => extensionsManager.isInitialized();
export const getExtensionsStatus = () => extensionsManager.getStatus();

// Re-export for backward compatibility
export { ExtensionsManager };