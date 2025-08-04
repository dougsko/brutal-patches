import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { OscillatorComponent } from './oscillator.component';

describe('OscillatorComponent', () => {
  let component: OscillatorComponent;
  let fixture: ComponentFixture<OscillatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OscillatorComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OscillatorComponent);
    component = fixture.componentInstance;
    // Initialize patch property to prevent errors
    component.patch = {
      sub_fifth: 0.5,
      overtone: 0.3,
      ultra_saw: 0.7,
      saw: 0.4,
      pulse_width: 0.6,
      square: 0.2,
      metalizer: 0.8,
      triangle: 0.1
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have patch input property', () => {
    expect(component.patch).toBeDefined();
  });
});
