import matter from 'gray-matter';
import type { FileSystemPort } from '../../../application/ports/secondary/file-system-port';
import type { NoteRepository } from '../../../application/ports/secondary/note-repository';
import { Note } from '../../../domain/entities/note';
import {
  type DomainError,
  FileSystemError,
  NoteParsingError,
  VaultAccessError,
} from '../../../domain/errors/note-errors';
import { normalizeFrontmatter } from '../../../domain/types/frontmatter';
import { Err, Ok, type Result } from '../../../domain/types/result';

export class FileNoteRepository implements NoteRepository {
  private notesCache: Note[] = [];

  constructor(
    private vaultPath: string,
    private fileSystem: FileSystemPort,
    private ignoredFolders: string[] = [],
  ) {}

  async findAll(): Promise<Result<Note[], DomainError>> {
    const result = await this.loadAllNotes(this.vaultPath);
    if (result.ok) {
      this.notesCache = result.value;
      return Ok(this.notesCache);
    }
    return result;
  }

  async findByPath(path: string): Promise<Result<Note | null, DomainError>> {
    if (this.notesCache.length === 0) {
      const result = await this.findAll();
      if (!result.ok) {
        return result;
      }
    }
    return Ok(this.notesCache.find((note) => note.path === path) || null);
  }

  async findByFolder(folder: string): Promise<Result<Note[], DomainError>> {
    if (this.notesCache.length === 0) {
      const result = await this.findAll();
      if (!result.ok) {
        return result;
      }
    }
    const normalizedFolder = folder.endsWith('/') ? folder : `${folder}/`;
    return Ok(this.notesCache.filter((note) => note.path.startsWith(normalizedFolder)));
  }

  async getAllTags(): Promise<Result<Map<string, number>, DomainError>> {
    if (this.notesCache.length === 0) {
      const result = await this.findAll();
      if (!result.ok) {
        return result;
      }
    }
    const tagCounts = new Map<string, number>();

    for (const note of this.notesCache) {
      for (const tag of note.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    return Ok(tagCounts);
  }

  async getRecentlyModified(limit: number): Promise<Result<Note[], DomainError>> {
    if (this.notesCache.length === 0) {
      const result = await this.findAll();
      if (!result.ok) {
        return result;
      }
    }
    return Ok(
      [...this.notesCache]
        .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
        .slice(0, limit),
    );
  }

  private async loadAllNotes(
    dirPath: string,
    relativePath = '',
  ): Promise<Result<Note[], DomainError>> {
    const notes: Note[] = [];

    try {
      const entries = await this.fileSystem.readdir(dirPath);

      for (const entry of entries) {
        // Skip ignored folders
        if (this.ignoredFolders.some((folder) => entry.startsWith(folder))) {
          continue;
        }

        const fullPath = `${dirPath}/${entry}`;
        const notePath = relativePath ? `${relativePath}/${entry}` : entry;

        const stats = await this.fileSystem.stat(fullPath);

        if (stats.isDirectory()) {
          // Recursively load notes from subdirectories
          const subNotesResult = await this.loadAllNotes(fullPath, notePath);
          if (!subNotesResult.ok) {
            // Log error but continue loading other notes
            console.error(`Error loading subdirectory ${fullPath}:`, subNotesResult.error);
            continue;
          }
          notes.push(...subNotesResult.value);
        } else if (stats.isFile() && entry.endsWith('.md')) {
          // Load markdown file as note
          const noteResult = await this.loadNote(fullPath, notePath, stats);
          if (noteResult.ok && noteResult.value) {
            notes.push(noteResult.value);
          } else if (!noteResult.ok) {
            // Log error but continue loading other notes
            console.error(`Error loading note ${fullPath}:`, noteResult.error);
          }
        }
      }
    } catch (error) {
      return Err(new VaultAccessError(dirPath, error));
    }

    return Ok(notes);
  }

  private async loadNote(
    fullPath: string,
    relativePath: string,
    stats: { modifiedAt: Date; createdAt: Date },
  ): Promise<Result<Note | null, DomainError>> {
    try {
      const content = await this.fileSystem.readFile(fullPath);
      const { data: rawFrontmatter, content: noteContent } = matter(content);

      // Normalize frontmatter for consistent handling
      const normalized = normalizeFrontmatter(rawFrontmatter);

      // Extract title from frontmatter or first heading
      const title = this.extractTitle(rawFrontmatter, noteContent);

      // Combine tags from frontmatter and content
      const contentTags = this.extractContentTags(noteContent);
      const allTags = [...new Set([...normalized.tags, ...contentTags])];

      // Extract links from content
      const links = this.extractLinks(noteContent);

      // Use dates from frontmatter if available, otherwise use file stats
      const createdAt = normalized.created || stats.createdAt;
      const modifiedAt = normalized.updated || stats.modifiedAt;

      return Ok(
        new Note(
          relativePath,
          title,
          noteContent,
          rawFrontmatter, // Store raw frontmatter for full access
          allTags,
          links,
          createdAt,
          modifiedAt,
        ),
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        return Err(new FileSystemError('read', fullPath, error));
      }
      return Err(new NoteParsingError(relativePath, error));
    }
  }

  private extractTitle(frontmatter: Record<string, unknown>, content: string): string {
    // Check frontmatter first
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    if (frontmatter['title'] && typeof frontmatter['title'] === 'string') {
      // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
      return frontmatter['title'];
    }

    // Extract from first heading
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch?.[1]) {
      return headingMatch[1];
    }

    return 'Untitled';
  }

  private extractContentTags(content: string): string[] {
    const tags = new Set<string>();

    // Extract inline tags from content (#tag format)
    const tagMatches = content.matchAll(/#([a-zA-Z0-9_-]+)/g);
    for (const match of tagMatches) {
      if (match[1]) {
        tags.add(match[1]);
      }
    }

    return Array.from(tags);
  }

  private extractLinks(content: string): string[] {
    const links: string[] = [];

    // Extract wikilinks
    const linkMatches = content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
    for (const match of linkMatches) {
      if (match[1]) {
        links.push(match[1]);
      }
    }

    return links;
  }
}
