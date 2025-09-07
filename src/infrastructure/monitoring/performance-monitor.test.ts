import { beforeEach, describe, expect, test } from 'bun:test';
import { PerformanceMonitor } from './performance-monitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  test('should track operation timing', () => {
    monitor.startTimer('test-operation');

    // Simulate some work
    const start = performance.now();
    while (performance.now() - start < 10) {
      // Busy wait for at least 10ms
    }

    const metrics = monitor.endTimer('test-operation');

    expect(metrics.operation).toBe('test-operation');
    expect(metrics.duration).toBeGreaterThan(10);
    expect(metrics.duration).toBeLessThan(100); // Should not take too long
  });

  test('should track multiple operations', () => {
    monitor.startTimer('op1');
    monitor.startTimer('op2');

    monitor.endTimer('op1');
    monitor.endTimer('op2');

    const allMetrics = monitor.getMetrics();
    expect(allMetrics).toHaveLength(2);
    expect(allMetrics[0]?.operation).toBe('op1');
    expect(allMetrics[1]?.operation).toBe('op2');
  });

  test('should measure async operations', async () => {
    const result = await monitor.measure(
      'async-operation',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'done';
      },
      { test: true },
    );

    expect(result).toBe('done');

    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0]?.operation).toBe('async-operation');
    expect(metrics[0]?.duration).toBeGreaterThan(10);
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    expect(metrics[0]?.metadata?.['test']).toBe(true);
  });

  test('should handle errors in async operations', async () => {
    const error = new Error('Test error');

    await expect(
      monitor.measure('failing-operation', async () => {
        throw error;
      }),
    ).rejects.toThrow('Test error');

    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(1);
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    expect(metrics[0]?.metadata?.['error']).toBe(true);
  });

  test('should calculate statistics', () => {
    // Record multiple measurements
    monitor.startTimer('repeated-op');
    monitor.endTimer('repeated-op');

    monitor.startTimer('repeated-op');
    const start = performance.now();
    while (performance.now() - start < 20) {
      // Busy wait
    }
    monitor.endTimer('repeated-op');

    monitor.startTimer('repeated-op');
    monitor.endTimer('repeated-op');

    const stats = monitor.getStats('repeated-op');

    expect(stats).not.toBeNull();
    expect(stats?.count).toBe(3);
    expect(stats?.avgDuration).toBeGreaterThan(0);
    if (stats) {
      expect(stats.minDuration).toBeLessThanOrEqual(stats.avgDuration);
      expect(stats.maxDuration).toBeGreaterThanOrEqual(stats.avgDuration);
    }
  });

  test('should return null stats for unknown operation', () => {
    const stats = monitor.getStats('unknown');
    expect(stats).toBeNull();
  });

  test('should clear all metrics', () => {
    monitor.startTimer('op1');
    monitor.endTimer('op1');

    expect(monitor.getMetrics()).toHaveLength(1);

    monitor.clear();

    expect(monitor.getMetrics()).toHaveLength(0);
  });

  test('should track metadata including item counts', () => {
    monitor.startTimer('batch-operation');
    const metrics = monitor.endTimer('batch-operation', {
      itemCount: 100,
      source: 'test',
    });

    expect(metrics.itemCount).toBe(100);
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    expect(metrics.metadata?.['source']).toBe('test');
  });

  test('should throw error for unknown timer', () => {
    expect(() => monitor.endTimer('unknown')).toThrow('No timer found for operation: unknown');
  });

  test('should include memory usage when available', () => {
    monitor.startTimer('memory-test');
    const metrics = monitor.endTimer('memory-test');

    // Memory usage should be available in Node.js/Bun
    if (typeof process !== 'undefined' && process.memoryUsage !== undefined) {
      expect(metrics.memoryUsed).toBeGreaterThan(0);
    }
  });
});
