/**
 * Component Testing Templates - Phase 4 QA Implementation
 * 
 * Provides standardized testing templates for different component types
 * to ensure consistent, reliable test patterns across the application.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';

import { boundedFakeAsync, waitForDebounce, testSearchDebounce } from './async-testing-utils';
import { createHttpTestSuite, HttpTestSuiteBuilder, HttpMockManager } from './http-testing-utilities';
import { SubscriptionBaseComponent } from '../core/components/subscription-base.component';

/**
 * Base configuration for component tests
 */
export interface ComponentTestConfig {
  componentClass: any;
  mockServices?: { [key: string]: any };
  mockProviders?: any[];
  imports?: any[];
  declarations?: any[];
  schemas?: any[];
  enableHttpTesting?: boolean;
  enableServiceIsolation?: boolean;
}

/**
 * Mock patch data factory
 */
export class MockPatchFactory {
  static createBasicPatch(overrides: Partial<any> = {}): any {
    return {
      id: 'test-patch-1',
      title: 'Test Patch',
      description: 'A test synthesizer patch',
      tags: ['test', 'basic'],
      ratings: { average: 4.5, count: 10 },
      
      // Oscillator parameters
      oscillator: {
        sub_fifth: 0.0,
        ultra_saw: 0.3,
        saw: 0.7,
        square: 0.2,
        triangle: 0.5,
        pulse_width: 0.5,
        metalizer: 0.0,
        overtone: 0.0
      },
      
      // Filter parameters
      filter: {
        cutoff: 0.8,
        resonance: 0.3,
        env_amt: 0.5,
        brute_factor: 0.2,
        keyboard_tracking: 0.7,
        mode: 'low_pass'
      },
      
      // Envelope parameters
      envelope: {
        attack: 0.1,
        decay: 0.3,
        sustain: 0.7,
        release: 0.5,
        vca_mode: 'adsr'
      },
      
      // LFO parameters
      lfo: {
        rate: 0.4,
        amount: 0.3,
        waveform: 'triangle',
        sync: false
      },
      
      // Modulation matrix
      modulation: {
        lfo_to_cutoff: 0.2,
        lfo_to_pitch: 0.1,
        env_to_filter: 0.6,
        velocity_to_amp: 0.8
      },
      
      // User metadata
      user_id: 'test-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      ...overrides
    };
  }

  static createPatchVariations(count: number = 5): any[] {
    return Array.from({ length: count }, (_, i) => 
      this.createBasicPatch({
        id: `test-patch-${i + 1}`,
        title: `Test Patch ${i + 1}`,
        oscillator: {
          ...this.createBasicPatch().oscillator,
          saw: Math.random(),
          square: Math.random()
        }
      })
    );
  }

  static createEmptyPatch(): any {
    return this.createBasicPatch({
      id: undefined,
      title: '',
      description: '',
      oscillator: {
        sub_fifth: 0, ultra_saw: 0, saw: 0, square: 0, triangle: 0,
        pulse_width: 0.5, metalizer: 0, overtone: 0
      }
    });
  }
}

/**
 * Synthesizer component testing template
 */
export abstract class SynthesizerComponentTestTemplate<T> {
  protected component!: T;
  protected fixture!: ComponentFixture<T>;
  protected mockPatch = MockPatchFactory.createBasicPatch();
  protected testSuiteBuilder?: HttpTestSuiteBuilder;
  protected mockManager?: HttpMockManager;

