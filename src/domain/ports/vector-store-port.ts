import type { Embedding } from './embedding-port';

/**
 * Port for vector storage and similarity search.
 * Allows swapping between different vector database implementations.
 */
export interface VectorStorePort {
  /**
   * Insert or update a vector with metadata.
   */
  upsert(id: string, vector: Embedding, metadata: VectorMetadata): Promise<void>;

  /**
   * Batch upsert for efficiency.
   */
  upsertBatch(items: VectorItem[]): Promise<void>;

  /**
   * Search for similar vectors.
   * @param vector Query vector
   * @param k Number of results to return
   * @param filter Optional metadata filter
   */
  search(vector: Embedding, k: number, filter?: MetadataFilter): Promise<SearchResult[]>;

  /**
   * Delete a vector by ID.
   */
  delete(id: string): Promise<void>;

  /**
   * Delete multiple vectors.
   */
  deleteBatch(ids: string[]): Promise<void>;

  /**
   * Clear all vectors.
   */
  clear(): Promise<void>;

  /**
   * Get statistics about the store.
   */
  getStats(): Promise<VectorStoreStats>;

  /**
   * Initialize the store (create indices, load data, etc).
   */
  initialize?(): Promise<void>;

  /**
   * Persist any in-memory data.
   */
  persist?(): Promise<void>;
}

/**
 * Metadata associated with a vector.
 */
export interface VectorMetadata {
  noteId: string;
  notePath: string;
  chunkIndex: number;
  chunkText: string;
  headerContext?: string;
  createdAt: Date;
  modifiedAt: Date;
  tags?: string[];
}

/**
 * Item for batch upsert.
 */
export interface VectorItem {
  id: string;
  vector: Embedding;
  metadata: VectorMetadata;
}

/**
 * Filter for metadata during search.
 */
export interface MetadataFilter {
  noteId?: string;
  notePath?: string;
  tags?: string[];
  after?: Date;
  before?: Date;
}

/**
 * Search result with similarity score.
 */
export interface SearchResult {
  id: string;
  score: number; // Similarity score (0-1, higher is better)
  metadata: VectorMetadata;
}

/**
 * Statistics about the vector store.
 */
export interface VectorStoreStats {
  totalVectors: number;
  totalNotes: number;
  indexSize: number; // In bytes
  lastUpdated?: Date;
}
