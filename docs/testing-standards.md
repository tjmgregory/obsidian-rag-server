# Testing Standards

This document defines the testing standards for the Obsidian RAG Server project. All tests must follow these guidelines to ensure consistency, reliability, and maintainability.

## Testing Framework

- **Test Runner**: Bun's built-in test runner
- **Assertions**: Bun's built-in expect API
- **No External Frameworks**: No Jest, Vitest, Mocha, etc.

## Test-Driven Development (TDD)

### The TDD Cycle
1. **Red**: Write a failing test first
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code quality while keeping tests green

### TDD Rules
- Never write production code without a failing test
- Write the simplest code that makes the test pass
- Only refactor when tests are green

## Test Organization

### File Structure
```
test/
├── tools/              # MCP tool tests
│   ├── search-vault.test.ts
│   ├── get-note.test.ts
│   └── list-notes.test.ts
├── services/           # Service layer tests
│   ├── vault-service.test.ts
│   └── file-watcher.test.ts
├── mocks/              # Shared mock implementations
│   └── mock-file-system.ts
├── helpers/            # Test utilities
│   └── test-data.ts
└── integration/        # Integration tests (sparingly)
    └── real-vault.test.ts
```

### Test File Naming
- Test files must match source files: `vault-service.ts` → `vault-service.test.ts`
- Integration tests clearly marked: `real-vault.integration.test.ts`

## Test Structure

### Basic Test Template
```typescript
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';

describe('ComponentName', () => {
  let instance: ComponentType;
  let mockDependency: MockType;

  beforeEach(async () => {
    // Setup fresh state for each test
    mockDependency = new MockDependency();
    instance = new Component(mockDependency);
  });

  afterEach(async () => {
    // Cleanup if needed (rare with mocks)
  });

  describe('methodName', () => {
    test('should do expected behavior when given input', async () => {
      // Arrange
      const input = 'test input';
      
      // Act
      const result = await instance.method(input);
      
      // Assert
      expect(result).toBe('expected output');
    });
  });
});
```

## Testing Principles

### AAA Pattern
Every test should follow Arrange-Act-Assert:
```typescript
test('should find notes by keyword', async () => {
  // Arrange
  const searchTerm = 'project';
  
  // Act
  const results = await vaultService.searchNotes(searchTerm);
  
  // Assert
  expect(results.length).toBeGreaterThan(0);
  expect(results[0].snippet).toContain('project');
});
```

### One Assertion Per Test (Preferred)
```typescript
// ✅ Good: Focused test
test('should return null for non-existent note', async () => {
  const result = await service.getNote('missing.md');
  expect(result).toBeNull();
});

// ⚠️ Avoid: Multiple assertions (unless testing related properties)
test('should return note with all properties', async () => {
  const note = await service.getNote('test.md');
  expect(note).not.toBeNull();
  expect(note.title).toBe('Test');
  expect(note.path).toBe('test.md');
  // OK if testing a single object's properties
});
```

### Test Isolation
- Each test must be independent
- No shared state between tests
- Tests must run in any order
- Use beforeEach for fresh setup

## Mock Strategy

### Use Dependency Injection
```typescript
// Production code
export class VaultService {
  constructor(
    private config: VaultConfig,
    private fileSystem?: FileSystemAdapter  // Injectable
  ) {
    this.fileSystem = fileSystem || new RealFileSystem();
  }
}

// Test code
const mockFS = new MockFileSystem();
const service = new VaultService(config, mockFS);
```

### Mock File System Rules
- Pre-seed with minimal test data
- Provide helper methods for test manipulation
- Keep mock simple and fast
- Store everything in memory

```typescript
export class MockFileSystem implements FileSystemAdapter {
  private files = new Map<string, string>();
  
  // Test helpers
  addFile(path: string, content: string): void {
    this.files.set(path, content);
  }
  
  reset(): void {
    this.files.clear();
    this.seedTestData();
  }
}
```

## Test Data

### Minimal Representative Data
Create the smallest dataset that covers test cases:
```typescript
// ✅ Good: Minimal but complete
const TEST_NOTES = [
  { path: 'note1.md', content: '# Title\nContent with keyword' },
  { path: 'note2.md', content: '# Another\nDifferent content' }
];

// ❌ Bad: Too much data
const TEST_NOTES = [
  // 100 notes that slow down tests
];
```

### Predictable Test Data
- Use fixed dates (not `new Date()`)
- Use consistent file paths
- Use clear, descriptive content
- Include edge cases in test data

