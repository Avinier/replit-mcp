/**
 * Utility helpers for ReplDB operations
 * Provides common patterns and helper functions for database operations
 */

import { replDb } from '@replit/extensions';
import { logger } from './logger.js';
import { isReplDbError, extractReplDbValue, safeJsonStringify as safeJsonStringifyUtil } from './repldb-types.js';

/**
 * Local safe JSON parse function to avoid conflicts
 */
function localSafeJsonParse(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * ReplDB cache manager - provides caching layer for frequently accessed data
 */
export class ReplDbCache {
  private cache = new Map<string, { value: any; expires: number }>();
  private defaultTTL = 300000; // 5 minutes

  /**
   * Get value from cache or database
   */
  async get(key: string, ttl: number = this.defaultTTL): Promise<any> {
    const cached = this.cache.get(key);

    if (cached && Date.now() < cached.expires) {
      return cached.value;
    }

    const result = await replDb.get({ key });
    if (isReplDbError(result)) {
      return null;
    }

    const value = extractReplDbValue(result) || '';
    const parsed = localSafeJsonParse(value);

    this.cache.set(key, {
      value: parsed,
      expires: Date.now() + ttl
    });

    return parsed;
  }

  /**
   * Set value in both cache and database
   */
  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    const stringValue = safeJsonStringifyUtil(value);

    await replDb.set({ key, value: stringValue });
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  }

/**
 * ReplDB queue manager - provides queue operations for background tasks
 */
export class ReplDbQueue {
  private queueName: string;

  constructor(queueName: string = 'default') {
    this.queueName = queueName;
  }

  /**
   * Add item to queue
   */
  async enqueue(item: any, priority: number = 0): Promise<void> {
    const queueKey = `queue:${this.queueName}`;
    const queue = await this.getQueue();

    queue.push({
      id: this.generateId(),
      item,
      priority,
      timestamp: Date.now(),
      status: 'pending'
    });

    // Sort by priority (higher first)
    queue.sort((a, b) => b.priority - a.priority);

    await replDb.set({ key: queueKey, value: JSON.stringify(queue) });
  }

  /**
   * Get next item from queue
   */
  async dequeue(): Promise<any | null> {
    const queueKey = `queue:${this.queueName}`;
    const queue = await this.getQueue();

    if (queue.length === 0) {
      return null;
    }

    const nextItem = queue.shift();
    await replDb.set({ key: queueKey, value: JSON.stringify(queue) });

    return nextItem;
  }

  /**
   * Get queue status
   */
  async getStatus(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
  }> {
    const queue = await this.getQueue();

    const status = {
      total: queue.length,
      pending: queue.filter(item => item.status === 'pending').length,
      processing: queue.filter(item => item.status === 'processing').length,
      completed: queue.filter(item => item.status === 'completed').length
    };

    return status;
  }

  /**
   * Clear queue
   */
  async clear(): Promise<void> {
    const queueKey = `queue:${this.queueName}`;
    await replDb.del({ key: queueKey });
  }

  private async getQueue(): Promise<any[]> {
    const queueKey = `queue:${this.queueName}`;
    const result = await replDb.get({ key: queueKey });

    if (isReplDbError(result)) {
      return [];
    }

    try {
      return JSON.parse(extractReplDbValue(result) || '');
    } catch {
      return [];
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

/**
 * ReplDB counter - provides atomic counter operations
 */
export class ReplDbCounter {
  private counterKey: string;

  constructor(counterName: string) {
    this.counterKey = `counter:${counterName}`;
  }

  /**
   * Increment counter
   */
  async increment(amount: number = 1): Promise<number> {
    const result = await replDb.get({ key: this.counterKey });

    let current = 0;
    if (!isReplDbError(result)) {
      current = parseInt(extractReplDbValue(result) || '0') || 0;
    }

    const newValue = current + amount;
    await replDb.set({ key: this.counterKey, value: newValue.toString() });

    return newValue;
  }

  /**
   * Decrement counter
   */
  async decrement(amount: number = 1): Promise<number> {
    return this.increment(-amount);
  }

  /**
   * Get current value
   */
  async value(): Promise<number> {
    const result = await replDb.get({ key: this.counterKey });

    if (isReplDbError(result)) {
      return 0;
    }

    return parseInt(extractReplDbValue(result) || '0') || 0;
  }

  /**
   * Reset counter
   */
  async reset(): Promise<void> {
    await replDb.set({ key: this.counterKey, value: '0' });
  }
}

/**
 * ReplDB session manager - manages user sessions
 */
export class ReplDbSessionManager {
  private sessionPrefix = 'session:';

  /**
   * Create new session
   */
  async createSession(userId: string, data: any, ttl: number = 86400000): Promise<string> {
    const sessionId = this.generateSessionId();
    const sessionKey = this.sessionPrefix + sessionId;

    const session = {
      sessionId,
      userId,
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      lastAccessed: Date.now()
    };

    await replDb.set({ key: sessionKey, value: JSON.stringify(session) });

    // Add to user's active sessions
    const userSessionsKey = `user_sessions:${userId}`;
    const userSessions = await this.getUserSessions(userId);
    userSessions.push(sessionId);

    await replDb.set({
      key: userSessionsKey,
      value: JSON.stringify(userSessions)
    });

    return sessionId;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<any | null> {
    const sessionKey = this.sessionPrefix + sessionId;
    const result = await replDb.get({ key: sessionKey });

    if (isReplDbError(result)) {
      return null;
    }

    try {
      const session = JSON.parse(extractReplDbValue(result) || '');

      // Check if expired
      if (Date.now() > session.expiresAt) {
        await this.deleteSession(sessionId);
        return null;
      }

      // Update last accessed
      session.lastAccessed = Date.now();
      await replDb.set({ key: sessionKey, value: JSON.stringify(session) });

      return session;
    } catch {
      return null;
    }
  }

  /**
   * Update session data
   */
  async updateSession(sessionId: string, data: any): Promise<boolean> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return false;
    }

    session.data = { ...session.data, ...data };
    session.lastAccessed = Date.now();

    const sessionKey = this.sessionPrefix + sessionId;
    await replDb.set({ key: sessionKey, value: JSON.stringify(session) });

    return true;
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);

    if (session) {
      // Remove from user's active sessions
      const userSessionsKey = `user_sessions:${session.userId}`;
      const userSessions = await this.getUserSessions(session.userId);
      const updatedSessions = userSessions.filter(id => id !== sessionId);

      await replDb.set({
        key: userSessionsKey,
        value: JSON.stringify(updatedSessions)
      });
    }

    // Delete session
    const sessionKey = this.sessionPrefix + sessionId;
    await replDb.del({ key: sessionKey });
  }

  /**
   * Get all sessions for user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    const userSessionsKey = `user_sessions:${userId}`;
    const result = await replDb.get({ key: userSessionsKey });

    if (isReplDbError(result)) {
      return [];
    }

    try {
      return JSON.parse(extractReplDbValue(result) || '');
    } catch {
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpired(): Promise<number> {
    const result = await replDb.list({ prefix: this.sessionPrefix });

    if (isReplDbError(result)) {
      return 0;
    }

    const keysData = extractReplDbValue(result) as { keys: string[] };
    let cleaned = 0;

    for (const key of keysData.keys) {
      const sessionResult = await replDb.get({ key });

      if (!isReplDbError(sessionResult)) {
        try {
          const session = JSON.parse(extractReplDbValue(sessionResult) || '');

          if (Date.now() > session.expiresAt) {
            await this.deleteSession(session.sessionId);
            cleaned++;
          }
        } catch {
          // Invalid session format, delete it
          await replDb.del({ key });
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

/**
 * ReplDB rate limiter - provides rate limiting functionality
 */
export class ReplDbRateLimiter {
  private windowMs: number;
  private maxRequests: number;

  constructor(options: { windowMs: number; maxRequests: number }) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
  }

  /**
   * Check if request is allowed
   */
  async isAllowed(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const result = await replDb.get({ key });

    if (isReplDbError(result)) {
      // First request
      const window = [{ timestamp: now }];
      await replDb.set({ key, value: JSON.stringify(window) });

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      };
    }

    try {
      const window: { timestamp: number }[] = JSON.parse(extractReplDbValue(result) || '');

      // Remove old requests outside window
      const validRequests = window.filter(req => req.timestamp > windowStart);

      if (validRequests.length >= this.maxRequests) {
        // Rate limit exceeded
        const oldestRequest = validRequests[0];
        return {
          allowed: false,
          remaining: 0,
          resetTime: oldestRequest.timestamp + this.windowMs
        };
      }

      // Add current request
      validRequests.push({ timestamp: now });
      await replDb.set({ key, value: JSON.stringify(validRequests) });

      return {
        allowed: true,
        remaining: this.maxRequests - validRequests.length,
        resetTime: now + this.windowMs
      };
    } catch {
      // Invalid data, reset
      const window = [{ timestamp: now }];
      await replDb.set({ key, value: JSON.stringify(window) });

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      };
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = `rate_limit:${identifier}`;
    await replDb.del({ key });
  }
}

/**
 * Create a default cache instance
 */
export const defaultCache = new ReplDbCache();

/**
 * Create a default queue instance
 */
export const defaultQueue = new ReplDbQueue('default');

/**
 * Create a default rate limiter (100 requests per hour)
 */
export const defaultRateLimiter = new ReplDbRateLimiter({
  windowMs: 3600000, // 1 hour
  maxRequests: 100
});

/**
 * Utility function to create a namespaced key
 */
export function createNamespacedKey(namespace: string, key: string): string {
  return `${namespace}:${key}`;
}

/**
 * Utility function to parse JSON safely
 */
export function safeJsonParse(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Utility function to stringify JSON safely
 */
export function safeJsonStringify(value: any): string {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

/**
 * Utility function to check if key exists
 */
export async function keyExists(key: string): Promise<boolean> {
  const result = await replDb.get({ key });
  return !isReplDbError(result);
}

/**
 * Utility function to get multiple keys
 */
export async function getMultipleKeys(keys: string[]): Promise<Record<string, any>> {
  const result: Record<string, any> = {};

  for (const key of keys) {
    const valueResult = await replDb.get({ key });
    if (!isReplDbError(valueResult)) {
      result[key] = localSafeJsonParse(extractReplDbValue(valueResult) || '');
    }
  }

  return result;
}

/**
 * Utility function to set multiple keys
 */
export async function setMultipleKeys(data: Record<string, any>): Promise<void> {
  for (const [key, value] of Object.entries(data)) {
    await replDb.set({ key, value: safeJsonStringify(value) });
  }
}

/**
 * Utility function to delete multiple keys
 */
export async function deleteMultipleKeys(keys: string[]): Promise<void> {
  for (const key of keys) {
    await replDb.del({ key });
  }
}