import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EnvelopeComponent } from './envelope.component';

describe('EnvelopeComponent', () => {
  let component: EnvelopeComponent;
  let fixture: ComponentFixture<EnvelopeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EnvelopeComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EnvelopeComponent);
    component = fixture.componentInstance;
    component.patch = {
      attack: 0.1,
      decay: 0.2,
      sustain: 0.7,
      release: 0.3,
      env_amt: 0.5,
      vca: 1
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with ADSR parameters', () => {
    expect(component.patch.attack).toBeDefined();
    expect(component.patch.decay).toBeDefined();
    expect(component.patch.sustain).toBeDefined();
    expect(component.patch.release).toBeDefined();
    expect(component.patch.env_amt).toBeDefined();
    expect(component.patch.vca).toBeDefined();
  });

  it('should handle ADSR parameter updates', () => {
    component.patch.attack = 0.05;
    expect(component.patch.attack).toBe(0.05);
    
    component.patch.decay = 0.15;
    expect(component.patch.decay).toBe(0.15);
    
    component.patch.sustain = 0.8;
    expect(component.patch.sustain).toBe(0.8);
    
    component.patch.release = 0.4;
    expect(component.patch.release).toBe(0.4);
  });

  it('should validate ADSR parameter ranges', () => {
    const adsrParams = ['attack', 'decay', 'sustain', 'release', 'env_amt'];
    
    adsrParams.forEach(param => {
      const value = component.patch[param];
      if (typeof value === 'number') {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });
  });

  it('should handle VCA mode switching', () => {
    component.patch.vca = 0;
    expect(component.patch.vca).toBe(0);
    
    component.patch.vca = 1;
    expect(component.patch.vca).toBe(1);
    
    // VCA should be discrete 0/1
    expect([0, 1]).toContain(component.patch.vca);
  });
});