  /**
   * Setup component test environment
   */
  protected setupComponent(config: ComponentTestConfig): void {
    const testingModule = TestBed.configureTestingModule({
      declarations: [config.componentClass, ...(config.declarations || [])],
      imports: [
        ReactiveFormsModule,
        ...(config.imports || []),
        ...(config.enableHttpTesting ? [HttpClientTestingModule] : [])
      ],
      providers: [...(config.mockProviders || [])],
      schemas: config.schemas || [NO_ERRORS_SCHEMA]
    });

    this.fixture = TestBed.createComponent(config.componentClass);
    this.component = this.fixture.componentInstance;

    if (config.enableHttpTesting) {
      const httpMock = TestBed.inject(HttpTestingController);
      this.testSuiteBuilder = createHttpTestSuite(httpMock);
      
      if (config.enableServiceIsolation) {
        // Add service isolation if services provided
        Object.keys(config.mockServices || {}).forEach(serviceName => {
          const service = TestBed.inject(config.mockServices![serviceName]);
          this.testSuiteBuilder = this.testSuiteBuilder!.withServiceIsolation(service);
        });
      }
      
      this.mockManager = this.testSuiteBuilder.getMockManager();
    }
  }

  /**
   * Cleanup component test environment
   */
  protected cleanupComponent(): void {
    if (this.testSuiteBuilder) {
      this.testSuiteBuilder.cleanupTest();
    }
  }

  /**
   * Standard parameter update test pattern
   */
  protected testParameterUpdate(
    parameterPath: string,
    newValue: any,
    expectedPatchUpdate: any
  ): jasmine.Spec {
    return it(`should update ${parameterPath} when value changes`, boundedFakeAsync(() => {
      // Setup
      (this.component as any).patch = { ...this.mockPatch };
      this.fixture.detectChanges();

      // Trigger parameter change
      this.setNestedProperty(this.component, parameterPath, newValue);
      this.fixture.detectChanges();

      // Wait for any debounced operations
      waitForDebounce();

      // Verify patch update
      expect(this.getNestedProperty((this.component as any).patch, parameterPath))
        .toBe(newValue);
      
      // Verify additional expectations if provided
      if (expectedPatchUpdate) {
        Object.keys(expectedPatchUpdate).forEach(key => {
          expect(this.getNestedProperty((this.component as any).patch, key))
            .toBe(expectedPatchUpdate[key]);
        });
      }
    }));
  }

  /**
   * Standard knob component interaction test
   */
  protected testKnobInteraction(
    knobSelector: string,
    parameterPath: string,
    testValue: number = 0.75
  ): jasmine.Spec {
    return it(`should handle ${knobSelector} knob interaction`, boundedFakeAsync(() => {
      // Setup
      (this.component as any).patch = { ...this.mockPatch };
      this.fixture.detectChanges();

      // Find knob component
      const knobDebugElement = this.fixture.debugElement.query(
        By.css(knobSelector)
      );
      expect(knobDebugElement).toBeTruthy();

      const knobComponent = knobDebugElement.componentInstance;
      
      // Simulate knob value change
      knobComponent.value = testValue;
      knobComponent.valueChange.emit(testValue);
      
      waitForDebounce();

      // Verify parameter updated
      expect(this.getNestedProperty((this.component as any).patch, parameterPath))
        .toBe(testValue);
    }));
  }

  /**
   * Standard form control testing pattern
   */
  protected testFormControlBinding(
    controlName: string,
    testValue: any,
    expectedBehavior: () => void
  ): jasmine.Spec {
    return it(`should handle ${controlName} form control changes`, boundedFakeAsync(() => {
      // Setup
      this.fixture.detectChanges();

      const control = (this.component as any)[controlName] as FormControl;
      expect(control).toBeTruthy();

      // Set control value
      control.setValue(testValue);
      waitForDebounce();

      // Verify expected behavior
      expectedBehavior();
    }));
  }

  /**
   * Standard subscription cleanup test
   */
  protected testSubscriptionCleanup(): jasmine.Spec {
    return it('should cleanup subscriptions on destroy', () => {
      // Initialize component
      (this.component as any).ngOnInit?.();
      this.fixture.detectChanges();

      // Verify destroy$ is not closed
      if ((this.component as any).destroy$) {
        expect((this.component as any).destroy$.closed).toBeFalse();
      }

      // Destroy component
      (this.component as any).ngOnDestroy?.();

      // Verify destroy$ is closed
      if ((this.component as any).destroy$) {
        expect((this.component as any).destroy$.closed).toBeTrue();
      }
    });
  }

