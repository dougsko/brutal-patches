/**
 * Test Lifecycle Management System
 * 
 * Provides automatic cleanup, mock lifecycle management, and verification utilities
 * to ensure reliable, isolated HTTP testing.
 */

import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpMockManager } from './http-testing-utilities';
import { ServiceTestIsolator } from './service-test-isolation';

/**
 * Test Lifecycle Configuration
 */
export interface TestLifecycleConfig {
  services: Array<{
    name: string;
    token: any;
    requiresIsolation?: boolean;
  }>;
  httpMockingEnabled: boolean;
  autoVerification: boolean;
  debugMode: boolean;
  strictMode: boolean; // Fail tests if verification fails
}

/**
 * Test Lifecycle Events
 */
export interface TestLifecycleEvents {
  beforeEach?: () => void;
  afterEach?: () => void;
  beforeAll?: () => void;
  afterAll?: () => void;
  onError?: (error: any, phase: string) => void;
  onVerificationFailure?: (failures: string[]) => void;
}

/**
 * Test Statistics
 */
export interface TestStatistics {
  testsRun: number;
  httpRequestsMocked: number;
  verificationFailures: number;
  cacheLeakages: number;
  cleanupErrors: number;
  averageCleanupTime: number;
}

/**
 * Main Test Lifecycle Manager
 */
export class TestLifecycleManager {
  private config: TestLifecycleConfig;
  private events: TestLifecycleEvents;
  private httpMock: HttpTestingController | null = null;
  private mockManager: HttpMockManager | null = null;
  private serviceIsolators: Map<string, ServiceTestIsolator> = new Map();
  private statistics: TestStatistics = {
    testsRun: 0,
    httpRequestsMocked: 0,
    verificationFailures: 0,
    cacheLeakages: 0,
    cleanupErrors: 0,
    averageCleanupTime: 0
  };
  private cleanupTimes: number[] = [];

  constructor(config: TestLifecycleConfig, events: TestLifecycleEvents = {}) {
    this.config = config;
    this.events = events;
  }

  /**
   * Initialize the test lifecycle manager
   */
  initialize(): void {
    if (this.config.debugMode) {
      console.log('Initializing Test Lifecycle Manager:', this.config);
    }

    // Initialize HTTP testing if enabled
    if (this.config.httpMockingEnabled) {
      this.httpMock = TestBed.inject(HttpTestingController);
      this.mockManager = new HttpMockManager(this.httpMock);
    }

    // Initialize service isolators
    this.config.services.forEach(serviceConfig => {
      if (serviceConfig.requiresIsolation) {
        try {
          const service = TestBed.inject(serviceConfig.token);
          const isolator = new ServiceTestIsolator(service);
          this.serviceIsolators.set(serviceConfig.name, isolator);
          
          if (this.config.debugMode) {
            console.log(`Initialized isolator for service: ${serviceConfig.name}`);
          }
        } catch (error) {
          console.warn(`Failed to initialize isolator for ${serviceConfig.name}:`, error);
        }
      }
    });

    // Execute beforeAll event
    if (this.events.beforeAll) {
      try {
        this.events.beforeAll();
      } catch (error) {
        this.handleError(error, 'beforeAll');
      }
    }
  }

  /**
   * Setup before each test
   */
  beforeEach(): void {
    const startTime = performance.now();

    try {
      // Reset statistics for this test
      this.statistics.testsRun++;

      // Begin service isolation
      this.serviceIsolators.forEach(isolator => {
        isolator.beginIsolation();
      });

      // Reset HTTP mocks
      if (this.mockManager) {
        this.mockManager.cleanup();
      }

      // Execute custom beforeEach
      if (this.events.beforeEach) {
        this.events.beforeEach();
      }

      if (this.config.debugMode) {
        const duration = performance.now() - startTime;
        console.log(`Test setup completed in ${duration.toFixed(2)}ms`);
      }
    } catch (error) {
      this.handleError(error, 'beforeEach');
    }
  }

