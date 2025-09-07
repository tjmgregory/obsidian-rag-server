import { beforeEach, describe, expect, test } from 'bun:test';
import { Note } from '../../domain/entities/note';
import { VaultAccessError } from '../../domain/errors/note-errors';
import { Err, Ok } from '../../domain/types/result';
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
      findAll: async () => Ok(testNotes),
      findByPath: async (path: string) => Ok(testNotes.find((n) => n.path === path) || null),
      findByFolder: async () => Ok([]),
      getAllTags: async () => Ok(new Map()),
      getRecentlyModified: async () => Ok([]),
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
      return Err(new VaultAccessError('/vault', new Error('Database connection failed')));
    };

    expect(useCase.execute('test')).rejects.toThrow('Cannot access vault at: /vault');
  });
});
