import { beforeEach, describe, expect, test } from 'bun:test';
import { Note } from '../../domain/entities/note';
import type { NoteRepository } from '../ports/secondary/note-repository';
import { SearchVaultUseCaseImpl } from './search-vault-use-case-impl';

describe('SearchVaultUseCaseImpl', () => {
  let useCase: SearchVaultUseCaseImpl;
  let mockRepository: NoteRepository;
  let testNotes: Note[];

  beforeEach(() => {
    testNotes = [
      new Note(
        'javascript.md',
        'JavaScript Guide',
        'Learn JavaScript and TypeScript programming. JavaScript is great!',
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

    mockRepository = {
      findAll: async () => testNotes,
      findByPath: async (path: string) => testNotes.find((n) => n.path === path) || null,
      findByFolder: async () => [],
      getAllTags: async () => new Map(),
      getRecentlyModified: async () => [],
    };

    useCase = new SearchVaultUseCaseImpl(mockRepository);
  });

  test('should search notes and return ranked results', async () => {
    const results = await useCase.execute('JavaScript');

    expect(results).toHaveLength(2);
    expect(results[0]?.note.path).toBe('javascript.md');
    expect(results[1]?.note.path).toBe('react.md');
  });

  test('should return empty array when no matches found', async () => {
    const results = await useCase.execute('Ruby');
    expect(results).toEqual([]);
  });

  test('should handle empty query gracefully', async () => {
    const results = await useCase.execute('');
    expect(results).toEqual([]);
  });

  test('should respect limit parameter', async () => {
    const results = await useCase.execute('programming', 1);
    expect(results).toHaveLength(1);
  });

  test('should handle repository errors gracefully', async () => {
    mockRepository.findAll = async () => {
      throw new Error('Database connection failed');
    };

    expect(useCase.execute('test')).rejects.toThrow('Database connection failed');
  });
});