  /**
   * Cleanup after each test
   */
  afterEach(): void {
    const startTime = performance.now();
    const failures: string[] = [];

    try {
      // Execute custom afterEach first
      if (this.events.afterEach) {
        this.events.afterEach();
      }

      // Verify and clean up HTTP mocks
      if (this.config.httpMockingEnabled && this.mockManager) {
        try {
          const stats = this.mockManager.getStatistics();
          this.statistics.httpRequestsMocked += stats.totalRequests;

          if (this.config.autoVerification) {
            this.mockManager.verifyNoOutstandingRequests();
          }
          
          this.mockManager.cleanup();
        } catch (error) {
          failures.push(`HTTP mock verification failed: ${error}`);
          this.statistics.verificationFailures++;
        }
      }

      // Verify and clean up service isolation
      if (this.config.autoVerification) {
        this.serviceIsolators.forEach((isolator, serviceName) => {
          try {
            const verification = isolator.verifyIsolation();
            if (!verification.cacheClean) {
              failures.push(`Cache leakage detected in ${serviceName}: ${JSON.stringify(verification.statistics)}`);
              this.statistics.cacheLeakages++;
            }
          } catch (error) {
            failures.push(`Service verification failed for ${serviceName}: ${error}`);
          }
        });
      }

      // End service isolation
      this.serviceIsolators.forEach(isolator => {
        try {
          isolator.endIsolation();
        } catch (error) {
          failures.push(`Service isolation cleanup failed: ${error}`);
          this.statistics.cleanupErrors++;
        }
      });

      const duration = performance.now() - startTime;
      this.cleanupTimes.push(duration);
      this.statistics.averageCleanupTime = this.cleanupTimes.reduce((a, b) => a + b, 0) / this.cleanupTimes.length;

      if (this.config.debugMode) {
        console.log(`Test cleanup completed in ${duration.toFixed(2)}ms`);
      }

      // Handle verification failures
      if (failures.length > 0) {
        this.statistics.verificationFailures++;
        
        if (this.events.onVerificationFailure) {
          this.events.onVerificationFailure(failures);
        }

        if (this.config.strictMode) {
          throw new Error(`Test verification failed:\n${failures.join('\n')}`);
        } else if (this.config.debugMode) {
          console.warn('Test verification failures:', failures);
        }
      }
    } catch (error) {
      this.handleError(error, 'afterEach');
      throw error; // Re-throw to ensure test fails
    }
  }

  /**
   * Final cleanup after all tests
   */
  afterAll(): void {
    try {
      // Complete reset of all isolators
      this.serviceIsolators.forEach(isolator => {
        isolator.completeReset();
      });

      // Final HTTP mock cleanup
      if (this.mockManager) {
        this.mockManager.cleanup();
      }

      // Execute custom afterAll
      if (this.events.afterAll) {
        this.events.afterAll();
      }

      // Log final statistics if debug mode
      if (this.config.debugMode) {
        console.log('=== Test Lifecycle Statistics ===');
        console.log(JSON.stringify(this.statistics, null, 2));
        console.log('================================');
      }
    } catch (error) {
      this.handleError(error, 'afterAll');
    }
  }

  /**
   * Get the HTTP mock manager
   */
  getHttpMockManager(): HttpMockManager | null {
    return this.mockManager;
  }

  /**
   * Get a service isolator by name
   */
  getServiceIsolator(serviceName: string): ServiceTestIsolator | undefined {
    return this.serviceIsolators.get(serviceName);
  }

  /**
   * Get current test statistics
   */
  getStatistics(): TestStatistics {
    return { ...this.statistics };
  }

  /**
   * Verify all managed resources are clean
   */
  verifyCleanState(): boolean {
    let isClean = true;
    const failures: string[] = [];

    // Verify HTTP mocks
    if (this.mockManager) {
      try {
        this.mockManager.verifyNoOutstandingRequests();
      } catch (error) {
        failures.push(`HTTP mocks not clean: ${error}`);
        isClean = false;
      }
    }

    // Verify service isolation
    this.serviceIsolators.forEach((isolator, serviceName) => {
      const verification = isolator.verifyIsolation();
      if (!verification.cacheClean) {
        failures.push(`Service ${serviceName} not clean: ${JSON.stringify(verification.statistics)}`);
        isClean = false;
      }
    });

    if (!isClean && this.config.debugMode) {
      console.warn('Clean state verification failed:', failures);
    }

    return isClean;
  }

  /**
   * Handle errors with proper logging and callbacks
   */
  private handleError(error: any, phase: string): void {
    console.error(`Test lifecycle error in ${phase}:`, error);
    
    if (this.events.onError) {
      this.events.onError(error, phase);
    }
  }

  /**
   * Create a scoped test runner for isolated test execution
   */
  createTestScope(): TestScope {
    return new TestScope(this);
  }
}

/**
 * Test Scope for individual test isolation
 */
