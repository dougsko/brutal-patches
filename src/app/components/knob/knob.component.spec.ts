import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { KnobComponent } from './knob.component';

describe('KnobComponent', () => {
  let component: KnobComponent;
  let fixture: ComponentFixture<KnobComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ KnobComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(KnobComponent);
    component = fixture.componentInstance;
    // Set default properties for knob component
    component.patch = {} as any;
    component.label = 'Test Knob';
    component.name = 'testKnob';
    component.sFlow = 'linear';
    component.lFlow = '100';
    component.lower = '0';
    component.max = '100';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have required input properties', () => {
    expect(component.patch).toBeDefined();
    expect(component.label).toBeDefined();
    expect(component.name).toBeDefined();
  });

  it('should initialize with default values', () => {
    expect(component.sFlow).toBe('linear');
    expect(component.lower).toBe('0');
    expect(component.max).toBe('100');
  });

  it('should handle patch property updates', () => {
    component.patch['testKnob'] = 0.75;
    expect(component.patch['testKnob']).toBe(0.75);
  });
});
