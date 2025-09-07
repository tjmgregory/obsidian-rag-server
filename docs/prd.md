# Obsidian RAG System PRD

## Product Vision

Build a best-in-class RAG (Retrieval-Augmented Generation) system for Obsidian that enables AI agents to intelligently access, search, and utilize knowledge from the vault. The system will expose its capabilities through multiple interfaces including MCP (Model Context Protocol).

## Problem Statement

**As a** knowledge worker with extensive notes in Obsidian  
**I want** AI agents to have intelligent, context-aware access to my knowledge base  
**So that** they can provide accurate, grounded responses based on my personal knowledge graph

### Current Pain Points
- AI assistants lack access to personal knowledge and context
- Generic AI responses don't leverage accumulated domain expertise
- No way to ground AI responses in verified personal notes
- Difficult to maintain consistency between AI outputs and knowledge base
- Manual copy-paste workflow breaks context and relationships

## Core RAG Features

### 1. Intelligent Retrieval
**Goal**: Find the most relevant content for any query

**Capabilities:**
- Semantic search using embeddings
- Hybrid search combining keywords and semantics
- Graph-based retrieval following note links
- Tag and metadata-aware filtering
- Temporal awareness (recent vs historical notes)

**Acceptance Criteria:**
- Returns top-k most relevant chunks
- Considers note relationships and backlinks
- Weights results by recency and frequency of access
- Filters by tags, folders, or metadata

### 2. Context Window Optimization
**Goal**: Maximize useful context within token limits

**Capabilities:**
- Intelligent chunking strategies
- Context compression and summarization
- Hierarchical retrieval (overview → details)
- Dynamic chunk sizing based on relevance
- Relationship-aware context inclusion

**Acceptance Criteria:**
- Fits within model context limits
- Preserves essential relationships
- Includes necessary background context
- Avoids redundant information

### 3. Knowledge Graph Navigation
**Goal**: Leverage Obsidian's linked structure

**Capabilities:**
- Follow backlinks and forward links
- Traverse folder hierarchies
- Navigate tag relationships
- Build context from note clusters
- Identify knowledge hubs and authorities

**Acceptance Criteria:**
- Can traverse n-degree relationships
- Identifies central/authoritative notes
- Builds topic clusters dynamically
- Respects PARA method structure

### 4. Multi-Modal RAG
**Goal**: Support various content types

**Capabilities:**
- Text notes and markdown
- Code blocks with language awareness
- Embedded images and diagrams
- PDF and document attachments
- Excalidraw diagrams

**Acceptance Criteria:**
- Extracts text from various formats
- Maintains code formatting
- Describes visual content
- Preserves source attribution

## MCP Server Implementation

### Server Specification (Following MCP Standards)

#### Server Metadata
- **Name**: `obsidian-rag` (lowercase, hyphenated, under 128 chars)
- **Version**: `0.1.0` (semantic versioning)
- **Description**: "Model Context Protocol server for Obsidian RAG - provides semantic search and knowledge retrieval from Obsidian vaults"
- **Transport**: STDIO (local) with future HTTP+SSE support
- **Capabilities**: Tools, Resources, and Prompts

### MCP Tools (verb-oriented, perform actions)

#### `search_vault`
**Description**: "Perform semantic search across the Obsidian vault using natural language queries. This tool understands the meaning and intent behind your search, not just keywords. It searches through all note content, titles, and metadata to find conceptually related information. The search considers synonyms, related concepts, and semantic similarity to return the most relevant notes even if they don't contain the exact search terms. Results are ranked by relevance with contextual snippets showing why each note matched. This is the primary tool for discovering information when you don't know the exact note location or when you want to find all related content on a topic."

#### `get_note`
**Description**: "Retrieve the complete content of a specific note from the vault when you know its exact path. This tool returns the full markdown content including frontmatter metadata, tags, links, and all formatting. Use this when you need to read an entire note for detailed analysis, when you want to understand the full context of a piece of information, or when you need to work with the complete content of a known note. The tool preserves all markdown formatting, code blocks, and embedded content exactly as stored in the vault."

#### `list_notes`
**Description**: "Browse and explore the vault's contents by listing notes with various filtering options. This tool helps you understand the vault's structure, discover what topics are covered, and find notes by their location, tags, or modification time. It's particularly useful for getting an overview of specific folders (like Projects or Areas in PARA method), finding recently updated notes to understand current work, or discovering all notes with certain tags. Unlike search, this tool doesn't look at content but rather at note metadata and organization."

