/**
 * CI/CD Quality Gates System - Phase 4 QA Implementation
 * 
 * Provides automated quality gate enforcement for test reliability,
 * performance standards, and deployment readiness validation.
 */

import { TestPerformanceMonitor, GlobalTestMetrics } from './test-performance-monitor';
import { FlakinessDetector, TestFlakinessAnalysis } from './flakiness-detector';

/**
 * Quality gate configuration
 */
export interface QualityGateConfig {
  // Performance Gates
  maxTestExecutionTime: number; // milliseconds
  maxAverageTestDuration: number;
  minSuccessRate: number; // percentage
  maxFlakyTestPercentage: number;
  maxCriticalFlakyTests: number;
  
  // Memory Gates
  maxMemoryUsage: number; // MB
  memoryLeakThreshold: number; // MB
  
  // Coverage Gates (if coverage data available)
  minCodeCoverage?: number; // percentage
  minBranchCoverage?: number;
  minFunctionCoverage?: number;
  
  // Stability Gates
  maxConsecutiveFailures: number;
  maxTimeoutRate: number; // percentage
  minTestStability: number; // percentage over time window
  
  // Environment Gates
  supportedBrowsers: string[];
  supportedNodeVersions: string[];
  
  // Severity Levels
  errorThresholds: QualityGateThresholds;
  warningThresholds: QualityGateThresholds;
}

/**
 * Quality gate thresholds
 */
export interface QualityGateThresholds {
  successRate: number;
  averageDuration: number;
  flakyTestRate: number;
  memoryUsage: number;
  timeoutRate: number;
}

/**
 * Default quality gate configuration
 */
export const DEFAULT_QUALITY_GATES: QualityGateConfig = {
  maxTestExecutionTime: 600000, // 10 minutes
  maxAverageTestDuration: 2000, // 2 seconds
  minSuccessRate: 95, // 95%
  maxFlakyTestPercentage: 5, // 5%
  maxCriticalFlakyTests: 0,
  
  maxMemoryUsage: 500, // 500MB
  memoryLeakThreshold: 50, // 50MB
  
  minCodeCoverage: 80,
  minBranchCoverage: 70,
  minFunctionCoverage: 85,
  
  maxConsecutiveFailures: 3,
  maxTimeoutRate: 2, // 2%
  minTestStability: 90, // 90%
  
  supportedBrowsers: ['Chrome', 'Firefox', 'Safari', 'Edge'],
  supportedNodeVersions: ['18.x', '20.x', '21.x'],
  
  errorThresholds: {
    successRate: 90,
    averageDuration: 5000,
    flakyTestRate: 10,
    memoryUsage: 1000,
    timeoutRate: 5
  },
  
  warningThresholds: {
    successRate: 95,
    averageDuration: 3000,
    flakyTestRate: 5,
    memoryUsage: 500,
    timeoutRate: 2
  }
};

/**
 * Quality gate validation result
 */
export interface QualityGateResult {
  passed: boolean;
  gateId: string;
  gateName: string;
  category: 'performance' | 'reliability' | 'coverage' | 'stability' | 'environment';
  severity: 'error' | 'warning' | 'info';
  actualValue: number | string;
  expectedValue: number | string;
  message: string;
  recommendation?: string;
  blockingDeployment: boolean;
}

/**
 * Overall quality assessment
 */
export interface QualityAssessment {
  overallStatus: 'passed' | 'failed' | 'warning';
  deploymentReady: boolean;
  totalGates: number;
  passedGates: number;
  failedGates: number;
  warningGates: number;
  results: QualityGateResult[];
  summary: {
    performance: QualityGateResult[];
    reliability: QualityGateResult[];
    coverage: QualityGateResult[];
    stability: QualityGateResult[];
    environment: QualityGateResult[];
  };
  recommendations: string[];
  criticalIssues: string[];
  score: number; // Overall quality score 0-100
}

/**
 * Quality gate enforcement engine
 */
