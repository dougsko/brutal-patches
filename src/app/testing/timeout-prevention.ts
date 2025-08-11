/**
 * Timeout Prevention Mechanisms for Angular Testing
 * 
 * This module provides comprehensive timeout prevention strategies
 * specifically designed for Angular async testing scenarios.
 */

import { fakeAsync, tick, discardPeriodicTasks, flushMicrotasks } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

/**
 * Global timeout prevention configuration
 */
export interface TimeoutPreventionConfig {
  maxTestDuration: number;
  periodicTaskCleanupInterval: number;
  enablePeriodicCleanup: boolean;
  enableMemoryLeakDetection: boolean;
}

export const DEFAULT_TIMEOUT_CONFIG: TimeoutPreventionConfig = {
  maxTestDuration: 25000, // 25 seconds (less than Karma's 30s timeout)
  periodicTaskCleanupInterval: 1000,
  enablePeriodicCleanup: true,
  enableMemoryLeakDetection: true
};

/**
 * Global timeout prevention manager
 */
class TimeoutPreventionManager {
  private static instance: TimeoutPreventionManager;
  private activeTimeouts: Set<any> = new Set();
  private testStartTime: number = 0;
  private config: TimeoutPreventionConfig = DEFAULT_TIMEOUT_CONFIG;
  private cleanupInterval?: any;

  static getInstance(): TimeoutPreventionManager {
    if (!TimeoutPreventionManager.instance) {
      TimeoutPreventionManager.instance = new TimeoutPreventionManager();
    }
    return TimeoutPreventionManager.instance;
  }

  startTest(): void {
    this.testStartTime = Date.now();
    this.activeTimeouts.clear();
    
    if (this.config.enablePeriodicCleanup) {
      this.startPeriodicCleanup();
    }
  }

  endTest(): void {
    this.clearAllTimeouts();
    this.stopPeriodicCleanup();
    
    // Discard any remaining periodic tasks
    try {
      discardPeriodicTasks();
    } catch (e) {
      // Ignore errors from discarding non-existent tasks
    }
  }

  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const elapsed = Date.now() - this.testStartTime;
      
      if (elapsed > this.config.maxTestDuration) {
        console.warn(`Test has been running for ${elapsed}ms, forcing cleanup`);
        this.forceTestCleanup();
      }
      
      // Periodic cleanup of dead timers
      this.cleanupDeadTimeouts();
      
    }, this.config.periodicTaskCleanupInterval);
  }

  private stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  private forceTestCleanup(): void {
    this.clearAllTimeouts();
    
    try {
      discardPeriodicTasks();
      flushMicrotasks();
    } catch (e) {
      console.warn('Error during force cleanup:', e);
    }
  }

  private clearAllTimeouts(): void {
    this.activeTimeouts.forEach(timeout => {
      try {
        clearTimeout(timeout);
        clearInterval(timeout);
      } catch (e) {
        // Ignore cleanup errors
      }
    });
    this.activeTimeouts.clear();
  }

  private cleanupDeadTimeouts(): void {
    // Clean up references to completed timeouts
    this.activeTimeouts = new Set([...this.activeTimeouts].filter(timeout => {
      // Basic check - this is a simple heuristic
      return timeout && typeof timeout === 'object';
    }));
  }

  registerTimeout(timeout: any): void {
    this.activeTimeouts.add(timeout);
  }

  unregisterTimeout(timeout: any): void {
    this.activeTimeouts.delete(timeout);
  }
}

/**
 * Setup timeout prevention for a test suite
 */
export function setupTimeoutPrevention(config?: Partial<TimeoutPreventionConfig>): void {
  const manager = TimeoutPreventionManager.getInstance();
  
  if (config) {
    Object.assign(manager['config'], config);
  }
  
  // Override global setTimeout and setInterval
  const originalSetTimeout = window.setTimeout;
  const originalSetInterval = window.setInterval;
  const originalClearTimeout = window.clearTimeout;
  const originalClearInterval = window.clearInterval;
  
  window.setTimeout = ((callback: any, delay?: number) => {
    const timeout = originalSetTimeout(callback, delay);
    manager.registerTimeout(timeout);
    return timeout;
  }) as any;
  
  window.setInterval = ((callback: any, delay?: number) => {
    const interval = originalSetInterval(callback, delay);
    manager.registerTimeout(interval);
    return interval;
  }) as any;
  
  window.clearTimeout = ((timeout: any) => {
    manager.unregisterTimeout(timeout);
    return originalClearTimeout(timeout);
  }) as any;
  
  window.clearInterval = ((interval: any) => {
    manager.unregisterTimeout(interval);
    return originalClearInterval(interval);
  }) as any;
}

