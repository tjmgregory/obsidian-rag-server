import type { Note, SearchResult, VaultConfig } from '../types';
import type { FileSystemAdapter } from './file-system.interface';

export class VaultService {
  private readonly cache: Map<string, Note> = new Map();

  constructor(
    private readonly config: VaultConfig,
    private readonly fileSystem?: FileSystemAdapter,
  ) {}

  async initialize(): Promise<void> {
    // TODO: Load vault and set up file watching
    // Will use this.config, this.fileSystem, and this.cache
    void this.config; // Temporary - remove when implementing
    void this.fileSystem; // Temporary - remove when implementing
    void this.cache; // Temporary - remove when implementing
    throw new Error('Not implemented');
  }

  async searchNotes(_query: string, _limit?: number): Promise<SearchResult[]> {
    // TODO: Implement search functionality
    throw new Error('Not implemented');
  }

  async getNote(_path: string): Promise<Note | null> {
    // TODO: Implement note retrieval
    throw new Error('Not implemented');
  }

  async listNotes(_folder?: string): Promise<Note[]> {
    // TODO: Implement note listing
    throw new Error('Not implemented');
  }
}
