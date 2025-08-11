/**
 * Test Performance Monitoring System - Phase 4 QA Implementation
 * 
 * Provides comprehensive test execution monitoring, performance analysis,
 * and bottleneck detection to ensure test suite efficiency and reliability.
 */

import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { filter, map, scan, tap } from 'rxjs/operators';

/**
 * Individual test execution metrics
 */
export interface TestExecutionMetrics {
  testName: string;
  suiteName: string;
  duration: number;
  status: 'passed' | 'failed' | 'skipped' | 'timeout';
  timestamp: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  errorMessage?: string;
  retryCount?: number;
  slowOperations?: Array<{
    operation: string;
    duration: number;
    context: string;
  }>;
}

/**
 * Test suite performance summary
 */
export interface TestSuiteMetrics {
  suiteName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalDuration: number;
  averageDuration: number;
  slowestTest: string;
  fastestTest: string;
  flakiness: number; // Percentage of tests that have failed intermittently
  memoryLeaks: number;
  timeoutCount: number;
  retryCount: number;
}

/**
 * Global test performance statistics
 */
export interface GlobalTestMetrics {
  totalSuites: number;
  totalTests: number;
  totalDuration: number;
  successRate: number;
  averageTestDuration: number;
  slowestSuites: Array<{ name: string; duration: number }>;
  mostFlakySuites: Array<{ name: string; flakinessRate: number }>;
  performanceBottlenecks: Array<{
    type: 'memory' | 'timeout' | 'slow_operation' | 'resource_leak';
    description: string;
    affectedTests: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  timestamp: number;
}

/**
 * Configuration for performance monitoring
 */
export interface PerformanceMonitorConfig {
  slowTestThreshold: number; // milliseconds
  timeoutThreshold: number;
  memoryLeakThreshold: number; // MB
  flakinessThreshold: number; // percentage
  retentionPeriod: number; // days
  enableDetailedProfiling: boolean;
  enableMemoryMonitoring: boolean;
  enableBottleneckDetection: boolean;
}

/**
 * Default monitoring configuration
 */
export const DEFAULT_MONITOR_CONFIG: PerformanceMonitorConfig = {
  slowTestThreshold: 2000, // 2 seconds
  timeoutThreshold: 30000, // 30 seconds  
  memoryLeakThreshold: 50, // 50MB
  flakinessThreshold: 5, // 5%
  retentionPeriod: 30, // 30 days
  enableDetailedProfiling: true,
  enableMemoryMonitoring: true,
  enableBottleneckDetection: true
};

/**
 * Test performance monitoring service
 */
export class TestPerformanceMonitor {
  private metricsSubject = new Subject<TestExecutionMetrics>();
  private suiteMetricsSubject = new BehaviorSubject<Map<string, TestSuiteMetrics>>(new Map());
  private globalMetricsSubject = new BehaviorSubject<GlobalTestMetrics | null>(null);
  
  private testHistory: TestExecutionMetrics[] = [];
  private suiteMetrics = new Map<string, TestSuiteMetrics>();
  private startTime = Date.now();
  
  constructor(private config: PerformanceMonitorConfig = DEFAULT_MONITOR_CONFIG) {
    this.setupMetricsProcessing();
    this.startMemoryMonitoring();
  }

  /**
   * Record test execution metrics
   */
  recordTestExecution(metrics: TestExecutionMetrics): void {
    // Add memory usage if monitoring enabled
    if (this.config.enableMemoryMonitoring && (window as any).performance?.memory) {
      metrics.memoryUsage = {
        usedJSHeapSize: (window as any).performance.memory.usedJSHeapSize,
        totalJSHeapSize: (window as any).performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: (window as any).performance.memory.jsHeapSizeLimit
      };
    }

    this.testHistory.push(metrics);
    this.metricsSubject.next(metrics);
    
    // Update suite metrics
    this.updateSuiteMetrics(metrics);
    
    // Clean up old metrics based on retention period
    this.cleanupOldMetrics();
    
    // Update global metrics
    this.updateGlobalMetrics();
  }

  /**
   * Start test execution timer
   */
  startTest(testName: string, suiteName: string): TestTimer {
    return new TestTimer(testName, suiteName, this);
  }

  /**
   * Get real-time metrics stream
   */
  getMetricsStream(): Observable<TestExecutionMetrics> {
    return this.metricsSubject.asObservable();
  }

  /**
   * Get suite metrics stream
   */
  getSuiteMetricsStream(): Observable<Map<string, TestSuiteMetrics>> {
    return this.suiteMetricsSubject.asObservable();
  }

