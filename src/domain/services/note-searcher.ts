import type { Note } from '../entities/note';
import { SearchResult } from '../entities/search-result';

interface SearchOptions {
  limit?: number;
}

export class NoteSearcher {
  search(query: string, notes: Note[], options: SearchOptions = {}): SearchResult[] {
    // Handle empty query
    if (!query || !query.trim()) {
      return [];
    }

    const results: SearchResult[] = [];

    for (const note of notes) {
      if (note.matchesQuery(query)) {
        results.push(new SearchResult(note, query));
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply limit if specified
    if (options.limit && options.limit > 0) {
      return results.slice(0, options.limit);
    }

    return results;
  }
}
