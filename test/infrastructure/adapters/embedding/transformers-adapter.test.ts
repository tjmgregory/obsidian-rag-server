import { beforeAll, describe, expect, it } from 'bun:test';
import { TransformersEmbeddingAdapter } from '../../../../src/infrastructure/adapters/embedding/transformers-adapter';

describe('TransformersEmbeddingAdapter', () => {
  let adapter: TransformersEmbeddingAdapter;

  beforeAll(() => {
    adapter = new TransformersEmbeddingAdapter();
  });

  it('should initialize the model', async () => {
    await adapter.initialize();
    expect(adapter.getDimensions()).toBe(384);
  }, 30000); // Allow time for model download

  it('should generate embedding for text', async () => {
    const embedding = await adapter.embed('Hello, world!');

    expect(embedding.dimensions).toBe(384);
    expect(embedding.vector).toBeInstanceOf(Float32Array);
    expect(embedding.vector.length).toBe(384);

    // Check that it's normalized (magnitude should be ~1)
    let magnitude = 0;
    for (let i = 0; i < embedding.dimensions; i++) {
      const val = embedding.vector[i];
      if (val !== undefined) {
        magnitude += val * val;
      }
    }
    magnitude = Math.sqrt(magnitude);
    expect(magnitude).toBeCloseTo(1.0, 2);
  }, 10000);

  it('should generate similar embeddings for similar texts', async () => {
    const embedding1 = await adapter.embed('I love programming');
    const embedding2 = await adapter.embed('I enjoy coding');
    const embedding3 = await adapter.embed('The weather is nice');

    const similarity12 = embedding1.cosineSimilarity(embedding2);
    const similarity13 = embedding1.cosineSimilarity(embedding3);

    // Similar texts should have higher similarity
    expect(similarity12).toBeGreaterThan(0.5);
    // Different topics should have lower similarity
    expect(similarity13).toBeLessThan(similarity12);
  }, 10000);

  it('should handle batch embedding', async () => {
    const texts = [
      'First document about cats',
      'Second document about dogs',
      'Third document about programming',
    ];

    const embeddings = await adapter.embedBatch(texts);

    expect(embeddings).toHaveLength(3);
    for (const embedding of embeddings) {
      expect(embedding.dimensions).toBe(384);
      expect(embedding.vector.length).toBe(384);
    }

    // Cats and dogs should be more similar than programming
    const emb0 = embeddings[0];
    const emb1 = embeddings[1];
    const emb2 = embeddings[2];
    expect(emb0).toBeDefined();
    expect(emb1).toBeDefined();
    expect(emb2).toBeDefined();
    const catDogSimilarity = emb0 && emb1 ? emb0.cosineSimilarity(emb1) : 0;
    const catProgSimilarity = emb0 && emb2 ? emb0.cosineSimilarity(emb2) : 0;
    expect(catDogSimilarity).toBeGreaterThan(catProgSimilarity);
  }, 15000);

  it('should calculate cosine similarity correctly', () => {
    // Test with known vectors
    const vec1 = new Float32Array([1, 0, 0]);
    const vec2 = new Float32Array([0, 1, 0]);
    const vec3 = new Float32Array([1, 0, 0]);

    const emb1 = new (require('../../../../src/domain/ports/embedding-port').Embedding)(vec1, 3);
    const emb2 = new (require('../../../../src/domain/ports/embedding-port').Embedding)(vec2, 3);
    const emb3 = new (require('../../../../src/domain/ports/embedding-port').Embedding)(vec3, 3);

    // Perpendicular vectors should have 0 similarity
    expect(emb1.cosineSimilarity(emb2)).toBeCloseTo(0, 5);
    // Identical vectors should have 1 similarity
    expect(emb1.cosineSimilarity(emb3)).toBeCloseTo(1, 5);
  });

  it('should handle empty text gracefully', async () => {
    const embedding = await adapter.embed('');
    expect(embedding.dimensions).toBe(384);
    expect(embedding.vector).toBeInstanceOf(Float32Array);
  }, 10000);
});
