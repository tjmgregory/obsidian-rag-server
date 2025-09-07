import { beforeEach, describe, expect, test } from 'bun:test';
import { MockFileSystem } from '../../../../test/helpers/mock-file-system';
import { isOk, unwrap } from '../../../domain/types/result';
import { FileNoteRepository } from './file-note-repository';

describe('FileNoteRepository', () => {
  let repository: FileNoteRepository;
  let mockFs: MockFileSystem;

  beforeEach(() => {
    mockFs = new MockFileSystem();
    repository = new FileNoteRepository('/vault', mockFs, ['.obsidian', '.trash']);
  });

  test('should load all markdown files as notes', async () => {
    mockFs.addFile('/vault/note1.md', '# Note 1\n\nContent of note 1');
    mockFs.addFile('/vault/note2.md', '# Note 2\n\nContent of note 2');
    mockFs.addFile('/vault/README.txt', 'Not a markdown file');

    const result = await repository.findAll();

    expect(isOk(result)).toBe(true);
    const notes = unwrap(result);
    expect(notes).toHaveLength(2);
    expect(notes[0]?.path).toBe('note1.md');
    expect(notes[0]?.title).toBe('Note 1');
    expect(notes[1]?.path).toBe('note2.md');
  });

  test('should parse frontmatter from notes', async () => {
    mockFs.addFile(
      '/vault/with-frontmatter.md',
      `---
title: Custom Title
tags: [javascript, testing]
date: 2024-01-01
---

# Content Title

Note content here.`,
    );

    const result = await repository.findAll();

    expect(isOk(result)).toBe(true);
    const notes = unwrap(result);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.title).toBe('Custom Title');
    expect(notes[0]?.frontmatter).toMatchObject({
      title: 'Custom Title',
      tags: ['javascript', 'testing'],
    });
    expect(notes[0]?.tags).toContain('javascript');
    expect(notes[0]?.tags).toContain('testing');
  });

  test('should extract tags from content', async () => {
    mockFs.addFile(
      '/vault/with-tags.md',
      `# Note with Tags

Content with #inline-tag and #another-tag in the text.`,
    );

    const result = await repository.findAll();

    expect(isOk(result)).toBe(true);
    const notes = unwrap(result);
    expect(notes[0]?.tags).toContain('inline-tag');
    expect(notes[0]?.tags).toContain('another-tag');
  });

  test('should extract links from content', async () => {
    mockFs.addFile(
      '/vault/with-links.md',
      `# Note with Links

This references [[other-note]] and [[another-note|with alias]].`,
    );

    const result = await repository.findAll();

    expect(isOk(result)).toBe(true);
    const notes = unwrap(result);
    expect(notes[0]?.links).toContain('other-note');
    expect(notes[0]?.links).toContain('another-note');
  });

  test('should ignore files in ignored folders', async () => {
    mockFs.addFile('/vault/note.md', '# Regular note');
    mockFs.addFile('/vault/.obsidian/config.md', '# Config');
    mockFs.addFile('/vault/.trash/deleted.md', '# Deleted');

    const result = await repository.findAll();

    expect(isOk(result)).toBe(true);
    const notes = unwrap(result);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.path).toBe('note.md');
  });

  test('should find note by path', async () => {
    mockFs.addFile('/vault/projects/project1.md', '# Project 1');
    mockFs.addFile('/vault/daily/2024-01-01.md', '# Daily Note');

    const result = await repository.findByPath('projects/project1.md');

    expect(isOk(result)).toBe(true);
    const note = unwrap(result);
    expect(note).not.toBeNull();
    expect(note?.title).toBe('Project 1');
    expect(note?.path).toBe('projects/project1.md');
  });

  test('should return null for non-existent path', async () => {
    // Ensure cache is populated first
    mockFs.addFile('/vault/some-note.md', '# Some Note');

    const result = await repository.findByPath('non-existent.md');

    expect(isOk(result)).toBe(true);
    const note = unwrap(result);
    expect(note).toBeNull();
  });

  test('should find notes by folder', async () => {
    mockFs.addFile('/vault/projects/project1.md', '# Project 1');
    mockFs.addFile('/vault/projects/project2.md', '# Project 2');
    mockFs.addFile('/vault/daily/2024-01-01.md', '# Daily Note');

    const result = await repository.findByFolder('projects');

    expect(isOk(result)).toBe(true);
    const notes = unwrap(result);
    expect(notes).toHaveLength(2);
    expect(notes[0]?.path).toBe('projects/project1.md');
    expect(notes[1]?.path).toBe('projects/project2.md');
  });

  test('should get all unique tags with counts', async () => {
    mockFs.addFile('/vault/note1.md', 'Content with #tag1 and #tag2');
    mockFs.addFile('/vault/note2.md', 'Content with #tag1 and #tag3');
    mockFs.addFile('/vault/note3.md', 'Content with #tag1');

    const result = await repository.getAllTags();

    expect(isOk(result)).toBe(true);
    const tags = unwrap(result);
    expect(tags.get('tag1')).toBe(3);
    expect(tags.get('tag2')).toBe(1);
    expect(tags.get('tag3')).toBe(1);
  });

  test('should get recently modified notes', async () => {
    // Note: In mock, all files have same date, so order depends on findAll order
    mockFs.addFile('/vault/note1.md', '# Note 1');
    mockFs.addFile('/vault/note2.md', '# Note 2');
    mockFs.addFile('/vault/note3.md', '# Note 3');

    const result = await repository.getRecentlyModified(2);

    expect(isOk(result)).toBe(true);
    const recent = unwrap(result);
    expect(recent).toHaveLength(2);
  });
});
