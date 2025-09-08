/**
 * Port for embedding generation.
 * This allows us to swap between local (Transformers.js) and remote (OpenAI) implementations.
 */
export interface EmbeddingPort {
  /**
   * Generate embedding for a single text.
   */
  embed(text: string): Promise<Embedding>;

  /**
   * Generate embeddings for multiple texts (more efficient).
   */
  embedBatch(texts: string[]): Promise<Embedding[]>;

  /**
   * Get the dimension size of embeddings.
   */
  getDimensions(): number;

  /**
   * Initialize the embedding model (if needed).
   */
  initialize?(): Promise<void>;
}

/**
 * Represents a text embedding (vector representation of meaning).
 */
export class Embedding {
  constructor(
    public readonly vector: Float32Array,
    public readonly dimensions: number,
  ) {
    if (vector.length !== dimensions) {
      throw new Error(`Vector length ${vector.length} doesn't match dimensions ${dimensions}`);
    }
  }

  /**
   * Calculate cosine similarity with another embedding.
   * Returns a value between -1 and 1, where 1 means identical.
   */
  cosineSimilarity(other: Embedding): number {
    if (this.dimensions !== other.dimensions) {
      throw new Error('Cannot compare embeddings of different dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < this.dimensions; i++) {
      const a = this.vector[i];
      const b = other.vector[i];
      if (a !== undefined && b !== undefined) {
        dotProduct += a * b;
        normA += a * a;
        normB += b * b;
      }
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Calculate Euclidean distance to another embedding.
   */
  euclideanDistance(other: Embedding): number {
    if (this.dimensions !== other.dimensions) {
      throw new Error('Cannot compare embeddings of different dimensions');
    }

    let sum = 0;
    for (let i = 0; i < this.dimensions; i++) {
      const a = this.vector[i];
      const b = other.vector[i];
      if (a !== undefined && b !== undefined) {
        const diff = a - b;
        sum += diff * diff;
      }
    }
    return Math.sqrt(sum);
  }

  /**
   * Convert to plain array (for serialization).
   */
  toArray(): number[] {
    return Array.from(this.vector);
  }

  /**
   * Create from plain array.
   */
  static fromArray(array: number[]): Embedding {
    return new Embedding(new Float32Array(array), array.length);
  }
}
