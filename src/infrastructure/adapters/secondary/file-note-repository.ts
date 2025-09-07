import matter from 'gray-matter';
import type { FileSystemPort } from '../../../application/ports/secondary/file-system-port';
import type { NoteRepository } from '../../../application/ports/secondary/note-repository';
import { Note } from '../../../domain/entities/note';

export class FileNoteRepository implements NoteRepository {
  private notesCache: Note[] = [];

  constructor(
    private vaultPath: string,
    private fileSystem: FileSystemPort,
    private ignoredFolders: string[] = [],
  ) {}

  async findAll(): Promise<Note[]> {
    this.notesCache = await this.loadAllNotes(this.vaultPath);
    return this.notesCache;
  }

  async findByPath(path: string): Promise<Note | null> {
    if (this.notesCache.length === 0) {
      await this.findAll();
    }
    return this.notesCache.find((note) => note.path === path) || null;
  }

  async findByFolder(folder: string): Promise<Note[]> {
    if (this.notesCache.length === 0) {
      await this.findAll();
    }
    const normalizedFolder = folder.endsWith('/') ? folder : `${folder}/`;
    return this.notesCache.filter((note) => note.path.startsWith(normalizedFolder));
  }

  async getAllTags(): Promise<Map<string, number>> {
    if (this.notesCache.length === 0) {
      await this.findAll();
    }
    const tagCounts = new Map<string, number>();

    for (const note of this.notesCache) {
      for (const tag of note.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    return tagCounts;
  }

  async getRecentlyModified(limit: number): Promise<Note[]> {
    if (this.notesCache.length === 0) {
      await this.findAll();
    }
    return [...this.notesCache]
      .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
      .slice(0, limit);
  }

  private async loadAllNotes(dirPath: string, relativePath = ''): Promise<Note[]> {
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
          const subNotes = await this.loadAllNotes(fullPath, notePath);
          notes.push(...subNotes);
        } else if (stats.isFile() && entry.endsWith('.md')) {
          // Load markdown file as note
          const note = await this.loadNote(fullPath, notePath, stats);
          if (note) {
            notes.push(note);
          }
        }
      }
    } catch (error) {
      console.error(`Error loading notes from ${dirPath}:`, error);
    }

    return notes;
  }

  private async loadNote(
    fullPath: string,
    relativePath: string,
    stats: { modifiedAt: Date; createdAt: Date },
  ): Promise<Note | null> {
    try {
      const content = await this.fileSystem.readFile(fullPath);
      const { data: frontmatter, content: noteContent } = matter(content);

      // Extract title from frontmatter or first heading
      const title = this.extractTitle(frontmatter, noteContent);

      // Extract tags from frontmatter and content
      const tags = this.extractTags(frontmatter, noteContent);

      // Extract links from content
      const links = this.extractLinks(noteContent);

      return new Note(
        relativePath,
        title,
        noteContent,
        frontmatter,
        tags,
        links,
        stats.createdAt,
        stats.modifiedAt,
      );
    } catch (error) {
      console.error(`Error loading note ${fullPath}:`, error);
      return null;
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

  private extractTags(frontmatter: Record<string, unknown>, content: string): string[] {
    const tags = new Set<string>();

    // Extract from frontmatter
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    if (frontmatter['tags']) {
      // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
      if (Array.isArray(frontmatter['tags'])) {
        // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
        for (const tag of frontmatter['tags']) {
          if (typeof tag === 'string') {
            tags.add(tag);
          }
        }
      }
    }

    // Extract inline tags from content
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
