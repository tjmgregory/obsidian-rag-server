import { describe, expect, test } from 'bun:test';
import { Note } from './note';
import { SearchResult } from './search-result';

describe('SearchResult entity', () => {
  test('should calculate relevance score based on match count', () => {
    const note = new Note(
      'test.md',
      'JavaScript Guide',
      'Learn JavaScript and TypeScript. JavaScript is powerful.',
      {},
      [],
      [],
      new Date(),
      new Date(),
    );

    const result = new SearchResult(note, 'javascript');

    expect(result.note).toBe(note);
    expect(result.score).toBeGreaterThan(0);
    expect(result.matchedFields).toContain('title');
    expect(result.matchedFields).toContain('content');
  });

  test('should identify which fields matched the query', () => {
    const note = new Note(
      'test.md',
      'Python Guide',
      'Learn about JavaScript frameworks',
      {},
      [],
      [],
      new Date(),
      new Date(),
    );

    const result = new SearchResult(note, 'javascript');

    expect(result.matchedFields).toContain('content');
    expect(result.matchedFields).not.toContain('title');
  });

  test('should handle tag matches', () => {
    const note = new Note(
      'test.md',
      'My Note',
      'Some content',
      {},
      ['javascript', 'testing'],
      [],
      new Date(),
      new Date(),
    );

    const result = new SearchResult(note, 'javascript');

    expect(result.matchedFields).toContain('tags');
    expect(result.score).toBeGreaterThan(0);
  });
});
