# Phase 2 Implementation Guide - Semantic Search

> **Status**: In Progress (~40% Complete)  
> **Last Updated**: 2025-09-08 Evening  
> **Next Steps**: Complete indexing pipeline, implement semantic search use case

## Overview

Phase 2 transforms our keyword-based search into intelligent semantic search that understands meaning.

### ✅ Completed
- Embedding infrastructure with Transformers.js
- Vector store with VectraJS
- Smart markdown-aware chunking
- All foundation tests passing

### 📋 TODO
- Indexing pipeline (drafted, not committed)
- Semantic search use case
- Hybrid search combining keyword + semantic
- MCP integration
- Performance optimization

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   MCP Client                        │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                 MCP Adapter                         │
│         (Enhanced with semantic options)            │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              Hybrid Search UseCase                  │
│         (Combines keyword + semantic)               │
└──────┬──────────────────────────────┬───────────────┘
       │                              │
┌──────▼────────┐            ┌───────▼───────────────┐
│ Keyword Search│            │  Semantic Search      │
│   (Phase 1)   │            │    (Phase 2 New)      │
└───────────────┘            └───────┬───────────────┘
                                     │
                          ┌──────────▼────────────────┐
                          │   Embedding Service       │
                          │ (Transformers.js Adapter) │
                          └──────────┬────────────────┘
                                     │
                          ┌──────────▼────────────────┐
                          │    Vector Store           │
                          │  (VectraJS + SQLite)      │
                          └───────────────────────────┘
```

## Implementation Steps

### Step 1: Embedding Service Infrastructure

- [x] **1.1 Create Embedding Port (Domain Layer)**

```typescript
// src/domain/ports/embedding-port.ts
export interface EmbeddingPort {
  embed(text: string): Promise<Embedding>;
  embedBatch(texts: string[]): Promise<Embedding[]>;
  getDimensions(): number;
}

export class Embedding {
  constructor(
    public readonly vector: Float32Array,
    public readonly dimensions: number,
  ) {}

  cosineSimilarity(other: Embedding): number {
    // Implementation
  }
}
```

- [x] **1.2 Implement Transformers.js Adapter**

```typescript
// src/infrastructure/adapters/embedding/transformers-adapter.ts
import { pipeline } from '@xenova/transformers';

export class TransformersEmbeddingAdapter implements EmbeddingPort {
  private model: any;
  private readonly modelName = 'Xenova/all-MiniLM-L6-v2';
  
  async initialize() {
    this.model = await pipeline('feature-extraction', this.modelName);
  }
  
  async embed(text: string): Promise<Embedding> {
    const output = await this.model(text, {
      pooling: 'mean',
      normalize: true,
    });
    return new Embedding(output.data, 384);
  }
}
```

- [ ] **1.3 Create OpenAI Adapter (Future Option)**

```typescript
// src/infrastructure/adapters/embedding/openai-adapter.ts
export class OpenAIEmbeddingAdapter implements EmbeddingPort {
  // Implementation for future remote option
  // Same interface, different implementation
}
```

### Step 2: Smart Chunking System

- [x] **2.1 Chunking Service**

```typescript
// src/domain/services/chunking-service.ts
export interface ChunkOptions {
  maxTokens: number;      // 512
  overlapTokens: number;  // 64
  respectHeaders: boolean; // true
}

export class ChunkingService {
  chunk(content: string, options: ChunkOptions): DocumentChunk[] {
    // 1. Split by headers first
    // 2. Split large sections by paragraphs
    // 3. Apply overlap
    // 4. Maintain metadata
  }
}

export class DocumentChunk {
  constructor(
    public readonly content: string,
    public readonly metadata: {
      noteId: string;
      chunkIndex: number;
      startLine: number;
      endLine: number;
      headerContext?: string;
    }
  ) {}
}
```

- [x] **2.2 Markdown-Aware Splitter** (integrated into ChunkingService)

```typescript
// src/infrastructure/utils/markdown-splitter.ts
export class MarkdownSplitter {
  private readonly headerRegex = /^#{1,6}\s+.+$/gm;
  
  splitByHeaders(content: string): Section[] {
    // Smart splitting logic
  }
  
  splitByParagraphs(content: string, maxSize: number): string[] {
    // Paragraph-aware splitting
  }
}
```

### Step 3: Vector Storage Layer

- [x] **3.1 Vector Store Port**

```typescript
// src/domain/ports/vector-store-port.ts
export interface VectorStorePort {
  upsert(id: string, vector: Embedding, metadata: any): Promise<void>;
  search(vector: Embedding, k: number): Promise<SearchResult[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: any;
}
```

- [x] **3.2 VectraJS Implementation**

```typescript
// src/infrastructure/adapters/vector-store/vectra-adapter.ts
import { LocalIndex } from 'vectra';

export class VectraVectorStore implements VectorStorePort {
  private index: LocalIndex;
  
  constructor(private readonly dbPath: string) {
    this.index = new LocalIndex({
      dimensions: 384,
      metric: 'cosine',
    });
  }
  
  async initialize() {
    if (await this.index.isIndexCreated()) {
      await this.index.load();
    } else {
      await this.index.create();
    }
  }
  
  async upsert(id: string, vector: Embedding, metadata: any) {
    await this.index.upsert({
      id,
      vector: Array.from(vector.vector),
      metadata,
    });
  }
}
```

- [ ] **3.3 SQLite Persistence** (VectraJS has built-in persistence)

```typescript
// src/infrastructure/adapters/vector-store/sqlite-persistence.ts
export class SQLiteVectorPersistence {
  // Store embeddings in SQLite for durability
  // Load into VectraJS on startup
  // Sync changes periodically
}
```

### Step 4: Indexing Pipeline

- [ ] **4.1 Indexing Service**

```typescript
// src/application/services/indexing-service.ts
export class IndexingService {
  constructor(
    private noteRepository: NoteRepository,
    private chunkingService: ChunkingService,
    private embeddingPort: EmbeddingPort,
    private vectorStore: VectorStorePort,
  ) {}
  
