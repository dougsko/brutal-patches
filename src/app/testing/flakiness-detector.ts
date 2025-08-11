/**
 * Test Flakiness Detection System - Phase 4 QA Implementation
 * 
 * Identifies unstable tests that pass/fail intermittently, tracks patterns,
 * and provides automated remediation suggestions.
 */

import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, map, scan } from 'rxjs/operators';

/**
 * Test execution result for flakiness analysis
 */
export interface TestExecutionResult {
  testName: string;
  suiteName: string;
  fullName: string;
  status: 'passed' | 'failed' | 'skipped' | 'timeout';
  duration: number;
  timestamp: number;
  failureReason?: string;
  errorType?: 'assertion' | 'timeout' | 'network' | 'memory' | 'dependency' | 'random' | 'race_condition';
  environmentContext?: {
    browser?: string;
    os?: string;
    nodeVersion?: string;
    timestamp?: number;
  };
}

/**
 * Flakiness analysis result for a specific test
 */
export interface TestFlakinessAnalysis {
  testName: string;
  suiteName: string;
  fullName: string;
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  skippedRuns: number;
  successRate: number;
  flakinessScore: number; // 0-100, higher = more flaky
  averageDuration: number;
  failurePatterns: Array<{
    errorType: string;
    frequency: number;
    examples: string[];
  }>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastFailure?: Date;
  consecutiveFailures: number;
  intermittentFailures: number;
  recommendations: string[];
}

/**
 * Flakiness detection configuration
 */
export interface FlakinessDetectorConfig {
  minRunsForAnalysis: number;
  flakinessThreshold: number; // Percentage below which test is considered flaky
  historyRetentionDays: number;
  patternDetectionWindow: number; // Number of recent runs to analyze for patterns
  alertThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  enablePredictiveAnalysis: boolean;
  enableAutoRemediation: boolean;
}

/**
 * Default flakiness detector configuration
 */
export const DEFAULT_FLAKINESS_CONFIG: FlakinessDetectorConfig = {
  minRunsForAnalysis: 5,
  flakinessThreshold: 90, // 90% success rate minimum
  historyRetentionDays: 30,
  patternDetectionWindow: 20,
  alertThresholds: {
    low: 80,
    medium: 70,
    high: 60,
    critical: 50
  },
  enablePredictiveAnalysis: true,
  enableAutoRemediation: false
};

/**
 * Alert for flaky test detection
 */
export interface FlakinessAlert {
  testName: string;
  suiteName: string;
  alertLevel: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  analysis: TestFlakinessAnalysis;
  timestamp: number;
  actionRequired: boolean;
  suggestedActions: string[];
}

/**
 * Main flakiness detection service
 */
export class FlakinessDetector {
  private executionHistory: TestExecutionResult[] = [];
  private testAnalyses = new Map<string, TestFlakinessAnalysis>();
  private alertsSubject = new Subject<FlakinessAlert>();
  private analysesSubject = new BehaviorSubject<Map<string, TestFlakinessAnalysis>>(new Map());
  
  constructor(private config: FlakinessDetectorConfig = DEFAULT_FLAKINESS_CONFIG) {
    this.startPeriodicAnalysis();
  }

  /**
   * Record a test execution result
   */
  recordTestExecution(result: TestExecutionResult): void {
    // Add environment context if not provided
    if (!result.environmentContext) {
      result.environmentContext = {
        browser: this.getBrowserInfo(),
        os: this.getOSInfo(),
        nodeVersion: this.getNodeVersion(),
        timestamp: Date.now()
      };
    }

    this.executionHistory.push(result);
    this.cleanupOldHistory();
    
    // Analyze this specific test
    this.analyzeTest(result.fullName);
    
    // Check for immediate alerts
    this.checkForAlerts(result.fullName);
  }

  /**
   * Get flakiness analysis for a specific test
   */
  getTestAnalysis(testFullName: string): TestFlakinessAnalysis | null {
    return this.testAnalyses.get(testFullName) || null;
  }

  /**
   * Get all flaky tests
   */
  getFlakyTests(minFlakinessScore: number = 10): TestFlakinessAnalysis[] {
    return Array.from(this.testAnalyses.values())
      .filter(analysis => analysis.flakinessScore >= minFlakinessScore)
      .sort((a, b) => b.flakinessScore - a.flakinessScore);
  }