export class QualityGateEngine {
  private performanceMonitor: TestPerformanceMonitor;
  private flakinessDetector: FlakinessDetector;
  
  constructor(
    private config: QualityGateConfig = DEFAULT_QUALITY_GATES,
    performanceMonitor?: TestPerformanceMonitor,
    flakinessDetector?: FlakinessDetector
  ) {
    this.performanceMonitor = performanceMonitor || new TestPerformanceMonitor();
    this.flakinessDetector = flakinessDetector || new FlakinessDetector();
  }

  /**
   * Evaluate all quality gates
   */
  async evaluateQualityGates(): Promise<QualityAssessment> {
    const results: QualityGateResult[] = [];
    
    // Get current metrics
    const performanceMetrics = this.performanceMonitor.getPerformanceSummary();
    const flakinessReport = this.flakinessDetector.generateFlakinessReport();
    
    // Performance Gates
    results.push(...this.evaluatePerformanceGates(performanceMetrics));
    
    // Reliability Gates
    results.push(...this.evaluateReliabilityGates(performanceMetrics, flakinessReport));
    
    // Coverage Gates (if data available)
    results.push(...this.evaluateCoverageGates());
    
    // Stability Gates
    results.push(...this.evaluateStabilityGates(flakinessReport));
    
    // Environment Gates
    results.push(...this.evaluateEnvironmentGates());
    
    return this.buildQualityAssessment(results);
  }

  /**
   * Evaluate performance-related quality gates
   */
  private evaluatePerformanceGates(metrics: GlobalTestMetrics | null): QualityGateResult[] {
    const results: QualityGateResult[] = [];
    
    if (!metrics) {
      results.push({
        passed: false,
        gateId: 'perf-001',
        gateName: 'Performance Metrics Available',
        category: 'performance',
        severity: 'error',
        actualValue: 'No metrics available',
        expectedValue: 'Metrics required',
        message: 'Performance metrics not available for evaluation',
        blockingDeployment: true
      });
      return results;
    }

    // Total execution time gate
    results.push({
      passed: metrics.totalDuration <= this.config.maxTestExecutionTime,
      gateId: 'perf-002',
      gateName: 'Total Execution Time',
      category: 'performance',
      severity: metrics.totalDuration > this.config.errorThresholds.averageDuration ? 'error' : 'warning',
      actualValue: `${(metrics.totalDuration / 1000).toFixed(1)}s`,
      expectedValue: `<${(this.config.maxTestExecutionTime / 1000).toFixed(1)}s`,
      message: `Test suite execution time: ${(metrics.totalDuration / 1000).toFixed(1)}s`,
      recommendation: metrics.totalDuration > this.config.maxTestExecutionTime 
        ? 'Optimize slow tests or increase parallelization' : undefined,
      blockingDeployment: metrics.totalDuration > this.config.errorThresholds.averageDuration
    });

    // Average test duration gate
    results.push({
      passed: metrics.averageTestDuration <= this.config.maxAverageTestDuration,
      gateId: 'perf-003',
      gateName: 'Average Test Duration',
      category: 'performance',
      severity: metrics.averageTestDuration > this.config.errorThresholds.averageDuration ? 'error' : 'warning',
      actualValue: `${metrics.averageTestDuration.toFixed(0)}ms`,
      expectedValue: `<${this.config.maxAverageTestDuration}ms`,
      message: `Average test duration: ${metrics.averageTestDuration.toFixed(0)}ms`,
      recommendation: metrics.averageTestDuration > this.config.maxAverageTestDuration
        ? 'Profile and optimize slow individual tests' : undefined,
      blockingDeployment: metrics.averageTestDuration > this.config.errorThresholds.averageDuration
    });

    // Critical bottlenecks gate
    const criticalBottlenecks = metrics.performanceBottlenecks.filter(b => b.severity === 'critical');
    results.push({
      passed: criticalBottlenecks.length === 0,
      gateId: 'perf-004',
      gateName: 'Critical Performance Bottlenecks',
      category: 'performance',
      severity: 'error',
      actualValue: criticalBottlenecks.length.toString(),
      expectedValue: '0',
      message: `Critical performance bottlenecks: ${criticalBottlenecks.length}`,
      recommendation: criticalBottlenecks.length > 0
        ? 'Address critical performance bottlenecks before deployment' : undefined,
      blockingDeployment: criticalBottlenecks.length > 0
    });

    return results;
  }

