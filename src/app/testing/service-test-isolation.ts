/**
 * Service Test Isolation Utilities
 * 
 * Specialized utilities for preventing shared state pollution between test cases,
 * particularly for services with caching, pending requests, and other stateful behavior.
 */

import { Observable, of, throwError } from 'rxjs';

/**
 * Interface for cacheable services
 */
export interface CacheableService {
  clearCache?: () => Observable<any> | void;
  invalidateCache?: (pattern?: RegExp) => void;
  getCacheStats?: () => { size: number; keys: string[] };
  cache?: Map<string, any>;
  pendingRequests?: Map<string, Observable<any>>;
}

/**
 * Cache State Manager for isolating cache-related state between tests
 */
export class CacheStateManager {
  private originalCacheState: Map<string, any> = new Map();
  private originalPendingRequests: Map<string, any> = new Map();

  constructor(private service: CacheableService) {}

  /**
   * Capture current cache state
   */
  captureState(): void {
    // Save cache state
    if (this.service.cache) {
      this.originalCacheState.clear();
      this.service.cache.forEach((value, key) => {
        this.originalCacheState.set(key, JSON.parse(JSON.stringify(value)));
      });
    }

    // Save pending requests state
    if (this.service.pendingRequests) {
      this.originalPendingRequests.clear();
      this.service.pendingRequests.forEach((value, key) => {
        this.originalPendingRequests.set(key, value);
      });
    }
  }

  /**
   * Clear all cached state
   */
  clearState(): void {
    if (this.service.clearCache) {
      const result = this.service.clearCache();
      // Handle both Observable and void returns
      if (result instanceof Observable) {
        result.subscribe();
      }
    }

    // Manual cache clearing if clearCache doesn't exist
    if (this.service.cache) {
      this.service.cache.clear();
    }

    // Clear pending requests
    if (this.service.pendingRequests) {
      this.service.pendingRequests.clear();
    }
  }

  /**
   * Restore original cache state
   */
  restoreState(): void {
    this.clearState();

    // Restore cache
    if (this.service.cache && this.originalCacheState.size > 0) {
      this.originalCacheState.forEach((value, key) => {
        this.service.cache!.set(key, value);
      });
    }

    // Restore pending requests
    if (this.service.pendingRequests && this.originalPendingRequests.size > 0) {
      this.originalPendingRequests.forEach((value, key) => {
        this.service.pendingRequests!.set(key, value);
      });
    }
  }

  /**
   * Verify cache is clean
   */
  verifyCacheClean(): boolean {
    if (this.service.getCacheStats) {
      const stats = this.service.getCacheStats();
      return stats.size === 0;
    }

    if (this.service.cache) {
      return this.service.cache.size === 0;
    }

    return true;
  }

  /**
   * Get current cache statistics
   */
  getCacheStatistics(): {
    cacheSize: number;
    pendingRequestsSize: number;
    cacheKeys: string[];
  } {
    const cacheSize = this.service.cache ? this.service.cache.size : 0;
    const pendingRequestsSize = this.service.pendingRequests ? this.service.pendingRequests.size : 0;
    const cacheKeys = this.service.cache ? Array.from(this.service.cache.keys()) : [];

    return {
      cacheSize,
      pendingRequestsSize,
      cacheKeys
    };
  }
}

/**
 * Service Mock State Manager for handling spy state
 */
export class ServiceMockStateManager {
  private spies: jasmine.Spy[] = [];
  private originalMethods: Map<string, any> = new Map();

  constructor(private service: any) {}

  /**
   * Create and track a spy on a service method
   */
  spyOnMethod(methodName: string, returnValue?: any): jasmine.Spy {
    // Save original method
    if (this.service[methodName]) {
      this.originalMethods.set(methodName, this.service[methodName]);
    }

    const spy = spyOn(this.service, methodName);
    
    if (returnValue !== undefined) {
      spy.and.returnValue(returnValue);
    }

    this.spies.push(spy);
    return spy;
  }

  /**
   * Reset all spies
   */
  resetSpies(): void {
    this.spies.forEach(spy => {
      spy.calls.reset();
    });
  }

  /**
   * Restore original methods
   */
  restoreOriginalMethods(): void {
    this.originalMethods.forEach((originalMethod, methodName) => {
      this.service[methodName] = originalMethod;
    });
    this.originalMethods.clear();
    this.spies = [];
  }

  /**
   * Get spy call statistics
   */
  getSpyStatistics(): { [methodName: string]: number } {
    const stats: { [methodName: string]: number } = {};
    
    this.spies.forEach(spy => {
      const methodName = spy.and.identity || 'unknown';
      stats[methodName] = spy.calls.count();
    });

    return stats;
  }
}

/**
 * Complete Service Test Isolator
 */
export class ServiceTestIsolator {
  private cacheManager: CacheStateManager;
  private mockManager: ServiceMockStateManager;
  private isolationActive: boolean = false;

  constructor(private service: any) {
    this.cacheManager = new CacheStateManager(service);
    this.mockManager = new ServiceMockStateManager(service);
  }