  /**
   * Get most critical flaky tests
   */
  getCriticalFlakyTests(): TestFlakinessAnalysis[] {
    return this.getFlakyTests().filter(analysis => analysis.riskLevel === 'critical');
  }

  /**
   * Get flakiness alerts stream
   */
  getAlertsStream(): Observable<FlakinessAlert> {
    return this.alertsSubject.asObservable();
  }

  /**
   * Get analyses stream
   */
  getAnalysesStream(): Observable<Map<string, TestFlakinessAnalysis>> {
    return this.analysesSubject.asObservable();
  }

  /**
   * Generate flakiness report
   */
  generateFlakinessReport(): {
    summary: {
      totalTests: number;
      flakyTests: number;
      criticalTests: number;
      overallStability: number;
      riskDistribution: { [key: string]: number };
    };
    topFlakiestTests: TestFlakinessAnalysis[];
    emergingIssues: TestFlakinessAnalysis[];
    recommendations: string[];
    trends: Array<{ metric: string; trend: 'improving' | 'degrading' | 'stable' }>;
  } {
    const allAnalyses = Array.from(this.testAnalyses.values());
    const flakyTests = allAnalyses.filter(a => a.flakinessScore > 10);
    const criticalTests = allAnalyses.filter(a => a.riskLevel === 'critical');
    
    const riskDistribution = {
      low: allAnalyses.filter(a => a.riskLevel === 'low').length,
      medium: allAnalyses.filter(a => a.riskLevel === 'medium').length,
      high: allAnalyses.filter(a => a.riskLevel === 'high').length,
      critical: criticalTests.length
    };

    const overallStability = allAnalyses.length > 0 
      ? allAnalyses.reduce((sum, a) => sum + a.successRate, 0) / allAnalyses.length 
      : 100;

    const emergingIssues = allAnalyses
      .filter(a => a.consecutiveFailures > 2 || (a.intermittentFailures > 3 && a.lastFailure && (Date.now() - a.lastFailure.getTime()) < 24 * 60 * 60 * 1000))
      .sort((a, b) => b.flakinessScore - a.flakinessScore);

    const recommendations = this.generateRecommendations(flakyTests);

    return {
      summary: {
        totalTests: allAnalyses.length,
        flakyTests: flakyTests.length,
        criticalTests: criticalTests.length,
        overallStability,
        riskDistribution
      },
      topFlakiestTests: flakyTests.slice(0, 10),
      emergingIssues,
      recommendations,
      trends: this.analyzeTrends()
    };
  }

  /**
   * Predict if a test is likely to fail on next run
   */
  predictTestFailure(testFullName: string): {
    failureProbability: number;
    confidence: number;
    factors: string[];
  } {
    const analysis = this.getTestAnalysis(testFullName);
    if (!analysis || !this.config.enablePredictiveAnalysis) {
      return { failureProbability: 0, confidence: 0, factors: [] };
    }

    const recentRuns = this.getRecentTestRuns(testFullName, 10);
    const factors: string[] = [];
    let failureProbability = 0;
    let confidence = Math.min(recentRuns.length / 10, 1); // Confidence based on data availability

    // Factor 1: Recent failure trend
    const recentFailures = recentRuns.filter(r => r.status === 'failed').length;
    if (recentFailures > 0) {
      failureProbability += (recentFailures / recentRuns.length) * 40;
      factors.push(`Recent failure rate: ${recentFailures}/${recentRuns.length}`);
    }

    // Factor 2: Consecutive failures
    if (analysis.consecutiveFailures > 0) {
      failureProbability += Math.min(analysis.consecutiveFailures * 15, 30);
      factors.push(`${analysis.consecutiveFailures} consecutive failures`);
    }

    // Factor 3: Duration variance (instability indicator)
    if (recentRuns.length > 1) {
      const durations = recentRuns.map(r => r.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev > avgDuration * 0.5) { // High duration variance
        failureProbability += 10;
        factors.push('High execution time variance');
      }
    }

    // Factor 4: Pattern-based prediction
    const dominantErrorType = analysis.failurePatterns[0];
    if (dominantErrorType) {
      switch (dominantErrorType.errorType) {
        case 'race_condition':
        case 'random':
          failureProbability += 20;
          factors.push(`Prone to ${dominantErrorType.errorType} failures`);
          break;
        case 'timeout':
        case 'network':
          failureProbability += 15;
          factors.push(`Environment-dependent failures (${dominantErrorType.errorType})`);
          break;
      }
    }

    return {
      failureProbability: Math.min(failureProbability, 100),
      confidence,
      factors
    };
  }

