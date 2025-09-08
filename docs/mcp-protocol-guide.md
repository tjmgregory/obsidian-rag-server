# MCP Protocol Guide

## How MCP Tool Discovery Works

This guide explains how AI agents (like Claude) discover and learn to use MCP server capabilities without prior knowledge.

## The Discovery Flow

### 1. Initial Connection - "Hello, who are you?"

When an agent connects to an MCP server, it sends an `initialize` request:

```json
// Agent → Server
{
  "method": "initialize",
  "params": {
    "protocolVersion": "0.1.0",
    "capabilities": {},
    "clientInfo": { "name": "claude", "version": "1.0" }
  }
}

// Server → Agent
{
  "result": {
    "protocolVersion": "2025-06-18",
    "capabilities": {
      "tools": {},      // "I support tools"
      "resources": {}   // "I support resources"
    },
    "serverInfo": {
      "name": "obsidian-rag",
      "version": "0.1.0"
    }
  }
}
```

### 2. Tool Discovery - "What can you do?"

The agent asks for available tools using `tools/list`:

```json
// Agent → Server
{ "method": "tools/list" }

// Server → Agent
{
  "tools": [
    {
      "name": "search_vault",
      "description": "Search notes in the Obsidian vault by keyword",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Search query to find notes"
          },
          "limit": {
            "type": "number",
            "description": "Maximum number of results to return",
            "minimum": 1,
            "maximum": 100,
            "default": 20
          }
        },
        "required": ["query"]
      }
    }
  ]
}
```

### 3. Dynamic Understanding

The agent now knows:
- **Tool name**: `search_vault`
- **Purpose**: From the description
- **Parameters**: `query` (required string), `limit` (optional number 1-100)
- **Defaults**: `limit` defaults to 20
- **Validation rules**: Built into the schema

### 4. Tool Invocation - "Do this for me"

When the user asks to search, the agent can now call the tool:

```json
// Agent → Server
{
  "method": "tools/call",
  "params": {
    "name": "search_vault",
    "arguments": {
      "query": "Spanish learning",
      "limit": 5
    }
  }
}
```

## Why This Is Powerful

### No Hardcoding Required
- Agents don't need to know about your server beforehand
- You can add new tools without updating any clients
- Tools are discovered at runtime

### Self-Documenting
- Descriptions explain what each tool does
- Parameter descriptions guide usage
- Schemas enforce correct types

### Type Safety Through Schemas
- JSON Schema provides strict typing
- Validation happens before execution
- Clear error messages for invalid inputs

### Universal Compatibility
- Any MCP-compatible client can use any MCP server
- Protocol is language-agnostic
- Works over stdio, HTTP, WebSocket

## Comparison with Other Approaches

| Aspect | REST API | GraphQL | gRPC | MCP |
|--------|----------|---------|------|-----|
| Discovery | OpenAPI/Swagger | Introspection | Proto files | Built-in protocol |
| Type Safety | Optional | Schema-first | Proto-first | JSON Schema |
| Documentation | Separate | In schema | In proto | In protocol |
| Learning Curve | Medium | High | High | Low |
| Transport | HTTP | HTTP/WS | HTTP/2 | Multiple |

## Best Practices for MCP Servers

### 1. Write Clear Descriptions
```typescript
// ❌ Bad
"description": "Search"

// ✅ Good
"description": "Search notes in the Obsidian vault by keyword, returning relevant excerpts"
```

### 2. Use Descriptive Parameter Names
```typescript
// ❌ Bad
"q": { "type": "string" }

// ✅ Good
"query": { 
  "type": "string",
  "description": "Search query to find notes"
}
```

### 3. Provide Sensible Defaults
```typescript
"limit": {
  "type": "number",
  "default": 20,  // Reasonable default
  "minimum": 1,
  "maximum": 100  // Prevent abuse
}
```

### 4. Use Consistent Naming
- Tools: `verb_noun` format (e.g., `search_vault`, `get_note`)
- Parameters: Clear, descriptive names
- Maintain consistency across all tools

## Implementation Tips

### Type-First Development
Following insights from ["Why I'm Over GraphQL"](https://bessey.dev/blog/2024/05/24/why-im-over-graphql/):

1. **Define types once** (using Zod or similar)
2. **Generate JSON schemas** from types
3. **Validate at runtime** using the same types
4. **Get compile-time safety** in your implementation

Example with Zod:
```typescript
const SearchSchema = z.object({
  query: z.string().describe("Search query"),
  limit: z.number().min(1).max(100).default(20)
});

// Type is derived
type SearchInput = z.infer<typeof SearchSchema>;

// JSON Schema is generated
const jsonSchema = zodToJsonSchema(SearchSchema);

// Runtime validation
const validated = SearchSchema.parse(input);
```

### Error Handling
Always return clear, actionable error messages:

```typescript
// ❌ Bad
{ "error": "Invalid input" }

// ✅ Good
{
  "error": "Invalid arguments",
  "details": "Parameter 'limit' must be between 1 and 100, got 500"
}
```

## Resources

- [MCP Specification](https://modelcontextprotocol.io/specification)
- [JSON Schema](https://json-schema.org/)
- [Our Type-Safe Pattern](./type-safe-mcp-pattern.md)

## Key Takeaway

MCP's discovery protocol means **your server teaches agents how to use it**. Focus on:
- Clear, descriptive schemas
- Good documentation in descriptions
- Type safety in implementation
- Consistent patterns

This creates a delightful experience for both AI agents and developers!