/**
 * LRU (Least Recently Used) cache implementation.
 * Evicts the least recently accessed items when capacity is reached.
 */
export class InMemoryCacheAdapter<T> {
  private cache: Map<string, T>;
  private accessOrder: Map<string, number>;
  private accessCounter = 0;
  private readonly maxSize: number;

  // Statistics
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(maxSize: number) {
    this.maxSize = Math.max(0, maxSize);
    this.cache = new Map();
    this.accessOrder = new Map();
  }

  /**
   * Get a value from the cache.
   * Updates access order for LRU tracking.
   */
  get(key: string): T | undefined {
    if (this.cache.has(key)) {
      this.hits++;
      // Update access order
      this.accessOrder.set(key, this.accessCounter++);
      return this.cache.get(key);
    }
    this.misses++;
    return undefined;
  }

  /**
   * Set a value in the cache.
   * May trigger LRU eviction if at capacity.
   */
  set(key: string, value: T): void {
    // Zero capacity means no caching
    if (this.maxSize === 0) {
      return;
    }

    // If key exists, just update it
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      this.accessOrder.set(key, this.accessCounter++);
      return;
    }

    // Check if we need to evict
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Add the new item
    this.cache.set(key, value);
    this.accessOrder.set(key, this.accessCounter++);
  }

  /**
   * Check if a key exists in the cache.
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a specific key from the cache.
   */
  delete(key: string): boolean {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  /**
   * Get the current size of the cache.
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Reset cache statistics.
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Evict the least recently used item.
   */
  private evictLRU(): void {
    let lruKey: string | undefined;
    let lruTime = Number.POSITIVE_INFINITY;

    // Find the least recently accessed key
    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < lruTime) {
        lruTime = accessTime;
        lruKey = key;
      }
    }

    // Evict the LRU item
    if (lruKey !== undefined) {
      this.cache.delete(lruKey);
      this.accessOrder.delete(lruKey);
      this.evictions++;
    }
  }
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  size: number;
  maxSize: number;
}
