# Coding Standards

This document defines coding standards NOT handled by Biome. For formatting and basic linting rules, Biome handles them automatically.

## Automated by Biome

The following are handled by Biome and don't need manual attention:
- Formatting (indentation, line width, quotes, semicolons)
- Basic linting (no-var, no-console, no-any, naming conventions)
- Import organization
- Code complexity checks
- Security basics (no eval, no dangerous HTML)
- **Trailing commas**: Always added for cleaner diffs
- **Consistent spacing**: Automated bracket spacing and line breaks

Run `bun run lint:fix` to automatically fix most issues.

### Diff-Friendly Formatting

Biome is configured to minimize diff noise:
- Trailing commas on all multi-line structures
- Consistent indentation (2 spaces)
- Each import on its own line
- Object properties on separate lines when needed

## Architecture & Design Patterns

### Hexagonal Architecture (Ports and Adapters)

This project follows **Hexagonal Architecture** to create loosely coupled, testable, and maintainable code. The architecture separates business logic from infrastructure concerns.

#### Core Principles

1. **Domain at the Center**: Pure business logic with no framework dependencies
2. **Ports Define Contracts**: Interfaces that define how the domain interacts with the outside world
3. **Adapters Implement Infrastructure**: Concrete implementations of ports for specific technologies
4. **Dependency Inversion**: Domain depends on abstractions (ports), not concrete implementations

#### Architecture Layers

```
┌─────────────────────────────────────────┐
│         Primary/Driving Adapters        │
│     (MCP Server, HTTP API, CLI)        │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│           Primary Ports                 │
│    (Use Cases / Application Services)   │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│                                         │
│         DOMAIN / BUSINESS LOGIC         │
│     (Pure, framework-free TypeScript)   │
│                                         │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          Secondary Ports                │
│    (Repository, FileSystem, Cache)      │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│       Secondary/Driven Adapters         │
│    (File System, Database, External)    │
└─────────────────────────────────────────┘
```

#### Implementation Guidelines

##### Domain Layer (Center)
```typescript
// ✅ Good: Pure domain logic, no infrastructure
export class NoteSearcher {
  findRelevantNotes(query: string, notes: Note[]): SearchResult[] {
    // Pure business logic for ranking and filtering
    // No file I/O, no database, no HTTP
  }
}

// ❌ Bad: Domain with infrastructure concerns
export class NoteSearcher {
  async search(query: string) {
    const files = await fs.readdir(this.path); // NO! Infrastructure in domain
  }
}
```

##### Ports (Interfaces)
```typescript
// Primary Port (Use Case)
export interface SearchVaultUseCase {
  execute(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}

// Secondary Port (Repository)
export interface NoteRepository {
  findAll(): Promise<Note[]>;
  findByPath(path: string): Promise<Note | null>;
  save(note: Note): Promise<void>;
}

// Secondary Port (File System)
export interface FileSystemPort {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  watch(path: string, callback: WatchCallback): void;
}
```

##### Adapters (Implementations)
```typescript
// Primary Adapter (MCP Server)
export class MCPServerAdapter {
  constructor(private searchUseCase: SearchVaultUseCase) {}
  
  async handleSearchRequest(params: any) {
    // Adapt MCP protocol to use case
    const results = await this.searchUseCase.execute(params.query);
    return this.formatForMCP(results);
  }
}

// Secondary Adapter (File System)
export class BunFileSystemAdapter implements FileSystemPort {
  async readFile(path: string): Promise<string> {
    // Actual file I/O using Bun
    return await Bun.file(path).text();
  }
}
```

### Dependency Injection for Hexagonal Architecture

Use dependency injection to wire ports and adapters:

```typescript
// ✅ Good: Inject ports, not concrete implementations
export class VaultService {
  constructor(
    private noteRepository: NoteRepository,  // Port interface
    private fileSystem: FileSystemPort,      // Port interface
    private cache: CachePort,                // Port interface
  ) {}
}

// Composition root (main/index.ts)
const fileSystem = new BunFileSystemAdapter();
const repository = new FileNoteRepository(fileSystem);
const cache = new InMemoryCacheAdapter();
const vaultService = new VaultService(repository, fileSystem, cache);

// ❌ Bad: Hard-coded dependencies
export class VaultService {
  private fileSystem = new BunFileSystemAdapter(); // Coupled to infrastructure!
}
```

### File System as a Secondary Port

File system access is infrastructure and must be behind a port:

```typescript
// ✅ Good: File system as a port
interface FileSystemPort {
  readFile(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
}

class VaultService {
  constructor(private fs: FileSystemPort) {}
  
  async loadNote(path: string) {
    return await this.fs.readFile(path);
  }
}

// ❌ Bad: Direct file system access in service
import { readFile } from 'fs/promises';

class VaultService {
  async loadNote(path: string) {
    return await readFile(path); // Coupled to Node.js fs!
  }
}
```

### Testing with Hexagonal Architecture

The architecture makes testing straightforward:

