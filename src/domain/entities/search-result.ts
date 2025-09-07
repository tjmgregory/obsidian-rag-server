import type { Note } from './note';

export class SearchResult {
  public readonly score: number;
  public readonly matchedFields: string[];

  constructor(
    public readonly note: Note,
    query: string,
  ) {
    this.matchedFields = [];
    let matchCount = 0;

    const normalizedQuery = query.toLowerCase();

    // Check title
    if (note.title.toLowerCase().includes(normalizedQuery)) {
      this.matchedFields.push('title');
      matchCount +=
        (note.title.toLowerCase().match(new RegExp(normalizedQuery, 'g')) || []).length * 2; // Title matches worth more
    }

    // Check content
    if (note.content.toLowerCase().includes(normalizedQuery)) {
      this.matchedFields.push('content');
      matchCount += (note.content.toLowerCase().match(new RegExp(normalizedQuery, 'g')) || [])
        .length;
    }

    // Check tags
    if (note.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))) {
      this.matchedFields.push('tags');
      matchCount += 3; // Tag matches are valuable
    }

    this.score = matchCount;
  }
}
