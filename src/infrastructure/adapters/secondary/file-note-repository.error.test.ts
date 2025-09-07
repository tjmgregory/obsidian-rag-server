import { beforeEach, describe, expect, test } from 'bun:test';
import { MockFileSystem } from '../../../../test/helpers/mock-file-system';
import { VaultAccessError } from '../../../domain/errors/note-errors';
import { isErr, isOk } from '../../../domain/types/result';
import { FileNoteRepository } from './file-note-repository';

describe('FileNoteRepository Error Handling', () => {
  let repository: FileNoteRepository;
  let mockFs: MockFileSystem;

  beforeEach(() => {
    mockFs = new MockFileSystem();
    repository = new FileNoteRepository('/vault', mockFs, ['.obsidian', '.trash']);
  });

  test('should return error when vault directory does not exist', async () => {
    // Don't add any files, so /vault doesn't exist
    const result = await repository.findAll();

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(VaultAccessError);
      expect(result.error.code).toBe('VAULT_ACCESS_ERROR');
      // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
      expect(result.error.context?.['vaultPath']).toBe('/vault');
    }
  });

  test('should continue loading other notes if one fails', async () => {
    // Add some valid notes
    mockFs.addFile('/vault/good1.md', '# Good Note 1');
    mockFs.addFile('/vault/good2.md', '# Good Note 2');

    // The repository should handle parse errors gracefully and continue
    const result = await repository.findAll();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toHaveLength(2);
    }
  });

  test('should propagate error when finding note by path with inaccessible vault', async () => {
    const result = await repository.findByPath('some-note.md');

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(VaultAccessError);
    }
  });

  test('should propagate error when finding notes by folder with inaccessible vault', async () => {
    const result = await repository.findByFolder('projects');

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(VaultAccessError);
    }
  });

  test('should propagate error when getting tags with inaccessible vault', async () => {
    const result = await repository.getAllTags();

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(VaultAccessError);
    }
  });

  test('should propagate error when getting recent notes with inaccessible vault', async () => {
    const result = await repository.getRecentlyModified(5);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(VaultAccessError);
    }
  });

  test('should handle corrupted frontmatter gracefully', async () => {
    // Add a note with potentially problematic frontmatter
    mockFs.addFile(
      '/vault/corrupted.md',
      `---
title: "Valid title"
tags: [tag1, tag2]
created: "not-a-valid-date"
---

# Content

Some content here.`,
    );

    const result = await repository.findAll();

    // Should still succeed, just with normalized/default values
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toHaveLength(1);
      const note = result.value[0];
      expect(note?.title).toBe('Valid title');
      expect(note?.tags).toContain('tag1');
      expect(note?.tags).toContain('tag2');
    }
  });

  test('should handle notes with invalid markdown gracefully', async () => {
    mockFs.addFile('/vault/invalid.md', 'This is just plain text without any markdown structure');

    const result = await repository.findAll();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toHaveLength(1);
      const note = result.value[0];
      expect(note?.title).toBe('Untitled'); // Should fall back to default
      expect(note?.content).toBe('This is just plain text without any markdown structure');
    }
  });
});