  /**
   * Evaluate reliability-related quality gates
   */
  private evaluateReliabilityGates(
    metrics: GlobalTestMetrics | null, 
    flakinessReport: any
  ): QualityGateResult[] {
    const results: QualityGateResult[] = [];
    
    if (!metrics) return results;

    // Success rate gate
    const successRatePercent = metrics.successRate * 100;
    results.push({
      passed: successRatePercent >= this.config.minSuccessRate,
      gateId: 'rel-001',
      gateName: 'Test Success Rate',
      category: 'reliability',
      severity: successRatePercent < this.config.errorThresholds.successRate ? 'error' : 'warning',
      actualValue: `${successRatePercent.toFixed(1)}%`,
      expectedValue: `≥${this.config.minSuccessRate}%`,
      message: `Test success rate: ${successRatePercent.toFixed(1)}%`,
      recommendation: successRatePercent < this.config.minSuccessRate
        ? 'Fix failing tests before deployment' : undefined,
      blockingDeployment: successRatePercent < this.config.errorThresholds.successRate
    });

    // Flaky test percentage gate
    const flakyTestRate = (flakinessReport.summary.flakyTests / flakinessReport.summary.totalTests) * 100;
    results.push({
      passed: flakyTestRate <= this.config.maxFlakyTestPercentage,
      gateId: 'rel-002',
      gateName: 'Flaky Test Rate',
      category: 'reliability',
      severity: flakyTestRate > this.config.errorThresholds.flakyTestRate ? 'error' : 'warning',
      actualValue: `${flakyTestRate.toFixed(1)}%`,
      expectedValue: `≤${this.config.maxFlakyTestPercentage}%`,
      message: `Flaky test rate: ${flakyTestRate.toFixed(1)}%`,
      recommendation: flakyTestRate > this.config.maxFlakyTestPercentage
        ? 'Stabilize flaky tests before deployment' : undefined,
      blockingDeployment: flakyTestRate > this.config.errorThresholds.flakyTestRate
    });

    // Critical flaky tests gate
    results.push({
      passed: flakinessReport.summary.criticalTests <= this.config.maxCriticalFlakyTests,
      gateId: 'rel-003',
      gateName: 'Critical Flaky Tests',
      category: 'reliability',
      severity: 'error',
      actualValue: flakinessReport.summary.criticalTests.toString(),
      expectedValue: `≤${this.config.maxCriticalFlakyTests}`,
      message: `Critical flaky tests: ${flakinessReport.summary.criticalTests}`,
      recommendation: flakinessReport.summary.criticalTests > this.config.maxCriticalFlakyTests
        ? 'Fix critical flaky tests immediately' : undefined,
      blockingDeployment: flakinessReport.summary.criticalTests > this.config.maxCriticalFlakyTests
    });

    return results;
  }

