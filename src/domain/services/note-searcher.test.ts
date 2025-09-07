import { describe, expect, test } from 'bun:test';
import { Note } from '../entities/note';
import { NoteSearcher } from './note-searcher';

describe('NoteSearcher service', () => {
  const createTestNotes = () => [
    new Note(
      'javascript.md',
      'JavaScript Guide',
      'Learn JavaScript and TypeScript programming',
      {},
      ['javascript', 'programming'],
      [],
      new Date(),
      new Date(),
    ),
    new Note(
      'python.md',
      'Python Tutorial',
      'Python programming for beginners',
      {},
      ['python', 'programming'],
      [],
      new Date(),
      new Date(),
    ),
    new Note(
      'react.md',
      'React Components',
      'Building components with JavaScript and React',
      {},
      ['javascript', 'react', 'frontend'],
      [],
      new Date(),
      new Date(),
    ),
  ];

  test('should find notes matching a query', () => {
    const searcher = new NoteSearcher();
    const notes = createTestNotes();

    const results = searcher.search('javascript', notes);

    expect(results).toHaveLength(2);
    expect(results[0]?.note.path).toBe('javascript.md');
    expect(results[1]?.note.path).toBe('react.md');
  });

  test('should rank results by relevance score', () => {
    const searcher = new NoteSearcher();
    const notes = createTestNotes();

    const results = searcher.search('javascript', notes);

    expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0); // First result should have higher score
  });

  test('should return empty array when no matches found', () => {
    const searcher = new NoteSearcher();
    const notes = createTestNotes();

    const results = searcher.search('rust', notes);

    expect(results).toHaveLength(0);
  });

  test('should handle case-insensitive search', () => {
    const searcher = new NoteSearcher();
    const notes = createTestNotes();

    const results = searcher.search('JAVASCRIPT', notes);

    expect(results).toHaveLength(2);
  });

  test('should respect result limit', () => {
    const searcher = new NoteSearcher();
    const notes = createTestNotes();

    const results = searcher.search('programming', notes, { limit: 1 });

    expect(results).toHaveLength(1);
  });
});