  /**
   * Get global metrics stream
   */
  getGlobalMetricsStream(): Observable<GlobalTestMetrics | null> {
    return this.globalMetricsSubject.asObservable();
  }

  /**
   * Get current performance summary
   */
  getPerformanceSummary(): GlobalTestMetrics | null {
    return this.globalMetricsSubject.value;
  }

  /**
   * Get slow test alerts
   */
  getSlowTestAlerts(): Observable<TestExecutionMetrics[]> {
    return this.metricsSubject.pipe(
      scan((acc: TestExecutionMetrics[], current) => {
        if (current.duration > this.config.slowTestThreshold) {
          return [...acc.slice(-9), current]; // Keep last 10 slow tests
        }
        return acc;
      }, []),
      filter(alerts => alerts.length > 0)
    );
  }

  /**
   * Get timeout alerts
   */
  getTimeoutAlerts(): Observable<TestExecutionMetrics[]> {
    return this.metricsSubject.pipe(
      filter(metrics => metrics.status === 'timeout'),
      scan((acc: TestExecutionMetrics[], current) => [...acc.slice(-4), current], [])
    );
  }

  /**
   * Get memory leak alerts
   */
  getMemoryLeakAlerts(): Observable<Array<{ testName: string; leakSize: number }>> {
    return this.metricsSubject.pipe(
      filter(metrics => metrics.memoryUsage !== undefined),
      scan((acc: TestExecutionMetrics[], current) => [...acc.slice(-9), current], []),
      map(recentTests => {
        const leaks: Array<{ testName: string; leakSize: number }> = [];
        
        for (let i = 1; i < recentTests.length; i++) {
          const prev = recentTests[i - 1];
          const curr = recentTests[i];
          
          if (prev.memoryUsage && curr.memoryUsage) {
            const leakSize = (curr.memoryUsage.usedJSHeapSize - prev.memoryUsage.usedJSHeapSize) / (1024 * 1024);
            
            if (leakSize > this.config.memoryLeakThreshold) {
              leaks.push({
                testName: curr.testName,
                leakSize
              });
            }
          }
        }
        
        return leaks;
      }),
      filter(leaks => leaks.length > 0)
    );
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: GlobalTestMetrics | null;
    recommendations: string[];
    criticalIssues: string[];
    trends: Array<{ metric: string; trend: 'improving' | 'degrading' | 'stable' }>;
  } {
    const summary = this.getPerformanceSummary();
    const recommendations: string[] = [];
    const criticalIssues: string[] = [];
    const trends: Array<{ metric: string; trend: 'improving' | 'degrading' | 'stable' }> = [];

    if (!summary) {
      return { summary: null, recommendations: [], criticalIssues: [], trends: [] };
    }

    // Analyze success rate
    if (summary.successRate < 0.95) {
      criticalIssues.push(`Low test success rate: ${(summary.successRate * 100).toFixed(1)}%. Target: >95%`);
    } else if (summary.successRate < 0.98) {
      recommendations.push(`Test success rate could be improved: ${(summary.successRate * 100).toFixed(1)}%. Target: >98%`);
    }

    // Analyze performance
    if (summary.averageTestDuration > this.config.slowTestThreshold / 2) {
      recommendations.push(`Average test duration is high: ${summary.averageTestDuration}ms. Consider optimizing slow tests.`);
    }

    // Analyze flakiness
    const flakyTests = summary.mostFlakySuites.filter(s => s.flakinessRate > this.config.flakinessThreshold);
    if (flakyTests.length > 0) {
      criticalIssues.push(`${flakyTests.length} test suites have high flakiness rates. Address test stability issues.`);
    }

    // Analyze bottlenecks
    const criticalBottlenecks = summary.performanceBottlenecks.filter(b => b.severity === 'critical');
    if (criticalBottlenecks.length > 0) {
      criticalIssues.push(`${criticalBottlenecks.length} critical performance bottlenecks detected.`);
    }

    // Add trend analysis (would need historical data for real implementation)
    trends.push({ metric: 'successRate', trend: 'stable' });
    trends.push({ metric: 'averageDuration', trend: 'stable' });

    return {
      summary,
      recommendations,
      criticalIssues,
      trends
    };
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): {
    testHistory: TestExecutionMetrics[];
    suiteMetrics: TestSuiteMetrics[];
    globalMetrics: GlobalTestMetrics | null;
    config: PerformanceMonitorConfig;
    exportTimestamp: number;
  } {
    return {
      testHistory: [...this.testHistory],
      suiteMetrics: Array.from(this.suiteMetrics.values()),
      globalMetrics: this.globalMetricsSubject.value,
      config: this.config,
      exportTimestamp: Date.now()
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.testHistory = [];
    this.suiteMetrics.clear();
    this.suiteMetricsSubject.next(new Map());
    this.globalMetricsSubject.next(null);
    this.startTime = Date.now();
  }

  /**
   * Private method to setup metrics processing pipeline
   */
  private setupMetricsProcessing(): void {
    // Process metrics in real-time
    this.metricsSubject.pipe(
      tap(metrics => {
        if (this.config.enableBottleneckDetection) {
          this.detectBottlenecks(metrics);
        }
      })
    ).subscribe();
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (!this.config.enableMemoryMonitoring || !(window as any).performance?.memory) {
      return;
    }

    setInterval(() => {
      const memory = (window as any).performance.memory;
      const usedMB = memory.usedJSHeapSize / (1024 * 1024);
      
      // Log significant memory usage
      if (usedMB > this.config.memoryLeakThreshold * 2) {
        console.warn(`High memory usage detected: ${usedMB.toFixed(2)}MB`);
      }
    }, 5000);
  }

  /**
   * Update suite-level metrics
   */
  private updateSuiteMetrics(testMetrics: TestExecutionMetrics): void {
    const suiteName = testMetrics.suiteName;
    const existing = this.suiteMetrics.get(suiteName) || {
      suiteName,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0,
      averageDuration: 0,
      slowestTest: '',
      fastestTest: '',
      flakiness: 0,
      memoryLeaks: 0,
      timeoutCount: 0,
      retryCount: 0
    };

    // Update counts
    existing.totalTests++;
    switch (testMetrics.status) {
      case 'passed':
        existing.passedTests++;
        break;
      case 'failed':
        existing.failedTests++;
        break;
      case 'skipped':
        existing.skippedTests++;
        break;
      case 'timeout':
        existing.failedTests++;
        existing.timeoutCount++;
        break;
    }

    // Update durations
    existing.totalDuration += testMetrics.duration;
    existing.averageDuration = existing.totalDuration / existing.totalTests;

    // Track slowest and fastest
    if (!existing.slowestTest || testMetrics.duration > this.getTestDuration(existing.slowestTest)) {
      existing.slowestTest = testMetrics.testName;
    }
    if (!existing.fastestTest || testMetrics.duration < this.getTestDuration(existing.fastestTest)) {
      existing.fastestTest = testMetrics.testName;
    }

    // Update retry count
    if (testMetrics.retryCount) {
      existing.retryCount += testMetrics.retryCount;
    }

    // Calculate flakiness (simplified - would need historical failure data)
    existing.flakiness = (existing.failedTests / existing.totalTests) * 100;

    this.suiteMetrics.set(suiteName, existing);
    this.suiteMetricsSubject.next(new Map(this.suiteMetrics));
  }

  /**
   * Update global metrics
   */
  private updateGlobalMetrics(): void {
    const totalTests = this.testHistory.length;
    if (totalTests === 0) return;

    const passedTests = this.testHistory.filter(t => t.status === 'passed').length;
    const totalDuration = this.testHistory.reduce((sum, t) => sum + t.duration, 0);

    const globalMetrics: GlobalTestMetrics = {
      totalSuites: this.suiteMetrics.size,
      totalTests,
      totalDuration,
      successRate: passedTests / totalTests,
      averageTestDuration: totalDuration / totalTests,
      slowestSuites: this.getSlowSuites(),
      mostFlakySuites: this.getFlakySuites(),
      performanceBottlenecks: this.getPerformanceBottlenecks(),
      timestamp: Date.now()
    };

    this.globalMetricsSubject.next(globalMetrics);
  }

  /**
   * Get slowest test suites
   */
  private getSlowSuites(): Array<{ name: string; duration: number }> {
    return Array.from(this.suiteMetrics.values())
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 5)
      .map(suite => ({ name: suite.suiteName, duration: suite.averageDuration }));
  }