  async indexVault(options: IndexingOptions) {
    // 1. Load all notes
    // 2. Check which need indexing (hash comparison)
    // 3. Chunk new/modified notes
    // 4. Generate embeddings
    // 5. Store in vector database
    // 6. Update metadata
  }
  
  async indexNote(note: Note) {
    // Incremental indexing for single note
  }
}
```

- [ ] **4.2 Progress Tracking**

```typescript
// src/application/services/indexing-progress.ts
export class IndexingProgress extends EventEmitter {
  private total = 0;
  private completed = 0;
  
  start(total: number) {
    this.total = total;
    this.emit('start', { total });
  }
  
  update(completed: number) {
    this.completed = completed;
    this.emit('progress', {
      completed,
      total: this.total,
      percentage: (completed / this.total) * 100,
    });
  }
}
```

### Step 5: Hybrid Search Implementation

- [ ] **5.1 Semantic Search UseCase**

```typescript
// src/application/use-cases/semantic-search-use-case.ts
export class SemanticSearchUseCase {
  constructor(
    private embeddingPort: EmbeddingPort,
    private vectorStore: VectorStorePort,
    private noteRepository: NoteRepository,
  ) {}
  
  async search(query: string, limit: number): Promise<SearchResult[]> {
    // 1. Embed query
    const queryVector = await this.embeddingPort.embed(query);
    
    // 2. Vector search
    const vectorResults = await this.vectorStore.search(queryVector, limit * 2);
    
    // 3. Retrieve full notes
    // 4. Re-rank if needed
    // 5. Return results
  }
}
```

- [ ] **5.2 Hybrid Search Combiner**

```typescript
// src/application/use-cases/hybrid-search-use-case.ts
export class HybridSearchUseCase {
  constructor(
    private keywordSearch: SearchVaultUseCase,  // Phase 1
    private semanticSearch: SemanticSearchUseCase, // Phase 2
  ) {}
  
  async search(query: string, options: HybridOptions): Promise<SearchResult[]> {
    // Run both searches in parallel
    const [keywordResults, semanticResults] = await Promise.all([
      this.keywordSearch.execute({ query, limit: options.limit }),
      this.semanticSearch.search(query, options.limit),
    ]);
    
    // Combine with weights
    return this.rankResults(
      keywordResults,
      semanticResults,
      options.keywordWeight, // 0.3
      options.semanticWeight, // 0.7
    );
  }
}
```

### Step 6: MCP Integration

- [ ] **6.1 Enhanced MCP Tools**

```typescript
// src/infrastructure/mcp/enhanced-tools.ts
export const SEMANTIC_SEARCH_TOOL = {
  name: 'semantic_search',
  description: 'Search notes by meaning, not just keywords',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Natural language query' },
      mode: {
        type: 'string',
        enum: ['keyword', 'semantic', 'hybrid'],
        default: 'hybrid',
      },
      limit: { type: 'number', default: 20 },
    },
  },
};
```

- [ ] **6.2 Configuration**

```typescript
// config.json additions
{
  "semanticSearch": {
    "enabled": true,
    "modelName": "Xenova/all-MiniLM-L6-v2",
    "chunkSize": 512,
    "chunkOverlap": 64,
    "hybridWeights": {
      "keyword": 0.3,
      "semantic": 0.7
    }
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
// test/domain/services/chunking-service.test.ts
describe('ChunkingService', () => {
  it('should respect markdown headers');
  it('should maintain overlap between chunks');
  it('should handle edge cases');
});

// test/domain/embedding.test.ts  
describe('Embedding', () => {
  it('should calculate cosine similarity correctly');
  it('should handle zero vectors');
});
```

### Integration Tests

```typescript
// test/integration/semantic-search.test.ts
describe('Semantic Search Integration', () => {
  it('should find semantically similar notes');
  it('should combine keyword and semantic results');
  it('should handle incremental indexing');
});
```

### Performance Tests

```typescript
// test/performance/indexing.bench.ts
describe('Indexing Performance', () => {
  it('should index 100 notes in under 30 seconds');
  it('should search 1000 chunks in under 50ms');
});
```

## Rollout Plan

### Phase 2.1: Foundation (Week 1)
- [x] Embedding service with Transformers.js
- [x] Smart chunking (markdown-aware)
- [x] Vector store setup

### Phase 2.2: Smart Features (Week 2)
- [x] Markdown-aware chunking (completed in Phase 2.1)
- [ ] Incremental indexing
- [ ] Progress tracking

### Phase 2.3: Integration (Week 3)
- [ ] Hybrid search
- [ ] MCP tool updates
- [ ] Configuration UI

### Phase 2.4: Optimization (Week 4)
- [ ] Performance tuning
- [ ] Caching layer
- [ ] Background indexing

## Success Metrics

- Semantic search finds 80%+ relevant results without exact keywords
- Indexing completes in <5 minutes for 1000 notes
- Search latency stays under 200ms
- Memory usage under 500MB
- User reports improved search quality

## Dependencies

```json
{
  "dependencies": {
    "@xenova/transformers": "^2.17.0",
    "vectra": "^0.9.0",
    "better-sqlite3": "^11.0.0"
  }
}
```

## Next Steps

1. Install dependencies
2. Create embedding service
3. Implement basic chunking
4. Set up vector store
5. Build indexing pipeline
6. Add semantic search
7. Integrate with existing system

Ready to start building! 🚀