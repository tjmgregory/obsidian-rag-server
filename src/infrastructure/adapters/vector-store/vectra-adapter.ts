import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { LocalIndex } from 'vectra';
import type { Embedding } from '../../../domain/ports/embedding-port';
import type {
  MetadataFilter,
  SearchResult,
  VectorItem,
  VectorMetadata,
  VectorStorePort,
  VectorStoreStats,
} from '../../../domain/ports/vector-store-port';

/**
 * Vector store implementation using VectraJS.
 * Provides fast in-memory similarity search with disk persistence.
 */
export class VectraVectorStore implements VectorStorePort {
  private index: LocalIndex;
  private readonly indexPath: string;
  private stats = {
    totalVectors: 0,
    totalNotes: new Set<string>(),
    lastUpdated: new Date(),
  };

  constructor(
    private readonly dataPath: string,
    private readonly dimensions: number = 384,
  ) {
    this.indexPath = path.join(dataPath, 'vector-index');

    // Create VectraJS index
    this.index = new LocalIndex(this.indexPath);
  }

  /**
   * Initialize the store - load existing index or create new one.
   */
  async initialize(): Promise<void> {
    console.error(`Initializing vector store at: ${this.indexPath}`);

    // Ensure data directory exists
    await fs.mkdir(this.dataPath, { recursive: true });

    try {
      // Check if index exists
      const indexExists = await this.index.isIndexCreated();

      if (indexExists) {
        // Load existing index
        await this.index.beginUpdate();
        console.error('Loaded existing vector index');

        // Update stats
        const items = await this.index.listItems();
        this.stats.totalVectors = items.length;
        for (const item of items) {
          if (item.metadata?.['noteId']) {
            this.stats.totalNotes.add(item.metadata['noteId'] as string);
          }
        }
        await this.index.cancelUpdate();
      } else {
        // Create new index
        await this.index.createIndex({ version: 1 });
        console.error('Created new vector index');
      }
    } catch (error) {
      console.error('Error initializing vector store:', error);
      // Create new index if loading failed
      await this.index.createIndex({ version: 1, deleteIfExists: true });
    }
  }

  /**
   * Insert or update a vector with metadata.
   */
  async upsert(id: string, vector: Embedding, metadata: VectorMetadata): Promise<void> {
    await this.index.beginUpdate();
    await this.index.upsertItem({
      id,
      vector: Array.from(vector.vector),
      metadata: {
        noteId: metadata.noteId,
        notePath: metadata.notePath,
        chunkIndex: metadata.chunkIndex,
        chunkText: metadata.chunkText,
        headerContext: metadata.headerContext || '',
        createdAt: metadata.createdAt.toISOString(),
        modifiedAt: metadata.modifiedAt.toISOString(),
        tagsString: metadata.tags?.join(',') || '', // Convert array to string
      },
    });
    await this.index.endUpdate();

    // Update stats
    this.stats.totalVectors++;
    this.stats.totalNotes.add(metadata.noteId);
    this.stats.lastUpdated = new Date();
  }

  /**
   * Batch upsert for efficiency.
   */
  async upsertBatch(items: VectorItem[]): Promise<void> {
    await this.index.beginUpdate();

    for (const item of items) {
      await this.index.upsertItem({
        id: item.id,
        vector: Array.from(item.vector.vector),
        metadata: {
          noteId: item.metadata.noteId,
          notePath: item.metadata.notePath,
          chunkIndex: item.metadata.chunkIndex,
          chunkText: item.metadata.chunkText,
          headerContext: item.metadata.headerContext || '',
          createdAt: item.metadata.createdAt.toISOString(),
          modifiedAt: item.metadata.modifiedAt.toISOString(),
          tagsString: item.metadata.tags?.join(',') || '', // Convert array to string
        },
      });
    }

    await this.index.endUpdate();

    // Update stats
    this.stats.totalVectors += items.length;
    for (const item of items) {
      this.stats.totalNotes.add(item.metadata.noteId);
    }
    this.stats.lastUpdated = new Date();
  }