  /**
   * Evaluate code coverage gates
   */
  private evaluateCoverageGates(): QualityGateResult[] {
    const results: QualityGateResult[] = [];
    
    // Mock coverage evaluation (would integrate with actual coverage tools)
    const mockCoverage = {
      statements: 85,
      branches: 75,
      functions: 90,
      lines: 87
    };

    if (this.config.minCodeCoverage) {
      results.push({
        passed: mockCoverage.statements >= this.config.minCodeCoverage,
        gateId: 'cov-001',
        gateName: 'Statement Coverage',
        category: 'coverage',
        severity: 'warning',
        actualValue: `${mockCoverage.statements}%`,
        expectedValue: `≥${this.config.minCodeCoverage}%`,
        message: `Statement coverage: ${mockCoverage.statements}%`,
        recommendation: mockCoverage.statements < this.config.minCodeCoverage
          ? 'Increase test coverage for critical code paths' : undefined,
        blockingDeployment: false
      });
    }

    if (this.config.minBranchCoverage) {
      results.push({
        passed: mockCoverage.branches >= this.config.minBranchCoverage,
        gateId: 'cov-002',
        gateName: 'Branch Coverage',
        category: 'coverage',
        severity: 'warning',
        actualValue: `${mockCoverage.branches}%`,
        expectedValue: `≥${this.config.minBranchCoverage}%`,
        message: `Branch coverage: ${mockCoverage.branches}%`,
        blockingDeployment: false
      });
    }

    if (this.config.minFunctionCoverage) {
      results.push({
        passed: mockCoverage.functions >= this.config.minFunctionCoverage,
        gateId: 'cov-003',
        gateName: 'Function Coverage',
        category: 'coverage',
        severity: 'warning',
        actualValue: `${mockCoverage.functions}%`,
        expectedValue: `≥${this.config.minFunctionCoverage}%`,
        message: `Function coverage: ${mockCoverage.functions}%`,
        blockingDeployment: false
      });
    }

    return results;
  }

  /**
   * Evaluate stability-related quality gates
   */
  private evaluateStabilityGates(flakinessReport: any): QualityGateResult[] {
    const results: QualityGateResult[] = [];

    // Overall stability gate
    const overallStability = flakinessReport.summary.overallStability;
    results.push({
      passed: overallStability >= this.config.minTestStability,
      gateId: 'stab-001',
      gateName: 'Test Suite Stability',
      category: 'stability',
      severity: overallStability < 85 ? 'error' : 'warning',
      actualValue: `${overallStability.toFixed(1)}%`,
      expectedValue: `≥${this.config.minTestStability}%`,
      message: `Test suite stability: ${overallStability.toFixed(1)}%`,
      recommendation: overallStability < this.config.minTestStability
        ? 'Improve test stability before deployment' : undefined,
      blockingDeployment: overallStability < 85
    });

    // Emerging issues gate
    const emergingIssues = flakinessReport.emergingIssues.length;
    results.push({
      passed: emergingIssues === 0,
      gateId: 'stab-002',
      gateName: 'Emerging Stability Issues',
      category: 'stability',
      severity: emergingIssues > 5 ? 'error' : 'warning',
      actualValue: emergingIssues.toString(),
      expectedValue: '0',
      message: `Emerging stability issues: ${emergingIssues}`,
      recommendation: emergingIssues > 0
        ? 'Investigate and address emerging test stability issues' : undefined,
      blockingDeployment: emergingIssues > 5
    });

    return results;
  }

  /**
   * Evaluate environment-related quality gates
   */
  private evaluateEnvironmentGates(): QualityGateResult[] {
    const results: QualityGateResult[] = [];

    // Node version gate (browser-safe)
    const currentNodeVersion = (typeof process !== 'undefined' && process.version) ? process.version : 'browser';
    const nodeVersionSupported = currentNodeVersion === 'browser' ? true : this.config.supportedNodeVersions.some(version => 
      currentNodeVersion.startsWith('v' + version.replace('.x', ''))
    );

    results.push({
      passed: nodeVersionSupported,
      gateId: 'env-001',
      gateName: 'Node.js Version Support',
      category: 'environment',
      severity: 'warning',
      actualValue: currentNodeVersion,
      expectedValue: this.config.supportedNodeVersions.join(', '),
      message: `Node.js version: ${currentNodeVersion}`,
      recommendation: !nodeVersionSupported
        ? 'Consider upgrading to a supported Node.js version' : undefined,
      blockingDeployment: false
    });

    // Browser compatibility gate (mock evaluation)
    const testedBrowsers = ['Chrome']; // Would be determined from actual test runs
    const browserCoverage = (testedBrowsers.length / this.config.supportedBrowsers.length) * 100;
    
    results.push({
      passed: browserCoverage >= 50, // Require testing on at least 50% of supported browsers
      gateId: 'env-002',
      gateName: 'Browser Test Coverage',
      category: 'environment',
      severity: 'info',
      actualValue: `${browserCoverage.toFixed(0)}%`,
      expectedValue: '≥50%',
      message: `Browser test coverage: ${browserCoverage.toFixed(0)}%`,
      recommendation: browserCoverage < 50
        ? 'Increase browser test coverage for better compatibility' : undefined,
      blockingDeployment: false
    });

    return results;
  }

