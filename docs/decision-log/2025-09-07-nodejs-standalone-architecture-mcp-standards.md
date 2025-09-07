# Decision Log - 2025-09-07

## Decision: Use Bun/Node.js for RAG Implementation

### Context
Evaluating whether to use Node.js/Bun or consider other languages (Python, Rust, Go) for implementing the Obsidian RAG system with MCP server. Expected scale is 500-1000 documents in the vault.

### Decision
**Use Bun** (Node.js-compatible runtime) for the entire implementation.

### Rationale

#### Performance is Sufficient
- 500-1000 documents is well within Node.js capabilities
- Memory usage ~50-100MB for embeddings (768-dim vectors)
- Sub-100ms search times achievable with proper indexing
- Modern vector libraries (`vectra`, `hnswlib-node`) are highly optimized

#### Real Bottlenecks Are Language-Agnostic
1. **Embedding generation** - Both Node and Python call same C++ libraries
2. **Vector search** - Faiss/HNSW have Node bindings with identical performance  
3. **File I/O** - Node.js async I/O is actually advantageous
4. **MCP communication** - Node's event loop ideal for STDIO/HTTP servers

#### Strategic Advantages
- **Developer velocity** - Use familiar tools, ship faster
- **Ecosystem** - Full npm compatibility, MCP SDK in JavaScript
- **Bun benefits** - Faster startup, built-in TypeScript, better DX
- **Performance** - Bun is faster than Node.js for most operations

#### Migration Path
MCP architecture makes future language changes easy - could rewrite just the server component later if needed while keeping plugin unchanged.

### Decision Maker
Theo (with AI assistance)

### Review Date
After v1 ships and performance metrics are available

---

## Decision: Adopt MCP Protocol Standards

### Context
Implementing Model Context Protocol (MCP) server for the RAG system, need to follow emerging standards.

### Decision
Follow official MCP naming conventions and best practices:
- Server name: `obsidian-rag` (lowercase, hyphenated)
- Tools: verb-oriented with underscores (`search_vault`, `get_note`)
- Resources: noun-oriented with URI format (`obsidian://vault/info`)
- Transport: STDIO initially, HTTP+SSE for future remote access

### Rationale
- Ensures compatibility with Claude Desktop, Continue.dev, and other MCP clients
- Following standards now prevents breaking changes later
- Clear naming improves discoverability and usability

### Decision Maker
Theo (with AI assistance)

### Review Date
When MCP 2.0 specification is released

---

## Decision: Standalone System vs Obsidian Plugin Architecture

### Context
Evaluating whether to build the RAG system as an Obsidian plugin or as a standalone system that reads Obsidian files directly. Need to balance development complexity, features, and user experience.

### Decision
**Build as a Standalone Node.js System** (not an Obsidian plugin) for Phase 1.

### Rationale

#### Development Velocity
- No browser environment restrictions
- Full access to Node.js ecosystem and APIs
- Standard debugging and development tools
- No Obsidian API learning curve

#### Technical Flexibility
- Use any npm packages (fs, path, database libraries)
- Run CPU-intensive operations without UI concerns
- Implement file watching with chokidar or similar
- Better performance for embeddings and vector operations

#### Broader Applicability
- Works with any markdown files, not just Obsidian
- Can support multiple vaults simultaneously
- Portable to other note-taking systems
- Easier to containerize or deploy as a service

#### Simpler Architecture
- Single Node.js process with MCP server
- No complex plugin ↔ server communication
- Direct file system access
- Cleaner separation of concerns

### Alternatives Considered

1. **Pure Obsidian Plugin**: Rejected due to browser restrictions and complexity of spawning MCP server from plugin

2. **Hybrid Approach**: Keep as future option - standalone server with optional Obsidian plugin for enhanced metadata

3. **Obsidian Plugin with Embedded MCP**: Too complex for MVP, would slow down initial development

### Migration Path
- Start with standalone system
- Can add optional Obsidian plugin later for:
  - Richer metadata access
  - UI integration
  - Settings management
  - Live vault change notifications

### Implications
- Need to implement own frontmatter parsing
- Build own link graph extraction
- Handle file watching independently
- May miss some Obsidian-specific features initially

### Decision Maker
Theo (with AI assistance)

### Review Date
After Phase 1 completion, evaluate if plugin adds significant value