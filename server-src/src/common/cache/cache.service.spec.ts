import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheService],
    }).compile();

    service = module.get<CacheService>(CacheService);

    // Clear cache before each test
    service.clear();

    // Mock Date.now for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic cache operations', () => {
    it('should store and retrieve a value', () => {
      const key = 'test-key';
      const value = 'test-value';

      service.set(key, value);
      const result = service.get(key);

      expect(result).toBe(value);
    });

    it('should return null for non-existent key', () => {
      const result = service.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should check if key exists', () => {
      const key = 'test-key';
      const value = 'test-value';

      expect(service.has(key)).toBe(false);
      
      service.set(key, value);
      expect(service.has(key)).toBe(true);
    });

    it('should delete a value', () => {
      const key = 'test-key';
      const value = 'test-value';

      service.set(key, value);
      expect(service.has(key)).toBe(true);

      const deleted = service.delete(key);
      expect(deleted).toBe(true);
      expect(service.has(key)).toBe(false);
    });

    it('should clear all values', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      service.set('key3', 'value3');

      service.clear();

      expect(service.has('key1')).toBe(false);
      expect(service.has('key2')).toBe(false);
      expect(service.has('key3')).toBe(false);
    });
  });

  describe('TTL (Time To Live) functionality', () => {
    it('should expire items after TTL', () => {
      const key = 'expiring-key';
      const value = 'expiring-value';
      const ttl = 60; // 60 seconds

      service.set(key, value, { ttl });
      expect(service.get(key)).toBe(value);

      // Advance time by 61 seconds
      jest.advanceTimersByTime(61 * 1000);

      expect(service.get(key)).toBeNull();
      expect(service.has(key)).toBe(false);
    });

    it('should use default TTL when not specified', () => {
      const key = 'default-ttl-key';
      const value = 'default-ttl-value';

      service.set(key, value);
      expect(service.get(key)).toBe(value);

      // Advance time by 1 hour (default TTL)
      jest.advanceTimersByTime(3600 * 1000);

      expect(service.get(key)).toBeNull();
    });

    it('should not expire items before TTL', () => {
      const key = 'not-expiring-key';
      const value = 'not-expiring-value';
      const ttl = 120; // 2 minutes

      service.set(key, value, { ttl });
      
      // Advance time by 1 minute (less than TTL)
      jest.advanceTimersByTime(60 * 1000);

      expect(service.get(key)).toBe(value);
    });
  });

  describe('access tracking', () => {
    it('should track access count and last accessed time', () => {
      const key = 'tracked-key';
      const value = 'tracked-value';

      service.set(key, value);
      
      // Access the item multiple times
      service.get(key);
      
      // Advance time
      jest.advanceTimersByTime(1000);
      service.get(key);
      
      jest.advanceTimersByTime(1000);
      service.get(key);

      const stats = service.getStats();
      const item = stats.items.find(item => item.key === key);

      expect(item).toBeDefined();
      expect(item!.accessCount).toBe(3);
    });
  });

  describe('getOrSet pattern', () => {
    it('should return cached value if exists', async () => {
      const key = 'cached-key';
      const cachedValue = 'cached-value';
      const factoryMock = jest.fn().mockResolvedValue('factory-value');

      service.set(key, cachedValue);

      const result = await service.getOrSet(key, factoryMock);

      expect(result).toBe(cachedValue);
      expect(factoryMock).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if not exists', async () => {
      const key = 'new-key';
      const factoryValue = 'factory-value';
      const factoryMock = jest.fn().mockResolvedValue(factoryValue);

      const result = await service.getOrSet(key, factoryMock);

      expect(result).toBe(factoryValue);
      expect(factoryMock).toHaveBeenCalledTimes(1);
      expect(service.get(key)).toBe(factoryValue);
    });

    it('should handle factory function errors', async () => {
      const key = 'error-key';
      const error = new Error('Factory error');
      const factoryMock = jest.fn().mockRejectedValue(error);

      await expect(service.getOrSet(key, factoryMock)).rejects.toThrow('Factory error');
      expect(service.has(key)).toBe(false);
    });
  });

  describe('memoization', () => {
    it('should memoize function calls', async () => {
      const originalFunction = jest.fn().mockImplementation((a: number, b: number) => a + b);
      const memoizedFunction = service.memoize(originalFunction);

      const result1 = await memoizedFunction(1, 2);
      const result2 = await memoizedFunction(1, 2);
      const result3 = await memoizedFunction(2, 3);

      expect(result1).toBe(3);
      expect(result2).toBe(3);
      expect(result3).toBe(5);

      expect(originalFunction).toHaveBeenCalledTimes(2); // Once for (1,2), once for (2,3)
    });

    it('should use custom key generator for memoization', async () => {
      const originalFunction = jest.fn().mockImplementation((obj: { id: number; name: string }) => obj.name);
      const keyGenerator = (obj: { id: number; name: string }) => `user-${obj.id}`;
      const memoizedFunction = service.memoize(originalFunction, keyGenerator);

      const user1 = { id: 1, name: 'Alice' };
      const user1Copy = { id: 1, name: 'Alice' };
      const user2 = { id: 2, name: 'Bob' };

      await memoizedFunction(user1);
      await memoizedFunction(user1Copy); // Should use cache
      await memoizedFunction(user2);

      expect(originalFunction).toHaveBeenCalledTimes(2);
    });
  });

  describe('pattern-based clearing', () => {
    it('should clear items matching pattern', () => {
      service.set('user:1:profile', 'profile1');
      service.set('user:2:profile', 'profile2');
      service.set('user:1:settings', 'settings1');
      service.set('product:1:details', 'product1');

      const cleared = service.clearByPattern(/^user:/);

      expect(cleared).toBe(3);
      expect(service.has('user:1:profile')).toBe(false);
      expect(service.has('user:2:profile')).toBe(false);
      expect(service.has('user:1:settings')).toBe(false);
      expect(service.has('product:1:details')).toBe(true);
    });
  });

  describe('tag-based invalidation', () => {
    it('should associate cache items with tags', () => {
      service.setWithTags('user:1', { name: 'Alice' }, ['users', 'active-users']);
      service.setWithTags('user:2', { name: 'Bob' }, ['users']);
      service.setWithTags('product:1', { name: 'Product A' }, ['products']);

      expect(service.get('user:1')).toEqual({ name: 'Alice' });
      expect(service.get('user:2')).toEqual({ name: 'Bob' });
      expect(service.get('product:1')).toEqual({ name: 'Product A' });
    });

    it('should invalidate cache items by tag', () => {
      service.setWithTags('user:1', { name: 'Alice' }, ['users', 'active-users']);
      service.setWithTags('user:2', { name: 'Bob' }, ['users']);
      service.setWithTags('product:1', { name: 'Product A' }, ['products']);

      const invalidated = service.invalidateByTag('users');

      expect(invalidated).toBe(2);
      expect(service.has('user:1')).toBe(false);
      expect(service.has('user:2')).toBe(false);
      expect(service.has('product:1')).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should provide cache statistics', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      service.set('key3', 'value3');

      // Access some items
      service.get('key1');
      service.get('key1');
      service.get('key2');

      const stats = service.getStats();

      expect(stats.size).toBe(3);
      expect(stats.maxSize).toBeGreaterThan(0);
      expect(stats.items).toHaveLength(3);
      expect(stats.items.some(item => item.key === 'key1' && item.accessCount === 2)).toBe(true);
      expect(stats.items.some(item => item.key === 'key2' && item.accessCount === 1)).toBe(true);
      expect(stats.items.some(item => item.key === 'key3' && item.accessCount === 0)).toBe(true);
    });
  });

  describe('cache eviction', () => {
    it('should handle cache size limits', () => {
      const smallCache = new CacheService();
      const maxSize = 100;

      // Set items up to the limit
      for (let i = 0; i < maxSize + 10; i++) {
        smallCache.set(`key${i}`, `value${i}`, { maxSize: maxSize });
      }

      const stats = smallCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(maxSize);

      smallCache.onDestroy();
    });
  });

  describe('cleanup and destruction', () => {
    it('should clean up on destruction', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');

      service.onDestroy();

      expect(service.getStats().size).toBe(0);
    });
  });
});