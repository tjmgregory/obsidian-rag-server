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

### Dependency Injection (Not Enforced by Linters)

Always use dependency injection for testability:

```typescript
// ✅ Good: Injectable dependencies
export class VaultService {
  constructor(
    private config: VaultConfig,
    private fileSystem?: FileSystemAdapter  // Optional for testing
  ) {
    this.fileSystem = fileSystem || new RealFileSystem();
  }
}

// ❌ Bad: Hard-coded dependencies
export class VaultService {
  private fileSystem = new RealFileSystem(); // Can't mock in tests!
}
```

### File System Abstraction

Never access the file system directly in business logic:

```typescript
// ✅ Good: Use abstraction
await this.fileSystem.readFile(path);

// ❌ Bad: Direct fs access
import { readFile } from 'fs/promises';
await readFile(path);
```

## Error Handling Philosophy

### Provide Context in Errors

Biome can't check error message quality:

```typescript
// ✅ Good: Contextual error
throw new Error(`Note not found at path: ${path}`);

// ❌ Bad: Generic error
throw new Error('Not found');
```

### Never Silently Fail

```typescript
// ✅ Good: Explicit null return
async getNote(path: string): Promise<Note | null> {
  const content = await this.fileSystem.readFile(path).catch(() => null);
  if (!content) return null;
  return this.parseNote(content);
}

// ❌ Bad: Swallowing errors without intent
try {
  return await this.fileSystem.readFile(path);
} catch {
  // Silent failure - unclear if intentional
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

### Single Responsibility

Each class/function should have one clear purpose:

```typescript
// ✅ Good: Separate concerns
class NoteParser {
  parse(content: string): Note { }
}

class NoteSearcher {
  search(notes: Note[], query: string): SearchResult[] { }
}

// ❌ Bad: Mixed responsibilities
class NoteManager {
  parse() { }
  search() { }
  cache() { }
  watch() { }
}
```

### Composition Over Inheritance

```typescript
// ✅ Good: Composition
class VaultService {
  constructor(
    private parser: NoteParser,
    private searcher: NoteSearcher,
    private cache: CacheService
  ) {}
}

// ❌ Bad: Deep inheritance
class VaultService extends BaseService extends CacheableService { }
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