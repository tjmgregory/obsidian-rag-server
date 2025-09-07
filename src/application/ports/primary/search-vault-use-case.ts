import type { SearchResult } from '../../../domain/entities/search-result';

export interface SearchVaultUseCase {
  execute(query: string, limit?: number): Promise<SearchResult[]>;
}
