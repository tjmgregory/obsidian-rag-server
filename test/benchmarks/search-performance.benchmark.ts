#!/usr/bin/env bun
/**
 * Benchmark suite for search performance.
 * Run with: bun test/benchmarks/search-performance.benchmark.ts
 */

import { Note } from '../../src/domain/entities/note';
import { NoteSearcher } from '../../src/domain/services/note-searcher';

interface SearchBenchmarkResult {
  query: string;
  noteCount: number;
  resultCount: number;
  duration: number;
  memoryUsed: number;
  searchesPerSecond: number;
}

class SearchPerformanceBenchmark {
  private results: SearchBenchmarkResult[] = [];
  private searcher = new NoteSearcher();

  async runAllBenchmarks() {
    console.log('🔍 Starting Search Performance Benchmarks\n');

    // Create test datasets of different sizes
    const smallDataset = this.generateNotes(100);
    const mediumDataset = this.generateNotes(500);
    const largeDataset = this.generateNotes(1000);

    // Test different query types
    const queries = [
      { query: 'javascript', type: 'single-word' },
      { query: 'javascript typescript', type: 'multi-word' },
      { query: 'async await promise', type: 'three-words' },
      { query: 'react component state props hooks', type: 'complex' },
      { query: 'nonexistentterm', type: 'no-matches' },
    ];

    // Run benchmarks for each dataset size
    for (const query of queries) {
      await this.benchmarkSearch(query.query, smallDataset, `Small (${query.type})`);
      await this.benchmarkSearch(query.query, mediumDataset, `Medium (${query.type})`);
      await this.benchmarkSearch(query.query, largeDataset, `Large (${query.type})`);
    }

    this.printResults();
    this.checkPerformanceTargets();
  }

  private generateNotes(count: number): Note[] {
    const topics = [
      'javascript',
      'typescript',
      'react',
      'vue',
      'angular',
      'nodejs',
      'python',
      'rust',
      'go',
      'java',
      'async',
      'await',
      'promise',
      'callback',
      'observable',
      'component',
      'state',
      'props',
      'hooks',
      'context',
    ];

    const notes: Note[] = [];

    for (let i = 0; i < count; i++) {
      const topicIndex = i % topics.length;
      const topic = topics[topicIndex] ?? 'default';
      const relatedTopic = topics[(topicIndex + 1) % topics.length] ?? 'default';

      notes.push(
        new Note(
          `note${i}.md`,
          `Note about ${topic} - ${i}`,
          `This is a note about ${topic} and ${relatedTopic}. 
          It contains information about programming concepts.
          We discuss ${topic} in detail, including best practices.
          The relationship between ${topic} and ${relatedTopic} is important.
          #${topic} #programming #note${i % 10}`,
          { tags: [topic, 'programming'] },
          [topic, 'programming', `note${i % 10}`],
          [`related-${i % 20}`, topic],
          new Date(),
          new Date(),
        ),
      );
    }

    return notes;
  }

  private async benchmarkSearch(query: string, notes: Note[], label: string) {
    // Warm up
    this.searcher.search(query, notes, { limit: 50 });

    // Actual benchmark
    const iterations = 10;
    const memBefore = process.memoryUsage().heapUsed;
    const start = performance.now();

    let resultCount = 0;
    for (let i = 0; i < iterations; i++) {
      const results = this.searcher.search(query, notes, { limit: 50 });
      resultCount = results.length;
    }

    const totalDuration = performance.now() - start;
    const duration = totalDuration / iterations;
    const memAfter = process.memoryUsage().heapUsed;
    const memoryUsed = (memAfter - memBefore) / iterations;

    this.results.push({
      query: `${label}: "${query}"`,
      noteCount: notes.length,
      resultCount,
      duration,
      memoryUsed,
      searchesPerSecond: 1000 / duration,
    });
  }

  private printResults() {
    console.log('\n📊 Search Benchmark Results\n');
    console.log('═'.repeat(100));
    console.log(
      `${
        'Query'.padEnd(35) +
        'Notes'.padEnd(10) +
        'Results'.padEnd(10) +
        'Duration'.padEnd(15) +
        'Memory'.padEnd(15)
      }Searches/sec`,
    );
    console.log('─'.repeat(100));

    for (const result of this.results) {
      console.log(
        `${result.query.padEnd(35)}${result.noteCount.toString().padEnd(10)}${result.resultCount
          .toString()
          .padEnd(10)}${`${result.duration.toFixed(2)}ms`.padEnd(15)}${`${(
          result.memoryUsed / 1024
        ).toFixed(2)}KB`.padEnd(15)}${result.searchesPerSecond.toFixed(0)}`,
      );
    }
    console.log('═'.repeat(100));
  }

  private checkPerformanceTargets() {
    console.log('\n✅ Search Performance Target Validation\n');

    // Check that searches complete within 200ms for 1000 notes
    const largeDatasetResults = this.results.filter((r) => r.noteCount === 1000);

    for (const result of largeDatasetResults) {
      const target = 200; // ms
      const passed = result.duration <= target;
      const symbol = passed ? '✅' : '❌';

      const status = passed ? 'PASS' : 'FAIL';
      console.log(
        `${symbol} ${result.query}: ${result.duration.toFixed(2)}ms / ${target}ms [${status}]`,
      );
    }

    // Calculate statistics
    const avgDuration =
      largeDatasetResults.reduce((sum, r) => sum + r.duration, 0) / largeDatasetResults.length;
    const maxDuration = Math.max(...largeDatasetResults.map((r) => r.duration));

    console.log('\n📈 Statistics for 1000 notes:');
    console.log(`  Average search time: ${avgDuration.toFixed(2)}ms`);
    console.log(`  Maximum search time: ${maxDuration.toFixed(2)}ms`);
    console.log('  Target: <200ms');

    if (maxDuration <= 200) {
      console.log('\n✅ All search operations meet performance targets!');
    } else {
      console.log('\n⚠️  Some searches exceed performance targets.');
    }
  }
}

// Run benchmarks
const benchmark = new SearchPerformanceBenchmark();
await benchmark.runAllBenchmarks();