  /**
   * Utility methods
   */
  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

/**
 * Service testing template
 */
export abstract class ServiceTestTemplate<T> {
  protected service!: T;
  protected mockManager!: HttpMockManager;
  protected testSuiteBuilder!: HttpTestSuiteBuilder;

  /**
   * Setup service test environment
   */
  protected setupService(serviceClass: any, additionalProviders: any[] = []): void {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [serviceClass, ...additionalProviders]
    });

    this.service = TestBed.inject(serviceClass);
    const httpMock = TestBed.inject(HttpTestingController);
    
    this.testSuiteBuilder = createHttpTestSuite(httpMock)
      .withServiceIsolation(this.service);
    this.mockManager = this.testSuiteBuilder.getMockManager();
  }

  /**
   * Cleanup service test environment
   */
  protected cleanupService(): void {
    this.testSuiteBuilder.cleanupTest();
  }

  /**
   * Standard CRUD operation test patterns
   */
  protected testCreateOperation(
    methodName: string,
    apiEndpoint: string,
    inputData: any,
    expectedResponse: any
  ): jasmine.Spec {
    return it(`should create resource via ${methodName}`, boundedFakeAsync(() => {
      let result: any;

      (this.service as any)[methodName](inputData).subscribe((response: any) => {
        result = response;
      });

      this.mockManager.expectAndFlush({
        url: apiEndpoint,
        method: 'POST',
        body: inputData,
        response: expectedResponse
      });

      expect(result).toEqual(expectedResponse);
    }));
  }

  protected testReadOperation(
    methodName: string,
    apiEndpoint: string,
    expectedResponse: any,
    ...args: any[]
  ): jasmine.Spec {
    return it(`should read resource via ${methodName}`, boundedFakeAsync(() => {
      let result: any;

      (this.service as any)[methodName](...args).subscribe((response: any) => {
        result = response;
      });

      this.mockManager.expectAndFlush({
        url: apiEndpoint,
        method: 'GET',
        response: expectedResponse
      });

      expect(result).toEqual(expectedResponse);
    }));
  }

  protected testUpdateOperation(
    methodName: string,
    apiEndpoint: string,
    inputData: any,
    expectedResponse: any
  ): jasmine.Spec {
    return it(`should update resource via ${methodName}`, boundedFakeAsync(() => {
      let result: any;

      (this.service as any)[methodName](inputData).subscribe((response: any) => {
        result = response;
      });

      this.mockManager.expectAndFlush({
        url: apiEndpoint,
        method: 'PUT',
        body: inputData,
        response: expectedResponse
      });

      expect(result).toEqual(expectedResponse);
    }));
  }

  protected testDeleteOperation(
    methodName: string,
    apiEndpoint: string,
    resourceId: string
  ): jasmine.Spec {
    return it(`should delete resource via ${methodName}`, boundedFakeAsync(() => {
      let completed = false;

      (this.service as any)[methodName](resourceId).subscribe(() => {
        completed = true;
      });

      this.mockManager.expectAndFlush({
        url: `${apiEndpoint}/${resourceId}`,
        method: 'DELETE',
        response: { success: true }
      });

      expect(completed).toBeTrue();
    }));
  }

  /**
   * Standard error handling test pattern
   */
  protected testErrorHandling(
    methodName: string,
    apiEndpoint: string,
    errorStatus: number,
    expectedErrorMessage: string,
    ...args: any[]
  ): jasmine.Spec {
    return it(`should handle ${errorStatus} errors in ${methodName}`, boundedFakeAsync(() => {
      let errorReceived: any = null;

      (this.service as any)[methodName](...args).subscribe({
        next: () => fail('Should have failed'),
        error: (error: any) => {
          errorReceived = error;
        }
      });

      this.mockManager.expectAndFlush({
        url: apiEndpoint,
        error: { status: errorStatus, statusText: 'Error' }
      });

      expect(errorReceived).toBeTruthy();
      if (expectedErrorMessage) {
        expect(errorReceived.message).toContain(expectedErrorMessage);
      }
    }));
  }

  /**
   * Standard caching test pattern
   */
  protected testCaching(
    methodName: string,
    apiEndpoint: string,
    mockData: any,
    ...args: any[]
  ): jasmine.Spec {
    return it(`should cache requests in ${methodName}`, boundedFakeAsync(() => {
      let callCount = 0;

      // First call - should hit API
      (this.service as any)[methodName](...args).subscribe((data: any) => {
        expect(data).toEqual(mockData);
        callCount++;
      });

      this.mockManager.expectAndFlush({
        url: apiEndpoint,
        response: mockData
      });

      expect(callCount).toBe(1);

      // Second call - should use cache (no additional HTTP request)
      (this.service as any)[methodName](...args).subscribe((data: any) => {
        expect(data).toEqual(mockData);
        callCount++;
      });

      expect(callCount).toBe(2);
      // No additional HTTP request should be made
    }));
  }
}

