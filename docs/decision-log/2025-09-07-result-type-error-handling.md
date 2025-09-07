# Decision: Adopt Result Type for Error Handling

**Date**: 2025-09-07  
**Decision Maker**: Development Team  
**Status**: Accepted  
**Review Date**: 2025-12-07

## Context

During Phase 1 implementation, we needed a robust error handling strategy that would:
- Make error paths explicit and type-safe
- Avoid unexpected exceptions in repository methods
- Allow graceful error recovery (e.g., continue loading other notes when one fails)
- Provide rich error context for debugging

Traditional try-catch exception handling was making it difficult to distinguish between expected failures (file not found) and unexpected errors (corruption, I/O errors).

## Decision

Adopt a functional error handling pattern using `Result<T, E>` type, inspired by Rust's Result type.

### Implementation

```typescript
export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };
```

Repository methods return Results instead of throwing exceptions:
```typescript
interface NoteRepository {
  findAll(): Promise<Result<Note[], DomainError>>;
  findByPath(path: string): Promise<Result<Note | null, DomainError>>;
}
```

## Rationale

1. **Type Safety**: Errors are part of the function signature, making them impossible to ignore
2. **Explicit Handling**: Callers must explicitly handle both success and failure cases
3. **Composability**: Results can be mapped, chained, and combined functionally
4. **Performance**: No exception stack unwinding for expected failures
5. **Debugging**: Error types carry structured context about what went wrong

## Alternatives Considered

### 1. Traditional Exceptions
- **Pros**: Familiar pattern, automatic propagation
- **Cons**: Hidden control flow, no type safety, performance overhead

### 2. Node.js Callbacks (error-first)
- **Pros**: Standard Node.js pattern
- **Cons**: Callback hell, no async/await support, easy to ignore errors

### 3. Either Monad (fp-ts library)
- **Pros**: Full functional programming support
- **Cons**: Heavy dependency, steep learning curve, overkill for our needs

## Consequences

### Positive
- All error paths are visible in the type system
- Impossible to accidentally ignore errors
- Better error messages with structured context
- Graceful partial failure handling (load what we can)
- Consistent error handling across the codebase

### Negative
- Learning curve for developers unfamiliar with Result types
- More verbose than exceptions (must unwrap Results)
- Need helper functions (isOk, isErr, unwrap, mapResult)
- Migration effort for existing code

## Implementation Guidelines

1. **Use Result for:** Repository methods, external I/O, validation
2. **Use Exceptions for:** Programming errors, invariant violations
3. **Always include context:** Error types should carry relevant debugging information
4. **Graceful degradation:** Continue processing when individual items fail

## Example Migration

Before:
```typescript
async findAll(): Promise<Note[]> {
  const files = await fs.readdir(path); // Might throw
  return files.map(f => this.parseNote(f)); // Might throw
}
```

After:
```typescript
async findAll(): Promise<Result<Note[], DomainError>> {
  try {
    const files = await fs.readdir(path);
    const notes = [];
    for (const file of files) {
      const result = await this.loadNote(file);
      if (result.ok) {
        notes.push(result.value);
      } else {
        logger.warn('Failed to load note', { file, error: result.error });
      }
    }
    return Ok(notes);
  } catch (error) {
    return Err(new VaultAccessError(path, error));
  }
}
```

## References

- [Rust Result Type](https://doc.rust-lang.org/std/result/)
- [Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/)
- Our implementation: `src/domain/types/result.ts`
- Updated coding standards: `docs/coding-standards.md`