/**
 * Domain-specific error types for note operations.
 * These provide semantic meaning and context for errors.
 */

export abstract class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NoteNotFoundError extends DomainError {
  constructor(path: string) {
    super(`Note not found: ${path}`, 'NOTE_NOT_FOUND', { path });
  }
}

export class InvalidNotePathError extends DomainError {
  constructor(path: string, reason: string) {
    super(`Invalid note path: ${path}. ${reason}`, 'INVALID_NOTE_PATH', { path, reason });
  }
}

export class NoteParsingError extends DomainError {
  constructor(path: string, error: unknown) {
    super(`Failed to parse note: ${path}`, 'NOTE_PARSE_ERROR', {
      path,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

export class VaultNotFoundError extends DomainError {
  constructor(vaultPath: string) {
    super(`Vault not found at: ${vaultPath}`, 'VAULT_NOT_FOUND', { vaultPath });
  }
}

export class VaultAccessError extends DomainError {
  constructor(vaultPath: string, error: unknown) {
    super(`Cannot access vault at: ${vaultPath}`, 'VAULT_ACCESS_ERROR', {
      vaultPath,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

export class FileSystemError extends DomainError {
  constructor(operation: string, path: string, error: unknown) {
    super(`File system error during ${operation}: ${path}`, 'FILE_SYSTEM_ERROR', {
      operation,
      path,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

export class InvalidFrontmatterError extends DomainError {
  constructor(path: string, field: string, reason: string) {
    super(`Invalid frontmatter in ${path}: ${field} - ${reason}`, 'INVALID_FRONTMATTER', {
      path,
      field,
      reason,
    });
  }
}
