import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { FilterComponent } from './filter.component';

describe('FilterComponent', () => {
  let component: FilterComponent;
  let fixture: ComponentFixture<FilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FilterComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FilterComponent);
    component = fixture.componentInstance;
    component.patch = {
      cutoff: 0.5,
      resonance: 0.3,
      env_amt: 0.7,
      brute_factor: 0.4,
      kbd_tracking: 0.6,
      mode: 1
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with filter parameters', () => {
    expect(component.patch.cutoff).toBeDefined();
    expect(component.patch.resonance).toBeDefined();
    expect(component.patch.env_amt).toBeDefined();
    expect(component.patch.brute_factor).toBeDefined();
    expect(component.patch.kbd_tracking).toBeDefined();
    expect(component.patch.mode).toBeDefined();
  });

  it('should handle filter parameter updates', () => {
    component.patch.cutoff = 0.9;
    expect(component.patch.cutoff).toBe(0.9);
    
    component.patch.resonance = 0.2;
    expect(component.patch.resonance).toBe(0.2);
    
    component.patch.brute_factor = 0.7;
    expect(component.patch.brute_factor).toBe(0.7);
  });

  it('should handle mode switching', () => {
    component.patch.mode = 2;
    expect(component.patch.mode).toBe(2);
    
    // Mode should be discrete values
    expect(Number.isInteger(component.patch.mode)).toBe(true);
  });

  it('should validate parameter ranges for continuous controls', () => {
    const continuousParams = ['cutoff', 'resonance', 'env_amt', 'brute_factor', 'kbd_tracking'];
    
    continuousParams.forEach(param => {
      const value = component.patch[param];
      if (typeof value === 'number') {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });
  });
});