```typescript
// Unit test: Mock the ports
const mockFS: FileSystemPort = {
  readFile: async (path) => 'mock content',
  exists: async (path) => true,
};
const service = new VaultService(mockFS);

// Integration test: Use real adapters
const realFS = new BunFileSystemAdapter();
const service = new VaultService(realFS);
```

## Error Handling & Logging Philosophy

### Structured Logging Pattern

Always pass dynamic values as context, not in the message string:

```typescript
// ✅ Good: Structured with context
throw new Error('Note not found', { cause: { path, vaultId } });
console.error('Failed to parse note', { path, error });
logger.info('Search completed', { query, resultCount, duration });

// ❌ Bad: Dynamic values in string
throw new Error(`Note not found at path: ${path}`);
console.error(`Failed to parse ${path}: ${error}`);
logger.info(`Found ${count} results for "${query}"`);
```

### Custom Error Classes

Create specific error classes with structured data:

```typescript
// ✅ Good: Structured error class
export class NoteNotFoundError extends Error {
  constructor(
    public readonly path: string,
    public readonly vaultPath: string,
  ) {
    super('Note not found');
    this.name = 'NoteNotFoundError';
  }
}

// Usage
throw new NoteNotFoundError(path, vaultPath);

// ❌ Bad: Generic error with string interpolation
throw new Error(`Note not found: ${path} in ${vaultPath}`);
```

### Logging Standards

```typescript
// ✅ Good: Consistent structured logging
interface LogContext {
  [key: string]: unknown;
}

function log(level: 'info' | 'warn' | 'error', message: string, context?: LogContext) {
  console[level](JSON.stringify({ 
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  }));
}

// Usage
log('info', 'Search completed', { query, results: results.length, ms: duration });
log('error', 'Failed to parse note', { path, error: error.message });

// ❌ Bad: Inconsistent logging
console.log(`Search for "${query}" found ${results.length} results`);
console.error('Error:', error);
```

### Never Silently Fail

```typescript
// ✅ Good: Explicit error handling
async getNote(path: string): Promise<Note | null> {
  try {
    const content = await this.fileSystem.readFile(path);
    return this.parseNote(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // File doesn't exist is expected
    }
    throw new Error('Failed to read note', { cause: { path, error } });
  }
}

// ❌ Bad: Swallowing errors
try {
  return await this.fileSystem.readFile(path);
} catch {
  return null; // Which error? Why?
}
```

## Testing Philosophy

### Write Tests First (TDD)

This is a methodology, not enforceable by linters:

1. Write a failing test
2. Write minimal code to pass
3. Refactor

### Mock Boundaries, Not Implementation

```typescript
// ✅ Good: Mock external boundary
const mockFS = new MockFileSystem();
const service = new VaultService(config, mockFS);

// ❌ Bad: Mock internal methods
jest.spyOn(service, 'parseNote').mockReturnValue(...);
```

## Performance Patterns

### Cache Expensive Operations

```typescript
// ✅ Good: Cache parsed notes
private cache = new Map<string, Note>();

async getNote(path: string): Promise<Note | null> {
  if (this.cache.has(path)) {
    return this.cache.get(path)!;
  }
  // ... load and cache
}
```

### Batch I/O Operations

```typescript
// ✅ Good: Parallel I/O
const notes = await Promise.all(
  paths.map(path => this.loadNote(path))
);

// ❌ Bad: Sequential I/O (unless required)
const notes = [];
for (const path of paths) {
  notes.push(await this.loadNote(path));
}
```

## Domain-Specific Rules

### MCP Protocol Patterns

Follow MCP conventions for tool and resource naming:

```typescript
// ✅ Good: MCP-style naming
server.setRequestHandler('tools/list', () => [{
  name: 'search_vault',  // snake_case for MCP
  description: 'Search notes by keyword'
}]);

// ❌ Bad: Inconsistent naming
'searchVault' // Should be snake_case for MCP
```

### Note Processing Rules

1. Always preserve original content
2. Extract metadata without modifying source
3. Handle missing frontmatter gracefully
4. Support both `#tags` and frontmatter tags

```typescript
// ✅ Good: Preserve original, extract metadata
interface Note {
  content: string;        // Original content
  frontmatter: any;       // Parsed frontmatter
  tags: string[];         // Combined from both sources
}
```

## Security Patterns

### Path Validation

Prevent directory traversal:

```typescript
// ✅ Good: Validate paths
import { resolve, relative } from 'path';

function isPathSafe(requestedPath: string, vaultPath: string): boolean {
  const resolved = resolve(vaultPath, requestedPath);
  const rel = relative(vaultPath, resolved);
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}
```

### Input Sanitization

For search queries:

