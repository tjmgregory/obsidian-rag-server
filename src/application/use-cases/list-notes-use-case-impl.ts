import type { Note } from '../../domain/entities/note';
import type { ListNotesUseCase } from '../ports/primary/list-notes-use-case';
import type { NoteRepository } from '../ports/secondary/note-repository';

export class ListNotesUseCaseImpl implements ListNotesUseCase {
  constructor(private repository: NoteRepository) {}

  async execute(folder?: string): Promise<Note[]> {
    let notes: Note[];

    if (folder) {
      notes = await this.repository.findByFolder(folder);
    } else {
      notes = await this.repository.findAll();
    }

    // Sort by modified date descending (newest first)
    return notes.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  }
}
