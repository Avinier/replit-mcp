/**
 * Centralized logging utility for the Replit MCP server
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: any;
  error?: Error;
}

class Logger {
  private debugMode: boolean;
  private logLevel: LogLevel;

  constructor(debugMode = false, logLevel: LogLevel = 'info') {
    this.debugMode = debugMode || process.env.NODE_ENV === 'development';
    this.logLevel = logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    return levels[level] >= levels[this.logLevel];
  }

  private formatLog(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const errorStr = entry.error ? ` ${entry.error.stack || entry.error.message}` : '';

    return `[${timestamp}] ${level} ${entry.message}${contextStr}${errorStr}`;
  }

  private log(level: LogLevel, message: string, context?: any, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      error
    };

    const formatted = this.formatLog(entry);

    // Log to stderr for MCP compatibility
    if (level === 'error') {
      console.error(formatted);
    } else {
      console.error(formatted); // Use stderr for all logs to not interfere with MCP communication
    }
  }

  debug(message: string, context?: any): void {
    if (this.debugMode) {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: any): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: any): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: any): void {
    this.log('error', message, context, error);
  }

  // Create a child logger with a prefix
  child(prefix: string): Logger {
    const childLogger = new Logger(this.debugMode, this.logLevel);
    const originalLog = childLogger.log.bind(childLogger);

    childLogger.log = (level, message, context, err) => {
      originalLog(level, `[${prefix}] ${message}`, context, err);
    };

    return childLogger;
  }
}

// Create a default logger instance
export const logger = new Logger(
  process.env.DEBUG === 'replit-mcp:*' || process.env.NODE_ENV === 'development',
  (process.env.LOG_LEVEL as LogLevel) || 'info'
);

export default Logger;