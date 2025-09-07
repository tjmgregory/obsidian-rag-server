import type { Note } from '../../../domain/entities/note';

export interface NoteRepository {
  findAll(): Promise<Note[]>;
  findByPath(path: string): Promise<Note | null>;
  findByFolder(folder: string): Promise<Note[]>;
  getAllTags(): Promise<Map<string, number>>;
  getRecentlyModified(limit: number): Promise<Note[]>;
}
