# Decision Log: Phase 2 - Semantic Search Architecture

**Date**: 2025-09-08  
**Decision Makers**: Theo & Claude  
**Status**: Approved  
**Review Date**: 2025-10-08

## Context

Moving from keyword-based search (Phase 1) to semantic search (Phase 2) that understands meaning, not just exact matches.

## Key Decisions

### 1. Embedding Library: Transformers.js with Adapter Pattern

**Decision**: Use Transformers.js for local embeddings with an adapter interface for future flexibility.

**What are embeddings?**
- Think of them as "meaning fingerprints" - numbers that represent what text means
- Similar meanings = similar numbers
- Example: "dog" and "puppy" would have similar embeddings

**Why Transformers.js?**
- ✅ **Runs 100% locally** - no API keys, no costs, full privacy
- ✅ **Good enough quality** - Uses proven models like sentence-transformers
- ✅ **Bun/Node compatible** - Works in our environment
- ✅ **Active development** - Hugging Face maintains it

**The Adapter Pattern**:
```typescript
// This lets us swap implementations later
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

class TransformersEmbedding implements EmbeddingProvider { /* local */ }
class OpenAIEmbedding implements EmbeddingProvider { /* remote */ }
```

**Alternatives Considered**:
- OpenAI API: Better quality but requires key + costs
- TensorFlow.js: Heavier, more complex
- ONNX Runtime: Faster but harder to set up

**Model Choice**: `Xenova/all-MiniLM-L6-v2`
- Small (23MB), fast, good quality
- 384-dimensional vectors (good balance)
- Trained on 1B+ sentence pairs

### 2. Vector Storage: VectraJS + SQLite

**Decision**: Use VectraJS for in-memory operations with SQLite persistence.

**What is vector storage?**
- Regular DB: Find exact matches
- Vector DB: Find similar meanings using math (cosine similarity)
- Think of it like a "meaning map" where related concepts are nearby

**Why VectraJS?**
- ✅ **Pure TypeScript** - No native dependencies
- ✅ **Simple API** - Easy to understand and use
- ✅ **Local indexes** - JSON files for persistence
- ✅ **Good performance** - HNSW algorithm for fast search

**Architecture**:
```typescript
// In-memory for speed
const index = new LocalIndex({ dimensions: 384 });

// SQLite for persistence
CREATE TABLE embeddings (
  id TEXT PRIMARY KEY,
  note_path TEXT,
  chunk_index INTEGER,
  embedding BLOB,  -- Store as binary
  metadata JSON
);
```

**Alternatives Considered**:
- ChromaDB: Overkill for our needs, Python-focused
- Pinecone: Cloud-only, not local-first
- Raw implementation: Too much work, risky

### 3. Chunking Strategy: Semantic Boundaries with Overlap

**Decision**: Smart chunking that respects markdown structure.

**What is chunking?**
- Breaking long documents into digestible pieces
- Why? Embeddings work better on focused content
- Like summarizing a book chapter-by-chapter vs all at once

**Our Approach**:
```typescript
interface ChunkStrategy {
  // Respect markdown headers
  maxChunkSize: 512 tokens (~2000 chars)
  overlap: 64 tokens (~250 chars)
  
  // Smart boundaries:
  // 1. Try to break at headers (# ## ###)
  // 2. Then paragraphs (double newline)
  // 3. Then sentences (. ! ?)
  // 4. Last resort: word boundaries
}
```

**Visual Example**:
```markdown
# Main Topic           <- Chunk 1 starts
Introduction paragraph
More content...

## Subtopic A          <- Ideal break point
Content about A...     <- Chunk 2 starts (with overlap)

## Subtopic B          <- Another break
Content about B...     <- Chunk 3 starts
```

**Why This Approach?**
- Maintains context (overlap prevents cutting mid-thought)
- Respects document structure
- Better semantic coherence
- Improves retrieval quality

**Alternatives Considered**:
- Fixed-size chunks: Simple but breaks context
- Sentence-based: Too granular
- Page-based: Not applicable to markdown

## Implementation Plan

### Phase 2.1: Embedding Infrastructure
1. Set up Transformers.js
2. Create embedding provider interface
3. Build embedding cache
4. Add progress tracking

### Phase 2.2: Vector Storage
1. Integrate VectraJS
2. Set up SQLite persistence
3. Build indexing pipeline
4. Implement incremental updates

### Phase 2.3: Smart Chunking
1. Implement markdown-aware splitter
2. Add overlap logic
3. Maintain chunk-to-note mapping
4. Handle edge cases

### Phase 2.4: Hybrid Search
1. Combine keyword + vector search
2. Implement result ranking
3. Add relevance scoring
4. Build unified API

## Learning Resources

### Understanding Embeddings
- Think of words in 3D space: "cat" near "kitten", far from "airplane"
- Embeddings do this in 384 dimensions (impossible to visualize but mathematically sound)
- Similarity = angle between vectors (cosine similarity)

### Vector Search Explained
```
Query: "How to learn Spanish"
         ↓
    [0.23, -0.45, 0.67, ...]  <- 384 numbers
         ↓
Find nearest vectors in database
         ↓
Return: "Spanish practice", "Language learning tips", etc.
```

### Why Local-First Matters
1. **Privacy**: Your notes never leave your machine
2. **Speed**: No network latency
3. **Cost**: No API fees
4. **Reliability**: Works offline

## Performance Targets

- Embedding generation: ~100ms per chunk
- Vector search: <50ms for 10k chunks
- Initial indexing: <5 min for 1000 notes
- Incremental updates: <1s per note

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Slow initial indexing | Poor UX | Show progress, background processing |
| Large memory usage | App crashes | Pagination, disk-based indices |
| Model download size | Slow first run | Cache models, show download progress |
| Embedding quality | Poor search | Test multiple models, allow switching |

## Success Criteria

- Semantic search finds related content not containing exact keywords
- Search latency remains under 500ms
- Memory usage stays under 500MB
- User satisfaction improves (tracked via feedback)

## Next Steps

1. Create detailed implementation guide
2. Set up Transformers.js proof of concept
3. Benchmark embedding performance
4. Design incremental indexing strategy

---

**Decided by**: Claude (with Theo's requirements)  
**Rationale**: Local-first with flexibility, proven technologies, clear upgrade path