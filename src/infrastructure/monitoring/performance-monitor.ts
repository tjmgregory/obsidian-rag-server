/**
 * Simple performance monitoring utility for tracking operation timings and memory usage.
 * Designed to be lightweight and not interfere with normal operations.
 */

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  memoryUsed?: number;
  itemCount?: number;
  metadata?: Record<string, unknown>;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private timers = new Map<string, number>();

  /**
   * Start timing an operation
   */
  startTimer(operation: string): void {
    this.timers.set(operation, performance.now());
  }

  /**
   * End timing and record metrics
   */
  endTimer(
    operation: string,
    metadata?: { itemCount?: number; [key: string]: unknown },
  ): PerformanceMetrics {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      throw new Error(`No timer found for operation: ${operation}`);
    }

    const duration = performance.now() - startTime;
    this.timers.delete(operation);

    const metrics: PerformanceMetrics = {
      operation,
      duration,
      ...(metadata?.itemCount !== undefined && { itemCount: metadata.itemCount }),
      ...(metadata && { metadata }),
    };

    // Add memory usage if available (Node.js/Bun)
    // Add memory usage if available (Node.js/Bun)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      metrics.memoryUsed = process.memoryUsage().heapUsed;
    }

    this.metrics.push(metrics);
    return metrics;
  }

  /**
   * Measure an async operation
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    this.startTimer(operation);
    try {
      const result = await fn();
      this.endTimer(operation, metadata);
      return result;
    } catch (error) {
      this.endTimer(operation, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics for a specific operation
   */
  getMetricsForOperation(operation: string): PerformanceMetrics[] {
    return this.metrics.filter((m) => m.operation === operation);
  }

  /**
   * Calculate statistics for an operation
   */
  getStats(operation: string): {
    count: number;
    totalDuration: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
  } | null {
    const operationMetrics = this.getMetricsForOperation(operation);
    if (operationMetrics.length === 0) {
      return null;
    }

    const durations = operationMetrics.map((m) => m.duration);
    return {
      count: operationMetrics.length,
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.timers.clear();
  }

  /**
   * Log performance summary
   */
  logSummary(): void {
    const operations = new Set(this.metrics.map((m) => m.operation));

    // biome-ignore lint/suspicious/noConsoleLog: Performance monitoring output
    console.log('\n=== Performance Summary ===');
    for (const op of operations) {
      const stats = this.getStats(op);
      if (stats) {
        // biome-ignore lint/suspicious/noConsoleLog: Performance monitoring output
        console.log(`\n${op}:`);
        // biome-ignore lint/suspicious/noConsoleLog: Performance monitoring output
        console.log(`  Executions: ${stats.count}`);
        // biome-ignore lint/suspicious/noConsoleLog: Performance monitoring output
        console.log(`  Avg Duration: ${stats.avgDuration.toFixed(2)}ms`);
        // biome-ignore lint/suspicious/noConsoleLog: Performance monitoring output
        console.log(`  Min Duration: ${stats.minDuration.toFixed(2)}ms`);
        // biome-ignore lint/suspicious/noConsoleLog: Performance monitoring output
        console.log(`  Max Duration: ${stats.maxDuration.toFixed(2)}ms`);
        // biome-ignore lint/suspicious/noConsoleLog: Performance monitoring output
        console.log(`  Total Duration: ${stats.totalDuration.toFixed(2)}ms`);
      }
    }

    // Memory summary if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      // biome-ignore lint/suspicious/noConsoleLog: Performance monitoring output
      console.log('\n=== Memory Usage ===');
      // biome-ignore lint/suspicious/noConsoleLog: Performance monitoring output
      console.log(`  Heap Used: ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      // biome-ignore lint/suspicious/noConsoleLog: Performance monitoring output
      console.log(`  Heap Total: ${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
      // biome-ignore lint/suspicious/noConsoleLog: Performance monitoring output
      console.log(`  RSS: ${(memory.rss / 1024 / 1024).toFixed(2)} MB`);
    }
  }
}

// Singleton instance for global monitoring
export const globalMonitor = new PerformanceMonitor();
