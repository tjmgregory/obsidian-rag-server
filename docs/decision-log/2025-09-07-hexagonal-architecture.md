# Decision: Adopt Hexagonal Architecture

**Date**: 2025-09-07  
**Decision Maker**: Development Team  
**Status**: Accepted  
**Review Date**: 2025-12-07

## Context

We are building an MCP server for RAG functionality in Obsidian vaults. The system needs to:
- Be easily testable without requiring file system access
- Support multiple transport mechanisms (STDIO now, HTTP/SSE later)
- Maintain clean separation between business logic and infrastructure
- Allow for easy replacement of infrastructure components
- Scale from Phase 1 (keyword search) to Phase 2+ (semantic search, vector DBs)

## Decision

We will adopt **Hexagonal Architecture** (Ports and Adapters) as our primary architectural pattern for the Obsidian RAG Server.

### Key Architectural Principles

1. **Domain at the Center**: Pure business logic with zero infrastructure dependencies
2. **Ports Define Contracts**: Interfaces owned by the domain/application layer
3. **Adapters Implement Infrastructure**: Concrete implementations for specific technologies
4. **Dependency Inversion**: Always depend on abstractions, not concrete implementations
5. **Composition Root**: Single place where all dependencies are wired together

### Layer Structure

```
Primary Adapters (MCP, HTTP, CLI)
          ↓
    Primary Ports (Use Cases)
          ↓
     Domain Core (Pure Logic)
          ↓
   Secondary Ports (Interfaces)
          ↓
Secondary Adapters (File System, Cache, DB)
```

## Rationale

### Benefits for Our Project

1. **Testability**: 
   - Domain logic can be tested without any I/O
   - Use cases can be tested with in-memory implementations
   - 80% of tests run in milliseconds without file system

2. **Flexibility**:
   - Easy to switch from STDIO to HTTP transport
   - Can replace file-based storage with database in Phase 2
   - Mock implementations for testing, real ones for production

3. **Maintainability**:
   - Clear boundaries between layers
   - Business logic isolated from framework changes
   - Easy to understand where different concerns live

4. **Scalability**:
   - Clean path from Phase 1 to Phase 2+
   - Can add vector database without touching domain
   - New features don't break existing ones

### Specific Implementation Benefits

- **For MCP Protocol**: MCP becomes just another adapter, not central to architecture
- **For Testing**: Can test search algorithms without reading actual files
- **For Caching**: Cache is a port - can swap implementations easily
- **For File Watching**: Completely isolated in infrastructure layer

## Alternatives Considered

### 1. Traditional Layered Architecture
- **Pros**: Simple, well-understood
- **Cons**: Tends to couple business logic to infrastructure
- **Rejected because**: Would make testing harder and Phase 2 migration more difficult

### 2. Simple Service Pattern
- **Pros**: Very simple, quick to implement
- **Cons**: No clear boundaries, testing requires mocking everything
- **Rejected because**: Already experiencing pain with VaultService having too many responsibilities

### 3. Clean Architecture (Uncle Bob)
- **Pros**: Similar benefits to hexagonal
- **Cons**: More complex with additional layers
- **Rejected because**: Hexagonal is simpler and sufficient for our needs

## Implementation Details

### Directory Structure
```
src/
├── domain/              # Pure business logic
│   ├── entities/       # Note, SearchResult
│   └── services/       # NoteSearcher, NoteRanker
├── application/         # Use cases and ports
│   ├── ports/
│   │   ├── primary/    # Use case interfaces
│   │   └── secondary/  # Repository interfaces
│   └── use-cases/      # Use case implementations
├── infrastructure/      # All external concerns
│   ├── adapters/
│   │   ├── primary/    # MCP server adapter
│   │   └── secondary/  # File system, cache adapters
│   └── composition/    # Dependency injection
└── index.ts            # Entry point
```

### Testing Strategy
- **Domain**: Direct unit tests, no mocks
- **Use Cases**: Mock only secondary ports
- **Adapters**: Integration tests with real dependencies
- **End-to-end**: Few tests through complete system

### Migration Path
1. Create domain entities and services (pure logic)
2. Define ports as interfaces
3. Implement use cases
4. Create adapters for current infrastructure
5. Wire everything in composition root
6. Gradually migrate existing code

## Consequences

### Positive
- Clear separation of concerns
- Highly testable code
- Easy to maintain and extend
- Framework-agnostic domain
- Clear path for Phase 2 features

### Negative
- More files and interfaces initially
- Learning curve for team unfamiliar with pattern
- Some boilerplate for dependency injection
- May feel over-engineered for simple features

### Mitigations
- Start with essential ports only
- Use clear naming conventions
- Document the architecture well
- Provide examples in code
- Keep composition root simple

## References

- [Hexagonal Architecture by Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- [Ports and Adapters Pattern](https://en.wikipedia.org/wiki/Hexagonal_architecture_(software))
- Testing standards updated to support hexagonal testing strategy
- Coding standards updated with hexagonal guidelines

## Review Notes

*To be added after 3-month review on 2025-12-07*