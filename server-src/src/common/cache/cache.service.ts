import { Injectable, Logger } from '@nestjs/common';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  maxSize?: number; // Maximum number of items in cache
}

export interface CacheItem<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 3600; // 1 hour
  private maxSize = 10000; // Maximum cache items
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.logger.debug(`Cache item expired: ${key}`);
      return null;
    }

    // Update access statistics
    item.accessCount++;
    item.lastAccessed = Date.now();

    this.logger.debug(`Cache hit: ${key}`);
    return item.data;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, options?: CacheOptions): void {
    const ttl = (options?.ttl || this.defaultTTL) * 1000; // Convert to milliseconds
    const now = Date.now();

    const item: CacheItem<T> = {
      data,
      expiresAt: now + ttl,
      createdAt: now,
      accessCount: 0,
      lastAccessed: now,
    };

    // Check if cache is full and needs cleanup
    if (this.cache.size >= (options?.maxSize || this.maxSize)) {
      this.evictLeastUsed();
    }

    this.cache.set(key, item);
    this.logger.debug(`Cache set: ${key} (TTL: ${ttl}ms)`);
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Cache deleted: ${key}`);
    }
    return deleted;
  }

  /**
   * Check if key exists in cache (and not expired)
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache items
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cache cleared: ${count} items removed`);
  }

  /**
   * Clear cache items by pattern
   */
  clearByPattern(pattern: RegExp): number {
    let cleared = 0;

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        cleared++;
      }
    }

    this.logger.log(`Cache pattern clear: ${cleared} items removed`);
    return cleared;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    items: Array<{
      key: string;
      accessCount: number;
      ageMs: number;
      ttlMs: number;
    }>;
  } {
    const now = Date.now();
    const items = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      accessCount: item.accessCount,
      ageMs: now - item.createdAt,
      ttlMs: item.expiresAt - now,
    }));

    // Calculate hit rate (simplified - would need to track misses in real implementation)
    const totalAccesses = items.reduce(
      (sum, item) => sum + item.accessCount,
      0,
    );
    const hitRate =
      totalAccesses > 0
        ? (totalAccesses / (totalAccesses + items.length)) * 100
        : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: Math.round(hitRate * 100) / 100,
      items: items.sort((a, b) => b.accessCount - a.accessCount),
    };
  }

  /**
   * Get or set pattern - get from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    options?: CacheOptions,
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - execute factory function
    try {
      const data = await factory();
      this.set(key, data, options);
      this.logger.debug(`Cache miss - data fetched and cached: ${key}`);
      return data;
    } catch (error) {
      this.logger.error(`Factory function failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Memoize a function with caching
   */
  memoize<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn> | TReturn,
    keyGenerator?: (...args: TArgs) => string,
    options?: CacheOptions,
  ) {
    const defaultKeyGen = (...args: TArgs) => JSON.stringify(args);
    const generateKey = keyGenerator || defaultKeyGen;

    return async (...args: TArgs): Promise<TReturn> => {
      const key = `memoized:${fn.name}:${generateKey(...args)}`;

      return this.getOrSet(key, () => fn(...args), options);
    };
  }

  /**
   * Cache invalidation by tags
   */
  private tags = new Map<string, Set<string>>(); // tag -> set of cache keys

  setWithTags<T>(
    key: string,
    data: T,
    tags: string[],
    options?: CacheOptions,
  ): void {
    this.set(key, data, options);

    // Associate cache key with tags
    tags.forEach((tag) => {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(key);
    });
  }

  invalidateByTag(tag: string): number {
    const keys = this.tags.get(tag);
    if (!keys) {
      return 0;
    }

    let invalidated = 0;
    keys.forEach((key) => {
      if (this.cache.delete(key)) {
        invalidated++;
      }
    });

    // Remove the tag
    this.tags.delete(tag);

    this.logger.log(
      `Cache tag invalidation: ${invalidated} items removed for tag '${tag}'`,
    );
    return invalidated;
  }

  /**
   * Private methods
   */
  private cleanup(): void {
    const now = Date.now();
    let expired = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        expired++;
      }
    }

    if (expired > 0) {
      this.logger.debug(`Cache cleanup: ${expired} expired items removed`);
    }
  }

  private evictLeastUsed(): void {
    // Find least recently used items
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Remove bottom 10% of entries
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }

    this.logger.debug(`Cache eviction: ${toRemove} least used items removed`);
  }

  /**
   * Cleanup on service destruction
   */
  onDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}