export class TestScope {
  constructor(private manager: TestLifecycleManager) {}

  /**
   * Execute a test with automatic lifecycle management
   */
  runTest(testFunction: (scope: TestScope) => void): void {
    this.manager.beforeEach();
    
    try {
      testFunction(this);
    } finally {
      this.manager.afterEach();
    }
  }

  /**
   * Get HTTP mock manager
   */
  getHttpMocks(): HttpMockManager | null {
    return this.manager.getHttpMockManager();
  }

  /**
   * Get service isolator
   */
  getServiceIsolator(serviceName: string): ServiceTestIsolator | undefined {
    return this.manager.getServiceIsolator(serviceName);
  }

  /**
   * Verify test state is clean
   */
  verifyCleanState(): boolean {
    return this.manager.verifyCleanState();
  }
}

/**
 * Test Lifecycle Builder for easy configuration
 */
export class TestLifecycleBuilder {
  private config: Partial<TestLifecycleConfig> = {
    services: [],
    httpMockingEnabled: false,
    autoVerification: true,
    debugMode: false,
    strictMode: false
  };
  private events: TestLifecycleEvents = {};

  /**
   * Enable HTTP mocking
   */
  withHttpMocking(): TestLifecycleBuilder {
    this.config.httpMockingEnabled = true;
    return this;
  }

  /**
   * Add a service for lifecycle management
   */
  withService(name: string, token: any, requiresIsolation: boolean = false): TestLifecycleBuilder {
    this.config.services!.push({ name, token, requiresIsolation });
    return this;
  }

  /**
   * Enable debug mode
   */
  withDebugMode(): TestLifecycleBuilder {
    this.config.debugMode = true;
    return this;
  }

  /**
   * Enable strict mode (fail tests on verification failures)
   */
  withStrictMode(): TestLifecycleBuilder {
    this.config.strictMode = true;
    return this;
  }

  /**
   * Disable auto verification
   */
  withoutAutoVerification(): TestLifecycleBuilder {
    this.config.autoVerification = false;
    return this;
  }

  /**
   * Add lifecycle events
   */
  withEvents(events: TestLifecycleEvents): TestLifecycleBuilder {
    this.events = { ...this.events, ...events };
    return this;
  }

  /**
   * Build the test lifecycle manager
   */
  build(): TestLifecycleManager {
    return new TestLifecycleManager(this.config as TestLifecycleConfig, this.events);
  }
}

/**
 * Utility function to create a test lifecycle builder
 */
export function createTestLifecycle(): TestLifecycleBuilder {
  return new TestLifecycleBuilder();
}

/**
 * Decorator function for automatic test lifecycle management
 */
export function withTestLifecycle(
  config: TestLifecycleConfig,
  events?: TestLifecycleEvents
) {
  return function (target: any) {
    const manager = new TestLifecycleManager(config, events);
    
    beforeAll(() => manager.initialize());
    beforeEach(() => manager.beforeEach());
    afterEach(() => manager.afterEach());
    afterAll(() => manager.afterAll());
    
    // Add manager as a static property for access in tests
    target.lifecycleManager = manager;
  };
}

/**
 * Common test lifecycle configurations
 */
export const TestLifecycleConfigs = {
  /**
   * Basic HTTP testing configuration
   */
  basicHttp: (): TestLifecycleConfig => ({
    services: [],
    httpMockingEnabled: true,
    autoVerification: true,
    debugMode: false,
    strictMode: false
  }),

  /**
   * Service with caching configuration
   */
  withCaching: (serviceName: string, serviceToken: any): TestLifecycleConfig => ({
    services: [{ name: serviceName, token: serviceToken, requiresIsolation: true }],
    httpMockingEnabled: true,
    autoVerification: true,
    debugMode: false,
    strictMode: true
  }),

  /**
   * Debug mode configuration for troubleshooting
   */
  debug: (services: Array<{ name: string; token: any }>): TestLifecycleConfig => ({
    services: services.map(s => ({ ...s, requiresIsolation: true })),
    httpMockingEnabled: true,
    autoVerification: true,
    debugMode: true,
    strictMode: false
  }),

  /**
   * Strict mode for CI/CD environments
   */
  strict: (services: Array<{ name: string; token: any }>): TestLifecycleConfig => ({
    services: services.map(s => ({ ...s, requiresIsolation: true })),
    httpMockingEnabled: true,
    autoVerification: true,
    debugMode: false,
    strictMode: true
  })
};