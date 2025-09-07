# Obsidian RAG Server

A standalone MCP (Model Context Protocol) server that provides RAG (Retrieval-Augmented Generation) capabilities for Obsidian vaults. This server enables AI assistants like Claude to intelligently search and retrieve information from your markdown notes.

## Features

### Phase 1 (Current)
- 🔍 **Keyword Search** - Fast text search across all notes
- 📄 **Note Retrieval** - Get complete notes by path
- 📁 **Folder Browsing** - List and filter notes by location
- 🏷️ **Tag Extraction** - Discover and use note tags
- 🔄 **Live Updates** - Auto-refresh when notes change

### Phase 2+ (Planned)
- 🧠 Semantic search with embeddings
- 🔗 Graph traversal and link analysis
- 📊 Advanced context extraction
- 🌐 HTTP/SSE transport for remote access

## Installation

### Prerequisites
- [Bun](https://bun.sh) runtime
- An Obsidian vault with markdown files

### Setup

```bash
# Clone the repository
git clone https://github.com/tjmgregory/obsidian-rag-server.git
cd obsidian-rag-server

# Install dependencies
bun install

# Configure your vault path
cp config.example.json config.json
# Edit config.json with your vault path
```

## Usage

### Development Mode

```bash
# Run with auto-reload
bun run --watch src/index.ts
```

### Production Mode

```bash
# Build and run
bun build src/index.ts --target=bun --outfile=dist/server.js
bun run dist/server.js
```

### Integration with Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "obsidian-rag": {
      "command": "bun",
      "args": ["run", "/path/to/obsidian-rag-server/src/index.ts"]
    }
  }
}
```

## Configuration

Create a `config.json` file:

```json
{
  "vaultPath": "/path/to/your/obsidian/vault",
  "ignoredFolders": [".obsidian", ".trash"],
  "cacheSize": 1000,
  "searchLimit": 50
}
```

## MCP Tools & Resources

### Tools
- `search_vault` - Search notes using keywords
- `get_note` - Retrieve a specific note
- `list_notes` - Browse notes by folder

### Resources
- `obsidian://vault/info` - Vault statistics
- `obsidian://vault/tags` - All tags in use
- `obsidian://vault/recent` - Recently modified notes

## Development

See [docs/phase-1-implementation-guide.md](docs/phase-1-implementation-guide.md) for the development roadmap.

## Architecture

This is a standalone Bun/Node.js application that:
- Reads markdown files directly from your vault
- Parses frontmatter and extracts metadata
- Provides MCP protocol endpoints for AI assistants
- Watches for file changes in real-time

While this server operates independently, it complements the [Obsidian plugins ecosystem](https://github.com/tjmgregory/obsidian-plugins) to provide comprehensive AI-powered capabilities for your vault.

## Performance

Target metrics for 1000 notes:
- Search: <200ms
- Initial load: <5 seconds
- Memory usage: <100MB

## License

MIT

## Contributing

Contributions welcome! Please read the implementation guide and decision log in the `docs/` folder before submitting PRs.

## Support

For issues and questions, please use GitHub Issues.