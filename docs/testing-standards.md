# Testing Standards

This document defines the testing standards for the Obsidian RAG Server project. All tests must follow these guidelines to ensure consistency, reliability, and maintainability.

## Core Testing Philosophy

### Test Behaviors, Not Implementation Details
The fundamental principle of our testing methodology is to **test behaviors and requirements, not implementation details**. This means:
- Tests should verify WHAT the system does, not HOW it does it
- Focus on the public contract/API of modules, not internal classes or methods
- A behavior is a requirement the system must fulfill (e.g., "search notes by keyword" not "the searchNotes method returns an array")

### System Under Test
- The system under test is the **module's public API**, not individual classes
- Test at the boundary of your module (the exports/facade)
- Internal implementation details should remain free to change without breaking tests

## Testing Framework

- **Test Runner**: Bun's built-in test runner
- **Assertions**: Bun's built-in expect API
- **No External Frameworks**: No Jest, Vitest, Mocha, etc.

## Test-Driven Development (TDD)

### The Red-Green-Refactor Cycle

This three-step cycle is the foundation of effective TDD:

#### 1. RED Phase - Write a Failing Test
- Write a test for a **behavior/requirement** you want to implement
- The test MUST fail initially to prove it's testing something meaningful
- Focus on the behavior from the user/consumer perspective
- Example: "When I search for 'project', notes containing that word are returned"

#### 2. GREEN Phase - Make It Pass Quickly
- Write the **simplest, fastest code** that makes the test pass
- **Commit whatever sins necessary** - duplicate code, poor structure, etc.
- This is NOT the time for good engineering - be the "duct-tape programmer"
- Goal: Understand how to solve the problem as quickly as possible
- Use transaction scripts, copy from Stack Overflow, whatever works
- As Kent Beck says: "For this brief moment, speed trumps design"

#### 3. REFACTOR Phase - Make It Clean
- NOW apply good engineering practices
- Remove duplication, apply patterns, extract classes/methods
- **CRITICAL: Do NOT write new tests during refactoring**
- The original behavior test covers all refactoring changes
- Use safe refactoring moves that don't change behavior
- Only the implementation details change, not the public API

### TDD Rules
- The trigger for a new test is a **new requirement**, not a new method/class
- Tests enable refactoring by staying stable while implementation changes
- Unit of isolation is **the test**, not the class under test

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

## Unit Testing Clarification

### What "Unit" Really Means
- **Unit of Isolation**: The TEST, not the class under test
- **Unit Test**: A test that can run independently without affecting other tests
- It's perfectly fine for unit tests to:
  - Use multiple real classes together
  - Touch databases/filesystems IF there's no shared fixture problem
  - Test a complete module with its internal dependencies

### When External Dependencies Are OK
- Use real dependencies when they don't cause:
  - **Speed issues**: Tests should complete in seconds
  - **Isolation problems**: One test affecting another
  - **Non-determinism**: Random failures

## Mock Strategy

### When to Use Mocks
Use mocks ONLY when:
1. **External resources are expensive/slow** (databases, APIs, file systems)
2. **Shared fixture problems exist** (tests interfering with each other)
3. **Testing error conditions** that are hard to reproduce
4. **At module boundaries** when testing interactions between modules

### When NOT to Use Mocks
- **Don't mock to isolate classes** - this couples tests to implementation
- **Don't mock internal dependencies** within a module
- **Don't use mocks to enforce implementation details**
- **Don't mock simple value objects or data structures**

### Dependency Injection for Testing
```typescript
// Production code
export class VaultService {
  constructor(
    private config: VaultConfig,
    private fileSystem?: FileSystemAdapter  // Injectable for testing
  ) {
    this.fileSystem = fileSystem || new RealFileSystem();
  }
}

// Test code - inject mock only when needed
const mockFS = new MockFileSystem();
const service = new VaultService(config, mockFS);
```

### Mock Implementation Guidelines
- Keep mocks simple and focused on behavior
- Pre-seed with minimal, predictable test data
- Provide test helper methods for manipulation
- Store everything in memory for speed

```typescript
export class MockFileSystem implements FileSystemAdapter {
  private files = new Map<string, string>();
  
  // Minimal behavior implementation
  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (!content) throw new Error(`File not found: ${path}`);
    return content;
  }
  
  // Test helpers
  addFile(path: string, content: string): void {
    this.files.set(path, content);
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

## The Testing Pyramid

### Ideal Test Distribution
```
         /\        <- System Tests (few)
        /  \         Check end-to-end flows work
       /    \      
      /      \     <- Integration Tests (some)
     /        \      Test module boundaries/ports
    /          \   
   /            \  <- Developer Tests (many)
  /______________\   Test behaviors at module level