/**
 * Cleanup timeout prevention (call in afterAll)
 */
export function cleanupTimeoutPrevention(): void {
  const manager = TimeoutPreventionManager.getInstance();
  manager.endTest();
  
  // Restore original timer functions - this would need to store originals
  // For now, just ensure cleanup
}

/**
 * Enhanced beforeEach with timeout prevention
 */
export function safeBeforeEach(setupFn: () => void | Promise<void>): void {
  const manager = TimeoutPreventionManager.getInstance();
  manager.startTest();
  
  return setupFn();
}

/**
 * Enhanced afterEach with timeout prevention
 */
export function safeAfterEach(cleanupFn?: () => void): void {
  const manager = TimeoutPreventionManager.getInstance();
  
  if (cleanupFn) {
    cleanupFn();
  }
  
  manager.endTest();
  
  // Clean up TestBed to prevent memory leaks
  try {
    TestBed.resetTestingModule();
  } catch (e) {
    // Ignore reset errors
  }
}

/**
 * Wrapper for async tests with timeout prevention
 */
export function safeAsyncTest<T>(
  testFn: () => T,
  config?: Partial<TimeoutPreventionConfig>
): () => T {
  return fakeAsync(() => {
    const manager = TimeoutPreventionManager.getInstance();
    
    if (config) {
      Object.assign(manager['config'], config);
    }
    
    manager.startTest();
    
    try {
      const result = testFn();
      
      // Ensure all microtasks complete
      flushMicrotasks();
      tick();
      
      return result;
    } finally {
      manager.endTest();
    }
  });
}

/**
 * Memory leak detection utility
 */
export function detectMemoryLeaks(component: any, componentName: string): void {
  const issues: string[] = [];
  
  // Check for unclosed subscriptions
  if (component.subscription && !component.subscription.closed) {
    issues.push(`Unclosed subscription in ${componentName}`);
  }
  
  // Check for unclosed Subject streams
  if (component.destroy$ && !component.destroy$.closed) {
    issues.push(`Unclosed destroy$ stream in ${componentName}`);
  }
  
  // Check for timer references
  if (component.refreshSubscription && !component.refreshSubscription.closed) {
    issues.push(`Active refresh subscription in ${componentName}`);
  }
  
  if (issues.length > 0) {
    console.warn(`Memory leak detected in ${componentName}:`, issues);
  }
}

/**
 * Comprehensive test cleanup utility
 */
export function performTestCleanup(
  component?: any, 
  fixture?: any, 
  componentName?: string
): void {
  // Component cleanup
  if (component) {
    if (componentName) {
      detectMemoryLeaks(component, componentName);
    }
    
    if (typeof component.ngOnDestroy === 'function') {
      component.ngOnDestroy();
    }
  }
  
  // Fixture cleanup
  if (fixture) {
    try {
      fixture.destroy();
    } catch (e) {
      console.warn('Error destroying fixture:', e);
    }
  }
  
  // Angular testing cleanup
  try {
    discardPeriodicTasks();
    flushMicrotasks();
  } catch (e) {
    // Ignore cleanup errors
  }
  
  // TestBed cleanup
  try {
    TestBed.resetTestingModule();
  } catch (e) {
    // Ignore reset errors
  }
}

/**
 * Utility to check if test is approaching timeout
 */
export function isApproachingTimeout(): boolean {
  const manager = TimeoutPreventionManager.getInstance();
  const elapsed = Date.now() - manager['testStartTime'];
  return elapsed > (manager['config'].maxTestDuration * 0.8); // 80% of max duration
}

/**
 * Emergency test bailout function
 */
export function emergencyTestBailout(reason: string): void {
  console.warn(`Emergency test bailout: ${reason}`);
  
  const manager = TimeoutPreventionManager.getInstance();
  manager.endTest();
  
  // Force immediate cleanup
  try {
    discardPeriodicTasks();
    TestBed.resetTestingModule();
  } catch (e) {
    console.error('Emergency bailout cleanup failed:', e);
  }
  
  throw new Error(`Test bailed out: ${reason}`);
}