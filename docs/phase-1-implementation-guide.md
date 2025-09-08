# Phase 1 Implementation Guide - Standalone RAG System

## Implementation Progress Tracker

### 🎯 Current Status: Building Infrastructure Layer

#### Domain Layer (Pure Business Logic) ✅
- [x] **Note Entity** 
  - [x] Test: Tag detection (case-insensitive)
  - [x] Test: Query matching in title/content
  - [x] Implementation: Basic Note class with behaviors
- [x] **SearchResult Entity**
  - [x] Test: Score calculation based on matches
  - [x] Test: Field match identification
  - [x] Test: Tag match handling
  - [x] Implementation: SearchResult with scoring logic
- [x] **NoteSearcher Service**
  - [x] Test: Finding notes by query
  - [x] Test: Ranking by relevance
  - [x] Test: Empty results handling
  - [x] Test: Case-insensitive search
  - [x] Test: Result limiting
  - [x] Implementation: Domain search logic

#### Application Layer (Use Cases) ✅
- [x] **SearchVaultUseCase**
  - [x] Test: Search with repository integration
  - [x] Test: Empty query handling
  - [x] Test: Limit parameter
  - [x] Test: Error handling
  - [x] Implementation: Wire domain to ports
- [x] **GetNoteUseCase**
  - [x] Test: Retrieve by path
  - [x] Test: Non-existent path handling
  - [x] Test: Special characters in path
  - [x] Implementation: Single note retrieval
- [x] **ListNotesUseCase**
  - [x] Test: List all notes
  - [x] Test: Filter by folder
  - [x] Test: Sort by modified date
  - [x] Implementation: Note listing logic

#### Infrastructure Layer (Adapters) ✅
- [x] **FileNoteRepository**
  - [x] Test: Load notes from file system
  - [x] Test: Parse frontmatter
  - [x] Test: Extract tags and links
  - [x] Test: Ignore specified folders
  - [x] Implementation: File system integration with gray-matter
- [x] **InMemoryCacheAdapter**
  - [x] Test: Cache hit/miss
  - [x] Test: LRU eviction
  - [x] Test: Cache statistics
  - [x] Implementation: LRU caching with statistics
- [x] **MCPServerAdapter**
  - [x] Test: Protocol translation
  - [x] Test: Error handling
  - [x] Test: Tool registration
  - [x] Test: Resource listing
  - [x] Implementation: Full MCP protocol integration

#### Integration & Entry Point ✅
- [x] **Composition Root**
  - [x] Wire all dependencies
  - [x] Configure from config.json with Zod validation
- [x] **Integration Tests**
  - [x] End-to-end MCP protocol tests
  - [x] Tool invocation tests
  - [x] Resource reading tests
- [x] **Main Entry Point**
  - [x] Server initialization
  - [x] STDIO transport setup
  - [x] Graceful shutdown handling

### 📊 Phase 1 Completion Metrics

**Domain Layer**: 100% ✅ (3/3 components)
**Application Layer**: 100% ✅ (3/3 components)  
**Infrastructure Layer**: 100% ✅ (3/3 components)
**Integration**: 100% ✅ (3/3 components)

**Overall Progress**: 100% complete 🎉

---

## Overview

Phase 1 delivers a standalone MCP server that provides RAG functionality for your Obsidian vault. No plugin needed - just a Bun-powered service that reads your markdown files directly and exposes them to AI assistants via MCP.

## Phase 1 Scope

### What's Included (from PRD)
- ✅ **Keyword search** - Basic text matching across note content
- ✅ **Simple retrieval** - Get notes by path, list notes by folder
- ✅ **Basic MCP server** - STDIO transport with essential tools
- ✅ **File-based operations** - Direct file system access
- ✅ **File watching** - Auto-update when vault changes
- ✅ **Basic caching** - In-memory cache for performance

### What's NOT Included (Phase 2+)
- ❌ Semantic search with embeddings
- ❌ Vector database
- ❌ Graph traversal and link analysis
- ❌ Smart chunking strategies
- ❌ HTTP/SSE transport
- ❌ Advanced context building
- ❌ Connection analysis
- ❌ Context extraction tools

## Technical Architecture - Hexagonal Design

### High-Level Architecture

We follow **Hexagonal Architecture** (Ports and Adapters) to ensure clean separation of concerns, testability, and maintainability.