  /**
   * Search for similar vectors.
   */
  async search(vector: Embedding, k: number, filter?: MetadataFilter): Promise<SearchResult[]> {
    // Perform vector search
    const results = await this.index.queryItems(
      Array.from(vector.vector),
      '', // query string for BM25 (not used for vector search)
      filter ? k * 2 : k, // Get more results if filtering
    );

    // Apply metadata filters and convert results
    const searchResults: SearchResult[] = [];

    for (const result of results) {
      const metadata = result.item.metadata;

      // Apply filters
      if (filter) {
        if (filter.noteId && metadata['noteId'] !== filter.noteId) {
          continue;
        }
        if (filter.notePath && metadata['notePath'] !== filter.notePath) {
          continue;
        }
        if (filter.tags && filter.tags.length > 0) {
          const tagsString = metadata['tagsString'] as string;
          const tags = tagsString ? tagsString.split(',') : [];
          const hasTag = filter.tags.some((tag) => tags.includes(tag));
          if (!hasTag) {
            continue;
          }
        }
        const modifiedAt = metadata['modifiedAt'] as string;
        if (filter.after && new Date(modifiedAt) < filter.after) {
          continue;
        }
        if (filter.before && new Date(modifiedAt) > filter.before) {
          continue;
        }
      }

      // Convert tags back to array
      const tagsString = metadata['tagsString'] as string;
      const tags = tagsString && tagsString !== '' ? tagsString.split(',') : undefined;

      const searchResult: SearchResult = {
        id: result.item.id,
        score: result.score ?? 0,
        metadata: {
          noteId: metadata['noteId'] as string,
          notePath: metadata['notePath'] as string,
          chunkIndex: metadata['chunkIndex'] as number,
          chunkText: metadata['chunkText'] as string,
          createdAt: new Date(metadata['createdAt'] as string),
          modifiedAt: new Date(metadata['modifiedAt'] as string),
        },
      };

      // Add optional fields
      const headerContext = metadata['headerContext'] as string;
      if (headerContext && headerContext !== '') {
        searchResult.metadata.headerContext = headerContext;
      }
      if (tags) {
        searchResult.metadata.tags = tags;
      }

      searchResults.push(searchResult);

      // Stop if we have enough results
      if (searchResults.length >= k) {
        break;
      }
    }

    return searchResults;
  }

  /**
   * Delete a vector by ID.
   */
  async delete(id: string): Promise<void> {
    const item = await this.index.getItem(id);
    if (item) {
      await this.index.deleteItem(id);
      this.stats.totalVectors--;

      // Check if this was the last chunk for a note
      const noteId = item.metadata?.['noteId'];
      if (noteId && typeof noteId === 'string') {
        const remaining = await this.index.queryItems(Array(this.dimensions).fill(0), '', 1, {
          noteId,
        });
        if (remaining.length === 0) {
          this.stats.totalNotes.delete(noteId);
        }
      }
    }
  }

  /**
   * Delete multiple vectors.
   */
  async deleteBatch(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
  }

  /**
   * Clear all vectors.
   */
  async clear(): Promise<void> {
    // Delete and recreate the index
    await this.index.deleteIndex();
    await this.index.createIndex({ version: 1 });

    // Reset stats
    this.stats.totalVectors = 0;
    this.stats.totalNotes.clear();
    this.stats.lastUpdated = new Date();
  }

  /**
   * Get statistics about the store.
   */
  async getStats(): Promise<VectorStoreStats> {
    // Calculate index size
    let indexSize = 0;
    try {
      const indexFiles = await fs.readdir(this.indexPath);
      for (const file of indexFiles) {
        const stat = await fs.stat(path.join(this.indexPath, file));
        indexSize += stat.size;
      }
    } catch {
      // Index might not exist yet
    }

    return {
      totalVectors: this.stats.totalVectors,
      totalNotes: this.stats.totalNotes.size,
      indexSize,
      lastUpdated: this.stats.lastUpdated,
    };
  }

  /**
   * Persist any in-memory data to disk.
   */
  async persist(): Promise<void> {
    // VectraJS persists on endUpdate, so we just need to ensure any pending updates are saved
    // No-op since we call endUpdate after each operation
  }
}
