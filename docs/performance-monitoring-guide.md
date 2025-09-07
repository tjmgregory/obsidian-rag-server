# Performance Monitoring Guide

## Overview

This guide documents our approach to performance monitoring, based on established observability practices and the DORA metrics framework.

## Key Principles

### 1. Measure What Matters (SLIs - Service Level Indicators)

Focus on metrics that directly impact user experience:
- **Latency**: How long operations take (P50, P95, P99)
- **Throughput**: How many operations per second
- **Error Rate**: Percentage of failed operations
- **Saturation**: Resource usage (memory, CPU)

### 2. The Four Golden Signals (Google SRE)

From Google's Site Reliability Engineering book:
1. **Latency**: Time to service a request
2. **Traffic**: How much demand on the system
3. **Errors**: Rate of failed requests
4. **Saturation**: How "full" the service is

### 3. RED Method (Tom Wilkie)

For every service, monitor:
- **Rate**: Number of requests per second
- **Errors**: Number of failed requests
- **Duration**: Time each request takes

### 4. USE Method (Brendan Gregg)

For every resource, monitor:
- **Utilization**: Average time resource was busy
- **Saturation**: Amount of work queued
- **Errors**: Count of error events

## Our Implementation Strategy

### Phase 1: Basic Timing (Current)
- Operation duration tracking
- Memory usage snapshots
- Simple aggregation (min/max/avg)

### Phase 2: Structured Metrics (Future)
- Histogram for percentiles (P50, P95, P99)
- Time-series data collection
- Export to monitoring systems (Prometheus, DataDog)

### Phase 3: Distributed Tracing (Future)
- OpenTelemetry integration
- Span-based tracing
- Correlation IDs

## Implementation Patterns

### 1. Non-Invasive Monitoring

Performance monitoring should not impact performance:

```typescript
// ✅ Good: Opt-in monitoring
class Repository {
  constructor(
    private enableMetrics = false
  ) {}
  
  async findAll() {
    if (this.enableMetrics) {
      return this.monitor.measure('findAll', () => this._findAll());
    }
    return this._findAll();
  }
}

// ❌ Bad: Always-on heavy monitoring
async findAll() {
  const trace = startTrace();
  const span = trace.startSpan();
  // ... heavy instrumentation
}
```

### 2. Meaningful Metrics Names

Follow a hierarchical naming convention:

```typescript
// ✅ Good: Hierarchical, descriptive
'vault.load'
'vault.load.parse'
'vault.load.parse.frontmatter'
'search.execute'
'search.rank'

// ❌ Bad: Flat, ambiguous
'load'
'parse'
'search'
```

### 3. Context-Rich Metrics

Include relevant metadata:

```typescript
// ✅ Good: Rich context
monitor.endTimer('vault.load', {
  itemCount: notes.length,
  vaultPath,
  cacheHit: false,
  errorCount: errors.length,
});

// ❌ Bad: Just timing
monitor.endTimer('vault.load');
```

### 4. Sampling for High-Volume Operations

Don't measure every single operation in production:

```typescript
// ✅ Good: Sampling
class NoteParser {
  private sampleRate = 0.01; // 1% sampling
  
  parse(content: string) {
    if (Math.random() < this.sampleRate) {
      return monitor.measure('parse', () => this._parse(content));
    }
    return this._parse(content);
  }
}
```

## Performance Targets for Obsidian RAG

Based on our PRD and typical Obsidian vault sizes:

### Load Time Targets
- **Small vault** (< 100 notes): < 500ms
- **Medium vault** (100-500 notes): < 2s
- **Large vault** (500-1000 notes): < 5s
- **Memory usage**: < 100MB for 1000 notes

### Search Performance Targets
- **Keyword search**: < 200ms for 1000 notes
- **Result limit**: 50 results max
- **Incremental results**: First result < 50ms

### Operation Latency Targets
- **Note retrieval by path**: < 10ms (from cache)
- **Tag aggregation**: < 50ms
- **Recent notes**: < 20ms

## Monitoring in Different Environments

### Development
- Full metrics collection enabled
- Verbose logging
- Performance assertions in tests

### Testing
```typescript
test('performance: loads vault within target time', async () => {
  const start = performance.now();
  const result = await repository.findAll();
  const duration = performance.now() - start;
  
  expect(duration).toBeLessThan(500); // 500ms for test vault
});
```

### Production
- Sampling-based monitoring
- Aggregated metrics only
- Export to monitoring service
- Alerts on SLO violations

## Tools and Libraries

### Current (Built-in)
- `performance.now()` - High-resolution timing
- `process.memoryUsage()` - Memory monitoring
- Custom PerformanceMonitor class

### Future Considerations
- **OpenTelemetry**: Industry standard for observability
- **prom-client**: Prometheus metrics for Node.js
- **Clinic.js**: Performance profiling tools
- **Autocannon**: Load testing

## Anti-Patterns to Avoid

### 1. Measuring Everything
Don't create metrics inflation - focus on actionable metrics.

### 2. Ignoring Percentiles
Averages hide outliers. Always track P95/P99.

### 3. Not Setting Targets
Metrics without targets are just numbers.

### 4. Blocking on Metrics
Never let metrics collection block the main operation.

## Example Integration

```typescript
// In composition root
const monitor = new PerformanceMonitor();
const repository = new FileNoteRepository(
  vaultPath,
  fileSystem,
  ignoredFolders,
  config.enableMetrics, // Controlled by config
);

// After operations
if (config.enableMetrics) {
  monitor.logSummary();
  
  // Check against SLOs
  const stats = monitor.getStats('vault.load');
  if (stats?.avgDuration > 5000) {
    logger.warn('Vault load time exceeds SLO', stats);
  }
}
```

## References

- [Google SRE Book - Four Golden Signals](https://sre.google/sre-book/monitoring-distributed-systems/)
- [RED Method](https://www.weave.works/blog/the-red-method-key-metrics-for-microservices-architecture/)
- [USE Method](https://www.brendangregg.com/usemethod.html)
- [OpenTelemetry](https://opentelemetry.io/)
- [DORA Metrics](https://dora.dev/)

## Next Steps

1. ✅ Implement basic timing infrastructure
2. ⏳ Add memory monitoring
3. ⏳ Create benchmark suite
4. ⏳ Add percentile tracking
5. ⏳ Export metrics to monitoring service