#### `analyze_connections`
**Description**: "Explore the knowledge graph by analyzing how notes are connected through links, backlinks, and semantic relationships. This tool reveals the network of ideas in your vault by traversing connections between notes, identifying clusters of related content, and finding hidden relationships that aren't explicitly linked. It helps you understand how different concepts relate to each other, discover authoritative notes that many others reference, and find gaps in your knowledge graph. The analysis goes beyond simple links to identify semantic similarities and topic clusters, making it invaluable for understanding the deeper structure of your knowledge base."

#### `extract_context`
**Description**: "Build comprehensive, optimized context about any topic by intelligently gathering and organizing relevant information from across the vault. This tool doesn't just search for notes; it constructs a coherent narrative by finding all relevant pieces of information, organizing them logically, removing redundancy, and presenting them in a format optimized for AI consumption. It understands the relationships between different pieces of information and assembles them into a unified context that fits within token limits while preserving the most important details. Use this when you need to provide an AI with complete background on a complex topic or when preparing comprehensive briefings."

### MCP Resources (noun-oriented, provide data)

#### `obsidian://vault/info`
**Description**: "Comprehensive metadata and statistics about the entire Obsidian vault that provides a high-level understanding of the knowledge base. This resource returns information about the vault's size, structure, age, and activity patterns including total note count, word count, tag usage, folder organization, creation and modification dates, and growth trends. It helps AI assistants understand the scope and nature of the knowledge base they're working with, enabling them to provide more contextual responses and better gauge the depth of available information on various topics."

#### `obsidian://vault/tags`
**Description**: "Complete taxonomy of all tags used throughout the vault, providing insight into the topics, themes, and organizational structure of your knowledge. This resource returns not just a list of tags but their usage frequency, hierarchical relationships (nested tags), and distribution patterns. It helps identify the main topics you write about, understand your organizational system, find related concepts through tag proximity, and discover potential areas for further exploration. The tag structure often reveals the mental model and categorization system used in the vault."

#### `obsidian://vault/recent`
**Description**: "A chronological view of recently created and modified notes that reveals current interests, active projects, and work patterns. This resource provides insights into what you're currently thinking about and working on, making it invaluable for maintaining continuity in your work, identifying emerging themes, and ensuring recent insights are connected to existing knowledge. It helps AI assistants understand the temporal context of your work and prioritize recent developments when providing assistance."

#### `obsidian://vault/graph`
**Description**: "The complete knowledge graph structure showing how all notes in the vault are interconnected through explicit links, backlinks, and semantic relationships. This resource provides a bird's-eye view of your knowledge architecture, revealing clusters of related content, central hub notes that connect many concepts, isolated notes that might need integration, and the overall topology of your ideas. It's essential for understanding not just what information exists but how different pieces of knowledge relate to and build upon each other."

#### `obsidian://vault/folders`
**Description**: "The hierarchical folder structure of the vault that reveals the organizational methodology (such as PARA, Zettelkasten, or custom systems) used to categorize and store notes. This resource helps understand the high-level categories of information, the distinction between different types of content (projects vs resources vs archives), the depth and breadth of coverage in different areas, and the intended workflow for information management. The folder structure often indicates the intended use and lifecycle of different notes."

### MCP Prompts (pre-configured templates)

#### `search_notes`
**Description**: "An interactive conversation template for searching and refining queries about notes in your vault. This prompt helps AI assistants guide you through the search process, starting with understanding what you're looking for, performing the initial search, interpreting results, and suggesting refinements or related searches. It combines the search_vault tool with intelligent follow-up questions to ensure you find exactly what you need, even when you're not sure how to articulate it initially."

#### `summarize_recent`
**Description**: "A structured approach to understanding and summarizing recent activity in your vault. This prompt orchestrates multiple tools to identify what you've been working on, recognize patterns in your recent notes, highlight key themes and projects, and suggest connections between recent work. It helps maintain awareness of your knowledge work patterns and ensures important insights from recent notes aren't lost in the flow of daily work."

#### `explore_topic`
**Description**: "A comprehensive exploration workflow that deeply investigates any topic across your entire vault. This prompt doesn't just search for mentions; it builds a complete understanding by finding all relevant notes, analyzing their connections, identifying key sources and authorities, revealing gaps in coverage, and synthesizing findings into actionable insights. It's designed for when you need to fully understand everything your vault contains about a subject, whether for research, decision-making, or content creation."

#### `daily_review`
**Description**: "A systematic review process for daily notes that helps maintain knowledge hygiene and build connections. This prompt examines your daily note to extract key insights, identify tasks and commitments, suggest connections to existing notes, recommend tags and organization, and highlight items that deserve expansion into permanent notes. It transforms daily captures into integrated knowledge while maintaining the PARA method or your chosen organizational system."

