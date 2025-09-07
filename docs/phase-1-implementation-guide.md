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
# Create project directory (renamed since it's not a plugin)
mkdir -p ~/Documents/obsidian-rag-server
cd ~/Documents/obsidian-rag-server

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
  "vaultPath": "/Users/theo/Documents/Obsidian",
  "ignoredFolders": [".obsidian", ".trash"],
  "cacheSize": 1000,
  "searchLimit": 50
}
```

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

Implements Phase 1 MCP endpoints (simplified versions from PRD):

**Tools (Phase 1 - Basic Implementations):**
- `search_vault` - Keyword search only
- `get_note` - Retrieve complete note by path
- `list_notes` - List notes with folder filtering

**Resources (Phase 1 - Basic Data):**
- `obsidian://vault/info` - Note count and basic stats
- `obsidian://vault/tags` - Simple tag list
- `obsidian://vault/recent` - Last 30 modified notes

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
  console.error(`Vault: ${config.vaultPath}`);
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
      "args": ["run", "/path/to/obsidian-rag-server/src/index.ts"],
      "env": {
        "VAULT_PATH": "/Users/theo/Documents/Obsidian"
      }
    }
  }
}
```

## Testing Strategy

### Manual Testing Checklist

1. **Server Startup**
   - [ ] Server starts without errors
   - [ ] Loads all notes from vault
   - [ ] Reports correct note count

2. **Search Functionality**
   - [ ] Keyword search returns results
   - [ ] Results ranked by relevance
   - [ ] Respects search limit
   - [ ] Handles special characters

3. **File Operations**
   - [ ] Get note by path works
   - [ ] List notes returns all notes
   - [ ] Folder filtering works
   - [ ] Tag extraction correct

4. **File Watching**
   - [ ] New files detected
   - [ ] Modified files updated
   - [ ] Deleted files removed
   - [ ] Ignores non-markdown files

5. **MCP Protocol**
   - [ ] Tools respond correctly
   - [ ] Resources return valid data
   - [ ] Error handling works
   - [ ] Works with Claude Desktop

### Performance Targets

- Search completes in <200ms for 1000 notes
- Initial load <5 seconds for 1000 notes
- Memory usage <100MB for 1000 notes
- File change detection <1 second

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