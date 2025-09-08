/**
 * Service for splitting documents into chunks for embedding.
 * Respects markdown structure and maintains context.
 */
export class ChunkingService {
  constructor(
    private readonly options: ChunkOptions = {
      maxChunkSize: 2000, // Characters, not tokens (roughly 500 tokens)
      overlapSize: 200, // Characters of overlap
      respectHeaders: true,
      minChunkSize: 100,
    },
  ) {}

  /**
   * Split a note into chunks for embedding.
   */
  chunk(content: string, noteId: string): DocumentChunk[] {
    if (!content || content.trim().length === 0) {
      return [];
    }

    const chunks: DocumentChunk[] = [];

    if (this.options.respectHeaders) {
      // Smart chunking that respects markdown structure
      const sections = this.splitByHeaders(content);

      for (const section of sections) {
        const sectionChunks = this.chunkSection(section, noteId);
        chunks.push(...sectionChunks);
      }
    } else {
      // Simple chunking by size
      const simpleChunks = this.simpleChunk(content, noteId);
      chunks.push(...simpleChunks);
    }

    return chunks;
  }

  /**
   * Split content by markdown headers.
   */
  private splitByHeaders(content: string): Section[] {
    const lines = content.split('\n');
    const sections: Section[] = [];
    let currentSection: Section | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined) {
        continue;
      }
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headerMatch) {
        // Start new section
        if (currentSection) {
          sections.push(currentSection);
        }

        currentSection = {
          header: headerMatch[2] ?? '',
          level: headerMatch[1]?.length ?? 0,
          content: '',
          startLine: i,
          endLine: i,
        };
      } else if (currentSection) {
        // Add to current section
        currentSection.content += (currentSection.content ? '\n' : '') + line;
        currentSection.endLine = i;
      } else {
        // Content before first header
        const lastSection = sections[sections.length - 1];
        if (sections.length === 0 || (lastSection && lastSection.header !== '')) {
          currentSection = {
            header: '',
            level: 0,
            content: line,
            startLine: i,
            endLine: i,
          };
        } else if (lastSection) {
          lastSection.content += `\n${line}`;
          lastSection.endLine = i;
        }
      }
    }

    // Add final section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Chunk a section, splitting if too large.
   */
  private chunkSection(section: Section, noteId: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const fullContent = section.header
      ? `${'#'.repeat(section.level)} ${section.header}\n${section.content}`
      : section.content;

    if (fullContent.length <= this.options.maxChunkSize) {
      // Section fits in one chunk
      const metadata: ChunkMetadata = {
        noteId,
        chunkIndex: 0,
        startLine: section.startLine,
        endLine: section.endLine,
      };
      if (section.header) {
        metadata.headerContext = section.header;
      }
      chunks.push({
        content: fullContent,
        metadata,
      });
    } else {
      // Need to split section into multiple chunks
      const parts = this.splitLargeSection(fullContent);

      for (let i = 0; i < parts.length; i++) {
        const partContent = parts[i];
        if (partContent !== undefined) {
          const metadata: ChunkMetadata = {
            noteId,
            chunkIndex: i,
            startLine: section.startLine,
            endLine: section.endLine,
          };
          if (section.header) {
            metadata.headerContext = section.header;
          }
          chunks.push({
            content: partContent,
            metadata,
          });
        }
      }
    }

    return chunks;
  }

  /**
   * Split large content into overlapping chunks.
   */
  private splitLargeSection(content: string): string[] {
    const chunks: string[] = [];
    const sentences = this.splitIntoSentences(content);

    let currentChunk = '';
    let overlap = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= this.options.maxChunkSize) {
        currentChunk += sentence;
      } else {
        // biome-ignore lint/style/useCollapsedElseIf: Clearer logic flow
        // Save current chunk
        if (currentChunk.length >= this.options.minChunkSize) {
          chunks.push(currentChunk);

          // Create overlap from end of current chunk
          overlap = this.getOverlap(currentChunk);
          currentChunk = overlap + sentence;
        } else {
          // Current chunk too small, force add sentence
          currentChunk += sentence;
        }
      }
    }

    // Add final chunk
    if (currentChunk.length > 0 && currentChunk !== overlap) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Simple chunking without respecting structure.
   */
  private simpleChunk(content: string, noteId: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const maxSize = this.options.maxChunkSize;
    const overlap = this.options.overlapSize;

    let start = 0;
    let chunkIndex = 0;

    while (start < content.length) {
      let end = Math.min(start + maxSize, content.length);

      // Try to break at word boundary
      if (end < content.length) {
        const lastSpace = content.lastIndexOf(' ', end);
        if (lastSpace > start + this.options.minChunkSize) {
          end = lastSpace;
        }
      }

      const chunkContent = content.slice(start, end);

      chunks.push({
        content: chunkContent,
        metadata: {
          noteId,
          chunkIndex: chunkIndex++,
          startLine: 0, // Not tracking lines in simple mode
          endLine: 0,
        },
      });

      // Move start position, accounting for overlap
      start = end - overlap;
      if (start >= content.length - this.options.minChunkSize) {
        break;
      }
    }

    return chunks;
  }

  /**
   * Split text into sentences.
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting (can be improved)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  /**
   * Get overlap text from end of chunk.
   */
  private getOverlap(text: string): string {
    if (text.length <= this.options.overlapSize) {
      return text;
    }

    // Try to start overlap at sentence boundary
    const overlapStart = text.length - this.options.overlapSize;
    const beforeOverlap = text.slice(0, overlapStart);
    const lastPeriod = beforeOverlap.lastIndexOf('.');

    if (lastPeriod > 0) {
      return text.slice(lastPeriod + 1).trim();
    }

    return text.slice(overlapStart);
  }
}

/**
 * Options for chunking.
 */
export interface ChunkOptions {
  maxChunkSize: number; // Maximum characters per chunk
  overlapSize: number; // Characters to overlap between chunks
  respectHeaders: boolean; // Whether to respect markdown headers
  minChunkSize: number; // Minimum characters per chunk
}

/**
 * A document chunk ready for embedding.
 */
export interface DocumentChunk {
  content: string;
  metadata: ChunkMetadata;
}

/**
 * Metadata for a chunk.
 */
export interface ChunkMetadata {
  noteId: string;
  chunkIndex: number;
  startLine: number;
  endLine: number;
  headerContext?: string;
}

/**
 * Internal representation of a markdown section.
 */
interface Section {
  header: string;
  level: number; // 1-6 for h1-h6, 0 for no header
  content: string;
  startLine: number;
  endLine: number;
}
