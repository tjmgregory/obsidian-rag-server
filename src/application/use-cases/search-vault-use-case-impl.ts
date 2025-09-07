import type { SearchResult } from '../../domain/entities/search-result';
import { NoteSearcher } from '../../domain/services/note-searcher';
import { unwrap } from '../../domain/types/result';
import type { SearchVaultUseCase } from '../ports/primary/search-vault-use-case';
import type { NoteRepository } from '../ports/secondary/note-repository';

export class SearchVaultUseCaseImpl implements SearchVaultUseCase {
  private searcher = new NoteSearcher();

  constructor(private repository: NoteRepository) {}

  async execute(query: string, limit = 50): Promise<SearchResult[]> {
    const result = await this.repository.findAll();
    const notes = unwrap(result);
    return this.searcher.search(query, notes, { limit });
  }
}