/**
 * Admin component testing template
 */
export abstract class AdminComponentTestTemplate<T> extends SynthesizerComponentTestTemplate<T> {
  protected mockUsers = [
    { id: '1', username: 'user1', email: 'user1@test.com', role: 'user' },
    { id: '2', username: 'admin1', email: 'admin1@test.com', role: 'admin' }
  ];

  protected mockAnalytics = {
    totalUsers: 100,
    totalPatches: 500,
    averageRating: 4.2,
    topTags: ['bass', 'lead', 'pad']
  };

  /**
   * Standard admin data table test pattern
   */
  protected testDataTable(
    dataProperty: string,
    expectedColumns: string[]
  ): jasmine.Spec {
    return it('should display data table correctly', boundedFakeAsync(() => {
      // Setup data
      (this.component as any)[dataProperty] = this.mockUsers;
      this.fixture.detectChanges();
      
      waitForDebounce();

      // Verify table headers
      const headerCells = this.fixture.debugElement.queryAll(By.css('th'));
      expectedColumns.forEach((column, index) => {
        expect(headerCells[index]?.nativeElement.textContent.trim())
          .toContain(column);
      });

      // Verify data rows
      const dataRows = this.fixture.debugElement.queryAll(By.css('tbody tr'));
      expect(dataRows.length).toBe(this.mockUsers.length);
    }));
  }

  /**
   * Standard search functionality test pattern
   */
  protected testSearchFunctionality(
    searchControlName: string,
    mockServiceMethod: string,
    searchTerm: string = 'test'
  ): jasmine.Spec {
    return it('should handle search functionality', boundedFakeAsync(() => {
      // Setup
      this.fixture.detectChanges();
      
      const mockService = (this.component as any)[mockServiceMethod] || 
                         (this.component as any).adminApiService;
      spyOn(mockService, 'getUsers').and.returnValue(of({ users: [], total: 0 }));

      // Perform search
      testSearchDebounce(
        (this.component as any)[searchControlName],
        searchTerm,
        mockService,
        'getUsers'
      );

      expect(mockService.getUsers).toHaveBeenCalledWith(
        jasmine.objectContaining({ search: searchTerm })
      );
    }));
  }

  /**
   * Standard pagination test pattern
   */
  protected testPagination(): jasmine.Spec {
    return it('should handle pagination', boundedFakeAsync(() => {
      // Setup
      (this.component as any).totalItems = 100;
      (this.component as any).pageSize = 10;
      this.fixture.detectChanges();

      const mockService = (this.component as any).adminApiService;
      spyOn(mockService, 'getUsers').and.returnValue(of({ users: [], total: 100 }));

      // Simulate page change
      (this.component as any).onPageChange?.(2);
      waitForDebounce();

      expect(mockService.getUsers).toHaveBeenCalledWith(
        jasmine.objectContaining({ 
          page: 2,
          limit: 10
        })
      );
    }));
  }
}

