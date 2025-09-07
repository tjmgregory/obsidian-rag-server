import type { Note } from '../../../domain/entities/note';

export interface ListNotesUseCase {
  execute(folder?: string): Promise<Note[]>;
}
