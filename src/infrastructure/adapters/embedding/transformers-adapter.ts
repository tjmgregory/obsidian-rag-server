import { pipeline } from '@xenova/transformers';
import { Embedding, type EmbeddingPort } from '../../../domain/ports/embedding-port';

/**
 * Local embedding generation using Transformers.js.
 * Uses the Xenova/all-MiniLM-L6-v2 model for good balance of speed and quality.
 */
export class TransformersEmbeddingAdapter implements EmbeddingPort {
  // biome-ignore lint/suspicious/noExplicitAny: Transformers.js pipeline type is complex
  private extractor: any = null;
  private readonly modelName = 'Xenova/all-MiniLM-L6-v2';
  private readonly dimensions = 384;
  private initialized = false;

  /**
   * Initialize the model. This downloads the model on first run.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.error(`Initializing embedding model: ${this.modelName}`);
    console.error('This may take a moment on first run to download the model...');

    try {
      // Create feature extraction pipeline
      this.extractor = await pipeline('feature-extraction', this.modelName, {
        quantized: true, // Use quantized model for smaller size
      });

      this.initialized = true;
      console.error('Embedding model initialized successfully');
    } catch (error) {
      console.error('Failed to initialize embedding model:', error);
      throw new Error(`Failed to initialize Transformers.js: ${error}`);
    }
  }

  /**
   * Generate embedding for a single text.
   */
  async embed(text: string): Promise<Embedding> {
    if (!this.initialized || !this.extractor) {
      await this.initialize();
    }

    if (!this.extractor) {
      throw new Error('Embedding model not initialized');
    }

    try {
      // Generate embedding
      const output = await this.extractor(text, {
        pooling: 'mean', // Mean pooling for sentence embedding
        normalize: true, // Normalize for cosine similarity
      });

      // Convert to Float32Array
      const vector = new Float32Array(output.data);

      return new Embedding(vector, this.dimensions);
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  /**
   * Generate embeddings for multiple texts.
   * More efficient than calling embed() multiple times.
   */
  async embedBatch(texts: string[]): Promise<Embedding[]> {
    if (!this.initialized || !this.extractor) {
      await this.initialize();
    }

    if (!this.extractor) {
      throw new Error('Embedding model not initialized');
    }

    try {
      // Process in batches for memory efficiency
      const batchSize = 32;
      const embeddings: Embedding[] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        // Generate embeddings for batch
        const outputs = await Promise.all(
          batch.map((text) =>
            this.extractor?.(text, {
              pooling: 'mean',
              normalize: true,
            }),
          ),
        );

        // Convert to Embedding objects
        for (const output of outputs) {
          const vector = new Float32Array(output.data);
          embeddings.push(new Embedding(vector, this.dimensions));
        }

        // Log progress for large batches
        if (texts.length > 100 && (i + batchSize) % 100 === 0) {
          console.error(`Embedded ${Math.min(i + batchSize, texts.length)}/${texts.length} texts`);
        }
      }

      return embeddings;
    } catch (error) {
      throw new Error(`Failed to generate batch embeddings: ${error}`);
    }
  }

  /**
   * Get the dimension size of embeddings.
   */
  getDimensions(): number {
    return this.dimensions;
  }

  /**
   * Clean up resources.
   */
  async dispose(): Promise<void> {
    if (this.extractor) {
      // Transformers.js doesn't have explicit disposal, but we can clear the reference
      this.extractor = null;
      this.initialized = false;
    }
  }
}
