import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../common/cache/cache.service';
import { PatchRepository } from './patch.repository';
import { Patch, PatchHistory } from '../interfaces/patch.interface';

@Injectable()
export class PatchCacheService {
  private readonly logger = new Logger(PatchCacheService.name);

  constructor(
    private cacheService: CacheService,
    private patchRepository: PatchRepository,
  ) {}

  /**
   * Get patch with caching
   */
  async getPatch(id: number): Promise<Patch | null> {
    const cacheKey = `patch:${id}`;

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.patchRepository.findPatchById(id),
      { ttl: 1800 }, // 30 minutes
    );
  }

  /**
   * Get patches by user with caching
   */
  async getPatchesByUser(
    username: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ items: Patch[]; lastEvaluatedKey?: any; count: number }> {
    const cacheKey = `patches:user:${username}:${JSON.stringify(
      options || {},
    )}`;

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.patchRepository.findPatchesByUser(username, options),
      { ttl: 900 }, // 15 minutes
    );
  }

  /**
   * Get latest patches with caching
   */
  async getLatestPatches(
    limit?: number,
    exclusiveStartKey?: any,
  ): Promise<{ items: Patch[]; lastEvaluatedKey?: any; count: number }> {
    const cacheKey = `patches:latest:${limit || 'all'}:${
      exclusiveStartKey || 'start'
    }`;

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.patchRepository.findLatestPatches(limit, exclusiveStartKey),
      { ttl: 600 }, // 10 minutes
    );
  }

  /**
   * Get patches by category with caching
   */
  async getPatchesByCategory(
    category: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ items: Patch[]; lastEvaluatedKey?: any; count: number }> {
    const cacheKey = `patches:category:${category}:${JSON.stringify(
      options || {},
    )}`;

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.patchRepository.findPatchesByCategory(category, options),
      { ttl: 1800 }, // 30 minutes
    );
  }

  /**
   * Get patches by tag with caching
   */
  async getPatchesByTag(
    tag: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ items: Patch[]; lastEvaluatedKey?: any; count: number }> {
    const cacheKey = `patches:tag:${tag}:${JSON.stringify(options || {})}`;

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.patchRepository.findPatchesByTag(tag, options),
      { ttl: 1800 }, // 30 minutes
    );
  }

  /**
   * Search patches with caching
   */
  async searchPatches(
    searchTerm: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ items: Patch[]; lastEvaluatedKey?: any; count: number }> {
    const cacheKey = `patches:search:${searchTerm}:${JSON.stringify(
      options || {},
    )}`;

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.patchRepository.searchPatches(searchTerm, options),
      { ttl: 600 }, // 10 minutes (search results change more frequently)
    );
  }

  /**
   * Get top rated patches with caching
   */
  async getTopRatedPatches(
    minRating = 4,
    options?: { limit?: number; offset?: number },
  ): Promise<{ items: Patch[]; lastEvaluatedKey?: any; count: number }> {
    const cacheKey = `patches:top-rated:${minRating}:${JSON.stringify(
      options || {},
    )}`;

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.patchRepository.findTopRatedPatches(minRating, options),
      { ttl: 3600 }, // 1 hour
    );
  }

  /**
   * Get patch statistics with caching
   */
  async getPatchStats(): Promise<{
    totalPatches: number;
    averageRating: number;
    topCategories: Array<{ category: string; count: number }>;
  }> {
    const cacheKey = 'patches:stats';

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.patchRepository.getPatchStats(),
      { ttl: 1800 }, // 30 minutes
    );
  }

  /**
   * Get user patch count with caching
   */
  async getUserPatchCount(username: string): Promise<number> {
    const cacheKey = `patches:count:user:${username}`;

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.patchRepository.getUserPatchCount(username),
      { ttl: 900 }, // 15 minutes
    );
  }

  /**
   * Invalidate cache when patch is created
   */
  async invalidatePatchCreation(patch: Patch): Promise<void> {
    // Invalidate relevant caches
    this.cacheService.clearByPattern(/^patches:latest:/);
    this.cacheService.clearByPattern(/^patches:stats/);

    if (patch.category) {
      this.cacheService.clearByPattern(
        new RegExp(`^patches:category:${patch.category}:`),
      );
    }

    if (patch.tags && patch.tags.length > 0) {
      patch.tags.forEach((tag) => {
        this.cacheService.clearByPattern(new RegExp(`^patches:tag:${tag}:`));
      });
    }

    this.logger.debug(`Cache invalidated for patch creation: ${patch.id}`);
  }

  /**
   * Invalidate cache when patch is updated
   */
  async invalidatePatchUpdate(oldPatch: Patch, newPatch: Patch): Promise<void> {
    // Invalidate specific patch cache
    this.cacheService.delete(`patch:${newPatch.id}`);

    // Invalidate user patches cache
    // Note: we'd need to get the username from somewhere
    // this.cacheService.clearByPattern(new RegExp(`^patches:user:${username}:`));

    // Invalidate category caches if category changed
    if (oldPatch.category !== newPatch.category) {
      if (oldPatch.category) {
        this.cacheService.clearByPattern(
          new RegExp(`^patches:category:${oldPatch.category}:`),
        );
      }
      if (newPatch.category) {
        this.cacheService.clearByPattern(
          new RegExp(`^patches:category:${newPatch.category}:`),
        );
      }
    }

    // Invalidate tag caches if tags changed
    const oldTags = new Set(oldPatch.tags || []);
    const newTags = new Set(newPatch.tags || []);

    // Find removed tags
    oldTags.forEach((tag) => {
      if (!newTags.has(tag)) {
        this.cacheService.clearByPattern(new RegExp(`^patches:tag:${tag}:`));
      }
    });

    // Find added tags
    newTags.forEach((tag) => {
      if (!oldTags.has(tag)) {
        this.cacheService.clearByPattern(new RegExp(`^patches:tag:${tag}:`));
      }
    });

    // Always invalidate stats and search caches
    this.cacheService.clearByPattern(/^patches:stats/);
    this.cacheService.clearByPattern(/^patches:search:/);

    this.logger.debug(`Cache invalidated for patch update: ${newPatch.id}`);
  }

  /**
   * Invalidate cache when patch is deleted
   */
  async invalidatePatchDeletion(patch: Patch): Promise<void> {
    // Remove specific patch cache
    this.cacheService.delete(`patch:${patch.id}`);

    // Invalidate broad caches
    this.cacheService.clearByPattern(/^patches:latest:/);
    this.cacheService.clearByPattern(/^patches:stats/);
    this.cacheService.clearByPattern(/^patches:search:/);

    if (patch.category) {
      this.cacheService.clearByPattern(
        new RegExp(`^patches:category:${patch.category}:`),
      );
    }

    if (patch.tags && patch.tags.length > 0) {
      patch.tags.forEach((tag) => {
        this.cacheService.clearByPattern(new RegExp(`^patches:tag:${tag}:`));
      });
    }

    this.logger.debug(`Cache invalidated for patch deletion: ${patch.id}`);
  }

  /**
   * Warm up cache with popular data
   */
  async warmupCache(): Promise<void> {
    try {
      // Preload popular patches
      await this.getLatestPatches(50);
      await this.getTopRatedPatches(4.0, { limit: 20 });

      // Preload statistics
      await this.getPatchStats();

      // Preload popular categories
      const categories = ['bass', 'lead', 'pad', 'arp', 'pluck'];
      await Promise.all(
        categories.map((category) =>
          this.getPatchesByCategory(category, { limit: 20 }),
        ),
      );

      this.logger.log('Cache warmup completed successfully');
    } catch (error) {
      this.logger.error('Cache warmup failed:', error);
    }
  }

  /**
   * Get cache metrics for monitoring
   */
  getCacheMetrics(): any {
    return this.cacheService.getStats();
  }

  /**
   * Clear all patch-related caches
   */
  clearAllPatchCaches(): void {
    this.cacheService.clearByPattern(/^patch:/);
    this.cacheService.clearByPattern(/^patches:/);
    this.logger.log('All patch caches cleared');
  }
}