```
┌──────────────────────────────────────────────────────┐
│              PRIMARY/DRIVING SIDE                     │
│                                                       │
│  ┌─────────────────────────────────────────┐         │
│  │     MCP Client (Claude, etc)            │         │
│  └──────────────┬──────────────────────────┘         │
│                 │ STDIO Protocol                      │
│                 ▼                                     │
│  ┌─────────────────────────────────────────┐         │
│  │     MCP Server Adapter (Primary)        │         │
│  │  - Translates MCP protocol to use cases │         │
│  └──────────────┬──────────────────────────┘         │
│                 │                                     │
└─────────────────┼─────────────────────────────────────┘
                  │
     ┌────────────▼────────────────────────┐
     │      APPLICATION LAYER              │
     │                                     │
     │  ┌──────────────────────────────┐  │
     │  │    Primary Ports (Use Cases) │  │
     │  │  - SearchVaultUseCase        │  │
     │  │  - GetNoteUseCase           │  │
     │  │  - ListNotesUseCase         │  │
     │  └──────────┬───────────────────┘  │
     │             │                       │
     │             ▼                       │
     │  ┌──────────────────────────────┐  │
     │  │      DOMAIN CORE             │  │
     │  │  (Pure Business Logic)       │  │
     │  │  - Note entity              │  │
     │  │  - SearchResult entity      │  │
     │  │  - NoteSearcher service     │  │
     │  │  - NoteRanker service       │  │
     │  └──────────┬───────────────────┘  │
     │             │                       │
     │             ▼                       │
     │  ┌──────────────────────────────┐  │
     │  │   Secondary Ports            │  │
     │  │  - NoteRepository interface  │  │
     │  │  - FileSystemPort interface  │  │
     │  │  - CachePort interface       │  │
     │  └──────────────────────────────┘  │
     │                                     │
     └────────────┬────────────────────────┘
                  │
┌─────────────────┼─────────────────────────────────────┐
│                 │                                      │
│                 ▼                                      │
│  ┌─────────────────────────────────────────┐         │
│  │     Secondary Adapters                   │         │
│  │  - FileNoteRepository                   │         │
│  │  - BunFileSystemAdapter                 │         │
│  │  - InMemoryCacheAdapter                 │         │
│  └──────────────┬──────────────────────────┘         │
│                 │                                      │
│                 ▼                                      │
│  ┌─────────────────────────────────────────┐         │
│  │     External Systems                     │         │
│  │  - File System (Obsidian Vault)         │         │
│  │  - File Watcher (chokidar)              │         │
│  └─────────────────────────────────────────┘         │
│                                                       │
│              SECONDARY/DRIVEN SIDE                    │
└───────────────────────────────────────────────────────┘
```

### Directory Structure Following Hexagonal Architecture

```
src/
├── domain/                 # Pure business logic (no dependencies)
│   ├── entities/
│   │   ├── Note.ts
│   │   ├── Note.test.ts   # Co-located test
│   │   ├── SearchResult.ts
│   │   └── SearchResult.test.ts
│   └── services/
│       ├── NoteSearcher.ts
│       ├── NoteSearcher.test.ts
│       ├── NoteRanker.ts
│       └── NoteRanker.test.ts
│
├── application/            # Application layer
│   ├── ports/
│   │   ├── primary/       # Driving ports (use cases)
│   │   │   ├── SearchVaultUseCase.ts
│   │   │   ├── GetNoteUseCase.ts
│   │   │   └── ListNotesUseCase.ts
│   │   └── secondary/     # Driven ports (interfaces)
│   │       ├── NoteRepository.ts
│   │       ├── FileSystemPort.ts
│   │       └── CachePort.ts
│   └── use-cases/         # Use case implementations
│       ├── SearchVaultUseCaseImpl.ts
│       ├── SearchVaultUseCaseImpl.test.ts
│       ├── GetNoteUseCaseImpl.ts
│       ├── GetNoteUseCaseImpl.test.ts
│       ├── ListNotesUseCaseImpl.ts
│       └── ListNotesUseCaseImpl.test.ts
│
├── infrastructure/         # Adapters and external concerns
│   ├── adapters/
│   │   ├── primary/       # Driving adapters
│   │   │   ├── MCPServerAdapter.ts
│   │   │   └── MCPServerAdapter.test.ts
│   │   └── secondary/     # Driven adapters
│   │       ├── FileNoteRepository.ts
│   │       ├── FileNoteRepository.test.ts
│   │       ├── BunFileSystemAdapter.ts
│   │       ├── BunFileSystemAdapter.test.ts
│   │       ├── InMemoryCacheAdapter.ts
│   │       └── InMemoryCacheAdapter.test.ts
│   ├── config/
│   │   └── ConfigLoader.ts
│   └── composition/       # Dependency injection
│       └── CompositionRoot.ts
│
└── index.ts               # Entry point - wires everything

test/                      # Test-specific code
├── helpers/               # Shared test utilities
│   ├── MockFileSystem.ts
│   ├── TestDataBuilder.ts
│   └── InMemoryNoteRepository.ts
└── integration/           # Integration tests
    ├── mcp-protocol.integration.test.ts
    ├── file-watching.integration.test.ts
    └── vault-operations.integration.test.ts
```

