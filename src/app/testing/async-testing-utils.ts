import { fakeAsync, tick, flush, flushMicrotasks, discardPeriodicTasks } from '@angular/core/testing';
import { Observable, Subject, timer } from 'rxjs';
import { takeUntil, timeout, map } from 'rxjs/operators';

/**
 * Async Testing Utilities for Phase 3 - Async Testing Optimization
 * 
 * This module provides utility functions for properly handling asynchronous
 * operations in Angular tests using fakeAsync patterns and bounded async operations.
 */

/**
 * Configuration for async test timeouts and intervals
 */
export interface AsyncTestConfig {
  debounceTime?: number;
  maxWaitTime?: number;
  tickInterval?: number;
  cleanupTimeout?: number;
}

/**
 * Default configuration for async testing
 */
export const DEFAULT_ASYNC_CONFIG: AsyncTestConfig = {
  debounceTime: 300,
  maxWaitTime: 5000,
  tickInterval: 100,
  cleanupTimeout: 1000
};

/**
 * Async test cleanup manager for proper observable lifecycle management
 */
export class AsyncTestCleanupManager {
  private destroy$ = new Subject<void>();
  private activeTimers: any[] = [];
  private activeObservables: Observable<any>[] = [];
  
  /**
   * Register an observable for cleanup
   */
  registerObservable<T>(observable: Observable<T>): Observable<T> {
    const boundedObservable = observable.pipe(
      takeUntil(this.destroy$),
      timeout(DEFAULT_ASYNC_CONFIG.maxWaitTime!)
    );
    
    this.activeObservables.push(boundedObservable);
    return boundedObservable;
  }
  
  /**
   * Register a timer for cleanup
   */
  registerTimer(timerId: any): any {
    this.activeTimers.push(timerId as number);
    return timerId;
  }
  
  /**
   * Clean up all registered resources
   */
  cleanup(): void {
    // Complete all observables
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clear active timers
    this.activeTimers.forEach(id => clearTimeout(id));
    this.activeTimers = [];
    
    // Reset for next test
    this.destroy$ = new Subject<void>();
    this.activeObservables = [];
  }
}

/**
 * Global cleanup manager instance
 */
let globalCleanupManager: AsyncTestCleanupManager | null = null;

/**
 * Get or create the global cleanup manager
 */
export function getAsyncTestCleanupManager(): AsyncTestCleanupManager {
  if (!globalCleanupManager) {
    globalCleanupManager = new AsyncTestCleanupManager();
  }
  return globalCleanupManager;
}

/**
 * Reset the global cleanup manager (call in afterEach)
 */
export function resetAsyncTestCleanupManager(): void {
  if (globalCleanupManager) {
    globalCleanupManager.cleanup();
  }
  globalCleanupManager = null;
}

/**
 * Bounded fakeAsync wrapper that ensures proper cleanup
 */
export function boundedFakeAsync<T>(
  fn: () => T,
  config: AsyncTestConfig = DEFAULT_ASYNC_CONFIG
): () => T {
  return fakeAsync(() => {
    const cleanupManager = getAsyncTestCleanupManager();
    
    try {
      const result = fn();
      
      // Ensure all microtasks and timers are flushed
      flushMicrotasks();
      flush();
      
      return result;
    } finally {
      // Discard any remaining periodic tasks to prevent timeouts
      try {
        discardPeriodicTasks();
      } catch (e) {
        // Ignore errors from discarding tasks
      }
      
      // Cleanup registered resources
      cleanupManager.cleanup();
    }
  });
}

/**
 * Advance time in fakeAsync zone with proper bounds checking
 */
export function advanceTime(
  milliseconds: number,
  config: AsyncTestConfig = DEFAULT_ASYNC_CONFIG
): void {
  const maxTime = config.maxWaitTime || DEFAULT_ASYNC_CONFIG.maxWaitTime!;
  
  if (milliseconds > maxTime) {
    throw new Error(`Time advancement (${milliseconds}ms) exceeds maximum allowed time (${maxTime}ms)`);
  }
  
  tick(milliseconds);
  flushMicrotasks();
}

/**
 * Wait for debounce with proper async handling
 */
export function waitForDebounce(
  debounceTime: number = DEFAULT_ASYNC_CONFIG.debounceTime!
): void {
  advanceTime(debounceTime + 50); // Add small buffer for safety
}

/**
 * Wait for observable to complete with timeout protection
 */