  /**
   * Get flakiest test suites
   */
  private getFlakySuites(): Array<{ name: string; flakinessRate: number }> {
    return Array.from(this.suiteMetrics.values())
      .filter(suite => suite.flakiness > 0)
      .sort((a, b) => b.flakiness - a.flakiness)
      .slice(0, 5)
      .map(suite => ({ name: suite.suiteName, flakinessRate: suite.flakiness }));
  }

  /**
   * Get performance bottlenecks
   */
  private getPerformanceBottlenecks(): Array<{
    type: 'memory' | 'timeout' | 'slow_operation' | 'resource_leak';
    description: string;
    affectedTests: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const bottlenecks: any[] = [];

    // Timeout bottlenecks
    const timeoutTests = this.testHistory.filter(t => t.status === 'timeout');
    if (timeoutTests.length > 0) {
      bottlenecks.push({
        type: 'timeout',
        description: `${timeoutTests.length} tests are timing out`,
        affectedTests: timeoutTests.map(t => t.testName),
        severity: timeoutTests.length > 5 ? 'critical' : 'high'
      });
    }

    // Slow operation bottlenecks
    const slowTests = this.testHistory.filter(t => t.duration > this.config.slowTestThreshold);
    if (slowTests.length > 10) {
      bottlenecks.push({
        type: 'slow_operation',
        description: `${slowTests.length} tests exceed slow test threshold`,
        affectedTests: slowTests.map(t => t.testName),
        severity: slowTests.length > 50 ? 'critical' : 'high'
      });
    }

    return bottlenecks;
  }