## TDD Implementation Approach

### Our Development Process

**ALWAYS follow Red-Green-Refactor:**

1. **RED**: Write a failing test for the behavior you want
2. **GREEN**: Write the simplest code that makes the test pass (dirty code is OK!)
3. **REFACTOR**: Clean up the code without adding new tests

### Key Principles We Follow

- **Test behaviors, not implementation details**
- **Start with domain tests** (they need no mocks!)
- **Mock only at boundaries** (secondary ports)
- **Co-locate tests with source code**
- **Integration tests go in test/ folder**

### Order of Implementation

1. **Domain Layer First** (Pure logic, no dependencies)
   - Write tests for entities and services
   - Implement with simple code
   - Refactor for cleanliness

2. **Application Layer** (Use cases)
   - Test with mock repositories
   - Wire domain services together
   - Keep orchestration simple

3. **Infrastructure Layer** (Adapters)
   - Test adapters minimally (they're mostly glue)
   - Focus on configuration and setup
   - Real I/O goes here

4. **Integration Tests**
   - Test complete flows
   - Use in-memory implementations
   - Verify everything connects

## Implementation Steps

### Step 1: Project Setup with Hexagonal Structure

```bash
# Clone or create the project directory
# If cloning: git clone <repository-url> obsidian-rag-server
# If creating new:
mkdir -p obsidian-rag-server
cd obsidian-rag-server

# Initialize with Bun
bun init -y

# Create hexagonal architecture directories
mkdir -p src/domain/{entities,services}
mkdir -p src/application/ports/{primary,secondary}
mkdir -p src/application/use-cases
mkdir -p src/infrastructure/adapters/{primary,secondary}
mkdir -p src/infrastructure/{config,composition}
mkdir -p test/{helpers,integration}

# Install dependencies
bun add @modelcontextprotocol/sdk gray-matter chokidar
bun add -D @types/node typescript @biomejs/biome
```

### Step 2: Configuration

Create `config.json`:
```json
{
  "vaultPath": "../",  // Path to your Obsidian vault relative to this project
  "ignoredFolders": [".obsidian", ".trash", "obsidian-rag-server"],
  "cacheSize": 1000,
  "searchLimit": 50
}
```

**Configuration Notes:**
- `vaultPath` can be either relative (e.g., `"../"` if server is inside vault) or absolute
- Environment variable `VAULT_PATH` overrides the config file setting
- Ignored folders prevent indexing of non-content directories
- Adjust `cacheSize` based on your vault size and available memory

### Step 3: Start with Domain Tests (TDD Red Phase)

Following TDD, we write tests FIRST for the behaviors we want, then implement.

#### Test First: Note Entity Behaviors

Create `src/domain/entities/note.test.ts`:
```typescript
import { describe, test, expect } from 'bun:test';
import { Note } from './note';

describe('Note entity', () => {
  test('should detect if note has a specific tag', () => {
    const note = new Note(
      'test.md',
      'Test Note',
      'Content',
      {},
      ['javascript', 'testing'],
      [],
      new Date(),
      new Date(),
    );
    
    expect(note.hasTag('javascript')).toBe(true);
    expect(note.hasTag('JavaScript')).toBe(true); // Case insensitive
    expect(note.hasTag('python')).toBe(false);
  });
  
  test('should match query in title or content', () => {
    const note = new Note(
      'test.md',
      'JavaScript Guide',
      'Learn about TypeScript and JavaScript',
      {},
      [],
      [],
      new Date(),
      new Date(),
    );
    
    expect(note.matchesQuery('JavaScript')).toBe(true);
    expect(note.matchesQuery('typescript')).toBe(true); // Case insensitive
    expect(note.matchesQuery('python')).toBe(false);
  });
});
```

**Run the test - it should FAIL (Red phase):**
```bash
bun test src/domain/entities/note.test.ts
# ❌ Tests fail - Note class doesn't exist yet
```

#### Green Phase: Minimal Implementation

NOW create `src/domain/entities/note.ts` with the simplest code to pass:
```typescript
// Quick and dirty - just make tests pass!
export class Note {
  constructor(
    public readonly path: string,
    public readonly title: string,
    public readonly content: string,
    public readonly frontmatter: Record<string, any>,
    public readonly tags: string[],
    public readonly links: string[],
    public readonly modified: Date,
    public readonly created: Date,
  ) {}
  
  hasTag(tag: string): boolean {
    // Simplest thing that works
    const lower = tag.toLowerCase();
    return this.tags.some(t => t.toLowerCase() === lower);
  }
  
  matchesQuery(query: string): boolean {
    // Quick implementation
    const q = query.toLowerCase();
    return this.title.toLowerCase().includes(q) ||
           this.content.toLowerCase().includes(q);
  }
}
```

**Run tests again - they should PASS (Green phase):**
```bash
bun test src/domain/entities/note.test.ts
# ✅ Tests pass!
```

#### Refactor Phase: Clean Up (Optional)

The implementation is already clean for this simple entity, but if needed, refactor WITHOUT adding new tests.

#### Test First: SearchResult Behaviors

Create `src/domain/entities/search-result.test.ts`:
```typescript
import { describe, test, expect } from 'bun:test';
import { SearchResult } from './search-result';
import { Note } from './note';

describe('SearchResult entity', () => {
  const testNote = new Note(
    'test.md',
    'Test',
    'This is a long content with the word JavaScript in the middle of it.',
    {},
    [],
    [],
    new Date(),
    new Date(),
  );
  
  test('should create search result with snippet around query match', () => {
    const result = SearchResult.create(testNote, 75, 'JavaScript');
    
    expect(result.note).toBe(testNote);
    expect(result.score).toBe(75);
    expect(result.snippet).toContain('JavaScript');
    expect(result.snippet).toContain('...');
  });
  
  test('should handle query not found in content', () => {
    const result = SearchResult.create(testNote, 10, 'Python');
    
    expect(result.snippet).toContain('This is a long content');
    expect(result.snippet).toEndWith('...');
  });
});
```

**Red → Green → Refactor:**

Then create `src/domain/entities/search-result.ts`:
```typescript
import { Note } from './note';

export class SearchResult {
  constructor(
    public readonly note: Note,
    public readonly score: number,
    public readonly snippet: string,
  ) {}
  
  static create(note: Note, score: number, query: string): SearchResult {
    // Quick implementation to pass tests
    const content = note.content;
    const index = content.toLowerCase().indexOf(query.toLowerCase());
    
    let snippet: string;
    if (index === -1) {
      snippet = content.slice(0, 150) + '...';
    } else {
      const start = Math.max(0, index - 50);
      const end = Math.min(content.length, index + query.length + 50);
      snippet = '...' + content.slice(start, end) + '...';
    }
    
    return new SearchResult(note, score, snippet);
  }
}
```

### Step 4: Domain Service - Search Behavior

#### Test First: Note Search Behaviors

Create `src/domain/services/note-searcher.test.ts`:
```typescript
import { describe, test, expect } from 'bun:test';
import { NoteSearcher } from './note-searcher';
import { Note } from '../entities/note';

describe('NoteSearcher', () => {
  const searcher = new NoteSearcher();
  
  const notes = [
    new Note('exact.md', 'JavaScript', 'Content', {}, [], [], new Date(), new Date()),
    new Note('partial.md', 'Guide', 'Learn JavaScript here', {}, [], [], new Date(), new Date()),
    new Note('tagged.md', 'Tagged', 'Content', {}, ['javascript'], [], new Date(), new Date()),
    new Note('unrelated.md', 'Python', 'Python content', {}, [], [], new Date(), new Date()),
  ];
  
  test('returns empty array for empty query', () => {
    const results = searcher.search(notes, '');
    expect(results).toEqual([]);
  });
  
  test('finds notes matching query', () => {
    const results = searcher.search(notes, 'JavaScript');
    
    expect(results).toHaveLength(3);
    expect(results[0].note.path).toBe('exact.md'); // Title match scores highest
  });
  
  test('ranks exact title matches highest', () => {
    const results = searcher.search(notes, 'JavaScript');
    
    expect(results[0].note.title).toBe('JavaScript');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });
  
  test('respects search limit', () => {
    const results = searcher.search(notes, 'JavaScript', 2);
    expect(results).toHaveLength(2);
  });
  
  test('includes tag matches in results', () => {
    const results = searcher.search(notes, 'javascript');
    const paths = results.map(r => r.note.path);
    
    expect(paths).toContain('tagged.md');
  });
});
```

#### Green Phase: Quick Implementation

Create `src/domain/services/note-searcher.ts`:
```typescript
import { Note } from '../entities/note';
import { SearchResult } from '../entities/search-result';

export class NoteSearcher {
  search(notes: Note[], query: string, limit: number = 50): SearchResult[] {
    // Quick and dirty - just pass the tests!
    if (!query.trim()) return [];
    
    const q = query.toLowerCase();
    const scored = notes
      .filter(note => {
        // Check if matches
        return note.title.toLowerCase().includes(q) ||
               note.content.toLowerCase().includes(q) ||
               note.tags.some(tag => tag.toLowerCase().includes(q));
      })
      .map(note => {
        // Calculate score - simple version
        let score = 0;
        const titleLower = note.title.toLowerCase();
        
        if (titleLower === q) score = 100;
        else if (titleLower.includes(q)) score = 50;
        
        if (note.content.toLowerCase().includes(q)) score += 10;
        if (note.tags.some(tag => tag.toLowerCase().includes(q))) score += 30;
        
        return SearchResult.create(note, score, query);
      });
    
    // Sort and limit
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
```

#### Refactor Phase: Extract Score Calculation

NOW we can refactor to cleaner code (tests still pass):
```typescript
export class NoteSearcher {
  search(notes: Note[], query: string, limit: number = 50): SearchResult[] {
    if (!query.trim()) return [];
    
    return notes
      .filter(note => this.matches(note, query))
      .map(note => SearchResult.create(note, this.calculateScore(note, query), query))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  private matches(note: Note, query: string): boolean {
    const q = query.toLowerCase();
    return note.matchesQuery(query) || 
           note.tags.some(tag => tag.toLowerCase().includes(q));
  }
  
  private calculateScore(note: Note, query: string): number {
    const q = query.toLowerCase();
    let score = 0;
    
    // Title scoring
    const titleLower = note.title.toLowerCase();
    if (titleLower === q) score += 100;
    else if (titleLower.includes(q)) score += 50;
    
    // Content scoring
    const matches = (note.content.toLowerCase().match(new RegExp(q, 'g')) || []).length;
    score += matches * 10;
    
    // Tag scoring
    if (note.tags.some(tag => tag.toLowerCase().includes(q))) {
      score += 30;
    }
    
    return score;
  }
}
```

### Step 5: Application Layer - Use Cases with TDD

#### Test First: Search Vault Use Case

Create `src/application/use-cases/search-vault-use-case-impl.test.ts`:
```typescript
import { describe, test, expect, beforeEach } from 'bun:test';
import { SearchVaultUseCaseImpl } from './search-vault-use-case-impl';
import { Note } from '../../domain/entities/note';
import type { NoteRepository } from '../ports/secondary/note-repository';

describe('SearchVaultUseCase', () => {
  let useCase: SearchVaultUseCaseImpl;
  let mockRepository: NoteRepository;
  
  beforeEach(() => {
    // Create a simple mock - no fancy mocking library needed!
    mockRepository = {
      findAll: async () => [
        new Note('test1.md', 'JavaScript Guide', 'Learn JS', {}, [], [], new Date(), new Date()),
        new Note('test2.md', 'Python Guide', 'Learn Python', {}, [], [], new Date(), new Date()),
      ],
      findByPath: async () => null,
      findByFolder: async () => [],
      getAllTags: async () => new Map(),
      getRecentlyModified: async () => [],
    };
    
    useCase = new SearchVaultUseCaseImpl(mockRepository);
  });
  
  test('searches notes and returns ranked results', async () => {
    const results = await useCase.execute('JavaScript');
    
    expect(results).toHaveLength(1);
    expect(results[0].note.title).toBe('JavaScript Guide');
  });
  
  test('returns empty array when no matches', async () => {
    const results = await useCase.execute('Ruby');
    expect(results).toEqual([]);
  });
  
  test('respects limit parameter', async () => {
    const results = await useCase.execute('Guide', 1);
    expect(results).toHaveLength(1);
  });
});
```

#### Green Phase: Implement Use Case

Create `src/application/use-cases/search-vault-use-case-impl.ts`:
```typescript
import { SearchVaultUseCase } from '../ports/primary/search-vault-use-case';
import { NoteRepository } from '../ports/secondary/note-repository';
import { NoteSearcher } from '../../domain/services/note-searcher';
import { SearchResult } from '../../domain/entities/search-result';

export class SearchVaultUseCaseImpl implements SearchVaultUseCase {
  private searcher = new NoteSearcher();
  
  constructor(private repository: NoteRepository) {}
  
  async execute(query: string, limit: number = 50): Promise<SearchResult[]> {
    // Simple implementation - just wire together domain and repository
    const notes = await this.repository.findAll();
    return this.searcher.search(notes, query, limit);
  }
}
```

#### Define the Ports (Interfaces)

Create `src/application/ports/primary/search-vault-use-case.ts`:
```typescript
import { SearchResult } from '../../../domain/entities/search-result';

export interface SearchVaultUseCase {
  execute(query: string, limit?: number): Promise<SearchResult[]>;
}
```

Create `src/application/ports/secondary/note-repository.ts`:
```typescript
import { Note } from '../../../domain/entities/note';

export interface NoteRepository {
  findAll(): Promise<Note[]>;
  findByPath(path: string): Promise<Note | null>;
  findByFolder(folder: string): Promise<Note[]>;
  getAllTags(): Promise<Map<string, number>>;
  getRecentlyModified(limit: number): Promise<Note[]>;
}
```

### Step 6: Infrastructure Layer - Adapters

#### Test Helper: In-Memory Repository for Testing

Create `test/helpers/in-memory-note-repository.ts`:
```typescript
import type { NoteRepository } from '../../src/application/ports/secondary/note-repository';
import { Note } from '../../src/domain/entities/note';

export class InMemoryNoteRepository implements NoteRepository {
  private notes: Note[] = [];
  
  async findAll(): Promise<Note[]> {
    return [...this.notes];
  }
  
  async findByPath(path: string): Promise<Note | null> {
    return this.notes.find(n => n.path === path) || null;
  }
  
  async findByFolder(folder: string): Promise<Note[]> {
    return this.notes.filter(n => n.path.startsWith(folder));
  }
  
  async getAllTags(): Promise<Map<string, number>> {
    const tags = new Map<string, number>();
    for (const note of this.notes) {
      for (const tag of note.tags) {
        tags.set(tag, (tags.get(tag) || 0) + 1);
      }
    }
    return tags;
  }
  
  async getRecentlyModified(limit: number): Promise<Note[]> {
    return [...this.notes]
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
      .slice(0, limit);
  }
  
  // Test helper methods
  seed(notes: Note[]): void {
    this.notes = notes;
  }
  
  clear(): void {
    this.notes = [];
  }
}
```

### Step 7: MCP Server Implementation

Create `src/mcp/server.ts`:

## Phase 1 MCP Endpoints Implementation Order

### Priority 1: Core Tools (Implement First)

#### 1. `search_vault` Tool
**Purpose**: Keyword search across all notes
**Success Criteria**:
- ✅ Returns results for exact word matches
- ✅ Returns results for partial word matches
- ✅ Results include note path, title, and snippet
- ✅ Results are ranked by relevance (title matches > content matches)
- ✅ Respects the configured search limit (default: 50)
- ✅ Completes search in <200ms for 1000 notes
- ✅ Handles special characters gracefully

#### 2. `get_note` Tool
**Purpose**: Retrieve complete note content by path
**Success Criteria**:
- ✅ Returns full note content for valid path
- ✅ Includes parsed frontmatter as separate field
- ✅ Returns extracted tags array
- ✅ Returns extracted links array
- ✅ Returns null/error for non-existent paths
- ✅ Handles paths with spaces and special characters

#### 3. `list_notes` Tool
**Purpose**: List notes with optional folder filtering
**Success Criteria**:
- ✅ Returns all notes when no folder specified
- ✅ Filters by folder path when provided
- ✅ Returns note metadata (path, title, modified date)
- ✅ Sorted by modified date (newest first)
- ✅ Respects .gitignore and ignored folders
- ✅ Handles nested folder paths correctly

### Priority 2: Core Resources (Implement Second)

#### 1. `obsidian://vault/info` Resource
**Purpose**: Basic vault statistics
**Success Criteria**:
- ✅ Returns total note count
- ✅ Returns vault path
- ✅ Returns last update timestamp
- ✅ Returns total tags count
- ✅ Updates after file changes

#### 2. `obsidian://vault/tags` Resource
**Purpose**: List all unique tags
**Success Criteria**:
- ✅ Returns alphabetically sorted tag list
- ✅ Includes tag occurrence counts
- ✅ Extracts both #inline and frontmatter tags
- ✅ Updates when notes are modified

#### 3. `obsidian://vault/recent` Resource
**Purpose**: Recently modified notes
**Success Criteria**:
- ✅ Returns last 30 modified notes
- ✅ Sorted by modification time (newest first)
- ✅ Includes basic metadata (path, title, modified)
- ✅ Updates in real-time with file changes

### Step 8: Integration - Wiring Everything Together

#### Integration Test First

Create `test/integration/search-flow.integration.test.ts`:
```typescript
import { describe, test, expect, beforeEach } from 'bun:test';
import { SearchVaultUseCaseImpl } from '../../src/application/use-cases/search-vault-use-case-impl';
import { InMemoryNoteRepository } from '../helpers/in-memory-note-repository';
import { Note } from '../../src/domain/entities/note';

describe('Search flow integration', () => {
  let repository: InMemoryNoteRepository;
  let searchUseCase: SearchVaultUseCaseImpl;
  
  beforeEach(() => {
    repository = new InMemoryNoteRepository();
    searchUseCase = new SearchVaultUseCaseImpl(repository);
    
    // Seed test data
    repository.seed([
      new Note(
        'projects/web-app.md',
        'Web App Project',
        'Building a React application with TypeScript',
        { status: 'active' },
        ['javascript', 'react', 'typescript'],
        [],
        new Date('2024-01-15'),
        new Date('2024-01-01'),
      ),
      new Note(
        'notes/typescript-tips.md',
        'TypeScript Tips',
        'Advanced TypeScript patterns and tricks',
        {},
        ['typescript', 'programming'],
        [],
        new Date('2024-01-10'),
        new Date('2024-01-05'),
      ),
    ]);
  });
  
  test('complete search flow works end-to-end', async () => {
    const results = await searchUseCase.execute('TypeScript');
    
    expect(results).toHaveLength(2);
    expect(results[0].note.title).toBe('TypeScript Tips'); // Exact title match
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[0].snippet).toContain('TypeScript');
  });
});
```

### Step 9: Main Entry Point

Create `src/index.ts`:

```typescript
#!/usr/bin/env bun

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { VaultService } from './services/vault-service.js';
import { setupHandlers } from './mcp/handlers.js';
import config from '../config.json';

async function main() {
  // Initialize vault service
  const vaultService = new VaultService(config);
  await vaultService.initialize();
  
  // Create MCP server
  const server = new Server(
    {
      name: 'obsidian-rag',
      version: '0.1.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );
  
  // Setup handlers
  setupHandlers(server, vaultService);
  
  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Obsidian RAG MCP Server running');
  console.error(`Vault: ${path.resolve(config.vaultPath)}`);
  console.error(`Notes: ${vaultService.getNoteCount()}`);
}

main().catch(console.error);
```

## File Structure

```
obsidian-rag-server/
├── src/
│   ├── index.ts                # Entry point
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   ├── services/
│   │   └── vault-service.ts    # Vault operations
│   ├── mcp/
│   │   ├── server.ts           # MCP server setup
│   │   └── handlers.ts         # Request handlers
│   └── utils/
│       ├── markdown.ts         # Markdown parsing
│       ├── search.ts           # Search algorithms
│       └── cache.ts            # LRU cache
├── config.json                 # User configuration
├── package.json
├── tsconfig.json
├── bun.lockb
└── README.md
```

## Running the Server

### Development Mode

```bash
# Watch mode with auto-restart
bun run --watch src/index.ts
```

### Production Mode

```bash
# Build and run
bun build src/index.ts --target=bun --outfile=dist/server.js
bun run dist/server.js
```

### Integration with Claude Desktop

Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "obsidian-rag": {
      "command": "bun",
      "args": ["run", "<absolute-path-to-project>/obsidian-rag-server/src/index.ts"],
      "env": {
        "VAULT_PATH": "<absolute-path-to-your-vault>"
      }
    }
  }
}
```

## Testing Strategy

### Phase 1 Success Criteria

**Phase 1 is complete when ALL of the following are verified:**

#### Core Functionality
- [ ] Server starts and connects to Claude Desktop without errors
- [ ] All 3 tools (`search_vault`, `get_note`, `list_notes`) respond correctly
- [ ] All 3 resources (`vault/info`, `vault/tags`, `vault/recent`) return valid data
- [ ] File watching detects changes within 1 second

#### Performance Requirements
- [ ] Search completes in <200ms for test vault
- [ ] Initial vault load completes in <5 seconds
- [ ] Memory usage stays below 100MB for typical vault
- [ ] No memory leaks during 1-hour continuous operation

### Manual Testing Checklist

1. **Server Startup**
   - [ ] Server starts without errors
   - [ ] Loads all notes from vault
   - [ ] Reports correct note count
   - [ ] Connects to Claude Desktop successfully

2. **Tool: search_vault**
   - [ ] Returns results for single keyword
   - [ ] Returns results for multiple keywords
   - [ ] Ranks title matches higher than content matches
   - [ ] Returns snippets with search term highlighted
   - [ ] Respects search limit parameter
   - [ ] Handles special characters gracefully

3. **Tool: get_note**
   - [ ] Returns complete note content
   - [ ] Includes parsed frontmatter
   - [ ] Returns extracted tags array
   - [ ] Returns extracted links array
   - [ ] Handles non-existent paths gracefully
   - [ ] Works with paths containing spaces

4. **Tool: list_notes**
   - [ ] Returns all notes when no folder specified
   - [ ] Filters by folder correctly
   - [ ] Returns notes sorted by modified date
   - [ ] Includes note metadata
   - [ ] Respects ignored folders

5. **Resources**
   - [ ] vault/info returns accurate statistics
   - [ ] vault/tags returns all unique tags with counts
   - [ ] vault/recent returns 30 most recent notes
   - [ ] All resources update after file changes

6. **File Watching**
   - [ ] New files detected and indexed
   - [ ] Modified files updated in cache
   - [ ] Deleted files removed from index
   - [ ] Ignores non-markdown files
   - [ ] Ignores configured folders

### Performance Targets

- Search completes in <200ms for 1000 notes
- Initial load <5 seconds for 1000 notes
- Memory usage <100MB for 1000 notes
- File change detection <1 second

## Test-Driven Development Strategy

### File System Abstraction for Testing

Abstract file system operations behind an interface to enable fast, deterministic testing:

```typescript
// src/services/file-system.interface.ts
export interface FileSystemAdapter {
  readFile(path: string): Promise<string>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<FileStats>;
  exists(path: string): Promise<boolean>;
  watch?(path: string, callback: (event: string, filename: string) => void): void;
}

