# Type-Safe MCP Server Pattern

## Why Type-First Development Matters

Following the insights from ["Why I'm Over GraphQL"](https://bessey.dev/blog/2024/05/24/why-im-over-graphql/), we implement a **type-first** approach for our MCP server that provides:

1. **Single Source of Truth**: Define types once, derive everything
2. **Compile-Time Safety**: TypeScript catches errors before runtime
3. **Runtime Validation**: Zod ensures data integrity
4. **Automatic Documentation**: Types serve as living documentation
5. **Client Generation Ready**: Schemas can generate client SDKs

## The Pattern

### 1. Define Once with Zod

```typescript
// Single source of truth for the search_vault tool
export const SearchVaultSchema = z.object({
  query: z.string().min(1).describe('Search query to find notes'),
  limit: z.number().min(1).max(100).default(20),
});

// TypeScript type automatically derived
export type SearchVaultInput = z.infer<typeof SearchVaultSchema>;
```

### 2. Generate JSON Schema for MCP

```typescript
// Automatically convert Zod → JSON Schema for protocol
const jsonSchema = zodToJsonSchema(SearchVaultSchema);
// Returns: { type: 'object', properties: {...}, required: [...] }
```

### 3. Type-Safe Handlers

```typescript
// Handlers must match exact types - compile error if wrong!
const handlers = createToolHandlers({
  search_vault: async (input: SearchVaultInput) => {
    // input.query is guaranteed to be a string
    // input.limit is guaranteed to be a number 1-100
  },
});
```

### 4. Runtime Validation

```typescript
// Incoming data is validated before reaching handlers
const parseResult = SearchVaultSchema.safeParse(unknownInput);
if (!parseResult.success) {
  return { error: parseResult.error.message };
}
// parseResult.data is now type-safe!
```

## Benefits Over Loose Typing

### Before (Current Implementation)
```typescript
// ❌ Loose typing, runtime casting, no validation
async callTool(name: string, args: Record<string, unknown>) {
  if (name === 'search_vault') {
    const query = args['query'] as string;  // Hope it's a string!
    const limit = args['limit'] as number;  // Hope it's a number!
    // No validation, no type safety
  }
}
```

### After (Type-Safe Pattern)
```typescript
// ✅ Full type safety and validation
async callTool(name: string, args: unknown) {
  const validated = SearchVaultSchema.safeParse(args);
  if (!validated.success) return { error: validated.error };
  
  // validated.data is SearchVaultInput type
  return this.handlers.search_vault(validated.data);
}
```

## Comparison with GraphQL/tRPC

| Aspect | GraphQL | tRPC | MCP + Zod |
|--------|---------|------|-----------|
| Type Safety | Schema-first | TypeScript-first | Schema-first with TypeScript |
| Complexity | High (resolvers, loaders) | Low | Low |
| Runtime Validation | Via schema | Via Zod | Via Zod |
| Protocol | HTTP/WebSocket | HTTP/WebSocket | JSON-RPC (stdio/HTTP) |
| Discovery | Introspection | TypeScript imports | MCP tool listing |
| Client Generation | Yes (codegen) | No (same codebase) | Yes (from schemas) |

## Implementation Checklist

- [x] Define Zod schemas for all tools
- [x] Generate TypeScript types from schemas
- [x] Create type-safe handler interface
- [x] Implement runtime validation
- [x] Generate JSON Schema for MCP protocol
- [ ] Add integration tests for type validation
- [ ] Consider using `@anatine/zod-openapi` for better JSON Schema generation
- [ ] Generate client SDK from schemas

## Future Improvements

1. **Better JSON Schema Generation**: Use a library like `zod-to-json-schema` for complete spec compliance
2. **OpenAPI Generation**: Export OpenAPI spec for HTTP transport
3. **Client SDK Generation**: Auto-generate TypeScript/Python clients from schemas
4. **Schema Versioning**: Add version field to schemas for backwards compatibility
5. **Custom Validators**: Add business logic validation (e.g., valid file paths)

## Key Takeaway

By following the "type-first" pattern advocated in the article, we get:
- **GraphQL's type safety** without the complexity
- **REST's simplicity** with full typing
- **MCP's discovery** with validation

This approach scales well and makes our MCP server robust, maintainable, and delightful to work with.