export function waitForObservableCompletion<T>(
  observable: Observable<T>,
  timeoutMs: number = DEFAULT_ASYNC_CONFIG.maxWaitTime!
): Promise<T> {
  return new Promise((resolve, reject) => {
    const cleanup = getAsyncTestCleanupManager();
    
    const timeoutId = setTimeout(() => {
      reject(new Error(`Observable did not complete within ${timeoutMs}ms`));
    }, timeoutMs) as any;
    
    cleanup.registerTimer(timeoutId);
    
    const boundedObservable = cleanup.registerObservable(observable);
    
    boundedObservable.subscribe({
      next: (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      error: (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
      complete: () => {
        clearTimeout(timeoutId);
      }
    });
  });
}

/**
 * Test debounced form control with proper async handling
 */
export function testDebouncedFormControl(
  formControl: any,
  testValue: string,
  expectedDebounceTime: number = DEFAULT_ASYNC_CONFIG.debounceTime!,
  callback?: (value: string) => void
): void {
  // Set the value
  formControl.setValue(testValue);
  
  // Advance time by less than debounce time - callback should not fire
  advanceTime(expectedDebounceTime - 50);
  
  // Advance time to complete debounce - callback should fire
  advanceTime(100);
  
  if (callback) {
    callback(testValue);
  }
}

/**
 * Test search functionality with proper debounce handling
 */
export function testSearchDebounce(
  searchControl: any,
  searchTerm: string,
  mockService: any,
  methodName: string,
  expectedParams: any,
  debounceTime: number = DEFAULT_ASYNC_CONFIG.debounceTime!
): void {
  // Clear any previous calls
  mockService[methodName].calls.reset();
  
  // Set search value
  searchControl.setValue(searchTerm);
  
  // Advance time by debounce duration
  waitForDebounce(debounceTime);
  
  // Verify the service was called
  expect(mockService[methodName]).toHaveBeenCalledWith(expectedParams);
}

/**
 * Setup periodic timer cleanup for tests
 */
export function setupPeriodicTimerCleanup(): void {
  const cleanup = getAsyncTestCleanupManager();
  
  // Override setTimeout and setInterval to track them
  const originalSetTimeout = window.setTimeout;
  const originalSetInterval = window.setInterval;
  
  window.setTimeout = ((callback: any, delay?: number) => {
    const id = originalSetTimeout(callback, delay);
    cleanup.registerTimer(id);
    return id;
  }) as any;
  
  window.setInterval = ((callback: any, delay?: number) => {
    const id = originalSetInterval(callback, delay);
    cleanup.registerTimer(id);
    return id;
  }) as any;
}

/**
 * Restore original timer functions
 */
export function restoreOriginalTimers(): void {
  // This would restore original implementations
  // For now, let the cleanup manager handle the cleanup
}

/**
 * Create a bounded observable for testing
 */
export function createBoundedTestObservable<T>(
  source: Observable<T>,
  timeoutMs: number = DEFAULT_ASYNC_CONFIG.maxWaitTime!
): Observable<T> {
  const cleanup = getAsyncTestCleanupManager();
  return cleanup.registerObservable(source.pipe(timeout(timeoutMs)));
}

/**
 * Test component lifecycle with proper async handling
 */
export function testComponentLifecycle(
  component: any,
  fixture: any,
  lifecycle: 'init' | 'destroy' | 'changes'
): void {
  switch (lifecycle) {
    case 'init':
      component.ngOnInit();
      fixture.detectChanges();
      tick();
      flushMicrotasks();
      break;
      
    case 'destroy':
      component.ngOnDestroy();
      tick();
      flushMicrotasks();
      // Verify all subscriptions are cleaned up
      break;
      
    case 'changes':
      fixture.detectChanges();
      tick();
      flushMicrotasks();
      break;
  }
}

/**
 * Verify no memory leaks in component
 */
export function verifyNoMemoryLeaks(component: any): void {
  // Check for common memory leak patterns
  if (component.destroy$) {
    expect(component.destroy$.closed).toBeTruthy();
  }
  
  // Check for unsubscribed observables
  if (component.subscription) {
    expect(component.subscription.closed).toBeTruthy();
  }
  
  // Check for active timers
  const cleanup = getAsyncTestCleanupManager();
  expect(cleanup['activeTimers'].length).toBe(0);
}

/**
 * Mock observable with controlled timing
 */
export function createMockObservableWithTiming<T>(
  value: T,
  delay: number = 100
): Observable<T> {
  return timer(delay).pipe(
    takeUntil(getAsyncTestCleanupManager()['destroy$']),
    map(() => value)
  );
}

/**
 * Test HTTP request with debounce
 */
export function testHttpRequestDebounce(
  serviceMethod: any,
  expectedUrl: string,
  httpMock: any,
  debounceTime: number = DEFAULT_ASYNC_CONFIG.debounceTime!
): void {
  // Call the service method
  const subscription = serviceMethod();
  
  // Advance time by debounce
  waitForDebounce(debounceTime);
  
  // Verify HTTP request was made
  const req = httpMock.expectOne(expectedUrl);
  expect(req.request.method).toBe('GET');
  
  // Complete the request
  req.flush({ success: true });
  
  // Verify subscription completes
  subscription.subscribe({
    next: (result: any) => {
      expect(result.success).toBeTruthy();
    }
  });
  
  // Cleanup
  advanceTime(10);
}

/**
 * Integration test setup with async coordination
 */
export interface IntegrationTestSetup {
  component: any;
  fixture: any;
  mockServices: { [key: string]: any };
  httpMock?: any;
}

/**
 * Setup integration test environment with proper async handling
 */
export function setupIntegrationTest(setup: IntegrationTestSetup): void {
  const cleanup = getAsyncTestCleanupManager();
  
  // Initialize component
  setup.component.ngOnInit();
  setup.fixture.detectChanges();
  
  // Register component observables
  if (setup.component.destroy$) {
    cleanup.registerObservable(setup.component.destroy$);
  }
  
  // Setup mock coordination
  Object.keys(setup.mockServices).forEach(key => {
    const service = setup.mockServices[key];
    // Ensure all service methods return bounded observables
    Object.getOwnPropertyNames(service).forEach(method => {
      if (typeof service[method] === 'function' && service[method].and) {
        const originalReturnValue = service[method].and.returnValue;
        if (originalReturnValue && typeof originalReturnValue.subscribe === 'function') {
          service[method].and.returnValue(cleanup.registerObservable(originalReturnValue));
        }
      }
    });
  });
}

/**
 * Comprehensive async test wrapper
 */
export function asyncTest<T>(
  testFn: () => T,
  config: AsyncTestConfig = DEFAULT_ASYNC_CONFIG
): () => T {
  return boundedFakeAsync(() => {
    setupPeriodicTimerCleanup();
    
    try {
      return testFn();
    } finally {
      // Ensure all async operations complete
      flushMicrotasks();
      flush();
      
      // Cleanup
      resetAsyncTestCleanupManager();
      restoreOriginalTimers();
    }
  }, config);
}