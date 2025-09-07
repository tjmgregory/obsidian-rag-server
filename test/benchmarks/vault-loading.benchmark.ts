#!/usr/bin/env bun
/**
 * Benchmark suite for vault loading performance.
 * Run with: bun test/benchmarks/vault-loading.benchmark.ts
 */

import * as path from 'node:path';
import { BunFileSystem } from '../../src/infrastructure/adapters/secondary/bun-file-system';
import { FileNoteRepository } from '../../src/infrastructure/adapters/secondary/file-note-repository';
import { MockFileSystem } from '../helpers/mock-file-system';

interface BenchmarkResult {
  name: string;
  noteCount: number;
  duration: number;
  memoryUsed: number;
  notesPerSecond: number;
}

class VaultLoadingBenchmark {
  private results: BenchmarkResult[] = [];

  async runAllBenchmarks() {
    console.log('🚀 Starting Vault Loading Benchmarks\n');

    // Mock file system benchmarks (fast, in-memory)
    await this.benchmarkMockVault(10);
    await this.benchmarkMockVault(50);
    await this.benchmarkMockVault(100);
    await this.benchmarkMockVault(500);
    await this.benchmarkMockVault(1000);

    // Real file system benchmark (if test vault exists)
    await this.benchmarkRealVault();

    this.printResults();
    this.checkPerformanceTargets();
  }

  private async benchmarkMockVault(noteCount: number) {
    const mockFs = new MockFileSystem();

    // Generate test data
    for (let i = 0; i < noteCount; i++) {
      const folder = Math.floor(i / 20);
      const tags = Array.from({ length: 3 }, (_, j) => `tag${(i + j) % 10}`);

      mockFs.addFile(
        `/vault/folder${folder}/note${i}.md`,
        `---
title: Note ${i}
tags: ${JSON.stringify(tags)}
created: 2024-01-01
updated: 2024-01-${(i % 28) + 1}
---

# Note ${i}

This is the content of note ${i}. It contains some text to simulate real notes.

## Section 1

Some content with #inline-tag-${i % 5} and [[link-to-${i % 20}]].

## Section 2

More content to make the note realistic in size.
- Item 1
- Item 2 with [[another-link]]
- Item 3 with #another-tag
`,
      );
    }

    const repository = new FileNoteRepository('/vault', mockFs, [], true);

    // Warm up
    await repository.findAll();
    repository.clearPerformanceMetrics();

    // Actual benchmark
    const memBefore = process.memoryUsage().heapUsed;
    const start = performance.now();

    const result = await repository.findAll();

    const duration = performance.now() - start;
    const memAfter = process.memoryUsage().heapUsed;
    const memoryUsed = memAfter - memBefore;

    if (result.ok) {
      this.results.push({
        name: `Mock Vault (${noteCount} notes)`,
        noteCount,
        duration,
        memoryUsed,
        notesPerSecond: (noteCount / duration) * 1000,
      });
    }
  }

  private async benchmarkRealVault() {
    const testVaultPath = path.join(__dirname, '../fixtures/test-vault');

    try {
      const fileSystem = new BunFileSystem();
      const repository = new FileNoteRepository(testVaultPath, fileSystem, ['.obsidian'], true);

      const memBefore = process.memoryUsage().heapUsed;
      const start = performance.now();

      const result = await repository.findAll();

      const duration = performance.now() - start;
      const memAfter = process.memoryUsage().heapUsed;
      const memoryUsed = memAfter - memBefore;

      if (result.ok) {
        const noteCount = result.value.length;
        this.results.push({
          name: `Real Vault (${noteCount} notes)`,
          noteCount,
          duration,
          memoryUsed,
          notesPerSecond: (noteCount / duration) * 1000,
        });
      }
    } catch (_error) {
      console.log('⚠️  Skipping real vault benchmark (test vault not found)\n');
    }
  }

  private printResults() {
    console.log('\n📊 Benchmark Results\n');
    console.log('═'.repeat(80));
    console.log(
      `${
        'Name'.padEnd(25) + 'Notes'.padEnd(10) + 'Duration'.padEnd(15) + 'Memory'.padEnd(15)
      }Notes/sec`,
    );
    console.log('─'.repeat(80));

    for (const result of this.results) {
      console.log(
        result.name.padEnd(25) +
          result.noteCount.toString().padEnd(10) +
          `${result.duration.toFixed(2)}ms`.padEnd(15) +
          `${(result.memoryUsed / 1024 / 1024).toFixed(2)}MB`.padEnd(15) +
          result.notesPerSecond.toFixed(0),
      );
    }
    console.log('═'.repeat(80));
  }

  private checkPerformanceTargets() {
    console.log('\n✅ Performance Target Validation\n');

    const targets = [
      { noteCount: 100, maxDuration: 500, label: 'Small vault (<100 notes)' },
      { noteCount: 500, maxDuration: 2000, label: 'Medium vault (100-500 notes)' },
      { noteCount: 1000, maxDuration: 5000, label: 'Large vault (500-1000 notes)' },
    ];

    for (const target of targets) {
      const result = this.results.find((r) => r.noteCount === target.noteCount);
      if (result) {
        const passed = result.duration <= target.maxDuration;
        const symbol = passed ? '✅' : '❌';
        const status = passed ? 'PASS' : 'FAIL';

        console.log(
          `${symbol} ${target.label}: ${result.duration.toFixed(2)}ms / ${target.maxDuration}ms [${status}]`,
        );
      }
    }

    // Memory target
    const largestResult = this.results.find((r) => r.noteCount === 1000);
    if (largestResult) {
      const memoryMB = largestResult.memoryUsed / 1024 / 1024;
      const memoryTarget = 100; // MB
      const passed = memoryMB <= memoryTarget;
      const symbol = passed ? '✅' : '❌';

      console.log(
        `${symbol} Memory usage (1000 notes): ${memoryMB.toFixed(2)}MB / ${memoryTarget}MB [${passed ? 'PASS' : 'FAIL'}]`,
      );
    }
  }
}

// Run benchmarks
const benchmark = new VaultLoadingBenchmark();
await benchmark.runAllBenchmarks();