// src/services/vault-service.ts - Constructor with dependency injection
export class VaultService {
  constructor(
    private config: VaultConfig,
    fileSystem?: FileSystemAdapter // Optional injection for testing
  ) {
    this.fileSystem = fileSystem || new RealFileSystem();
  }
}
```

**Key Benefits:**
- Unit tests run 10-100x faster (no I/O)
- Tests are deterministic and isolated
- Easy to simulate edge cases and errors
- Production code uses `RealFileSystem`, tests use `MockFileSystem`

### Test Structure Examples

```typescript
// Basic test setup with mock file system
describe('search_vault tool', () => {
  let mockFS: MockFileSystem;
  let vaultService: VaultService;

  beforeEach(async () => {
    mockFS = new MockFileSystem(); // Pre-seeded with test data
    vaultService = new VaultService(config, mockFS);
    await vaultService.initialize();
  });

  test('finds notes by keyword', async () => {
    const results = await vaultService.searchNotes('test');
    expect(results.length).toBeGreaterThan(0);
  });
  
  test('completes search within 200ms', async () => {
    const start = performance.now();
    await vaultService.searchNotes('project');
    expect(performance.now() - start).toBeLessThan(200);
  });
});
```

### Test Data Structure

The mock should seed a standard vault structure:
```
/
├── daily/          # Daily notes with dates, tasks
├── projects/       # Active projects with tags
├── areas/          # Ongoing areas of responsibility
├── resources/      # Reference materials
└── archive/        # Completed/archived content
```

Each test note should include:
- Frontmatter (title, tags, dates)
- Hashtags (#tag)
- Wikilinks ([[other-note]])
- Mixed content (headers, lists, paragraphs)

### TDD Workflow

1. **Write failing test first** → 2. **Implement minimal code** → 3. **Refactor**

```bash
bun test                    # Run all tests
bun test --watch           # Watch mode for TDD
bun test --coverage        # Check coverage
```

### Testing Best Practices

- **Unit tests**: Use mocked file system (fast, isolated)
- **Integration tests**: Use real file system sparingly (confidence in I/O)
- **Performance tests**: Verify <200ms search on mock data
- **Edge cases**: Test special characters, empty results, large files

## Common Issues & Solutions

1. **Permission Errors**
   - Ensure Bun has read access to vault directory
   - Check file permissions

2. **Memory Usage**
   - Adjust cache size in config.json
   - Consider implementing LRU eviction

3. **Search Performance**
   - Pre-process and index content
   - Implement debouncing for file changes

4. **File Watching Issues**
   - Check chokidar options for your OS
   - Ensure not watching .obsidian directory

## Next Steps After Phase 1

Once Phase 1 is working:
1. Profile search performance
2. Test with larger vaults (1000+ notes)
3. Gather feedback from Claude Desktop usage
4. Plan Phase 2 semantic search
5. Consider adding HTTP transport

## Quick Commands Reference

```bash
# Install dependencies
bun install

# Run in development
bun run --watch src/index.ts

# Run tests (when added)
bun test

# Build for production
bun build src/index.ts --target=bun --outfile=dist/server.js

# Check TypeScript
bunx tsc --noEmit
```

---

**Ready to start?** This standalone approach is much simpler - no Obsidian API to learn, no browser restrictions, just pure Bun/Node.js code reading your markdown files!