```

- **Developer Tests (80%)**: Fast, behavior-focused tests at the module API level
- **Integration Tests (15%)**: Test that modules integrate correctly at boundaries
- **System Tests (5%)**: End-to-end tests through the complete system

### Avoid the Testing Ice Cream Cone (Anti-Pattern)
- Many manual tests at the top
- Heavy reliance on UI/Selenium tests
- Few developer tests at the bottom
- This is expensive, slow, and fragile

## Testing Gears - When to Drill Down

### The Five Gears of TDD
Sometimes you need to temporarily drill into implementation details:

1. **5th Gear (Normal TDD)**: Test behavior, implementation is obvious
2. **4th Gear (Standard)**: Test behavior, refactor to clean code
3. **3rd Gear (Exploration)**: Temporarily test internals to understand the problem
4. **2nd Gear**: Test smaller pieces when stuck
5. **1st Gear**: Test tiny implementation details when learning

### Using Lower Gears
When you shift to 3rd gear or lower:
1. Write tests to help understand the implementation
2. Use them as scaffolding to guide development
3. **DELETE these tests after going green**
4. Keep only the high-level behavior tests
5. The implementation detail tests are learning aids, not permanent fixtures

Example:
```typescript
// Temporary exploration test (DELETE after implementation)
test('helper: parse date format', () => {
  // Use to understand date parsing
  // DELETE once main behavior test passes
});

// Keep this behavior test
test('returns notes modified after given date', () => {
  // This stays - it tests required behavior
});
```

## Testing Anti-Patterns

### Critical Anti-Patterns to Avoid

#### 1. Testing Implementation Instead of Behavior
```typescript
// ❌ BAD: Testing HOW it works
test('should call repository.save() twice', () => {
  expect(mockRepo.save).toHaveBeenCalledTimes(2);
});

// ✅ GOOD: Testing WHAT it does
test('should persist user and audit log', async () => {
  await service.createUser(userData);
  expect(await service.getUser(id)).toEqual(userData);
  expect(await service.getAuditLog(id)).toContainEntry('user_created');
});
```

#### 2. Heavy Mocking of Internal Dependencies
```typescript
// ❌ BAD: Mocking everything
test('should process order', () => {
  const mockValidator = mock(Validator);
  const mockCalculator = mock(Calculator);
  const mockNotifier = mock(Notifier);
  // Tests become brittle and coupled to implementation
});

// ✅ GOOD: Test the module as a whole
test('should process valid order', async () => {
  const order = createTestOrder();
  const result = await orderModule.process(order);
  expect(result.status).toBe('completed');
});
```

#### 3. Making Things Public for Testing
```typescript
// ❌ BAD: Breaking encapsulation
class Service {
  public validateInternal() { }  // Made public just for testing
}

// ✅ GOOD: Test through public API
class Service {
  private validateInternal() { }  // Stays private
  public process() {             // Test this behavior
    this.validateInternal();
  }
}
```

#### 4. Test-Specific Production Code
```typescript
// ❌ BAD: if (process.env.NODE_ENV === 'test')
// ❌ BAD: Using InternalsVisibleTo (C#)
// ❌ BAD: Special test-only methods or flags
```

#### 5. Brittle Test Assertions
```typescript
// ❌ BAD: Over-specified test
test('should return formatted result', () => {
  expect(result).toEqual({
    id: 123,
    name: 'Test',
    created: '2024-01-01T10:00:00.000Z',  // Brittle!
    internal_flag: true,  // Implementation detail!
  });
});

// ✅ GOOD: Test essential behavior
test('should return user data', () => {
  expect(result.id).toBeDefined();
  expect(result.name).toBe('Test');
  // Don't assert on internals or exact formats
});
```

#### 6. Testing Framework Code
```typescript
// ❌ BAD: Testing that React/Vue/Angular works
// ❌ BAD: Testing third-party libraries
// ❌ BAD: Testing language features
```

#### 7. Ignoring Test Maintenance
- Keeping broken tests "to fix later"
- Commenting out failing tests
- Using `.skip()` without immediate follow-up
- Accepting flaky tests as normal

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

## Ports and Adapters Architecture for Testing

### Architecture Overview
The Ports and Adapters (Hexagonal) architecture provides clear testing boundaries:

```
┌─────────────────────────────────────┐
│         Adapters (Outside)          │
│  ┌─────────────────────────────┐    │
│  │   HTTP/GUI    │   Database  │    │
│  │   Adapters    │   Adapters  │    │
│  └───────┬───────┴──────┬──────┘    │
│          │              │           │
│  ┌───────▼───────┬──────▼──────┐    │
│  │     Ports    │    Ports     │    │ <- Test Here!
│  └───────┬───────┴──────┬──────┘    │
│          │              │           │
│  ┌───────▼──────────────▼──────┐    │
│  │                              │    │
│  │      Domain/Business         │    │
│  │         Logic                │    │
│  │    (Technology-Free)         │    │
│  │                              │    │
│  └──────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Testing at Different Levels

