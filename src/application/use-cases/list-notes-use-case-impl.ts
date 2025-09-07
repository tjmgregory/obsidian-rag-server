import type { Note } from '../../domain/entities/note';
import { unwrap } from '../../domain/types/result';
import type { ListNotesUseCase } from '../ports/primary/list-notes-use-case';
import type { NoteRepository } from '../ports/secondary/note-repository';

export class ListNotesUseCaseImpl implements ListNotesUseCase {
  constructor(private repository: NoteRepository) {}

  async execute(folder?: string): Promise<Note[]> {
    const result = folder
      ? await this.repository.findByFolder(folder)
      : await this.repository.findAll();

    // For now, unwrap the result - in future could handle errors more gracefully
    const notes = unwrap(result);

    // Sort by modified date descending (newest first)
    return notes.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  }
}
