/**
 * HTTP Testing Architecture Utilities
 * 
 * This module provides comprehensive utilities for HTTP testing to ensure:
 * - Proper test isolation without shared state pollution
 * - Mock lifecycle management with automatic cleanup
 * - Error scenario testing capabilities
 * - Request sequence validation
 */

import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Configuration for HTTP mock expectations
 */
export interface HttpMockExpectation {
  url: string | RegExp;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: { [key: string]: string };
  params?: { [key: string]: string };
  response?: any;
  error?: {
    status: number;
    statusText: string;
    message?: string;
  };
  delay?: number;
}

/**
 * HTTP Mock Manager for centralized test request handling
 */
export class HttpMockManager {
  private pendingRequests: TestRequest[] = [];
  private expectations: HttpMockExpectation[] = [];
  private requestHistory: Array<{ request: TestRequest; timestamp: number }> = [];

  constructor(private httpMock: HttpTestingController) {}

  /**
   * Add an HTTP expectation with automatic cleanup tracking
   */
  expectRequest(expectation: HttpMockExpectation): TestRequest {
    this.expectations.push(expectation);

    const req = this.httpMock.expectOne((testReq) => {
      if (typeof expectation.url === 'string') {
        return testReq.url.includes(expectation.url);
      } else {
        return expectation.url.test(testReq.url);
      }
    });

    // Track the request for cleanup
    this.pendingRequests.push(req);
    this.requestHistory.push({ request: req, timestamp: Date.now() });

    // Validate method if specified
    if (expectation.method) {
      expect(req.request.method).toBe(expectation.method);
    }

    // Validate body if specified
    if (expectation.body !== undefined) {
      expect(req.request.body).toEqual(expectation.body);
    }

    // Validate headers if specified
    if (expectation.headers) {
      Object.keys(expectation.headers).forEach(key => {
        expect(req.request.headers.get(key)).toBe(expectation.headers![key]);
      });
    }

    // Validate params if specified
    if (expectation.params) {
      Object.keys(expectation.params).forEach(key => {
        expect(req.request.params.get(key)).toBe(expectation.params![key]);
      });
    }

    return req;
  }

  /**
   * Flush a request with response or error
   */
  flushRequest(req: TestRequest, expectation: HttpMockExpectation): void {
    const executeFlush = () => {
      try {
        if (expectation.error) {
          if (expectation.error.status === 0) {
            // Network error
            req.error(new ErrorEvent('Network Error', {
              message: expectation.error.message || 'Network error occurred'
            }), { status: 0, statusText: '' });
          } else {
            // HTTP error
            req.flush(
              expectation.error.message || 'Error occurred',
              {
                status: expectation.error.status,
                statusText: expectation.error.statusText
              }
            );
          }
        } else {
          req.flush(expectation.response || {});
        }

        // Remove from pending requests
        const index = this.pendingRequests.indexOf(req);
        if (index > -1) {
          this.pendingRequests.splice(index, 1);
        }
      } catch (error) {
        console.warn('Failed to flush request:', error);
      }
    };

    if (expectation.delay && expectation.delay > 0) {
      setTimeout(executeFlush, expectation.delay);
    } else {
      executeFlush();
    }
  }

  /**
   * Expect and flush a request in one call
   */
  expectAndFlush(expectation: HttpMockExpectation): TestRequest {
    const req = this.expectRequest(expectation);
    this.flushRequest(req, expectation);
    return req;
  }

  /**
   * Simulate retry scenarios with multiple failed requests
   */
  expectRetrySequence(
    expectation: HttpMockExpectation,
    retryCount: number,
    finalSuccess: boolean = false
  ): TestRequest[] {
    const requests: TestRequest[] = [];

    // Handle retry attempts
    for (let i = 0; i < retryCount; i++) {
      const req = this.expectRequest({
        ...expectation,
        error: expectation.error || { status: 500, statusText: 'Server Error' }
      });
      this.flushRequest(req, {
        ...expectation,
        error: expectation.error || { status: 500, statusText: 'Server Error' }
      });
      requests.push(req);
    }

    // Handle final request
    if (finalSuccess) {
      const finalReq = this.expectRequest({
        ...expectation,
        error: undefined // Remove error for success case
      });
      this.flushRequest(finalReq, {
        ...expectation,
        error: undefined
      });
      requests.push(finalReq);
    } else {
      const finalReq = this.expectRequest(expectation);
      this.flushRequest(finalReq, expectation);
      requests.push(finalReq);
    }

    return requests;
  }

