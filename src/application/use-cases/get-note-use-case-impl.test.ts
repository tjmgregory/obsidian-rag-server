import { beforeEach, describe, expect, test } from 'bun:test';
import { Note } from '../../domain/entities/note';
import type { NoteRepository } from '../ports/secondary/note-repository';
import { GetNoteUseCaseImpl } from './get-note-use-case-impl';

describe('GetNoteUseCaseImpl', () => {
  let useCase: GetNoteUseCaseImpl;
  let mockRepository: NoteRepository;
  let testNote: Note;

  beforeEach(() => {
    testNote = new Note(
      'test.md',
      'Test Note',
      'Test content',
      { tags: ['test'] },
      ['test'],
      ['[[other-note]]'],
      new Date(),
      new Date(),
    );

    mockRepository = {
      findAll: async () => [],
      findByPath: async (path: string) => {
        if (path === 'test.md') {
          return testNote;
        }
        return null;
      },
      findByFolder: async () => [],
      getAllTags: async () => new Map(),
      getRecentlyModified: async () => [],
    };

    useCase = new GetNoteUseCaseImpl(mockRepository);
  });

  test('should retrieve note by path', async () => {
    const note = await useCase.execute('test.md');

    expect(note).toBe(testNote);
    expect(note?.title).toBe('Test Note');
  });

  test('should return null for non-existent path', async () => {
    const note = await useCase.execute('non-existent.md');

    expect(note).toBeNull();
  });

  test('should handle special characters in path', async () => {
    mockRepository.findByPath = async (path: string) => {
      if (path === 'folder/file with spaces.md') {
        return testNote;
      }
      return null;
    };

    const note = await useCase.execute('folder/file with spaces.md');
    expect(note).toBe(testNote);
  });
});
