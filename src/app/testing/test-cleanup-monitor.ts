/**
 * Test Cleanup Monitoring System - Phase 4 QA Implementation
 * 
 * Monitors test resource cleanup to prevent memory leaks, hanging processes,
 * and other resource-related issues that can cause test failures.
 */

import { Subject, BehaviorSubject, Observable, interval } from 'rxjs';
import { takeUntil, filter, map } from 'rxjs/operators';

/**
 * Resource types that need monitoring
 */
export type ResourceType = 'subscription' | 'http_request' | 'timer' | 'event_listener' | 
                          'dom_element' | 'memory_allocation' | 'file_handle' | 'web_worker';

/**
 * Resource allocation record
 */
export interface ResourceAllocation {
  id: string;
  type: ResourceType;
  testName: string;
  suiteName: string;
  allocatedAt: number;
  description: string;
  stackTrace?: string;
  cleanupCallback?: () => void;
  metadata?: { [key: string]: any };
}

/**
 * Resource leak detection result
 */
export interface ResourceLeak {
  resource: ResourceAllocation;
  leakDuration: number; // milliseconds since test completion
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  recommendedAction: string;
}

/**
 * Cleanup monitoring configuration
 */
export interface CleanupMonitorConfig {
  enableResourceTracking: boolean;
  enableMemoryMonitoring: boolean;
  enableDOMLeakDetection: boolean;
  enableTimerTracking: boolean;
  
  // Thresholds
  maxResourceAge: number; // milliseconds
  memoryLeakThreshold: number; // MB
  maxActiveTimers: number;
  maxActiveSubscriptions: number;
  
  // Monitoring intervals
  monitoringInterval: number; // milliseconds
  cleanupGracePeriod: number; // milliseconds
  
  // Reporting
  enableDetailedReporting: boolean;
  enableAutomaticCleanup: boolean;
  enableStackTraceCapture: boolean;
}

/**
 * Default cleanup monitoring configuration
 */
export const DEFAULT_CLEANUP_CONFIG: CleanupMonitorConfig = {
  enableResourceTracking: true,
  enableMemoryMonitoring: true,
  enableDOMLeakDetection: true,
  enableTimerTracking: true,
  
  maxResourceAge: 30000, // 30 seconds
  memoryLeakThreshold: 10, // 10MB
  maxActiveTimers: 5,
  maxActiveSubscriptions: 10,
  
  monitoringInterval: 5000, // 5 seconds
  cleanupGracePeriod: 2000, // 2 seconds
  
  enableDetailedReporting: true,
  enableAutomaticCleanup: true,
  enableStackTraceCapture: true
};

/**
 * Cleanup monitoring statistics
 */
export interface CleanupStatistics {
  totalResourcesTracked: number;
  activeResources: number;
  leaksDetected: number;
  automaticCleanups: number;
  memoryUsage: {
    current: number;
    peak: number;
    average: number;
  };
  resourceBreakdown: { [key in ResourceType]: number };
  testSuiteStats: { [suiteName: string]: {
    resourcesAllocated: number;
    leaksDetected: number;
    cleanupRate: number;
  }};
}

/**
 * Main cleanup monitoring service
 */
export class TestCleanupMonitor {
  private activeResources = new Map<string, ResourceAllocation>();
  private completedTests = new Set<string>();
  private leakDetectionSubject = new Subject<ResourceLeak>();
  private statisticsSubject = new BehaviorSubject<CleanupStatistics | null>(null);
  private monitoringSubject = new Subject<void>();
  
  private resourceCounter = 0;
  private totalResourcesTracked = 0;
  private leaksDetected = 0;
  private automaticCleanups = 0;
  private memorySnapshots: number[] = [];
  private testSuiteStats = new Map<string, { resourcesAllocated: number; leaksDetected: number }>();

  constructor(private config: CleanupMonitorConfig = DEFAULT_CLEANUP_CONFIG) {
    this.startMonitoring();
  }

  /**
   * Register a resource allocation
   */
  registerResource(
    type: ResourceType,
    testName: string,
    suiteName: string,
    description: string,
    cleanupCallback?: () => void,
    metadata?: { [key: string]: any }
  ): string {
    const resourceId = this.generateResourceId();
    
    const resource: ResourceAllocation = {
      id: resourceId,
      type,
      testName,
      suiteName,
      allocatedAt: Date.now(),
      description,
      stackTrace: this.config.enableStackTraceCapture ? this.captureStackTrace() : undefined,
      cleanupCallback,
      metadata
    };

    this.activeResources.set(resourceId, resource);
    this.totalResourcesTracked++;
    
    // Update suite stats
    const suiteKey = suiteName;
    const suiteStats = this.testSuiteStats.get(suiteKey) || { resourcesAllocated: 0, leaksDetected: 0 };
    suiteStats.resourcesAllocated++;
    this.testSuiteStats.set(suiteKey, suiteStats);
    
    this.updateStatistics();
    
    return resourceId;
  }

