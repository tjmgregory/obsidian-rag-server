# Phase 1 Implementation Guide - Standalone RAG System

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

## Technical Architecture

```
┌─────────────────────────────────────────┐
│         MCP Client (Claude, etc)         │
└────────────┬────────────────────────────┘
             │ STDIO
             ▼
┌─────────────────────────────────────────┐
│          MCP Server (Bun)                │
│  - Handle MCP protocol                   │
│  - Route tool/resource requests          │
│  - Format responses                      │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│          Vault Service                   │
│  - Read markdown files                   │
│  - Parse frontmatter (gray-matter)       │
│  - Extract tags and links                │
│  - Perform keyword search                │
│  - Cache metadata                        │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│       File System (Your Vault)           │
│  - Watch for changes (chokidar)          │
│  - Read .md files                        │
│  - Respect .gitignore                    │
└─────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Project Setup

```bash
# Clone or create the project directory
# If cloning: git clone <repository-url> obsidian-rag-server
# If creating new:
mkdir -p obsidian-rag-server
cd obsidian-rag-server

# Initialize with Bun
bun init -y

# Create source directories
mkdir -p src/{services,mcp,types,utils}

# Install dependencies
bun add @modelcontextprotocol/sdk gray-matter chokidar
bun add -D @types/node typescript
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

### Step 3: Core Type Definitions

Create `src/types/index.ts`:
```typescript
export interface Note {
  path: string;
  title: string;
  content: string;
  frontmatter: Record<string, any>;
  tags: string[];
  links: string[];
  modified: Date;
  created: Date;
}

export interface SearchResult {
  note: Note;
  score: number;
  snippet: string;
}

export interface VaultConfig {
  vaultPath: string;
  ignoredFolders: string[];
  cacheSize: number;
  searchLimit: number;
}
```

### Step 4: Vault Service Implementation

Create `src/services/vault-service.ts`:

Key responsibilities:
- Read all markdown files from vault directory
- Parse frontmatter using gray-matter
- Extract tags from content (#tag syntax)
- Extract wikilinks ([[link]] syntax)
- Implement keyword search with simple ranking
- Watch for file changes with chokidar
- Cache parsed notes in memory

```typescript
export class VaultService {
  private cache: Map<string, Note> = new Map();
  private watcher: FSWatcher;
  
  constructor(private config: VaultConfig) {}
  
  async initialize(): Promise<void>
  async getAllNotes(): Promise<Note[]>
  async searchNotes(query: string, limit?: number): Promise<SearchResult[]>
  async getNote(path: string): Promise<Note | null>
  async listNotes(folder?: string): Promise<Note[]>
  async getTags(): Promise<string[]>
  
  private parseNote(filePath: string): Promise<Note>
  private extractTags(content: string): string[]
  private extractLinks(content: string): string[]
  private scoreMatch(note: Note, query: string): number
}
```

### Step 5: MCP Server Implementation

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

### Step 6: Main Entry Point

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