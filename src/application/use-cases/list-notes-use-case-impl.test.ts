import { beforeEach, describe, expect, test } from 'bun:test';
import { Note } from '../../domain/entities/note';
import { Ok } from '../../domain/types/result';
import type { NoteRepository } from '../ports/secondary/note-repository';
import { ListNotesUseCaseImpl } from './list-notes-use-case-impl';

describe('ListNotesUseCaseImpl', () => {
  let useCase: ListNotesUseCaseImpl;
  let mockRepository: NoteRepository;
  let allNotes: Note[];

  beforeEach(() => {
    allNotes = [
      new Note(
        'root.md',
        'Root Note',
        'Content',
        {},
        [],
        [],
        new Date('2024-01-01'),
        new Date('2024-01-03'),
      ),
      new Note(
        'projects/project1.md',
        'Project 1',
        'Content',
        {},
        [],
        [],
        new Date('2024-01-01'),
        new Date('2024-01-02'),
      ),
      new Note(
        'projects/project2.md',
        'Project 2',
        'Content',
        {},
        [],
        [],
        new Date('2024-01-01'),
        new Date('2024-01-04'),
      ),
      new Note(
        'daily/2024-01-01.md',
        'Daily Note',
        'Content',
        {},
        [],
        [],
        new Date('2024-01-01'),
        new Date('2024-01-01'),
      ),
    ];

    mockRepository = {
      findAll: async () => Ok(allNotes),
      findByPath: async () => Ok(null),
      findByFolder: async (folder: string) => {
        return Ok(allNotes.filter((n) => n.path.startsWith(folder)));
      },
      getAllTags: async () => Ok(new Map()),
      getRecentlyModified: async () => Ok([]),
    };

    useCase = new ListNotesUseCaseImpl(mockRepository);
  });

  test('should list all notes when no folder specified', async () => {
    const notes = await useCase.execute();

    expect(notes).toHaveLength(4);
    expect(notes[0]?.path).toBe('projects/project2.md'); // Most recent first
    expect(notes[1]?.path).toBe('root.md');
    expect(notes[2]?.path).toBe('projects/project1.md');
    expect(notes[3]?.path).toBe('daily/2024-01-01.md');
  });

  test('should filter by folder when specified', async () => {
    const notes = await useCase.execute('projects/');

    expect(notes).toHaveLength(2);
    expect(notes[0]?.path).toBe('projects/project2.md');
    expect(notes[1]?.path).toBe('projects/project1.md');
  });

  test('should return empty array for non-existent folder', async () => {
    const notes = await useCase.execute('non-existent/');

    expect(notes).toEqual([]);
  });

  test('should sort by modified date descending', async () => {
    const notes = await useCase.execute();

    for (let i = 0; i < notes.length - 1; i++) {
      expect(notes[i]?.modifiedAt.getTime()).toBeGreaterThanOrEqual(
        notes[i + 1]?.modifiedAt.getTime() ?? 0,
      );
    }
  });
});