  /**
   * Release a resource
   */
  releaseResource(resourceId: string): boolean {
    const resource = this.activeResources.get(resourceId);
    if (!resource) {
      return false;
    }

    // Call cleanup callback if provided
    if (resource.cleanupCallback) {
      try {
        resource.cleanupCallback();
      } catch (error) {
        console.warn(`Cleanup callback failed for resource ${resourceId}:`, error);
      }
    }

    this.activeResources.delete(resourceId);
    this.updateStatistics();
    
    return true;
  }

  /**
   * Mark test as completed for leak detection
   */
  markTestCompleted(testName: string, suiteName: string): void {
    const testKey = `${suiteName}::${testName}`;
    this.completedTests.add(testKey);
    
    // Start grace period countdown for this test's resources
    setTimeout(() => {
      this.detectLeaksForTest(testName, suiteName);
    }, this.config.cleanupGracePeriod);
  }

  /**
   * Get resource leak alerts stream
   */
  getLeakAlertsStream(): Observable<ResourceLeak> {
    return this.leakDetectionSubject.asObservable();
  }

  /**
   * Get cleanup statistics stream
   */
  getStatisticsStream(): Observable<CleanupStatistics | null> {
    return this.statisticsSubject.asObservable();
  }

  /**
   * Get current cleanup statistics
   */
  getCurrentStatistics(): CleanupStatistics | null {
    return this.statisticsSubject.value;
  }

  /**
   * Force cleanup of all resources
   */
  forceCleanupAll(): number {
    let cleanedCount = 0;
    
    this.activeResources.forEach((resource, resourceId) => {
      if (this.releaseResource(resourceId)) {
        cleanedCount++;
      }
    });
    
    this.automaticCleanups += cleanedCount;
    this.updateStatistics();
    
    return cleanedCount;
  }

  /**
   * Get detailed leak report
   */
  generateLeakReport(): {
    summary: {
      totalLeaks: number;
      criticalLeaks: number;
      memoryLeaks: number;
      activeResources: number;
    };
    leaksByType: { [key in ResourceType]: number };
    leaksBySuite: { [suiteName: string]: number };
    recommendations: string[];
  } {
    const activeResources = Array.from(this.activeResources.values());
    const now = Date.now();
    
    const leaks = activeResources.filter(resource => {
      const testKey = `${resource.suiteName}::${resource.testName}`;
      const testCompleted = this.completedTests.has(testKey);
      const resourceAge = now - resource.allocatedAt;
      
      return testCompleted && resourceAge > this.config.maxResourceAge;
    });

    const criticalLeaks = leaks.filter(leak => {
      const age = now - leak.allocatedAt;
      return age > this.config.maxResourceAge * 2;
    });

    const memoryLeaks = leaks.filter(leak => 
      leak.type === 'memory_allocation' || leak.type === 'subscription'
    );

    const leaksByType = leaks.reduce((acc, leak) => {
      acc[leak.type] = (acc[leak.type] || 0) + 1;
      return acc;
    }, {} as { [key in ResourceType]: number });

    const leaksBySuite = leaks.reduce((acc, leak) => {
      acc[leak.suiteName] = (acc[leak.suiteName] || 0) + 1;
      return acc;
    }, {} as { [suiteName: string]: number });

    const recommendations = this.generateRecommendations(leaks);

    return {
      summary: {
        totalLeaks: leaks.length,
        criticalLeaks: criticalLeaks.length,
        memoryLeaks: memoryLeaks.length,
        activeResources: activeResources.length
      },
      leaksByType,
      leaksBySuite,
      recommendations
    };
  }

  /**
   * Reset all monitoring data
   */
  reset(): void {
    this.forceCleanupAll();
    this.completedTests.clear();
    this.testSuiteStats.clear();
    this.resourceCounter = 0;
    this.totalResourcesTracked = 0;
    this.leaksDetected = 0;
    this.automaticCleanups = 0;
    this.memorySnapshots = [];
    this.updateStatistics();
  }

