// Logger utility for consistent error logging
// Configurable via environment variables and hot-swappable at runtime

import { LOG_LEVEL, ENABLE_LOGGING } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

// Log level hierarchy (higher number = more important)
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private enabled: boolean;
  private minLevel: number;

  constructor() {
    this.enabled = ENABLE_LOGGING;
    this.minLevel = LOG_LEVELS[LOG_LEVEL as LogLevel] ?? LOG_LEVELS.error;
  }

  // Hot-swap logging configuration (useful for runtime debugging)
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setLogLevel(level: LogLevel) {
    this.minLevel = LOG_LEVELS[level];
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;
    return LOG_LEVELS[level] >= this.minLevel;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    switch (level) {
      case 'debug':
        console.debug(`[DEBUG] ${message}`, context || '');
        break;
      case 'info':
        console.info(`[INFO] ${message}`, context || '');
        break;
      case 'warn':
        console.warn(`[WARN] ${message}`, context || '');
        break;
      case 'error':
        console.error(`[ERROR] ${message}`, context || '');
        // In production, you might want to send to error tracking service
        // Example: Sentry.captureMessage(message, { level: 'error', extra: context });
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    if (error instanceof Error) {
      this.log('error', message, {
        ...context,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      });
      return;
    }
    if (
      error !== null &&
      error !== undefined &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as { message: unknown }).message === 'string'
    ) {
      const e = error as { name?: unknown; message: string; stack?: unknown };
      this.log('error', message, {
        ...context,
        error: {
          name: typeof e.name === 'string' ? e.name : 'Error',
          message: e.message,
          stack: typeof e.stack === 'string' ? e.stack : undefined,
        },
      });
      return;
    }
    this.log('error', message, { ...context, error });
  }
}

export const logger = new Logger();
