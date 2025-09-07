import { describe, expect, test } from 'bun:test';
import { Note } from './note';

describe('Note entity', () => {
  test('should detect if note has a specific tag', () => {
    const note = new Note(
      'test.md',
      'Test Note',
      'Content',
      {},
      ['javascript', 'testing'],
      [],
      new Date(),
      new Date(),
    );

    expect(note.hasTag('javascript')).toBe(true);
    expect(note.hasTag('JavaScript')).toBe(true); // Case insensitive
    expect(note.hasTag('python')).toBe(false);
  });

  test('should match query in title or content', () => {
    const note = new Note(
      'test.md',
      'JavaScript Guide',
      'Learn about TypeScript and JavaScript',
      {},
      [],
      [],
      new Date(),
      new Date(),
    );

    expect(note.matchesQuery('JavaScript')).toBe(true);
    expect(note.matchesQuery('typescript')).toBe(true); // Case insensitive
    expect(note.matchesQuery('python')).toBe(false);
  });
});