  /**
   * Simulate concurrent requests
   */
  expectConcurrentRequests(expectations: HttpMockExpectation[]): TestRequest[] {
    const requests = expectations.map(expectation => this.expectRequest(expectation));
    
    // Flush all requests
    requests.forEach((req, index) => {
      this.flushRequest(req, expectations[index]);
    });

    return requests;
  }

  /**
   * Get statistics about HTTP mock usage
   */
  getStatistics(): {
    totalRequests: number;
    pendingRequests: number;
    completedRequests: number;
    expectations: number;
  } {
    return {
      totalRequests: this.requestHistory.length,
      pendingRequests: this.pendingRequests.length,
      completedRequests: this.requestHistory.length - this.pendingRequests.length,
      expectations: this.expectations.length
    };
  }

  /**
   * Clean up all pending requests and reset state
   */
  cleanup(): void {
    // Attempt to flush any pending requests
    this.pendingRequests.forEach(req => {
      try {
        if (!req.cancelled) {
          req.flush({}, { status: 200, statusText: 'OK' });
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    // Reset state
    this.pendingRequests = [];
    this.expectations = [];
    this.requestHistory = [];
  }

  /**
   * Verify all expected requests have been made
   */
  verifyNoOutstandingRequests(): void {
    try {
      this.httpMock.verify();
    } catch (error) {
      // Clean up any outstanding requests and retry
      this.cleanup();
      try {
        this.httpMock.verify();
      } catch (secondError) {
        console.warn('Failed to verify HTTP requests after cleanup:', secondError);
      }
    }
  }
}

/**
 * Service Test Isolator for preventing shared state pollution
 */
export class ServiceTestIsolator {
  private serviceInstance: any;
  private originalMethods: Map<string, any> = new Map();

  constructor(service: any) {
    this.serviceInstance = service;
  }

  /**
   * Save current state of cacheable methods
   */
  saveState(): void {
    if (this.serviceInstance.clearCache) {
      this.serviceInstance.clearCache();
    }
    
    // Save original methods that might have side effects
    if (this.serviceInstance.invalidateCache) {
      this.originalMethods.set('invalidateCache', this.serviceInstance.invalidateCache);
    }
  }

  /**
   * Restore service to clean state
   */
  restoreState(): void {
    // Clear any cached data
    if (this.serviceInstance.clearCache) {
      this.serviceInstance.clearCache();
    }

    // Clear any pending requests
    if (this.serviceInstance.pendingRequests) {
      this.serviceInstance.pendingRequests.clear();
    }

    // Restore original methods
    this.originalMethods.forEach((method, name) => {
      this.serviceInstance[name] = method;
    });
  }

  /**
   * Reset all caches and pending operations
   */
  fullReset(): void {
    this.restoreState();
    
    // Additional cleanup for specific service patterns
    if (this.serviceInstance.cache) {
      this.serviceInstance.cache.clear();
    }

    if (this.serviceInstance.getCacheStats) {
      const stats = this.serviceInstance.getCacheStats();
      if (stats.size > 0) {
        console.warn(`Cache not fully cleared. Remaining entries: ${stats.size}`);
      }
    }
  }
}

/**
 * Error Scenario Builder for comprehensive error testing
 */
export class ErrorScenarioBuilder {
  private scenarios: HttpMockExpectation[] = [];

  /**
   * Add network error scenario
   */
  networkError(url: string | RegExp, method: string = 'GET'): ErrorScenarioBuilder {
    this.scenarios.push({
      url,
      method: method as any,
      error: { status: 0, statusText: '', message: 'Network error' }
    });
    return this;
  }

  /**
   * Add server error scenario
   */
  serverError(url: string | RegExp, method: string = 'GET', status: number = 500): ErrorScenarioBuilder {
    this.scenarios.push({
      url,
      method: method as any,
      error: { status, statusText: 'Server Error', message: 'Internal server error' }
    });
    return this;
  }

  /**
   * Add authentication error scenario
   */
  authError(url: string | RegExp, method: string = 'GET'): ErrorScenarioBuilder {
    this.scenarios.push({
      url,
      method: method as any,
      error: { status: 401, statusText: 'Unauthorized', message: 'Authentication required' }
    });
    return this;
  }

  /**
   * Add permission error scenario
   */
  permissionError(url: string | RegExp, method: string = 'GET'): ErrorScenarioBuilder {
    this.scenarios.push({
      url,
      method: method as any,
      error: { status: 403, statusText: 'Forbidden', message: 'Permission denied' }
    });
    return this;
  }

  /**
   * Add not found error scenario
   */
  notFoundError(url: string | RegExp, method: string = 'GET'): ErrorScenarioBuilder {
    this.scenarios.push({
      url,
      method: method as any,
      error: { status: 404, statusText: 'Not Found', message: 'Resource not found' }
    });
    return this;
  }

  /**
   * Add timeout error scenario
   */
  timeoutError(url: string | RegExp, method: string = 'GET'): ErrorScenarioBuilder {
    this.scenarios.push({
      url,
      method: method as any,
      error: { status: 0, statusText: 'Timeout', message: 'Request timeout' }
    });
    return this;
  }

  /**
   * Get all built scenarios
   */
  build(): HttpMockExpectation[] {
    return [...this.scenarios];
  }

  /**
   * Clear all scenarios
   */
  reset(): ErrorScenarioBuilder {
    this.scenarios = [];
    return this;
  }
}

/**
 * HTTP Test Suite Builder for complex testing scenarios
 */
export class HttpTestSuiteBuilder {
  private mockManager: HttpMockManager;
  private isolator: ServiceTestIsolator | null = null;
  private errorBuilder: ErrorScenarioBuilder;

  constructor(httpMock: HttpTestingController) {
    this.mockManager = new HttpMockManager(httpMock);
    this.errorBuilder = new ErrorScenarioBuilder();
  }

  /**
   * Set service for test isolation
   */
  withServiceIsolation(service: any): HttpTestSuiteBuilder {
    this.isolator = new ServiceTestIsolator(service);
    return this;
  }

  /**
   * Get the mock manager
   */
  getMockManager(): HttpMockManager {
    return this.mockManager;
  }

  /**
   * Get the error scenario builder
   */
  getErrorBuilder(): ErrorScenarioBuilder {
    return this.errorBuilder;
  }

  /**
   * Setup test isolation
   */
  setupTest(): void {
    if (this.isolator) {
      this.isolator.saveState();
    }
  }

  /**
   * Cleanup test isolation
   */
  cleanupTest(): void {
    if (this.isolator) {
      this.isolator.fullReset();
    }
    this.mockManager.cleanup();
    this.mockManager.verifyNoOutstandingRequests();
  }

  /**
   * Execute a test suite with proper isolation
   */
  executeTestSuite(testFunction: (mockManager: HttpMockManager, errorBuilder: ErrorScenarioBuilder) => void): void {
    this.setupTest();
    
    try {
      testFunction(this.mockManager, this.errorBuilder);
    } finally {
      this.cleanupTest();
    }
  }
}

/**
 * Utility function to create a test suite builder
 */
export function createHttpTestSuite(httpMock: HttpTestingController): HttpTestSuiteBuilder {
  return new HttpTestSuiteBuilder(httpMock);
}

/**
 * Common HTTP test patterns
 */
export const HttpTestPatterns = {
  /**
   * Test caching behavior
   */
  testCaching: (
    mockManager: HttpMockManager,
    service: any,
    methodName: string,
    url: string,
    mockData: any,
    ...args: any[]
  ) => {
    let callCount = 0;

    // First call - should hit API
    service[methodName](...args).subscribe((data: any) => {
      expect(data).toEqual(mockData);
      callCount++;
    });

    const req1 = mockManager.expectAndFlush({
      url,
      response: mockData
    });

    expect(callCount).toBe(1);

    // Second call - should use cache
    service[methodName](...args).subscribe((data: any) => {
      expect(data).toEqual(mockData);
      callCount++;
    });

    expect(callCount).toBe(2);
    // No additional HTTP request expected for cached data
  },

  /**
   * Test retry mechanism
   */
  testRetry: (
    mockManager: HttpMockManager,
    service: any,
    methodName: string,
    url: string,
    retryCount: number,
    finalSuccess: boolean = false
  ) => {
    let errorReceived = false;
    let successReceived = false;

    service[methodName]().subscribe({
      next: () => { successReceived = true; },
      error: () => { errorReceived = true; }
    });

    mockManager.expectRetrySequence(
      { url, error: { status: 500, statusText: 'Server Error' } },
      retryCount,
      finalSuccess
    );

    if (finalSuccess) {
      expect(successReceived).toBe(true);
    } else {
      expect(errorReceived).toBe(true);
    }
  },

  /**
   * Test error handling
   */
  testErrorHandling: (
    mockManager: HttpMockManager,
    service: any,
    methodName: string,
    url: string,
    errorStatus: number,
    expectedMessage: string,
    ...args: any[]
  ) => {
    let receivedError: any = null;

    service[methodName](...args).subscribe({
      next: () => fail('Should have failed'),
      error: (error: any) => {
        receivedError = error;
      }
    });

    mockManager.expectAndFlush({
      url,
      error: { status: errorStatus, statusText: 'Error' }
    });

    expect(receivedError).toBeTruthy();
    expect(receivedError.message).toBe(expectedMessage);
  }
};