  /**
   * Generate auto-remediation suggestions
   */
  generateRemediationSuggestions(testFullName: string): Array<{
    type: 'code_change' | 'configuration' | 'infrastructure' | 'testing_strategy';
    priority: 'low' | 'medium' | 'high';
    description: string;
    implementation: string;
    estimatedImpact: number; // Percentage improvement expected
  }> {
    const analysis = this.getTestAnalysis(testFullName);
    if (!analysis) return [];

    const suggestions: any[] = [];

    // Analyze failure patterns for specific suggestions
    analysis.failurePatterns.forEach(pattern => {
      switch (pattern.errorType) {
        case 'timeout':
          suggestions.push({
            type: 'code_change',
            priority: 'high',
            description: 'Add proper timeout handling and increase test timeout limits',
            implementation: 'Use fakeAsync() or async/await patterns with appropriate timeout values',
            estimatedImpact: 70
          });
          break;

        case 'race_condition':
          suggestions.push({
            type: 'code_change',
            priority: 'high',
            description: 'Implement proper async coordination with explicit wait conditions',
            implementation: 'Use flush(), tick(), and fixture.whenStable() to control timing',
            estimatedImpact: 80
          });
          break;

        case 'network':
          suggestions.push({
            type: 'testing_strategy',
            priority: 'medium',
            description: 'Improve HTTP mock reliability and error handling',
            implementation: 'Use HttpTestingController with comprehensive mock cleanup',
            estimatedImpact: 60
          });
          break;

        case 'memory':
          suggestions.push({
            type: 'code_change',
            priority: 'high',
            description: 'Implement proper subscription cleanup and memory management',
            implementation: 'Use takeUntil pattern and proper component lifecycle management',
            estimatedImpact: 90
          });
          break;

        case 'dependency':
          suggestions.push({
            type: 'configuration',
            priority: 'medium',
            description: 'Improve test isolation and mock dependencies properly',
            implementation: 'Use TestBed.configureTestingModule with proper provider overrides',
            estimatedImpact: 65
          });
          break;
      }
    });

    // General suggestions based on flakiness score
    if (analysis.flakinessScore > 50) {
      suggestions.push({
        type: 'testing_strategy',
        priority: 'high',
        description: 'Consider splitting large test into smaller, focused tests',
        implementation: 'Break down complex test scenarios into atomic test cases',
        estimatedImpact: 40
      });
    }

    if (analysis.averageDuration > 5000) {
      suggestions.push({
        type: 'code_change',
        priority: 'medium',
        description: 'Optimize slow test execution with mock improvements',
        implementation: 'Use more efficient mocks and reduce unnecessary async operations',
        estimatedImpact: 30
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Export flakiness data for external analysis
   */
  exportData(): {
    executionHistory: TestExecutionResult[];
    analyses: TestFlakinessAnalysis[];
    config: FlakinessDetectorConfig;
    exportTimestamp: number;
  } {
    return {
      executionHistory: [...this.executionHistory],
      analyses: Array.from(this.testAnalyses.values()),
      config: this.config,
      exportTimestamp: Date.now()
    };
  }

  /**
   * Reset all flakiness data
   */
  reset(): void {
    this.executionHistory = [];
    this.testAnalyses.clear();
    this.analysesSubject.next(new Map());
  }

  /**
   * Private method to analyze a specific test
   */
  private analyzeTest(testFullName: string): void {
    const testRuns = this.executionHistory.filter(r => r.fullName === testFullName);
    
    if (testRuns.length < this.config.minRunsForAnalysis) {
      return; // Not enough data for analysis
    }

    const passedRuns = testRuns.filter(r => r.status === 'passed').length;
    const failedRuns = testRuns.filter(r => r.status === 'failed' || r.status === 'timeout').length;
    const skippedRuns = testRuns.filter(r => r.status === 'skipped').length;
    const successRate = (passedRuns / (passedRuns + failedRuns)) * 100;
    
    // Calculate flakiness score
    let flakinessScore = 0;
    if (successRate < 100) {
      flakinessScore = 100 - successRate;
      
      // Increase score for intermittent failures (not consistent failures)
      const recentRuns = testRuns.slice(-this.config.patternDetectionWindow);
      const hasIntermittentPattern = this.detectIntermittentPattern(recentRuns);
      if (hasIntermittentPattern) {
        flakinessScore *= 1.5; // Boost flakiness score for truly intermittent tests
      }
    }

    const analysis: TestFlakinessAnalysis = {
      testName: testRuns[0].testName,
      suiteName: testRuns[0].suiteName,
      fullName: testFullName,
      totalRuns: testRuns.length,
      passedRuns,
      failedRuns,
      skippedRuns,
      successRate,
      flakinessScore,
      averageDuration: testRuns.reduce((sum, r) => sum + r.duration, 0) / testRuns.length,
      failurePatterns: this.analyzeFailurePatterns(testRuns),
      riskLevel: this.calculateRiskLevel(successRate),
      lastFailure: this.getLastFailure(testRuns),
      consecutiveFailures: this.countConsecutiveFailures(testRuns),
      intermittentFailures: this.countIntermittentFailures(testRuns),
      recommendations: this.generateTestRecommendations(testRuns)
    };

    this.testAnalyses.set(testFullName, analysis);
    this.analysesSubject.next(new Map(this.testAnalyses));
  }

  /**
   * Detect intermittent failure patterns
   */
  private detectIntermittentPattern(runs: TestExecutionResult[]): boolean {
    if (runs.length < 4) return false;

    let transitions = 0;
    for (let i = 1; i < runs.length; i++) {
      const prevStatus = runs[i - 1].status;
      const currStatus = runs[i].status;
      
      if ((prevStatus === 'passed' && currStatus === 'failed') ||
          (prevStatus === 'failed' && currStatus === 'passed')) {
        transitions++;
      }
    }

    // High transition rate indicates intermittent behavior
    return (transitions / runs.length) > 0.3;
  }

  /**
   * Analyze failure patterns
   */
  private analyzeFailurePatterns(testRuns: TestExecutionResult[]): Array<{
    errorType: string;
    frequency: number;
    examples: string[];
  }> {
    const failedRuns = testRuns.filter(r => r.status === 'failed' || r.status === 'timeout');
    const errorTypes = new Map<string, { count: number; examples: string[] }>();

    failedRuns.forEach(run => {
      const errorType = run.errorType || this.classifyError(run.failureReason || '');
      const existing = errorTypes.get(errorType) || { count: 0, examples: [] };
      
      existing.count++;
      if (existing.examples.length < 3 && run.failureReason) {
        existing.examples.push(run.failureReason);
      }
      
      errorTypes.set(errorType, existing);
    });

    return Array.from(errorTypes.entries())
      .map(([errorType, data]) => ({
        errorType,
        frequency: (data.count / failedRuns.length) * 100,
        examples: data.examples
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Classify error type from error message
   */
  private classifyError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('timeout') || message.includes('jasmine timeout')) {
      return 'timeout';
    }
    if (message.includes('network') || message.includes('http') || message.includes('xhr')) {
      return 'network';
    }
    if (message.includes('memory') || message.includes('heap')) {
      return 'memory';
    }
    if (message.includes('destroyed') || message.includes('injector')) {
      return 'dependency';
    }
    if (message.includes('expression changed') || message.includes('detectchanges')) {
      return 'race_condition';
    }
    if (message.includes('random') || message.includes('Math.random')) {
      return 'random';
    }
    
    return 'assertion';
  }

  /**
   * Calculate risk level based on success rate
   */
  private calculateRiskLevel(successRate: number): 'low' | 'medium' | 'high' | 'critical' {
    const thresholds = this.config.alertThresholds;
    
    if (successRate < thresholds.critical) return 'critical';
    if (successRate < thresholds.high) return 'high';
    if (successRate < thresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * Get last failure date
   */
  private getLastFailure(testRuns: TestExecutionResult[]): Date | undefined {
    const failedRuns = testRuns.filter(r => r.status === 'failed' || r.status === 'timeout');
    if (failedRuns.length === 0) return undefined;
    
    const latest = failedRuns.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    );
    
    return new Date(latest.timestamp);
  }

  /**
   * Count consecutive failures from most recent runs
   */
  private countConsecutiveFailures(testRuns: TestExecutionResult[]): number {
    const recentRuns = testRuns.slice().reverse(); // Most recent first
    let count = 0;
    
    for (const run of recentRuns) {
      if (run.status === 'failed' || run.status === 'timeout') {
        count++;
      } else {
        break;
      }
    }
    
    return count;
  }

  /**
   * Count intermittent failures
   */
  private countIntermittentFailures(testRuns: TestExecutionResult[]): number {
    let intermittentCount = 0;
    
    for (let i = 1; i < testRuns.length - 1; i++) {
      const prev = testRuns[i - 1].status;
      const curr = testRuns[i].status;
      const next = testRuns[i + 1].status;
      
      // Failed test surrounded by passing tests
      if ((curr === 'failed' || curr === 'timeout') && 
          prev === 'passed' && next === 'passed') {
        intermittentCount++;
      }
    }
    
    return intermittentCount;
  }

  /**
   * Generate test-specific recommendations
   */
  private generateTestRecommendations(testRuns: TestExecutionResult[]): string[] {
    const recommendations: string[] = [];
    const failedRuns = testRuns.filter(r => r.status === 'failed' || r.status === 'timeout');
    
    if (failedRuns.length === 0) return recommendations;

    const avgFailureDuration = failedRuns.reduce((sum, r) => sum + r.duration, 0) / failedRuns.length;
    const avgPassDuration = testRuns.filter(r => r.status === 'passed')
      .reduce((sum, r) => sum + r.duration, 0) / testRuns.filter(r => r.status === 'passed').length;

    if (avgFailureDuration > avgPassDuration * 2) {
      recommendations.push('Test failures take significantly longer - investigate timeout issues');
    }

    const timeoutFailures = failedRuns.filter(r => r.status === 'timeout').length;
    if (timeoutFailures > failedRuns.length * 0.5) {
      recommendations.push('High timeout rate - increase timeout limits or optimize test execution');
    }

    const hasIntermittentPattern = this.detectIntermittentPattern(testRuns.slice(-10));
    if (hasIntermittentPattern) {
      recommendations.push('Intermittent failures detected - investigate race conditions and timing dependencies');
    }

    return recommendations;
  }

  /**
   * Check for alerts based on analysis
   */
  private checkForAlerts(testFullName: string): void {
    const analysis = this.getTestAnalysis(testFullName);
    if (!analysis) return;

    const alertLevel = this.getAlertLevel(analysis);
    if (alertLevel === 'low') return; // No alert needed

    const alert: FlakinessAlert = {
      testName: analysis.testName,
      suiteName: analysis.suiteName,
      alertLevel,
      message: this.generateAlertMessage(analysis),
      analysis,
      timestamp: Date.now(),
      actionRequired: alertLevel === 'high' || alertLevel === 'critical',
      suggestedActions: this.generateAlertActions(analysis)
    };

    this.alertsSubject.next(alert);
  }

  /**
   * Get alert level for analysis
   */
  private getAlertLevel(analysis: TestFlakinessAnalysis): 'low' | 'medium' | 'high' | 'critical' {
    return analysis.riskLevel;
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(analysis: TestFlakinessAnalysis): string {
    const successRate = analysis.successRate.toFixed(1);
    const flakinessScore = analysis.flakinessScore.toFixed(1);
    
    return `Test "${analysis.testName}" has ${successRate}% success rate (flakiness score: ${flakinessScore})`;
  }

  /**
   * Generate suggested actions for alert
   */
  private generateAlertActions(analysis: TestFlakinessAnalysis): string[] {
    const actions: string[] = [];
    
    if (analysis.consecutiveFailures > 3) {
      actions.push('Investigate recent code changes - test failing consistently');
    }
    
    if (analysis.intermittentFailures > 2) {
      actions.push('Investigate timing issues - test showing intermittent behavior');
    }
    
    const dominantPattern = analysis.failurePatterns[0];
    if (dominantPattern) {
      switch (dominantPattern.errorType) {
        case 'timeout':
          actions.push('Review test timeout configuration and async operations');
          break;
        case 'race_condition':
          actions.push('Implement proper async synchronization patterns');
          break;
        case 'memory':
          actions.push('Review memory management and subscription cleanup');
          break;
        case 'network':
          actions.push('Improve HTTP mocking and error handling');
          break;
      }
    }
    
    return actions;
  }

  /**
   * Get recent test runs for a specific test
   */
  private getRecentTestRuns(testFullName: string, count: number): TestExecutionResult[] {
    return this.executionHistory
      .filter(r => r.fullName === testFullName)
      .slice(-count);
  }

  /**
   * Generate general recommendations
   */
  private generateRecommendations(flakyTests: TestFlakinessAnalysis[]): string[] {
    const recommendations: string[] = [];
    
    if (flakyTests.length === 0) {
      recommendations.push('No significant flakiness detected. Continue monitoring.');
      return recommendations;
    }

    const criticalTests = flakyTests.filter(t => t.riskLevel === 'critical');
    if (criticalTests.length > 0) {
      recommendations.push(`Address ${criticalTests.length} critical flaky tests immediately`);
    }

    const timeoutTests = flakyTests.filter(t => 
      t.failurePatterns.some(p => p.errorType === 'timeout')
    );
    if (timeoutTests.length > flakyTests.length * 0.3) {
      recommendations.push('High rate of timeout failures - review test timeout configuration globally');
    }

    const raceConditionTests = flakyTests.filter(t =>
      t.failurePatterns.some(p => p.errorType === 'race_condition')
    );
    if (raceConditionTests.length > 0) {
      recommendations.push('Implement consistent async testing patterns to prevent race conditions');
    }

    return recommendations;
  }

  /**
   * Analyze trends (simplified - would need historical data)
   */
  private analyzeTrends(): Array<{ metric: string; trend: 'improving' | 'degrading' | 'stable' }> {
    return [
      { metric: 'overall_stability', trend: 'stable' },
      { metric: 'flaky_test_count', trend: 'stable' },
      { metric: 'critical_issues', trend: 'stable' }
    ];
  }

  /**
   * Start periodic analysis
   */
  private startPeriodicAnalysis(): void {
    // Run analysis every 5 minutes
    setInterval(() => {
      // Re-analyze all tests with recent data
      const uniqueTests = new Set(this.executionHistory.map(r => r.fullName));
      uniqueTests.forEach(testName => this.analyzeTest(testName));
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up old execution history
   */
  private cleanupOldHistory(): void {
    const cutoffTime = Date.now() - (this.config.historyRetentionDays * 24 * 60 * 60 * 1000);
    this.executionHistory = this.executionHistory.filter(r => r.timestamp > cutoffTime);
  }

  /**
   * Get browser information
   */
  private getBrowserInfo(): string {
    return navigator.userAgent.split(' ')[0] || 'unknown';
  }

  /**
   * Get OS information
   */
  private getOSInfo(): string {
    return navigator.platform || 'unknown';
  }

  /**
   * Get Node version
   */
  private getNodeVersion(): string {
    return process?.version || 'unknown';
  }
}

/**
 * Global flakiness detector instance
 */
let globalFlakinessDetector: FlakinessDetector | null = null;

/**
 * Get or create global flakiness detector
 */
export function getFlakinessDetector(config?: FlakinessDetectorConfig): FlakinessDetector {
  if (!globalFlakinessDetector) {
    globalFlakinessDetector = new FlakinessDetector(config);
  }
  return globalFlakinessDetector;
}

/**
 * Reset global flakiness detector
 */
export function resetFlakinessDetector(): void {
  if (globalFlakinessDetector) {
    globalFlakinessDetector.reset();
  }
  globalFlakinessDetector = null;
}

/**
 * Jasmine reporter for automatic flakiness detection
 */
export class JasmineFlakinessReporter implements jasmine.CustomReporter {
  private detector = getFlakinessDetector();

  jasmineStarted(suiteInfo: jasmine.SuiteInfo): void {
    console.log('Flakiness Detection started');
  }

  specDone(result: jasmine.CustomReporterResult): void {
    const testResult: TestExecutionResult = {
      testName: result.description,
      suiteName: result.fullName.split(' ')[0],
      fullName: result.fullName,
      status: result.status as any,
      duration: result.duration || 0,
      timestamp: Date.now(),
      failureReason: result.failedExpectations.map(e => e.message).join('; ') || undefined
    };

    this.detector.recordTestExecution(testResult);
  }

  jasmineDone(runDetails: jasmine.RunDetails): void {
    const report = this.detector.generateFlakinessReport();
    if (report.summary.flakyTests > 0) {
      console.warn('Flakiness Detection Report:', report);
    }
  }
}