## Performance Testing

### Speed Requirements
```typescript
test('completes search within 200ms', async () => {
  const start = performance.now();
  await vaultService.searchNotes('test');
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(200);
});
```

### Memory Testing
Only for critical paths:
```typescript
test('handles large vault without memory issues', async () => {
  // Add 1000 test notes
  for (let i = 0; i < 1000; i++) {
    mockFS.addFile(`note${i}.md`, 'content');
  }
  
  const before = process.memoryUsage().heapUsed;
  await vaultService.initialize();
  const after = process.memoryUsage().heapUsed;
  
  expect(after - before).toBeLessThan(100 * 1024 * 1024); // 100MB
});
```

## Edge Cases to Test

### Always Test These Cases
- Empty inputs (`''`, `[]`, `{}`)
- Null/undefined handling
- Special characters in strings
- File paths with spaces
- Non-existent resources
- Boundary conditions (limits, pagination)
- Concurrent operations (if applicable)

### Example Edge Case Tests
```typescript
describe('edge cases', () => {
  test('handles empty search query', async () => {
    const results = await service.searchNotes('');
    expect(results).toEqual([]);
  });
  
  test('handles special characters in search', async () => {
    const results = await service.searchNotes('[[brackets]]');
    expect(results).toBeDefined();
    // Should not throw
  });
  
  test('handles file path with spaces', async () => {
    mockFS.addFile('my note.md', '# Test');
    const note = await service.getNote('my note.md');
    expect(note).not.toBeNull();
  });
});
```

## Integration Tests

### When to Write Integration Tests
- Testing real file system operations
- Testing MCP protocol integration
- End-to-end workflow validation
- Performance benchmarks with real data

### Integration Test Rules
- Keep them separate from unit tests
- Use real temp directories (clean up after)
- Run less frequently than unit tests
- Clearly mark as integration tests

```typescript
// test/integration/real-vault.integration.test.ts
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Integration: Real file system', () => {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'test-'));
  });
  
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });
  
  test('reads real files from disk', async () => {
    // Test with actual file I/O
  });
});
```

## Test Coverage

### Coverage Goals
- Minimum 80% code coverage
- 100% coverage for critical paths (search, retrieval)
- Don't test:
  - Simple getters/setters
  - Framework code
  - Type definitions

### Running Coverage
```bash
bun test --coverage
```

## Testing Anti-Patterns

### Don't Do These
```typescript
// ❌ Testing implementation details
test('should call parseNote 5 times', () => {
  // Tests HOW not WHAT
});

// ❌ Conditional test logic
test('should maybe return results', () => {
  if (results.length > 0) {
    expect(results[0]).toBeDefined();
  }
  // Tests should be deterministic
});

// ❌ Sleeping in tests
test('should update after delay', async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  // Use mock timers or events instead
});

// ❌ Large test data in code
test('should handle content', () => {
  const content = `
    500 lines of test content...
  `;
  // Use fixtures or generate programmatically
});
```

## Test Naming

### Test Names Should Be Descriptive
```typescript
// ✅ Good: Clear what's being tested
test('returns empty array when search finds no matches', async () => {});
test('throws error when vault path does not exist', async () => {});
test('ranks title matches higher than content matches', async () => {});

// ❌ Bad: Vague or unclear
test('search works', async () => {});
test('handles errors', async () => {});
test('test 1', async () => {});
```

## Debugging Tests

### Use Test Isolation
```bash
# Run single test file
bun test test/services/vault-service.test.ts

# Run with watch mode for TDD
bun test --watch

# See detailed output
bun test --verbose
```

### Debug Output
Only during debugging, remove before commit:
```typescript
test('debug test', async () => {
  const result = await service.method();
  console.log('Debug:', result); // Remove before commit!
  expect(result).toBeDefined();
});
```

## Continuous Integration

### Tests Must Pass Before Merge
- All tests must pass
- No skipped tests without justification
- Coverage must not decrease
- Performance tests must pass

## Test Review Checklist

Before submitting tests:
- [ ] Tests follow AAA pattern
- [ ] Tests are isolated and independent
- [ ] Test names clearly describe behavior
- [ ] Edge cases are covered
- [ ] No hardcoded delays or sleeps
- [ ] Mocks are properly typed
- [ ] No console.log statements
- [ ] Tests run fast (<5s for unit test suite)
- [ ] Integration tests are clearly marked
- [ ] Coverage meets minimum requirements