/**
 * Form component testing template
 */
export abstract class FormComponentTestTemplate<T> extends SynthesizerComponentTestTemplate<T> {
  /**
   * Standard form validation test pattern
   */
  protected testFormValidation(
    formName: string,
    validationTests: Array<{
      field: string;
      invalidValue: any;
      expectedError: string;
      validValue: any;
    }>
  ): jasmine.Spec {
    return it('should validate form fields correctly', boundedFakeAsync(() => {
      this.fixture.detectChanges();

      const form = (this.component as any)[formName];
      expect(form).toBeTruthy();

      validationTests.forEach(test => {
        // Test invalid value
        form.get(test.field)?.setValue(test.invalidValue);
        form.get(test.field)?.markAsTouched();
        
        expect(form.get(test.field)?.hasError(test.expectedError)).toBeTrue();
        expect(form.valid).toBeFalse();

        // Test valid value
        form.get(test.field)?.setValue(test.validValue);
        
        expect(form.get(test.field)?.hasError(test.expectedError)).toBeFalse();
      });
    }));
  }

  /**
   * Standard form submission test pattern
   */
  protected testFormSubmission(
    formName: string,
    submitMethodName: string,
    validFormData: any,
    expectedServiceCall: {
      service: string;
      method: string;
      expectedArgs?: any;
    }
  ): jasmine.Spec {
    return it('should submit form successfully', boundedFakeAsync(() => {
      // Setup
      this.fixture.detectChanges();

      const form = (this.component as any)[formName];
      const service = (this.component as any)[expectedServiceCall.service];
      
      spyOn(service, expectedServiceCall.method)
        .and.returnValue(of({ success: true }));

      // Set form values
      Object.keys(validFormData).forEach(key => {
        form.get(key)?.setValue(validFormData[key]);
      });

      expect(form.valid).toBeTrue();

      // Submit form
      (this.component as any)[submitMethodName]();
      waitForDebounce();

      // Verify service call
      if (expectedServiceCall.expectedArgs) {
        expect(service[expectedServiceCall.method])
          .toHaveBeenCalledWith(expectedServiceCall.expectedArgs);
      } else {
        expect(service[expectedServiceCall.method]).toHaveBeenCalled();
      }
    }));
  }
}

/**
 * Export all templates for easy importing
 */
export {
  SynthesizerComponentTestTemplate,
  ServiceTestTemplate,
  AdminComponentTestTemplate,
  FormComponentTestTemplate,
  MockPatchFactory,
  ComponentTestConfig
};

/**
 * Utility function to create component test suite
 */
export function createComponentTestSuite<T>(
  componentClass: any,
  config: Partial<ComponentTestConfig> = {}
): {
  setup: () => void;
  cleanup: () => void;
  getComponent: () => T;
  getFixture: () => ComponentFixture<T>;
  getMockManager: () => HttpMockManager | undefined;
} {
  let template: SynthesizerComponentTestTemplate<T>;
  
  class TestSuite extends SynthesizerComponentTestTemplate<T> {
    getComponent(): T {
      return this.component;
    }
    
    getFixture(): ComponentFixture<T> {
      return this.fixture;
    }
    
    getMockManager(): HttpMockManager | undefined {
      return this.mockManager;
    }
  }
  
  template = new TestSuite();
  
  return {
    setup: () => template['setupComponent']({
      componentClass,
      enableHttpTesting: false,
      enableServiceIsolation: false,
      ...config
    }),
    cleanup: () => template['cleanupComponent'](),
    getComponent: () => template.component,
    getFixture: () => template.fixture,
    getMockManager: () => template.mockManager
  };
}