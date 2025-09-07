import type { Note } from '../../../domain/entities/note';

export interface GetNoteUseCase {
  execute(path: string): Promise<Note | null>;
}
