/**
 * Structured logging utility
 * All dynamic values should be passed as context, not in message strings
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    // In test environment, only log errors
    if (process.env.NODE_ENV === 'test') {
      return level === 'error';
    }
    return true;
  }

  private formatEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
    };
  }

  private output(entry: LogEntry): void {
    if (entry.level === 'error') {
      console.error(JSON.stringify(entry));
    } else if (entry.level === 'warn') {
      console.warn(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.output(this.formatEntry('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.output(this.formatEntry('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      this.output(this.formatEntry('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      this.output(this.formatEntry('error', message, context));
    }
  }
}

export const logger = new Logger();

// Custom error classes for structured error handling
export class VaultError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: LogContext,
  ) {
    super(message);
    this.name = 'VaultError';
  }
}

export class NoteNotFoundError extends VaultError {
  constructor(path: string, vaultPath: string) {
    super('Note not found', 'NOTE_NOT_FOUND', { path, vaultPath });
    this.name = 'NoteNotFoundError';
  }
}

export class InvalidPathError extends VaultError {
  constructor(path: string, reason: string) {
    super('Invalid path', 'INVALID_PATH', { path, reason });
    this.name = 'InvalidPathError';
  }
}

export class ParseError extends VaultError {
  constructor(path: string, error: unknown) {
    super('Failed to parse note', 'PARSE_ERROR', {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    this.name = 'ParseError';
  }
}
