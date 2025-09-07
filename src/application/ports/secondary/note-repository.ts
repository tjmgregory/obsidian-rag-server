import type { Note } from '../../../domain/entities/note';
import type { DomainError } from '../../../domain/errors/note-errors';
import type { Result } from '../../../domain/types/result';

export interface NoteRepository {
  findAll(): Promise<Result<Note[], DomainError>>;
  findByPath(path: string): Promise<Result<Note | null, DomainError>>;
  findByFolder(folder: string): Promise<Result<Note[], DomainError>>;
  getAllTags(): Promise<Result<Map<string, number>, DomainError>>;
  getRecentlyModified(limit: number): Promise<Result<Note[], DomainError>>;
}
