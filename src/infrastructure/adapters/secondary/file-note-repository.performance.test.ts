import { beforeEach, describe, expect, test } from 'bun:test';
import { MockFileSystem } from '../../../../test/helpers/mock-file-system';
import { isOk, unwrap } from '../../../domain/types/result';
import { FileNoteRepository } from './file-note-repository';

describe('FileNoteRepository Performance Monitoring', () => {
  let repository: FileNoteRepository;
  let mockFs: MockFileSystem;

  beforeEach(() => {
    mockFs = new MockFileSystem();
  });

  test('should track performance metrics when enabled', async () => {
    repository = new FileNoteRepository(
      '/vault',
      mockFs,
      ['.obsidian', '.trash'],
      true, // Enable performance monitoring
    );

    // Add test data
    for (let i = 0; i < 10; i++) {
      mockFs.addFile(`/vault/note${i}.md`, `# Note ${i}\n\nContent of note ${i}`);
    }

    const result = await repository.findAll();
    expect(isOk(result)).toBe(true);

    // Check that metrics were recorded
    const metrics = repository.getPerformanceMetrics();
    expect(metrics.metrics).toHaveLength(1);
    expect(metrics.metrics[0]?.operation).toBe('vault.findAll');
    expect(metrics.metrics[0]?.itemCount).toBe(10);
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    expect(metrics.metrics[0]?.metadata?.['success']).toBe(true);

    // Check summary stats
    expect(metrics.summary).not.toBeNull();
    expect(metrics.summary?.count).toBe(1);
    expect(metrics.summary?.avgDuration).toBeGreaterThan(0);
  });

  test('should not track metrics when disabled', async () => {
    repository = new FileNoteRepository(
      '/vault',
      mockFs,
      ['.obsidian', '.trash'],
      false, // Disable performance monitoring
    );

    mockFs.addFile('/vault/note.md', '# Note');

    const result = await repository.findAll();
    expect(isOk(result)).toBe(true);

    const metrics = repository.getPerformanceMetrics();
    expect(metrics.metrics).toHaveLength(0);
    expect(metrics.summary).toBeNull();
  });

  test('should clear metrics on demand', async () => {
    repository = new FileNoteRepository('/vault', mockFs, [], true);

    mockFs.addFile('/vault/note.md', '# Note');
    await repository.findAll();

    // Verify metrics exist
    let metrics = repository.getPerformanceMetrics();
    expect(metrics.metrics).toHaveLength(1);

    // Clear and verify
    repository.clearPerformanceMetrics();
    metrics = repository.getPerformanceMetrics();
    expect(metrics.metrics).toHaveLength(0);
  });

  test('should measure performance for large vaults', async () => {
    repository = new FileNoteRepository('/vault', mockFs, [], true);

    // Create a larger test vault
    const noteCount = 100;
    for (let i = 0; i < noteCount; i++) {
      const folder = Math.floor(i / 10);
      mockFs.addFile(
        `/vault/folder${folder}/note${i}.md`,
        `---
title: Note ${i}
tags: [tag${i % 5}, performance]
---

# Note ${i}

Content with #inline-tag-${i % 3} and [[link-to-${i % 10}]].`,
      );
    }

    const start = performance.now();
    const result = await repository.findAll();
    const duration = performance.now() - start;

    expect(isOk(result)).toBe(true);
    const notes = unwrap(result);
    expect(notes).toHaveLength(noteCount);

    // Performance assertions
    expect(duration).toBeLessThan(1000); // Should load 100 notes in < 1 second

    const metrics = repository.getPerformanceMetrics();
    expect(metrics.metrics[0]?.itemCount).toBe(noteCount);
    expect(metrics.metrics[0]?.duration).toBeLessThan(1000);

    // Check memory usage is tracked (if available)
    if (typeof process !== 'undefined' && process.memoryUsage !== undefined) {
      expect(metrics.metrics[0]?.memoryUsed).toBeGreaterThan(0);
    }
  });

  test('performance regression test for findAll', async () => {
    repository = new FileNoteRepository('/vault', mockFs, [], true);

    // Add reasonable test data
    for (let i = 0; i < 50; i++) {
      mockFs.addFile(`/vault/note${i}.md`, `# Note ${i}\n\nSome content`);
    }

    const result = await repository.findAll();
    expect(isOk(result)).toBe(true);

    const metrics = repository.getPerformanceMetrics();
    const summary = metrics.summary;

    // Performance targets (adjust based on your requirements)
    expect(summary?.avgDuration).toBeLessThan(500); // 50 notes should load in < 500ms
  });
});