#### 1. Domain/Business Logic Tests (Core)
- Test pure business behaviors
- No technology concerns (no DB, no HTTP)
- These form the bulk of your tests
- Example: "Calculate search relevance score"

#### 2. Port Tests (Boundaries)
- Test the contracts/interfaces your domain exposes
- Mock external adapters if needed
- Example: "SearchPort returns filtered results"

#### 3. Adapter Tests (Minimal)
- Only test configuration and setup
- Don't test third-party code
- Example: "Database adapter connects with config"

#### 4. Integration Tests (Few)
- Test that ports and adapters connect correctly
- Use real dependencies but isolated data
- Example: "Can persist and retrieve a note"

### Practical Example
```typescript
// Domain (test heavily)
class NoteSearcher {
  findRelevantNotes(query: string, notes: Note[]): SearchResult[] {
    // Pure business logic - easy to test
  }
}

// Port (test the contract)
interface SearchPort {
  search(query: string): Promise<SearchResult[]>;
}

// Adapter (test minimally)
class HttpSearchAdapter {
  constructor(private searchPort: SearchPort) {}
  
  async handleRequest(req: Request): Promise<Response> {
    // Just adapts HTTP to port interface
    // Test: Does it call the port correctly?
  }
}
```

## BDD and Customer-Facing Tests

### Why We Don't Use Gherkin/Cucumber
Based on extensive experience, we avoid BDD tools like Gherkin, Cucumber, or FitNesse because:

1. **Customers don't actually read them** - Despite promises, customers rarely engage with these tests
2. **Translation layer overhead** - Converting natural language to code adds complexity
3. **Maintenance burden** - Two representations of the same requirement
4. **False confidence** - Green tests don't mean customers agree with the behavior
5. **Slow execution** - These tests typically run much slower than developer tests

### Alternative: Behavior-Focused Developer Tests
Instead, write developer tests that focus on behaviors:
```typescript
// Clear behavior description in test name
test('search returns notes ordered by relevance when multiple matches exist', async () => {
  // Implement behavior verification
});

// Group related behaviors
describe('Note search behavior', () => {
  test('finds notes by exact title match first', async () => {});
  test('finds notes by content match second', async () => {});
  test('excludes notes from ignored folders', async () => {});
});
```

## Test Review Checklist

Before submitting tests:
- [ ] **Tests verify behaviors, not implementation details**
- [ ] **Following Red-Green-Refactor cycle properly**
- [ ] Tests follow AAA pattern (Arrange-Act-Assert)
- [ ] Tests are isolated and independent
- [ ] Test names clearly describe the behavior being tested
- [ ] **No unnecessary mocks** - only mock external dependencies
- [ ] **Testing at the right level** - module API, not internal classes
- [ ] **No tests for refactored internals** - only behavior tests
- [ ] Edge cases are covered
- [ ] No hardcoded delays or sleeps
- [ ] No console.log statements
- [ ] Tests run fast (<5s for unit test suite)
- [ ] Integration tests are clearly marked
- [ ] **Exploratory tests have been deleted** after implementation
- [ ] Coverage meets minimum requirements (80% for critical paths)
- [ ] **No test-specific production code**
- [ ] **Encapsulation preserved** - no public methods just for testing

## Summary of Core Principles

1. **Test behaviors and requirements**, not methods and classes
2. **Red-Green-Refactor**: Fail first, pass quickly, refactor without new tests  
3. **The unit of isolation is the test**, not the class under test
4. **Test at module boundaries**, not internal implementation
5. **Minimize mocking** - only mock external dependencies when necessary
6. **Delete exploratory tests** after using them to understand implementation
7. **Refactoring never requires new tests** - behavior remains the same
8. **Speed and isolation over purity** - pragmatic choices for fast feedback
9. **Customer-facing tests are usually not worth it** - focus on developer tests
10. **Keep tests maintainable** - they should enable change, not prevent it

## Git Pre-Commit Hook Support

The project's pre-commit hook intelligently supports this methodology:
- **Documentation commits**: Skip tests for docs-only changes
- **Red phase**: Allow failing tests when committing test files only
- **Green phase**: Require passing tests when committing implementation
- **Refactoring**: Detect and praise when only implementation changes (tests stable)
- **Configuration changes**: Allow commits with warnings for tooling updates