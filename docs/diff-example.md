# Why Trailing Commas Matter

## Without Trailing Commas

When adding a new property without trailing commas:

```diff
 const config = {
   vaultPath: '/',
   ignoredFolders: ['.obsidian'],
-  cacheSize: 100
+  cacheSize: 100,
+  searchLimit: 50
 };
```

Two lines changed (added comma to previous line + new line).

## With Trailing Commas

When adding a new property with trailing commas:

```diff
 const config = {
   vaultPath: '/',
   ignoredFolders: ['.obsidian'],
   cacheSize: 100,
+  searchLimit: 50,
 };
```

Only one line changed - cleaner diff, easier review!

## Benefits

1. **Cleaner git history** - Only actual changes show in diffs
2. **Fewer merge conflicts** - Adding items doesn't modify existing lines
3. **Easier code reviews** - Reviewers focus on real changes
4. **Consistent formatting** - Biome enforces this automatically

## Arrays Too

```typescript
// With trailing commas
const tags = [
  'project',
  'development',
  'testing',  // <- trailing comma
];

// Adding new item = 1 line diff
const tags = [
  'project',
  'development',
  'testing',
+ 'production',
];
```

## Function Parameters

```typescript
// Multi-line parameters get trailing commas
function createNote(
  path: string,
  content: string,
  metadata: NoteMetadata,  // <- trailing comma
) {
  // ...
}
```

This is now enforced automatically by Biome with `"trailingCommas": "all"`!