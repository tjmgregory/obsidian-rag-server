import { beforeEach, describe, expect, test } from 'bun:test';
import { InMemoryCacheAdapter } from './in-memory-cache';

describe('InMemoryCacheAdapter', () => {
  let cache: InMemoryCacheAdapter<string>;

  beforeEach(() => {
    // Default cache with max 3 items for easy testing
    cache = new InMemoryCacheAdapter<string>(3);
  });

  describe('basic operations', () => {
    test('should return undefined for cache miss', () => {
      const result = cache.get('non-existent');
      expect(result).toBeUndefined();
    });

    test('should return cached value for cache hit', () => {
      cache.set('key1', 'value1');
      const result = cache.get('key1');
      expect(result).toBe('value1');
    });

    test('should update existing value', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'updated');
      const result = cache.get('key1');
      expect(result).toBe('updated');
    });

    test('should handle has() correctly', () => {
      expect(cache.has('key1')).toBe(false);
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    test('should delete entries', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);

      const deleted = cache.delete('key1');
      expect(deleted).toBe(true);
      expect(cache.has('key1')).toBe(false);
      expect(cache.get('key1')).toBeUndefined();
    });

    test('should return false when deleting non-existent key', () => {
      const deleted = cache.delete('non-existent');
      expect(deleted).toBe(false);
    });

    test('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.clear();

      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(false);
      expect(cache.size()).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    test('should evict least recently used item when capacity exceeded', () => {
      // Fill cache to capacity
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Add one more - should evict key1 (least recently used)
      cache.set('key4', 'value4');

      expect(cache.has('key1')).toBe(false); // Evicted
      expect(cache.has('key2')).toBe(true);
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    test('should update LRU order on get()', () => {
      // Fill cache to capacity
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Access key1 - moves it to most recently used
      cache.get('key1');

      // Add new item - should evict key2 (now least recently used)
      cache.set('key4', 'value4');

      expect(cache.has('key1')).toBe(true); // Still here (was accessed)
      expect(cache.has('key2')).toBe(false); // Evicted
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    test('should update LRU order on set() for existing key', () => {
      // Fill cache to capacity
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Update key1 - moves it to most recently used
      cache.set('key1', 'updated');

      // Add new item - should evict key2 (now least recently used)
      cache.set('key4', 'value4');

      expect(cache.get('key1')).toBe('updated'); // Still here (was updated)
      expect(cache.has('key2')).toBe(false); // Evicted
      expect(cache.has('key3')).toBe(true);
      expect(cache.has('key4')).toBe(true);
    });

    test('should handle capacity of 1', () => {
      const smallCache = new InMemoryCacheAdapter<string>(1);

      smallCache.set('key1', 'value1');
      expect(smallCache.get('key1')).toBe('value1');

      smallCache.set('key2', 'value2');
      expect(smallCache.has('key1')).toBe(false); // Evicted
      expect(smallCache.get('key2')).toBe('value2');
    });
  });

  describe('size and capacity', () => {
    test('should report correct size', () => {
      expect(cache.size()).toBe(0);

      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);

      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);

      cache.delete('key1');
      expect(cache.size()).toBe(1);

      cache.clear();
      expect(cache.size()).toBe(0);
    });

    test('should not exceed max capacity', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4');
      cache.set('key5', 'value5');

      // Should never exceed capacity of 3
      expect(cache.size()).toBe(3);
    });

    test('should handle zero capacity', () => {
      const noCache = new InMemoryCacheAdapter<string>(0);

      noCache.set('key1', 'value1');
      expect(noCache.size()).toBe(0);
      expect(noCache.has('key1')).toBe(false);
      expect(noCache.get('key1')).toBeUndefined();
    });
  });

  describe('type safety', () => {
    test('should work with complex types', () => {
      interface CachedNote {
        path: string;
        content: string;
        tags: string[];
      }

      const noteCache = new InMemoryCacheAdapter<CachedNote>(2);

      const note1: CachedNote = {
        path: '/note1.md',
        content: 'Test content',
        tags: ['test', 'cache'],
      };

      noteCache.set('note1', note1);
      const retrieved = noteCache.get('note1');

      expect(retrieved).toEqual(note1);
      expect(retrieved?.tags).toEqual(['test', 'cache']);
    });
  });

  describe('cache statistics', () => {
    test('should track hit rate', () => {
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);

      // Miss
      cache.get('key1');
      expect(cache.getStats().misses).toBe(1);

      // Hit
      cache.set('key1', 'value1');
      cache.get('key1');
      const finalStats = cache.getStats();
      expect(finalStats.hits).toBe(1);
      expect(finalStats.misses).toBe(1);
      expect(finalStats.hitRate).toBe(0.5); // 50% hit rate
    });

    test('should track evictions', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.getStats().evictions).toBe(0);

      // Trigger eviction
      cache.set('key4', 'value4');
      expect(cache.getStats().evictions).toBe(1);
    });

    test('should reset stats', () => {
      cache.get('key1'); // miss
      cache.set('key1', 'value1');
      cache.get('key1'); // hit

      const stats = cache.getStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);

      cache.resetStats();
      const resetStats = cache.getStats();
      expect(resetStats.hits).toBe(0);
      expect(resetStats.misses).toBe(0);
      expect(resetStats.evictions).toBe(0);
    });
  });
});