  /**
   * Begin test isolation
   */
  beginIsolation(): void {
    if (this.isolationActive) {
      console.warn('Test isolation already active');
      return;
    }

    this.cacheManager.captureState();
    this.cacheManager.clearState();
    this.isolationActive = true;
  }

  /**
   * End test isolation and restore state
   */
  endIsolation(): void {
    if (!this.isolationActive) {
      return;
    }

    this.cacheManager.clearState();
    this.mockManager.resetSpies();
    this.isolationActive = false;
  }

  /**
   * Complete reset - clear everything
   */
  completeReset(): void {
    this.cacheManager.clearState();
    this.mockManager.restoreOriginalMethods();
    this.isolationActive = false;
  }

  /**
   * Verify isolation is working correctly
   */
  verifyIsolation(): {
    cacheClean: boolean;
    statistics: any;
  } {
    return {
      cacheClean: this.cacheManager.verifyCacheClean(),
      statistics: {
        cache: this.cacheManager.getCacheStatistics(),
        spies: this.mockManager.getSpyStatistics()
      }
    };
  }

  /**
   * Get cache manager for advanced cache testing
   */
  getCacheManager(): CacheStateManager {
    return this.cacheManager;
  }

  /**
   * Get mock manager for advanced spy management
   */
  getMockManager(): ServiceMockStateManager {
    return this.mockManager;
  }
}

/**
 * Test Suite Isolation Decorator
 * 
 * Use this to wrap test suites that need service isolation
 */
export function withServiceIsolation<T>(
  service: T,
  testFunction: (isolator: ServiceTestIsolator) => void
): void {
  const isolator = new ServiceTestIsolator(service);
  
  try {
    isolator.beginIsolation();
    testFunction(isolator);
  } finally {
    isolator.completeReset();
  }
}

/**
 * Cache State Verification Utilities
 */
export class CacheStateVerifier {
  static verifyNoCacheLeakage(services: CacheableService[]): boolean {
    return services.every(service => {
      if (service.getCacheStats) {
        const stats = service.getCacheStats();
        if (stats.size > 0) {
          console.warn(`Cache leakage detected in service. Cache size: ${stats.size}, Keys: ${stats.keys.join(', ')}`);
          return false;
        }
      }

      if (service.cache && service.cache.size > 0) {
        console.warn(`Direct cache leakage detected. Size: ${service.cache.size}`);
        return false;
      }

      if (service.pendingRequests && service.pendingRequests.size > 0) {
        console.warn(`Pending requests leakage detected. Size: ${service.pendingRequests.size}`);
        return false;
      }

      return true;
    });
  }

  static logCacheState(service: CacheableService, label: string = 'Cache State'): void {
    console.log(`=== ${label} ===`);
    
    if (service.getCacheStats) {
      const stats = service.getCacheStats();
      console.log(`Cache size: ${stats.size}`);
      console.log(`Cache keys: ${stats.keys.join(', ')}`);
    }

    if (service.cache) {
      console.log(`Direct cache size: ${service.cache.size}`);
    }

    if (service.pendingRequests) {
      console.log(`Pending requests: ${service.pendingRequests.size}`);
    }
    
    console.log('================');
  }
}

/**
 * Service Test Builder for complex isolation scenarios
 */
export class ServiceTestBuilder {
  private isolators: Map<string, ServiceTestIsolator> = new Map();
  private verificationEnabled: boolean = false;

  /**
   * Register a service for isolation
   */
  registerService(name: string, service: any): ServiceTestBuilder {
    this.isolators.set(name, new ServiceTestIsolator(service));
    return this;
  }

  /**
   * Enable state verification after each test
   */
  enableVerification(): ServiceTestBuilder {
    this.verificationEnabled = true;
    return this;
  }

  /**
   * Begin isolation for all registered services
   */
  beginAllIsolation(): void {
    this.isolators.forEach(isolator => {
      isolator.beginIsolation();
    });
  }

  /**
   * End isolation for all registered services
   */
  endAllIsolation(): void {
    this.isolators.forEach(isolator => {
      isolator.endIsolation();
    });

    if (this.verificationEnabled) {
      this.verifyAllIsolation();
    }
  }

  /**
   * Complete reset for all services
   */
  completeResetAll(): void {
    this.isolators.forEach(isolator => {
      isolator.completeReset();
    });
  }

  /**
   * Verify isolation for all services
   */
  verifyAllIsolation(): boolean {
    let allClean = true;
    
    this.isolators.forEach((isolator, name) => {
      const verification = isolator.verifyIsolation();
      if (!verification.cacheClean) {
        console.warn(`Service ${name} has cache leakage:`, verification.statistics);
        allClean = false;
      }
    });

    return allClean;
  }

  /**
   * Get isolator for a specific service
   */
  getIsolator(name: string): ServiceTestIsolator | undefined {
    return this.isolators.get(name);
  }

  /**
   * Execute test with automatic isolation
   */
  executeWithIsolation(testFunction: (builder: ServiceTestBuilder) => void): void {
    this.beginAllIsolation();
    
    try {
      testFunction(this);
    } finally {
      this.completeResetAll();
    }
  }
}

/**
 * Utility function to create a service test builder
 */
export function createServiceTestBuilder(): ServiceTestBuilder {
  return new ServiceTestBuilder();
}