  /**
   * Start monitoring background processes
   */
  private startMonitoring(): void {
    if (!this.config.enableResourceTracking) return;

    // Monitor for resource leaks
    interval(this.config.monitoringInterval)
      .pipe(takeUntil(this.monitoringSubject))
      .subscribe(() => {
        this.performLeakDetection();
        this.updateMemoryMonitoring();
        this.updateStatistics();
      });

    // Monitor DOM mutations if enabled
    if (this.config.enableDOMLeakDetection && typeof window !== 'undefined') {
      this.setupDOMLeakDetection();
    }
  }

  /**
   * Perform leak detection for all resources
   */
  private performLeakDetection(): void {
    const now = Date.now();
    const leaks: ResourceLeak[] = [];

    this.activeResources.forEach((resource) => {
      const testKey = `${resource.suiteName}::${resource.testName}`;
      const testCompleted = this.completedTests.has(testKey);
      
      if (testCompleted) {
        const leakDuration = now - resource.allocatedAt - this.config.cleanupGracePeriod;
        
        if (leakDuration > 0) {
          const leak = this.createResourceLeak(resource, leakDuration);
          leaks.push(leak);
          
          // Update suite stats
          const suiteStats = this.testSuiteStats.get(resource.suiteName);
          if (suiteStats) {
            suiteStats.leaksDetected++;
          }
        }
      }
    });

    // Report all detected leaks
    leaks.forEach(leak => {
      this.leaksDetected++;
      this.leakDetectionSubject.next(leak);
      
      // Automatic cleanup if enabled
      if (this.config.enableAutomaticCleanup && leak.severity === 'critical') {
        this.releaseResource(leak.resource.id);
        this.automaticCleanups++;
      }
    });
  }

  /**
   * Detect leaks for a specific completed test
   */
  private detectLeaksForTest(testName: string, suiteName: string): void {
    const testKey = `${suiteName}::${testName}`;
    const now = Date.now();
    
    this.activeResources.forEach((resource) => {
      if (resource.testName === testName && resource.suiteName === suiteName) {
        const leakDuration = now - resource.allocatedAt;
        const leak = this.createResourceLeak(resource, leakDuration);
        
        this.leaksDetected++;
        this.leakDetectionSubject.next(leak);
        
        if (this.config.enableAutomaticCleanup) {
          this.releaseResource(resource.id);
          this.automaticCleanups++;
        }
      }
    });
  }

  /**
   * Create resource leak object
   */
  private createResourceLeak(resource: ResourceAllocation, leakDuration: number): ResourceLeak {
    let severity: 'low' | 'medium' | 'high' | 'critical';
    let impact: string;
    let recommendedAction: string;

    // Determine severity based on resource type and duration
    if (leakDuration > this.config.maxResourceAge * 3) {
      severity = 'critical';
    } else if (leakDuration > this.config.maxResourceAge * 2) {
      severity = 'high';
    } else if (leakDuration > this.config.maxResourceAge) {
      severity = 'medium';
    } else {
      severity = 'low';
    }

    // Determine impact and recommendations based on resource type
    switch (resource.type) {
      case 'subscription':
        impact = 'Memory leak and potential hanging async operations';
        recommendedAction = 'Add takeUntil(destroy$) pattern to subscription cleanup';
        break;
      case 'timer':
        impact = 'Background timer continues running, consuming CPU';
        recommendedAction = 'Clear timer in test cleanup or component ngOnDestroy';
        break;
      case 'http_request':
        impact = 'Pending HTTP request may cause unexpected test interactions';
        recommendedAction = 'Use HttpMockManager to properly clean up HTTP expectations';
        break;
      case 'dom_element':
        impact = 'DOM elements not cleaned up, potential memory leak';
        recommendedAction = 'Remove DOM elements in test cleanup';
        break;
      case 'event_listener':
        impact = 'Event listener continues to consume memory and may trigger unexpectedly';
        recommendedAction = 'Remove event listeners in component ngOnDestroy or test cleanup';
        break;
      default:
        impact = 'Resource not properly cleaned up';
        recommendedAction = 'Implement proper cleanup in test teardown';
    }

    return {
      resource,
      leakDuration,
      severity,
      impact,
      recommendedAction
    };
  }

