import type { Note } from '../../domain/entities/note';
import { unwrap } from '../../domain/types/result';
import type { GetNoteUseCase } from '../ports/primary/get-note-use-case';
import type { NoteRepository } from '../ports/secondary/note-repository';

export class GetNoteUseCaseImpl implements GetNoteUseCase {
  constructor(private repository: NoteRepository) {}

  async execute(path: string): Promise<Note | null> {
    const result = await this.repository.findByPath(path);
    return unwrap(result);
  }
}