### Security & Compliance

#### MCP Standards Compliance
- **Naming**: All names under 128 characters, lowercase with underscores
- **No Reserved Words**: Avoiding "system" and other reserved terms
- **Transport Security**: STDIO for local, HTTPS for remote
- **User Consent**: Explicit opt-in required in Obsidian settings
- **Access Control**: Respects vault permissions and .gitignore

#### Error Handling
- Clear, actionable error messages
- Graceful degradation on partial failures
- Rate limiting for resource-intensive operations
- Timeout protection (30s max per operation)

#### Logging Standards
- JSON-structured logs for debugging
- Request/response logging in development
- Performance metrics tracking
- Privacy-preserving production logs

### Integration Examples

**With Claude Desktop**:
```json
{
  "mcpServers": {
    "obsidian-rag": {
      "command": "node",
      "args": ["/path/to/obsidian-rag/dist/mcp-server.js"],
      "env": {
        "VAULT_PATH": "/Users/me/ObsidianVault"
      }
    }
  }
}
```

**With Continue.dev**:
```json
{
  "models": [{
    "contextProviders": [{
      "name": "obsidian-rag",
      "type": "mcp"
    }]
  }]
}
```

## Success Metrics

### Performance Metrics
- **Retrieval accuracy**: >90% relevant results in top-5
- **Response time**: <500ms for search queries
- **Context quality**: Human-rated relevance >4/5
- **Token efficiency**: <50% of context window used

### Usage Metrics
- **Query success rate**: Useful results for >80% of queries
- **Knowledge coverage**: Access to 100% of vault content
- **Relationship discovery**: New connections found weekly
- **Agent adoption**: Multiple AI tools using the server

## Technical Architecture

### Components

1. **Obsidian Plugin** (`main.ts`)
   - Handles plugin lifecycle
   - Manages settings UI
   - Coordinates between components
   - Monitors vault changes

2. **Indexing Engine**
   - Watches for vault changes via Obsidian API
   - Extracts text from markdown files
   - Parses frontmatter and tags
   - Maintains incremental index

3. **Embedding Service**
   - Generates semantic embeddings (using Transformers.js)
   - Chunks text intelligently
   - Caches embeddings locally
   - Updates on content changes

4. **Vector Database**
   - In-memory vector store (VectorDB.js)
   - Performs similarity search
   - Manages metadata associations
   - Persists to IndexedDB

5. **Graph Analyzer**
   - Processes wikilinks and backlinks
   - Builds relationship graph
   - Calculates note authority scores
   - Identifies topic clusters

6. **Query Processor**
   - Parses natural language queries
   - Performs hybrid search (keyword + semantic)
   - Ranks and filters results
   - Expands queries with synonyms

7. **Context Builder**
   - Assembles relevant chunks
   - Optimizes for token limits
   - Includes relationship context
   - Compresses redundant information

8. **MCP Server**
   - STDIO transport for local communication
   - Implements MCP protocol standards
   - Exposes tools, resources, and prompts
   - Handles concurrent requests

### Data Flow

1. **Indexing Pipeline**:
   - File change detected → Extract content → Generate embeddings → Update indices

2. **Query Pipeline**:
   - Query received → Parse & expand → Search indices → Rank results → Build context → Return response

3. **Graph Updates**:
   - Link change detected → Update graph → Recalculate scores → Update clusters

4. **Cache Management**:
   - LRU cache for embeddings → Persist to IndexedDB → Load on startup

## Implementation Phases

### Phase 1: Basic RAG (MVP)
- Keyword search
- Simple retrieval
- Basic MCP server
- File-based operations

### Phase 2: Semantic Search
- Embedding generation
- Vector similarity search
- Hybrid retrieval
- Smart chunking

### Phase 3: Graph Intelligence
- Link traversal
- Relationship scoring
- Context building
- Topic clustering

### Phase 4: Advanced Features
- Multi-modal support
- Query understanding
- Personalization
- Performance optimization

## Constraints

### Privacy & Security
- All processing happens locally
- No data leaves the system
- Configurable access controls
- Audit logging for changes

### Performance
- Must handle vaults with 10,000+ notes
- Sub-second response times
- Incremental indexing for changes
- Efficient memory usage

### Compatibility
- Works with standard Obsidian vaults
- Supports common plugins
- Platform agnostic (Windows/Mac/Linux)
- Multiple AI agent support

---

**Created**: 2025-09-07  
**Updated**: 2025-09-07  
**Status**: Planning - MCP standards defined, ready for implementation
**MCP Compliance**: Following Model Context Protocol v1.0 specification