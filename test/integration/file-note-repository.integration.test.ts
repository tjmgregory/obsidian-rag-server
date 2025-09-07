import { beforeAll, describe, expect, test } from 'bun:test';
import * as path from 'node:path';
import { isOk, unwrap } from '../../src/domain/types/result';
import { BunFileSystem } from '../../src/infrastructure/adapters/secondary/bun-file-system';
import { FileNoteRepository } from '../../src/infrastructure/adapters/secondary/file-note-repository';

describe('FileNoteRepository Integration Tests', () => {
  let repository: FileNoteRepository;
  const testVaultPath = path.join(__dirname, '../fixtures/test-vault');

  beforeAll(() => {
    const fileSystem = new BunFileSystem();
    repository = new FileNoteRepository(
      testVaultPath,
      fileSystem,
      ['.obsidian', '.trash'],
      false, // Disable performance monitoring for integration tests
    );
  });

  test('should load all markdown files from real file system', async () => {
    const result = await repository.findAll();

    expect(isOk(result)).toBe(true);
    const notes = unwrap(result);
    expect(notes).toHaveLength(5); // We created 5 test files

    const paths = notes.map((n) => n.path).sort();
    expect(paths).toEqual([
      'daily/2024-01-01.md',
      'projects/project-1.md',
      'resources/empty-note.md',
      'simple-note.md',
      'with-frontmatter.md',
    ]);
  });

  test('should parse frontmatter correctly from real files', async () => {
    const result = await repository.findAll();
    expect(isOk(result)).toBe(true);
    const notes = unwrap(result);
    const withFrontmatter = notes.find((n) => n.path === 'with-frontmatter.md');

    expect(withFrontmatter).toBeDefined();
    expect(withFrontmatter?.title).toBe('Custom Title from Frontmatter');
    expect(withFrontmatter?.frontmatter).toMatchObject({
      title: 'Custom Title from Frontmatter',
      tags: ['typescript', 'testing', 'documentation'],
      aliases: ['test-doc', 'sample-doc'],
      // biome-ignore lint/style/useNamingConvention: Testing actual Obsidian field names
      custom_field: 'Some custom value',
    });
  });

  test('should extract all tags from real files', async () => {
    const result = await repository.findAll();
    expect(isOk(result)).toBe(true);
    const notes = unwrap(result);
    const projectNote = notes.find((n) => n.path === 'projects/project-1.md');

    expect(projectNote).toBeDefined();
    // Should have both frontmatter tags and inline tags
    expect(projectNote?.tags).toContain('project');
    expect(projectNote?.tags).toContain('active');
    expect(projectNote?.tags).toContain('project-management');
    expect(projectNote?.tags).toContain('planning');
  });

  test('should extract links from real files', async () => {
    const result = await repository.findAll();
    expect(isOk(result)).toBe(true);
    const notes = unwrap(result);
    const dailyNote = notes.find((n) => n.path === 'daily/2024-01-01.md');

    expect(dailyNote).toBeDefined();
    expect(dailyNote?.links).toContain('projects/project-1');
  });

  test('should handle empty files gracefully', async () => {
    const result = await repository.findAll();
    expect(isOk(result)).toBe(true);
    const notes = unwrap(result);
    const emptyNote = notes.find((n) => n.path === 'resources/empty-note.md');

    expect(emptyNote).toBeDefined();
    expect(emptyNote?.title).toBe('Untitled');
    expect(emptyNote?.content).toBe('');
    expect(emptyNote?.tags).toEqual([]);
    expect(emptyNote?.links).toEqual([]);
  });

  test('should find notes by folder', async () => {
    const result = await repository.findByFolder('projects');

    expect(isOk(result)).toBe(true);
    const projectNotes = unwrap(result);
    expect(projectNotes).toHaveLength(1);
    expect(projectNotes[0]?.path).toBe('projects/project-1.md');
  });

  test('should find note by specific path', async () => {
    const result = await repository.findByPath('simple-note.md');

    expect(isOk(result)).toBe(true);
    const note = unwrap(result);
    expect(note).not.toBeNull();
    expect(note?.title).toBe('Simple Note');
    expect(note?.tags).toContain('simple-tag');
    expect(note?.links).toContain('another-note');
  });

  test('should aggregate all tags with counts', async () => {
    const result = await repository.getAllTags();

    expect(isOk(result)).toBe(true);
    const tags = unwrap(result);
    // Check some expected tags and their counts
    expect(tags.get('project')).toBe(1);
    expect(tags.get('daily')).toBe(1);
    expect(tags.get('typescript')).toBe(1);
    expect(tags.get('testing')).toBe(1);
  });

  test('should get recently modified notes', async () => {
    const result = await repository.getRecentlyModified(3);

    expect(isOk(result)).toBe(true);
    const recent = unwrap(result);
    expect(recent).toHaveLength(3);
    // Should be sorted by modification date (newest first)
    for (let i = 0; i < recent.length - 1; i++) {
      expect(recent[i]?.modifiedAt.getTime()).toBeGreaterThanOrEqual(
        recent[i + 1]?.modifiedAt.getTime() ?? 0,
      );
    }
  });

  test('should handle non-existent paths correctly', async () => {
    const result = await repository.findByPath('non-existent.md');
    expect(isOk(result)).toBe(true);
    const note = unwrap(result);
    expect(note).toBeNull();
  });

  test('should load notes with complex paths', async () => {
    const result = await repository.findByPath('projects/project-1.md');

    expect(isOk(result)).toBe(true);
    const note = unwrap(result);
    expect(note).not.toBeNull();
    expect(note?.title).toBe('Project Alpha');
  });

  test('performance: should load vault quickly', async () => {
    const start = performance.now();
    const result = await repository.findAll();
    const duration = performance.now() - start;

    expect(isOk(result)).toBe(true);
    // Should load our small test vault in under 100ms
    expect(duration).toBeLessThan(100);
  });
});