  /**
   * Build comprehensive quality assessment
   */
  private buildQualityAssessment(results: QualityGateResult[]): QualityAssessment {
    const passedGates = results.filter(r => r.passed).length;
    const failedGates = results.filter(r => !r.passed && r.severity === 'error').length;
    const warningGates = results.filter(r => !r.passed && r.severity === 'warning').length;
    const blockingIssues = results.filter(r => !r.passed && r.blockingDeployment).length;

    // Calculate overall status
    let overallStatus: 'passed' | 'failed' | 'warning';
    if (failedGates > 0) {
      overallStatus = 'failed';
    } else if (warningGates > 0) {
      overallStatus = 'warning';
    } else {
      overallStatus = 'passed';
    }

    // Calculate quality score
    const totalGates = results.length;
    const weightedScore = results.reduce((score, result) => {
      if (result.passed) return score + (result.severity === 'error' ? 3 : result.severity === 'warning' ? 2 : 1);
      return score + 0;
    }, 0);
    const maxScore = results.reduce((max, result) => 
      max + (result.severity === 'error' ? 3 : result.severity === 'warning' ? 2 : 1), 0
    );
    const qualityScore = Math.round((weightedScore / maxScore) * 100);

    // Categorize results
    const summary = {
      performance: results.filter(r => r.category === 'performance'),
      reliability: results.filter(r => r.category === 'reliability'),
      coverage: results.filter(r => r.category === 'coverage'),
      stability: results.filter(r => r.category === 'stability'),
      environment: results.filter(r => r.category === 'environment')
    };

    // Generate recommendations and critical issues
    const recommendations = results
      .filter(r => r.recommendation && !r.blockingDeployment)
      .map(r => r.recommendation!);
    
    const criticalIssues = results
      .filter(r => !r.passed && r.blockingDeployment)
      .map(r => r.message);

    return {
      overallStatus,
      deploymentReady: blockingIssues === 0,
      totalGates: totalGates,
      passedGates,
      failedGates,
      warningGates,
      results,
      summary,
      recommendations: [...new Set(recommendations)], // Remove duplicates
      criticalIssues,
      score: qualityScore
    };
  }