```typescript
// ✅ Good: Escape regex special characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

## Code Organization Principles

### Project Structure for Hexagonal Architecture

```
src/
├── domain/              # Pure business logic (no dependencies)
│   ├── entities/       # Domain entities (Note, SearchResult)
│   ├── services/       # Domain services (NoteSearcher, NoteRanker)
│   └── value-objects/  # Value objects (NoteId, SearchQuery)
├── application/         # Application layer (use cases)
│   ├── ports/          # Port interfaces
│   │   ├── primary/    # Driving ports (use cases)
│   │   └── secondary/  # Driven ports (repositories, gateways)
│   └── use-cases/      # Use case implementations
├── infrastructure/      # Adapters and framework-specific code
│   ├── adapters/
│   │   ├── primary/    # MCP server, HTTP, CLI adapters
│   │   └── secondary/  # File system, database adapters
│   ├── config/         # Configuration loading
│   └── composition/    # Dependency injection setup
└── index.ts            # Composition root (wires everything)
```

### Single Responsibility in Hexagonal Context

Each component has one clear role in the architecture:

```typescript
// ✅ Good: Clear architectural boundaries

// Domain Service (pure logic)
class NoteSearcher {
  rankByRelevance(notes: Note[], query: string): SearchResult[] {
    // Pure domain logic
  }
}

// Use Case (orchestration)
class SearchVaultUseCase implements SearchVaultPort {
  constructor(
    private repository: NoteRepository,
    private searcher: NoteSearcher,
  ) {}
  
  async execute(query: string): Promise<SearchResult[]> {
    const notes = await this.repository.findAll();
    return this.searcher.rankByRelevance(notes, query);
  }
}

// Adapter (infrastructure)
class MCPSearchAdapter {
  constructor(private searchUseCase: SearchVaultPort) {}
  
  handleRequest(params: MCPRequest): MCPResponse {
    // Adapt protocol to use case
  }
}

// ❌ Bad: Mixed architectural concerns
class NoteManager {
  parse() { }          // Domain logic
  searchFiles() { }    // Infrastructure
  handleHTTP() { }     // Adapter logic
  cacheResults() { }   // Cross-cutting concern
}
```

### Composition Over Inheritance

Hexagonal architecture naturally promotes composition:

```typescript
// ✅ Good: Composition with ports
class VaultService {
  constructor(
    private noteRepo: NoteRepository,      // Port
    private searchEngine: SearchEngine,    // Port
    private eventBus: EventBus,           // Port
  ) {}
}

// Wire at composition root
const vaultService = new VaultService(
  new FileNoteRepository(fileSystemAdapter),
  new LunrSearchEngine(),
  new InMemoryEventBus(),
);

// ❌ Bad: Inheritance couples to implementation
class VaultService extends FileBasedService { 
  // Now coupled to file-based implementation
}
```

### Dependency Flow Rules

1. **Dependencies point inward**: Outer layers depend on inner layers, never reverse
2. **Domain has zero dependencies**: Pure TypeScript, no imports from infrastructure
3. **Ports are owned by the domain**: Defined in terms of domain concepts
4. **Adapters depend on ports**: Not the other way around

```typescript
// ✅ Good: Adapter depends on port
import { NoteRepository } from '../../application/ports/secondary';

export class FileNoteRepository implements NoteRepository {
  // Implements the port interface
}

// ❌ Bad: Domain depends on infrastructure
import { FileNoteRepository } from '../../infrastructure/adapters';

export class NoteService {
  constructor(private repo: FileNoteRepository) {} // Domain coupled to infrastructure!
}
```

## Documentation Standards

### Public API Documentation

Document public methods with JSDoc:

```typescript
/**
 * Search notes by keyword with relevance ranking
 * @param query - Search terms (case-insensitive)
 * @param limit - Maximum results to return (default: 50)
 * @returns Ranked search results with snippets
 */
async searchNotes(query: string, limit = 50): Promise<SearchResult[]>
```

### Internal Documentation

Only document "why", not "what":

```typescript
// ✅ Good: Explains non-obvious decision
// Use Map instead of object for O(1) lookups and proper size tracking
private cache = new Map<string, Note>();

// ❌ Bad: States the obvious
// This is a cache
private cache = new Map();
```

## Git Practices

### Commit Message Format

```
type(scope): description

feat(search): add fuzzy matching support
fix(cache): prevent memory leak on file deletion
test(vault): add edge cases for special characters
docs(api): update MCP endpoint documentation
refactor(parser): extract frontmatter logic
```

### Branch Naming

```
feature/semantic-search
fix/cache-memory-leak
test/search-edge-cases
```

## Review Checklist

Before submitting code, verify:

### Automated (Biome handles these)
- [ ] `bun run check` passes (lint, format, types, tests)

### Manual Review Required
- [ ] Follows dependency injection pattern
- [ ] Uses file system abstraction
- [ ] Includes descriptive error messages
- [ ] Has appropriate test coverage
- [ ] Follows TDD (test written first)
- [ ] Uses composition appropriately
- [ ] Caches expensive operations
- [ ] Validates security boundaries
- [ ] Documents public APIs
- [ ] Commit message follows format

## Running Checks

```bash
# Run all automated checks
bun run check

# Individual commands
bun run lint        # Check linting
bun run lint:fix    # Auto-fix issues
bun run format      # Format code
bun run typecheck   # TypeScript check
bun test           # Run tests
```