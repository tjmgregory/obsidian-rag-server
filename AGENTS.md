# AGENTS.md

Quick reference for AI agents working on the Obsidian RAG MCP server.

## Project Overview

Building a standalone RAG (Retrieval-Augmented Generation) MCP server that provides semantic search and knowledge retrieval for Obsidian vaults. This is NOT an Obsidian plugin - it's a standalone Bun/Node.js application that reads markdown files directly.

## Key Documents

- **PRD**: `docs/prd.md` - Product requirements and specifications
- **Implementation Guide**: `docs/phase-1-implementation-guide.md` - Step-by-step Phase 1 plan
- **Decision Log**: `docs/decision-log/` - Architectural decisions and technical choices
- **Coding Standards**: `docs/coding-standards.md` - Code style and best practices
- **Testing Standards**: `docs/testing-standards.md` - TDD and testing guidelines

## Development Standards

**IMPORTANT**: All code must follow the standards defined in:
- `docs/coding-standards.md` - Required coding practices
- `docs/testing-standards.md` - TDD methodology and test requirements

Key principles:
- Use Test-Driven Development (TDD) - write tests first
- Dependency injection for all services
- Mock file system for unit tests
- TypeScript strict mode always
- No Vite/Vitest - use Bun's built-in test runner

## Git Hooks

The project has a TDD-aware git pre-commit hook:

- **pre-commit**: Runs lint, typecheck, and tests
- **TDD Support**: 
  - Allows failing tests when committing test files (red phase)
  - Requires passing tests when committing implementation (green/refactor)
- Located in `.git/hooks/pre-commit`

The hook intelligently handles TDD workflow - you can commit failing tests when writing them, but implementation commits require all tests to pass.

## Decision Log Protocol

When making important technical decisions:
1. **ALWAYS** get current date with: `date +%Y-%m-%d`
2. Check `docs/decision-log/` for existing decisions
3. Add new decisions to today's file: `YYYY-MM-DD-summary.md`
4. Update filename to reflect content
5. One file per day, multiple decisions in same file if needed
6. Always document: Context, Decision, Rationale, Alternatives, Decision Maker, Review Date

## Current Technical Decisions

- **Runtime**: Bun (Node.js compatible)
- **Architecture**: Standalone MCP server (not an Obsidian plugin)
- **MCP Server Name**: `obsidian-rag` (following MCP standards)
- **Transport**: STDIO for Phase 1, HTTP+SSE later
- **Dependencies**: gray-matter, chokidar, @modelcontextprotocol/sdk

## Development Setup

```bash
# Install Bun if needed
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Run in development
bun run --watch src/index.ts

# Build for production
bun build src/index.ts --target=bun --outfile=dist/server.js
```

## Quick Facts

- **Expected Scale**: 500-1000 documents
- **Phase 1**: Keyword search only (no embeddings yet)
- **Location**: `/Users/theo/Documents/Obsidian/obsidian-rag-server`
- **Vault Path**: Configured in `config.json`
- **Performance Targets**: <200ms search, <100MB memory

## Phase 1 MCP Endpoints

**Tools** (simplified for Phase 1):
- `search_vault` - Keyword search only
- `get_note` - Retrieve note by path
- `list_notes` - List with folder filtering

**Resources** (basic data only):
- `obsidian://vault/info` - Note count and stats
- `obsidian://vault/tags` - Simple tag list
- `obsidian://vault/recent` - Last 30 modified notes

## Project Structure

```
obsidian-rag-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── services/             # Vault operations
│   ├── mcp/                  # MCP protocol handlers
│   ├── types/                # TypeScript interfaces
│   └── utils/                # Helpers (search, cache, markdown)
├── docs/                     # Documentation
├── config.json              # User configuration
└── package.json
```

## Testing with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "obsidian-rag": {
      "command": "bun",
      "args": ["run", "/Users/theo/Documents/Obsidian/obsidian-rag-server/src/index.ts"]
    }
  }
}
```

## Common Commands

```bash
# Development
bun run --watch src/index.ts

# Type checking
bunx tsc --noEmit

# Tests (when added)
bun test

# Build
bun build src/index.ts --target=bun --outfile=dist/server.js
```

---

*Following the [agents.md](https://agents.md) standard.*