  /**
   * Update memory monitoring
   */
  private updateMemoryMonitoring(): void {
    if (!this.config.enableMemoryMonitoring || typeof window === 'undefined') return;

    const memory = (window as any).performance?.memory;
    if (memory) {
      const usedMB = memory.usedJSHeapSize / (1024 * 1024);
      this.memorySnapshots.push(usedMB);
      
      // Keep only recent snapshots
      if (this.memorySnapshots.length > 50) {
        this.memorySnapshots = this.memorySnapshots.slice(-50);
      }
      
      // Check for memory leaks
      if (usedMB > this.config.memoryLeakThreshold) {
        const leak: ResourceLeak = {
          resource: {
            id: 'memory-leak',
            type: 'memory_allocation',
            testName: 'global',
            suiteName: 'memory-monitoring',
            allocatedAt: Date.now(),
            description: `High memory usage detected: ${usedMB.toFixed(2)}MB`
          },
          leakDuration: 0,
          severity: usedMB > this.config.memoryLeakThreshold * 2 ? 'critical' : 'high',
          impact: 'High memory usage may cause browser instability',
          recommendedAction: 'Review recent tests for memory leaks and implement proper cleanup'
        };
        
        this.leakDetectionSubject.next(leak);
      }
    }
  }

  /**
   * Setup DOM leak detection
   */
  private setupDOMLeakDetection(): void {
    if (typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Register DOM element for tracking
              this.registerResource(
                'dom_element',
                'dom-mutation',
                'dom-monitoring',
                `Element created: ${element.tagName}`,
                () => {
                  if (element.parentNode) {
                    element.parentNode.removeChild(element);
                  }
                }
              );
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Update statistics
   */
  private updateStatistics(): void {
    const resourceBreakdown = {} as { [key in ResourceType]: number };
    
    // Initialize all resource types
    (['subscription', 'http_request', 'timer', 'event_listener', 
      'dom_element', 'memory_allocation', 'file_handle', 'web_worker'] as ResourceType[])
      .forEach(type => resourceBreakdown[type] = 0);
    
    // Count active resources by type
    this.activeResources.forEach(resource => {
      resourceBreakdown[resource.type]++;
    });

    // Calculate memory stats
    const memoryUsage = {
      current: this.memorySnapshots.length > 0 ? 
        this.memorySnapshots[this.memorySnapshots.length - 1] : 0,
      peak: Math.max(...this.memorySnapshots, 0),
      average: this.memorySnapshots.length > 0 ? 
        this.memorySnapshots.reduce((a, b) => a + b, 0) / this.memorySnapshots.length : 0
    };

    // Calculate test suite statistics
    const testSuiteStats: { [suiteName: string]: { resourcesAllocated: number; leaksDetected: number; cleanupRate: number } } = {};
    this.testSuiteStats.forEach((stats, suiteName) => {
      const cleanupRate = stats.resourcesAllocated > 0 ? 
        ((stats.resourcesAllocated - stats.leaksDetected) / stats.resourcesAllocated) * 100 : 100;
      
      testSuiteStats[suiteName] = {
        resourcesAllocated: stats.resourcesAllocated,
        leaksDetected: stats.leaksDetected,
        cleanupRate
      };
    });

    const statistics: CleanupStatistics = {
      totalResourcesTracked: this.totalResourcesTracked,
      activeResources: this.activeResources.size,
      leaksDetected: this.leaksDetected,
      automaticCleanups: this.automaticCleanups,
      memoryUsage,
      resourceBreakdown,
      testSuiteStats
    };

    this.statisticsSubject.next(statistics);
  }

  /**
   * Generate recommendations based on detected leaks
   */
  private generateRecommendations(leaks: ResourceAllocation[]): string[] {
    const recommendations: string[] = [];
    
    const subscriptionLeaks = leaks.filter(l => l.type === 'subscription').length;
    if (subscriptionLeaks > 0) {
      recommendations.push(`${subscriptionLeaks} subscription leaks detected. Implement takeUntil(destroy$) pattern.`);
    }

    const timerLeaks = leaks.filter(l => l.type === 'timer').length;
    if (timerLeaks > 0) {
      recommendations.push(`${timerLeaks} timer leaks detected. Clear timers in component ngOnDestroy.`);
    }

    const httpLeaks = leaks.filter(l => l.type === 'http_request').length;
    if (httpLeaks > 0) {
      recommendations.push(`${httpLeaks} HTTP request leaks detected. Use HttpMockManager for proper cleanup.`);
    }

    if (leaks.length > 10) {
      recommendations.push('High number of resource leaks detected. Consider implementing TestCleanupMonitor integration.');
    }

    return recommendations;
  }

  /**
   * Utility methods
   */
  private generateResourceId(): string {
    return `resource-${++this.resourceCounter}-${Date.now()}`;
  }

  private captureStackTrace(): string {
    const error = new Error();
    return error.stack || 'Stack trace not available';
  }

  /**
   * Stop monitoring (cleanup)
   */
  destroy(): void {
    this.monitoringSubject.next();
    this.monitoringSubject.complete();
    this.forceCleanupAll();
  }
}

/**
 * Global cleanup monitor instance
 */
let globalCleanupMonitor: TestCleanupMonitor | null = null;

/**
 * Get or create global cleanup monitor
 */
export function getTestCleanupMonitor(config?: CleanupMonitorConfig): TestCleanupMonitor {
  if (!globalCleanupMonitor) {
    globalCleanupMonitor = new TestCleanupMonitor(config);
  }
  return globalCleanupMonitor;
}

/**
 * Reset global cleanup monitor
 */
export function resetTestCleanupMonitor(): void {
  if (globalCleanupMonitor) {
    globalCleanupMonitor.destroy();
  }
  globalCleanupMonitor = null;
}

/**
 * Utility functions for resource tracking
 */
export const CleanupTracking = {
  /**
   * Track subscription with automatic cleanup registration
   */
  trackSubscription<T>(
    observable: Observable<T>,
    testName: string,
    suiteName: string,
    description?: string
  ): Observable<T> {
    const monitor = getTestCleanupMonitor();
    
    return new Observable<T>(subscriber => {
      const resourceId = monitor.registerResource(
        'subscription',
        testName,
        suiteName,
        description || 'Observable subscription',
        () => subscription.unsubscribe()
      );

      const subscription = observable.subscribe({
        next: (value) => subscriber.next(value),
        error: (error) => {
          monitor.releaseResource(resourceId);
          subscriber.error(error);
        },
        complete: () => {
          monitor.releaseResource(resourceId);
          subscriber.complete();
        }
      });

      return () => {
        monitor.releaseResource(resourceId);
        subscription.unsubscribe();
      };
    });
  },

  /**
   * Track timer with automatic cleanup registration
   */
  trackTimer(
    callback: () => void,
    delay: number,
    testName: string,
    suiteName: string,
    description?: string
  ): number {
    const monitor = getTestCleanupMonitor();
    
    const timerId = setTimeout(() => {
      callback();
      monitor.releaseResource(resourceId);
    }, delay);

    const resourceId = monitor.registerResource(
      'timer',
      testName,
      suiteName,
      description || `Timer (${delay}ms)`,
      () => clearTimeout(timerId)
    );

    return timerId;
  },

  /**
   * Track DOM element with automatic cleanup registration
   */
  trackDOMElement(
    element: HTMLElement,
    testName: string,
    suiteName: string,
    description?: string
  ): string {
    const monitor = getTestCleanupMonitor();
    
    return monitor.registerResource(
      'dom_element',
      testName,
      suiteName,
      description || `DOM element: ${element.tagName}`,
      () => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
    );
  }
};

/**
 * Jasmine reporter for automatic cleanup monitoring
 */
export class JasmineCleanupReporter implements jasmine.CustomReporter {
  private monitor = getTestCleanupMonitor();

  jasmineStarted(suiteInfo: jasmine.SuiteInfo): void {
    console.log('Test Cleanup Monitoring started');
    
    // Subscribe to leak alerts
    this.monitor.getLeakAlertsStream().subscribe(leak => {
      console.warn('Resource leak detected:', {
        test: `${leak.resource.suiteName} > ${leak.resource.testName}`,
        type: leak.resource.type,
        severity: leak.severity,
        duration: `${(leak.leakDuration / 1000).toFixed(1)}s`,
        recommendation: leak.recommendedAction
      });
    });
  }

  specDone(result: jasmine.CustomReporterResult): void {
    const testName = result.description;
    const suiteName = result.fullName.split(' ')[0];
    
    this.monitor.markTestCompleted(testName, suiteName);
  }

  jasmineDone(runDetails: jasmine.RunDetails): void {
    const leakReport = this.monitor.generateLeakReport();
    const stats = this.monitor.getCurrentStatistics();
    
    console.log('=== Test Cleanup Report ===');
    console.log(`Total leaks detected: ${leakReport.summary.totalLeaks}`);
    console.log(`Critical leaks: ${leakReport.summary.criticalLeaks}`);
    console.log(`Active resources: ${leakReport.summary.activeResources}`);
    
    if (stats) {
      console.log(`Memory usage: ${stats.memoryUsage.current.toFixed(2)}MB (peak: ${stats.memoryUsage.peak.toFixed(2)}MB)`);
    }
    
    if (leakReport.recommendations.length > 0) {
      console.log('Recommendations:');
      leakReport.recommendations.forEach(rec => console.log(`- ${rec}`));
    }
  }
}