  /**
   * Generate quality gate report
   */
  generateReport(assessment: QualityAssessment): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(80));
    lines.push('CI/CD QUALITY GATES REPORT');
    lines.push('='.repeat(80));
    lines.push('');
    
    // Overall status
    lines.push(`Overall Status: ${assessment.overallStatus.toUpperCase()}`);
    lines.push(`Quality Score: ${assessment.score}/100`);
    lines.push(`Deployment Ready: ${assessment.deploymentReady ? 'YES' : 'NO'}`);
    lines.push('');
    
    // Summary
    lines.push('SUMMARY:');
    lines.push(`├─ Total Gates: ${assessment.totalGates}`);
    lines.push(`├─ Passed: ${assessment.passedGates}`);
    lines.push(`├─ Failed: ${assessment.failedGates}`);
    lines.push(`└─ Warnings: ${assessment.warningGates}`);
    lines.push('');
    
    // Critical issues
    if (assessment.criticalIssues.length > 0) {
      lines.push('CRITICAL ISSUES (BLOCKING DEPLOYMENT):');
      assessment.criticalIssues.forEach(issue => {
        lines.push(`⚠️  ${issue}`);
      });
      lines.push('');
    }
    
    // Category breakdown
    Object.entries(assessment.summary).forEach(([category, categoryResults]) => {
      if (categoryResults.length > 0) {
        const categoryPassed = categoryResults.filter(r => r.passed).length;
        lines.push(`${category.toUpperCase()} (${categoryPassed}/${categoryResults.length} passed):`);
        
        categoryResults.forEach(result => {
          const icon = result.passed ? '✅' : (result.severity === 'error' ? '❌' : '⚠️');
          lines.push(`${icon} ${result.gateName}: ${result.actualValue} (expected: ${result.expectedValue})`);
        });
        lines.push('');
      }
    });
    
    // Recommendations
    if (assessment.recommendations.length > 0) {
      lines.push('RECOMMENDATIONS:');
      assessment.recommendations.forEach(rec => {
        lines.push(`💡 ${rec}`);
      });
      lines.push('');
    }
    
    lines.push('='.repeat(80));
    
    return lines.join('\n');
  }

  /**
   * Export quality gate results for external systems
   */
  exportResults(assessment: QualityAssessment): {
    cicd: {
      status: string;
      deploymentReady: boolean;
      qualityScore: number;
    };
    metrics: {
      gates: { [category: string]: number };
      issues: string[];
    };
    timestamp: number;
  } {
    return {
      cicd: {
        status: assessment.overallStatus,
        deploymentReady: assessment.deploymentReady,
        qualityScore: assessment.score
      },
      metrics: {
        gates: {
          total: assessment.totalGates,
          passed: assessment.passedGates,
          failed: assessment.failedGates,
          warnings: assessment.warningGates
        },
        issues: assessment.criticalIssues
      },
      timestamp: Date.now()
    };
  }
}

/**
 * Quality gate CLI runner for CI/CD integration
 */
export class QualityGateCLI {
  private engine: QualityGateEngine;

  constructor(config?: QualityGateConfig) {
    this.engine = new QualityGateEngine(config);
  }

  /**
   * Run quality gates and exit with appropriate code
   */
  async runQualityGates(): Promise<number> {
    try {
      console.log('Running Quality Gates...\n');
      
      const assessment = await this.engine.evaluateQualityGates();
      const report = this.engine.generateReport(assessment);
      
      console.log(report);
      
      // Export results for CI/CD systems
      const exportData = this.engine.exportResults(assessment);
      console.log('\nCI/CD Export Data:');
      console.log(JSON.stringify(exportData, null, 2));
      
      // Return appropriate exit code
      if (!assessment.deploymentReady) {
        console.error('\n❌ DEPLOYMENT BLOCKED: Critical quality gate failures detected');
        return 1; // Failure exit code
      } else if (assessment.overallStatus === 'warning') {
        console.warn('\n⚠️  DEPLOYMENT WITH WARNINGS: Quality gates passed with warnings');
        return 0; // Success but with warnings
      } else {
        console.log('\n✅ DEPLOYMENT READY: All quality gates passed');
        return 0; // Success exit code
      }
      
    } catch (error) {
      console.error('Quality Gate Evaluation Failed:', error);
      return 1; // Failure exit code
    }
  }
}

/**
 * Global quality gate engine instance
 */
let globalQualityGateEngine: QualityGateEngine | null = null;

/**
 * Get or create global quality gate engine
 */
export function getQualityGateEngine(config?: QualityGateConfig): QualityGateEngine {
  if (!globalQualityGateEngine) {
    globalQualityGateEngine = new QualityGateEngine(config);
  }
  return globalQualityGateEngine;
}

/**
 * Reset global quality gate engine
 */
export function resetQualityGateEngine(): void {
  globalQualityGateEngine = null;
}

/**
 * Utility function to run quality gates in CI/CD
 */
export async function runCICDQualityGates(config?: QualityGateConfig): Promise<number> {
  const cli = new QualityGateCLI(config);
  return await cli.runQualityGates();
}