  /**
   * Detect bottlenecks in real-time
   */
  private detectBottlenecks(metrics: TestExecutionMetrics): void {
    // Real-time bottleneck detection logic
    if (metrics.duration > this.config.slowTestThreshold) {
      console.warn(`Slow test detected: ${metrics.testName} (${metrics.duration}ms)`);
    }

    if (metrics.status === 'timeout') {
      console.error(`Test timeout: ${metrics.testName}`);
    }
  }

  /**
   * Get test duration by name (helper method)
   */
  private getTestDuration(testName: string): number {
    const test = this.testHistory.find(t => t.testName === testName);
    return test ? test.duration : 0;
  }

  /**
   * Clean up old metrics based on retention period
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);
    this.testHistory = this.testHistory.filter(m => m.timestamp > cutoffTime);
  }
}

/**
 * Test timer utility class
 */
export class TestTimer {
  private startTime: number = Date.now();
  private slowOperations: Array<{ operation: string; duration: number; context: string }> = [];

  constructor(
    private testName: string,
    private suiteName: string,
    private monitor: TestPerformanceMonitor
  ) {}

  /**
   * Record a slow operation within the test
   */
  recordSlowOperation(operation: string, duration: number, context: string = ''): void {
    this.slowOperations.push({ operation, duration, context });
  }

  /**
   * Complete the test and record metrics
   */
  complete(
    status: 'passed' | 'failed' | 'skipped' | 'timeout',
    errorMessage?: string,
    retryCount?: number
  ): void {
    const duration = Date.now() - this.startTime;

    const metrics: TestExecutionMetrics = {
      testName: this.testName,
      suiteName: this.suiteName,
      duration,
      status,
      timestamp: this.startTime,
      errorMessage,
      retryCount,
      slowOperations: this.slowOperations.length > 0 ? this.slowOperations : undefined
    };

    this.monitor.recordTestExecution(metrics);
  }
}

/**
 * Global performance monitor instance
 */
let globalPerformanceMonitor: TestPerformanceMonitor | null = null;

/**
 * Get or create global performance monitor
 */
export function getTestPerformanceMonitor(config?: PerformanceMonitorConfig): TestPerformanceMonitor {
  if (!globalPerformanceMonitor) {
    globalPerformanceMonitor = new TestPerformanceMonitor(config);
  }
  return globalPerformanceMonitor;
}

/**
 * Reset global performance monitor
 */
export function resetTestPerformanceMonitor(): void {
  if (globalPerformanceMonitor) {
    globalPerformanceMonitor.reset();
  }
  globalPerformanceMonitor = null;
}

/**
 * Jasmine reporter for automatic performance monitoring
 */
export class JasminePerformanceReporter implements jasmine.CustomReporter {
  private monitor = getTestPerformanceMonitor();
  private activeTimers = new Map<string, TestTimer>();

  jasmineStarted(suiteInfo: jasmine.SuiteInfo): void {
    console.log('Test Performance Monitoring started');
  }

  suiteStarted(result: jasmine.CustomReporterResult): void {
    // Suite started
  }

  specStarted(result: jasmine.CustomReporterResult): void {
    const testId = `${result.fullName}`;
    const timer = this.monitor.startTest(result.description, result.fullName.split(' ')[0]);
    this.activeTimers.set(testId, timer);
  }

  specDone(result: jasmine.CustomReporterResult): void {
    const testId = `${result.fullName}`;
    const timer = this.activeTimers.get(testId);
    
    if (timer) {
      const status = result.status as 'passed' | 'failed' | 'skipped';
      const errorMessage = result.failedExpectations.map(e => e.message).join('; ') || undefined;
      
      timer.complete(status, errorMessage);
      this.activeTimers.delete(testId);
    }
  }

  suiteDone(result: jasmine.CustomReporterResult): void {
    // Suite completed
  }

  jasmineDone(runDetails: jasmine.RunDetails): void {
    const report = this.monitor.generateReport();
    console.log('Test Performance Report:', report);
  }
}