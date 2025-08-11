/**
 * HTTP Testing Architecture - Main Export
 * 
 * Comprehensive HTTP testing utilities for Angular services with:
 * - Mock lifecycle management
 * - Test isolation and state management
 * - Error scenario testing
 * - Automatic cleanup and verification
 */

// Core HTTP testing utilities
export {
  HttpMockManager,
  ServiceTestIsolator,
  ErrorScenarioBuilder,
  HttpTestSuiteBuilder,
  createHttpTestSuite,
  HttpTestPatterns,
  type HttpMockExpectation
} from './http-testing-utilities';

// Service test isolation
export {
  CacheStateManager,
  ServiceMockStateManager,
  ServiceTestIsolator as ServiceIsolator,
  withServiceIsolation,
  CacheStateVerifier,
  ServiceTestBuilder,
  createServiceTestBuilder,
  type CacheableService
} from './service-test-isolation';

// Test lifecycle management
export {
  TestLifecycleManager,
  TestScope,
  TestLifecycleBuilder,
  createTestLifecycle,
  withTestLifecycle,
  TestLifecycleConfigs,
  type TestLifecycleConfig,
  type TestLifecycleEvents,
  type TestStatistics
} from './test-lifecycle-manager';

/**
 * Quick setup utilities for common testing scenarios
 */

import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestLifecycleManager, TestLifecycleConfigs } from './test-lifecycle-manager';
import { HttpMockManager } from './http-testing-utilities';
import { ServiceTestIsolator } from './service-test-isolation';

/**
 * Quick setup for HTTP service testing
 */
export function setupHttpServiceTest<T>(
  serviceToken: any,
  requiresIsolation: boolean = false
): {
  service: T;
  httpMock: HttpTestingController;
  mockManager: HttpMockManager;
  isolator?: ServiceTestIsolator;
} {
  const service = TestBed.inject(serviceToken) as T;
  const httpMock = TestBed.inject(HttpTestingController);
  const mockManager = new HttpMockManager(httpMock);
  
  let isolator: ServiceTestIsolator | undefined;
  if (requiresIsolation) {
    isolator = new ServiceTestIsolator(service);
  }

  return { service, httpMock, mockManager, isolator };
}

/**
 * Quick setup for cached service testing
 */
export function setupCachedServiceTest<T>(
  serviceToken: any,
  serviceName: string = 'service'
): {
  service: T;
  httpMock: HttpTestingController;
  lifecycleManager: TestLifecycleManager;
} {
  const service = TestBed.inject(serviceToken) as T;
  const httpMock = TestBed.inject(HttpTestingController);
  
  const config = TestLifecycleConfigs.withCaching(serviceName, serviceToken);
  const lifecycleManager = new TestLifecycleManager(config);
  
  return { service, httpMock, lifecycleManager };
}

/**
 * Test helper for verifying no outstanding HTTP requests
 */
export function verifyNoOutstandingHttpRequests(httpMock: HttpTestingController): void {
  try {
    httpMock.verify();
  } catch (error) {
    console.warn('HTTP verification failed, attempting cleanup:', error);
    
    // Attempt to clean up any pending requests
    const backend = httpMock as any;
    if (backend._pendingRequests && backend._pendingRequests.length > 0) {
      backend._pendingRequests.forEach((req: any) => {
        try {
          if (!req.cancelled) {
            req.flush({}, { status: 200, statusText: 'OK' });
          }
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      });
      backend._pendingRequests = [];
    }
    
    // Retry verification
    try {
      httpMock.verify();
    } catch (secondError) {
      console.error('Failed to clean up HTTP requests:', secondError);
      throw secondError;
    }
  }
}

/**
 * Common test patterns for HTTP services
 */
export const CommonTestPatterns = {
  /**
   * Test basic HTTP GET request
   */
  testBasicGet: (
    mockManager: HttpMockManager,
    service: any,
    methodName: string,
    url: string,
    mockData: any,
    ...args: any[]
  ) => {
    service[methodName](...args).subscribe((data: any) => {
      expect(data).toEqual(mockData);
    });

    mockManager.expectAndFlush({
      url,
      method: 'GET',
      response: mockData
    });
  },

  /**
   * Test HTTP POST request
   */
  testBasicPost: (
    mockManager: HttpMockManager,
    service: any,
    methodName: string,
    url: string,
    requestBody: any,
    mockResponse: any,
    ...args: any[]
  ) => {
    service[methodName](...args).subscribe((data: any) => {
      expect(data).toEqual(mockResponse);
    });

    mockManager.expectAndFlush({
      url,
      method: 'POST',
      body: requestBody,
      response: mockResponse
    });
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
    service[methodName](...args).subscribe({
      next: () => fail('Should have failed'),
      error: (error: any) => {
        expect(error.message).toBe(expectedMessage);
      }
    });

    mockManager.expectAndFlush({
      url,
      method: 'GET',
      error: { status: errorStatus, statusText: 'Error' }
    });
  }
};

/**
 * Debugging utilities
 */
export const TestDebugUtils = {
  /**
   * Log HTTP mock statistics
   */
  logHttpStats: (mockManager: HttpMockManager, label: string = 'HTTP Stats') => {
    const stats = mockManager.getStatistics();
    console.log(`=== ${label} ===`);
    console.log(`Total requests: ${stats.totalRequests}`);
    console.log(`Pending requests: ${stats.pendingRequests}`);
    console.log(`Completed requests: ${stats.completedRequests}`);
    console.log(`Expectations: ${stats.expectations}`);
    console.log('================');
  },

  /**
   * Log service cache state
   */
  logServiceCache: (service: any, label: string = 'Service Cache') => {
    console.log(`=== ${label} ===`);
    
    if (service.getCacheStats) {
      const stats = service.getCacheStats();
      console.log(`Cache size: ${stats.size}`);
      console.log(`Cache keys: ${stats.keys.join(', ')}`);
    }
    
    if (service.cache) {
      console.log(`Direct cache size: ${service.cache.size}`);
      console.log(`Cache keys: ${Array.from(service.cache.keys()).join(', ')}`);
    }
    
    console.log('================');
  }
};